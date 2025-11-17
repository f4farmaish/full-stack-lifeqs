import { Models, Query } from "appwrite";
import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import LikeModal from "@/components/shared/LikeModal";
import { checkIsLiked } from "@/lib/utils";
import {
  useLikePost,
  useSavePost,
  useDeleteSavedPost,
  useGetCommentsByPostId,
  useGetCurrentUser,
  useIsSaved,
} from "@/lib/react-query/queries";
import { getUsers } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";

import ShareButtons from "./ShareButtons";
import { Post, IPoll } from "@/types";

// Custom hook for fetching liked users with debouncing and caching
const useGetLikedUsers = (likes: string[]) => {
  return useQuery({
    queryKey: ["likedUsers", likes.sort().join(",")],
    queryFn: async () => {
      if (!likes.length) {
        return { documents: [] };
      }
      try {
        const response = await getUsers(50, 0, [Query.equal("$id", likes)]);
        return response;
      } catch (error) {
        console.error("useGetLikedUsers: Error fetching liked users", {
          error,
          likes,
        });
        throw error;
      }
    },
    enabled: likes.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

type PostStatsProps = {
  post: Models.Document & {
    type?: "post" | "poll";
    creatorId?: string;
    isDraft?: boolean;
    commentsLocked?: boolean;
    groupIdString?: string; // Added for group check
  };
  userId: string;
  isPoll?: boolean;
  onCommentClick?: () => void;
  shareUrl?: string;
  shareContent?: string;
  handleCopyLink?: (url: string, itemId: string) => void;
  disabled?: boolean;
};

const PostStats = ({
  post,
  userId,
  isPoll = false,
  onCommentClick,
  shareUrl,
  shareContent,
  handleCopyLink,
  disabled = false,
}: PostStatsProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const effectiveShareUrl =
    shareUrl ||
    `${window.location.origin}/${
      isPoll || post.type === "poll" ? "polls" : "posts"
    }/${post.$id}`;
  const effectiveShareContent =
    shareContent ||
    (isPoll || post.type === "poll"
      ? (post as IPoll).question
      : (post as Post).title) ||
    "Check this out!";
  const effectiveHandleCopyLink =
    handleCopyLink ||
    ((url: string, itemId: string) => {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast({ title: "Link copied to clipboard!" });
        })
        .catch((err) => {
          console.error(
            `PostStats: Failed to copy link for item ${itemId}:`,
            err
          );
          toast({ variant: "destructive", title: "Failed to copy link." });
        });
    });
  const likesList = post.likedBy ?? [];

  const [likes, setLikes] = useState<string[]>(likesList);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const { mutate: likePost } = useLikePost();
  const { mutate: savePost } = useSavePost();
  const { mutate: deleteSavePost } = useDeleteSavedPost();
  const { data: currentUser } = useGetCurrentUser();

  const { data: commentsData, isLoading: isCommentsLoading } =
    useGetCommentsByPostId(post.$id);

  const { data: saveData } = useIsSaved(post.$id, isPoll, userId);
  const isItemSaved = saveData?.isSaved ?? false;

  // Fetch liked users using custom hook
  const { data: likedUsersData } = useGetLikedUsers(likes);
  const likedUsers = likedUsersData?.documents || [];

  // Memoized handleLikePost with draft and lock checks
  const handleLikePost = useCallback(
    (e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
      e.stopPropagation();
      if (post.isDraft) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot like a draft post.",
        });
        return;
      }
      if (post.commentsLocked) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "This post is locked and cannot be liked.",
        });
        return;
      }
      if (!currentUser) {
        navigate("/sign-in");
        return;
      }
      if (currentUser.$id === (post.creatorId || post.creator)) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot like your own content.",
        });
        return;
      }
      let likesArray = [...likes];
      if (likesArray.includes(userId)) {
        likesArray = likesArray.filter((Id) => Id !== userId);
      } else {
        likesArray.push(userId);
      }
      setLikes(likesArray);
      likePost({ postId: post.$id, likesArray, isPoll: post.type === "poll" });
    },
    [
      likes,
      userId,
      post.$id,
      post.type,
      post.creatorId,
      post.creator,
      post.isDraft,
      post.commentsLocked,
      likePost,
      currentUser,
      navigate,
      toast,
    ]
  );

  // Memoized handleSavePost with draft check
  const handleSavePost = useCallback(
    (e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
      e.stopPropagation();
      if (post.isDraft) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot save a draft post.",
        });
        return;
      }
      if (!currentUser) {
        navigate("/sign-in");
        return;
      }
      if (currentUser.$id === (post.creatorId || post.creator)) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot save your own content.",
        });
        return;
      }

      if (isItemSaved) {
        queryClient.setQueryData(["isSaved", post.$id, isPoll, userId], {
          isSaved: false,
        });
        deleteSavePost({ userId, postId: post.$id, isPoll });
      } else {
        queryClient.setQueryData(["isSaved", post.$id, isPoll, userId], {
          isSaved: true,
        });
        savePost({ userId, postId: post.$id, isPoll });
      }
    },
    [
      isItemSaved,
      userId,
      post.$id,
      post.creatorId,
      post.creator,
      post.isDraft,
      isPoll,
      savePost,
      deleteSavePost,
      currentUser,
      navigate,
      queryClient,
      toast,
    ]
  );

  // Memoized handleCommentClick with draft check
  const handleCommentClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
      e.stopPropagation();
      if (post.isDraft) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot comment on a draft post.",
        });
        return;
      }
      if (disabled) {
        return;
      }
      if (!currentUser) {
        navigate("/sign-in");
        return;
      }
      if (isPoll) {
        navigate(`/polls/${post.$id}`);
      } else if (onCommentClick) {
        onCommentClick();
      }
    },
    [
      disabled,
      currentUser,
      isPoll,
      onCommentClick,
      navigate,
      post.$id,
      post.isDraft,
      toast,
    ]
  );

  // Memoized handleOpenModal with draft check
  const handleOpenModal = useCallback(
    (e: React.MouseEvent<HTMLParagraphElement>) => {
      e.stopPropagation();
      if (post.isDraft) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot view likes on a draft post.",
        });
        return;
      }
      if (!isModalOpen) {
        setIsModalOpen(true);
      }
    },
    [isModalOpen, post.$id, post.isDraft, toast]
  );

  // Memoized handleToggleShare with draft and group checks
  const handleToggleShare = useCallback(
    (e: React.MouseEvent<HTMLImageElement, MouseEvent>) => {
      e.stopPropagation();
      if (post.isDraft) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot share a draft post.",
        });
        return;
      }
      if (post.groupIdString) {
        toast({
          variant: "destructive",
          title: "Action Not Allowed",
          description: "You cannot share content from a private group.",
        });
        return;
      }
      setIsShareOpen((prev) => !prev);
    },
    [post.$id, post.isDraft, post.groupIdString, isShareOpen, toast]
  );

  const containerStyles = location.pathname.startsWith("/profile")
    ? "w-full"
    : "";
  const commentsCount =
    commentsData?.pages.flatMap((page) => page.documents || []).length || 0;

  return (
    <div className="relative">
      <div
        className={`flex justify-between items-center gap-6 z-20 ${containerStyles}`}>
        {/* Likes */}
        <div className="flex gap-2">
          <img
            src={`${
              checkIsLiked(likes, userId)
                ? "/assets/icons/liked.svg"
                : "/assets/icons/like.svg"
            }`}
            alt="like"
            width={22}
            height={22}
            className={`cursor-pointer ${
              post.isDraft || disabled ? "cursor-not-allowed opacity-50" : ""
            }`}
            onClick={handleLikePost}
            onError={(e) => {
              console.error("PostStats: Failed to load like icon", {
                postId: post.$id,
              });
              e.currentTarget.src = "/assets/icons/fallback.svg";
            }}
          />
          <p
            className={`small-medium lg:base-medium ${
              post.isDraft || disabled
                ? "cursor-not-allowed"
                : "cursor-pointer hover:underline"
            }`}
            onClick={handleOpenModal}>
            {likes.length}
          </p>
        </div>

        {/* Comments */}
        <div className="flex gap-2">
          <img
            src="/assets/icons/comment.svg"
            alt="comments"
            width={20}
            height={20}
            className={`cursor-pointer hover:text-light-1 transition-all ${
              post.isDraft || disabled ? "cursor-not-allowed opacity-50" : ""
            }`}
            onClick={handleCommentClick}
            onError={(e) => {
              console.error("PostStats: Failed to load comment icon", {
                postId: post.$id,
              });
              e.currentTarget.src = "/assets/icons/fallback.svg";
            }}
          />
          <p className="small-medium lg:base-medium">
            {isCommentsLoading ? "..." : commentsCount}
          </p>
        </div>

        {/* Save */}
        <div className="flex gap-2">
          <img
            src={
              isItemSaved ? "/assets/icons/saved.svg" : "/assets/icons/save.svg"
            }
            alt="save"
            width={20}
            height={20}
            className={`cursor-pointer ${
              post.isDraft || disabled ? "cursor-not-allowed opacity-50" : ""
            }`}
            onClick={handleSavePost}
            onError={(e) => {
              console.error("PostStats: Failed to load save icon", {
                postId: post.$id,
              });
              e.currentTarget.src = "/assets/icons/fallback.svg";
            }}
          />
        </div>

        {/* Share */}
        {!post.groupIdString && (
          <div className="flex gap-2">
            <img
              src="/assets/icons/share.svg"
              alt="share"
              width={20}
              height={20}
              className={`cursor-pointer ${
                post.isDraft || disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
              onClick={handleToggleShare}
              onError={(e) => {
                console.error("PostStats: Failed to load share icon", {
                  postId: post.$id,
                });
                e.currentTarget.src = "/assets/icons/fallback.svg";
              }}
            />
          </div>
        )}
      </div>

      {!post.groupIdString && isShareOpen && !post.isDraft && (
        <ShareButtons
          shareUrl={effectiveShareUrl}
          shareContent={effectiveShareContent}
          handleCopyLink={effectiveHandleCopyLink}
          postId={post.$id}
        />
      )}

      {/* Render LikeModal with postId to ensure uniqueness */}
      {!post.isDraft && (
        <LikeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          likedUsers={likedUsers}
          postId={post.$id}
        />
      )}
    </div>
  );
};

export default PostStats;
