import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader, PostStats } from "@/components/shared";
import {
  useGetPostById,
  useDeletePost,
  useGetCategoryNameById,
  useGetGroupById,
  useGetUserById,
  useLikePost,
  useSuperLikePost,
  useSimpleLikePost,
  useLockPostComments,
  useUnlockPostComments,
  usePublishPost,
} from "@/lib/react-query/queries";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import CommentForm from "@/components/comments/CommentForm";
import CommentList from "@/components/comments/CommentList";
import { useRef, useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { UserAction } from "@/lib/pointsMapping";
import {
  updateUserLevelAndPoints,
  incrementLikesToday,
  incrementSuperLikesToday,
  incrementSimpleLikesToday,
} from "@/services/userService";
import { IUser } from "@/types";
import LockCommentsModal from "@/components/comments/LockCommentsModal";
import GroupContentAccessDenied from "@/components/groups/GroupContentAccessDenied";
import DescriptionViewer from "@/components/post/DescriptionViewer";
import LockCommentsButton from "@/components/post/LockCommentsButton";
import ReactionButtons from "@/components/post/ReactionButtons";
import DraftControls from "@/components/post/DraftControls";
import CreatorInfo from "@/components/post/CreatorInfo";
import GreatButton from "@/components/post/GreatButton";
import RelatedPostsSidebar from "@/components/post/RelatedPostsSidebar";
import { useScrollDetector } from "@/hooks/useScrollDetector";
import StickyHeader from "@/components/post/StickyHeader";
import { useGetRelatedPosts } from "@/lib/react-query/queries";

interface UserContext {
  user: IUser;
  setUser: React.Dispatch<React.SetStateAction<IUser>>;
}

const PostDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { user, setUser } = useUserContext() as unknown as UserContext;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const commentFormRef = useRef<HTMLDivElement>(null);
  const { isVisible: isStickyHeaderVisible } = useScrollDetector({
    threshold: 1,
    scrollThreshold: 200,
    hideOnScrollUp: true,
  });



  // Fetch data
  const { data: post, isLoading: isPostLoading } = useGetPostById(id);
  const groupId = post?.groupIdString || post?.groupId?.$id;
  const { data: group, isLoading: isGroupLoading } = useGetGroupById(
    groupId,
    !!groupId
  );
  const categoryId =
    typeof post?.categoryId === "string"
      ? post.categoryId
      : post?.categoryId?.$id;
  const { data: categoryName } = useGetCategoryNameById(categoryId);
  const postCreatorId = post?.creatorId;
  const displayCreatorId = post?.isAnonymous ? undefined : postCreatorId;
  const { data: creatorData } = useGetUserById(displayCreatorId || "", {
    enabled: !!post && !post.isAnonymous && !!displayCreatorId,
  });
  const {
    data: relatedPosts = [],
    isLoading: isRelatedPostsLoading,
  } = useGetRelatedPosts(displayCreatorId || "", id || "", !!displayCreatorId);

  // Memoized values
  const creatorLevel = useMemo(
    () => (post?.isAnonymous ? "N/A" : creatorData?.level?.toString() || "N/A"),
    [post?.isAnonymous, creatorData]
  );

  const formattedDate = useMemo(
    () =>
      post?.createdAt && !isNaN(new Date(post.createdAt).getTime())
        ? multiFormatDateString(post.createdAt)
        : "Unknown Time",
    [post?.createdAt]
  );

  // State and mutations
  const [isLiked, setIsLiked] = useState(false);
  const [isSuperLiked, setIsSuperLiked] = useState(false);
  const [isSimpleLiked, setIsSimpleLiked] = useState(false);
  const { mutate: deletePost, isLoading: isDeleting } = useDeletePost();
  const { mutate: likePost } = useLikePost();
  const { mutate: superLikePost } = useSuperLikePost();
  const { mutate: simpleLikePost } = useSimpleLikePost();
  const { mutate: lockPostComments } = useLockPostComments();
  const { mutate: unlockPostComments } = useUnlockPostComments();
  const { mutate: publishPost, isLoading: isPublishing } = usePublishPost();
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);

  const isOwner = user.id === postCreatorId;
  const isGroupAdmin = groupId && group && group.admins?.includes(user.id);
  const isGroupPost = !!groupId;
  const canLock = useMemo(() => {
    return isGroupPost ? isOwner || isGroupAdmin : isOwner;
  }, [isGroupPost, isOwner, isGroupAdmin]);

  // Update states when post or user.id changes
  useEffect(() => {
    if (post && user.id) {
      setIsLiked(post.likedBy?.includes(user.id) || false);
      setIsSuperLiked(post.superLikedBy?.includes(user.id) || false);
      setIsSimpleLiked(post.simpleLikedBy?.includes(user.id) || false);
    }
  }, [post, user.id]);

  // Check if post is within 10-minute edit window
  const isWithinEditWindow = useMemo(() => {
    if (!post || post.isDraft) return false;
    const createdAt = new Date(post.$createdAt);
    const now = new Date();
    return now.getTime() - createdAt.getTime() < 10 * 60 * 1000;
  }, [post]);

  // Determine user permissions
  const userLevel = user.level;

  const isLikesTodayResetNeeded = (lastLikeReset?: string): boolean => {
    const today = new Date();
    if (!lastLikeReset) return true;
    const lastResetDate = new Date(lastLikeReset);
    if (isNaN(lastResetDate.getTime())) return true;
    return (
      lastResetDate.getUTCFullYear() !== today.getUTCFullYear() ||
      lastResetDate.getUTCMonth() !== today.getUTCMonth() ||
      lastResetDate.getUTCDate() !== today.getUTCDate()
    );
  };

  const canLike = useMemo(() => {
    const isToday = !isLikesTodayResetNeeded(user.lastLikeReset);
    const likesToday = isToday
      ? (user.likesToday || 0) +
        (user.superLikesToday || 0) +
        (user.simpleLikesToday || 0)
      : 0;
    return (
      userLevel >= 3 &&
      likesToday < 2 &&
      !isLiked &&
      !isSuperLiked &&
      !isSimpleLiked
    );
  }, [
    userLevel,
    user.likesToday,
    user.superLikesToday,
    user.simpleLikesToday,
    user.lastLikeReset,
    isLiked,
    isSuperLiked,
    isSimpleLiked,
  ]);

  const canSuperLike = useMemo(() => {
    const isToday = !isLikesTodayResetNeeded(user.lastLikeReset);
    const likesToday = isToday
      ? (user.likesToday || 0) +
        (user.superLikesToday || 0) +
        (user.simpleLikesToday || 0)
      : 0;
    return (
      userLevel >= 3 &&
      likesToday < 2 &&
      !isLiked &&
      !isSuperLiked &&
      !isSimpleLiked &&
      user.id !== postCreatorId // Prevent self-golden heart
    );
  }, [
    userLevel,
    user.likesToday,
    user.superLikesToday,
    user.simpleLikesToday,
    user.lastLikeReset,
    isLiked,
    isSuperLiked,
    isSimpleLiked,
    postCreatorId,
  ]);

  const canSimpleLike = useMemo(() => {
    const isToday = !isLikesTodayResetNeeded(user.lastLikeReset);
    const likesToday = isToday
      ? (user.likesToday || 0) +
        (user.superLikesToday || 0) +
        (user.simpleLikesToday || 0)
      : 0;
    return (
      userLevel >= 3 &&
      likesToday < 2 &&
      !isLiked &&
      !isSuperLiked &&
      !isSimpleLiked &&
      user.id !== postCreatorId // Prevent self-simple heart
    );
  }, [
    userLevel,
    user.likesToday,
    user.superLikesToday,
    user.simpleLikesToday,
    user.lastLikeReset,
    isLiked,
    isSuperLiked,
    isSimpleLiked,
    postCreatorId,
  ]);

  // Handlers
  const isCommentsLocked = useMemo(() => {
    if (!post?.commentsLocked) return false;
    if (!post.lockExpiry) return true; // Permanent lock
    const expiryDate = new Date(post.lockExpiry);
    const now = new Date();
    return now < expiryDate; // Locked if current time is before expiry
  }, [post?.commentsLocked, post?.lockExpiry]);

  // Determine if user can unlock comments
  const canUnlockComments = useMemo(() => {
    if (!post?.commentsLocked || !post?.lockedBy) return false;
    return isGroupAdmin || post.lockedBy === user.id;
  }, [post?.commentsLocked, post?.lockedBy, isGroupAdmin, user.id]);

  const handleDeletePost = async () => {
    if (!id) {
      toast({ description: "Post ID is missing." });
      return;
    }
    const confirmationMessage = isOwner
      ? "Are you sure you want to delete your post?"
      : "Are you sure you want to delete this post?";
    if (!window.confirm(confirmationMessage)) return;

    // Only show points warning for non-draft, non-anonymous posts
    if (!post?.isDraft && !post?.isAnonymous && postCreatorId) {
      const pointsWarning = window.confirm(
        "Warning: You will lose 15 Qpoints for deleting this post. Do you want to continue?"
      );
      if (!pointsWarning) return;
    }

    try {
      await deletePost({ postId: id, imageId: post?.imageId });

      if (!post?.isAnonymous && postCreatorId && !post?.isDraft) {
        await updateUserLevelAndPoints(
          postCreatorId,
          UserAction.DELETE_QUESTION
        );
      }
      toast({
        title: post?.isDraft
          ? "Draft deleted successfully."
          : "Post deleted. -15 points deducted.",
      });

      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["recentPosts"]);
      queryClient.invalidateQueries(["userDrafts"]);
      queryClient.removeQueries(["postById", id]);
      navigate(post?.groupIdString ? `/groups/${post.groupIdString}` : "/");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({ description: "Failed to delete post.", variant: "destructive" });
    }
  };

  const handlePublishPost = async () => {
    if (!id) {
      toast({ description: "Post ID is missing." });
      return;
    }
    if (!post?.isDraft) {
      toast({ description: "This post is not a draft." });
      return;
    }
    try {
      await publishPost(id);
      toast({ title: "Post published successfully." });
      queryClient.invalidateQueries(["postById", id]);
      queryClient.invalidateQueries(["posts"]);
      queryClient.invalidateQueries(["userDrafts"]);
      navigate(`/posts/${id}`);
    } catch (error) {
      console.error("Error publishing post:", error);
      toast({ description: "Failed to publish post.", variant: "destructive" });
    }
  };

  const handleLikePost = async () => {
    if (!id || !user.id) {
      toast({ title: "Post ID or User ID is missing." });
      return;
    }

    if (!canLike) {
      toast({
        title: isLiked
          ? "You have already liked this post."
          : "You have reached your daily reaction limit.",
      });
      return;
    }

    const updatedLikes = [...(post?.likedBy || []), user.id];

    try {
      await new Promise<void>((resolve, reject) => {
        likePost(
          { postId: id, likesArray: updatedLikes, isPoll: false },
          {
            onSuccess: () => {
              setIsLiked(true);
              resolve();
            },
            onError: (error) => reject(error),
          }
        );
      });

      await incrementLikesToday(user.id).then((updatedUser) => {
        setUser({
          ...user,
          likesToday: updatedUser.likesToday,
          lastLikeReset: updatedUser.lastLikeReset,
        });
      });

      if (!post?.isAnonymous && postCreatorId) {
        await updateUserLevelAndPoints(
          postCreatorId,
          UserAction.POST_HEART_RECEIVED
        );
      }

      toast({ title: "Post liked successfully!" });
    } catch (error) {
      console.error("Error liking post:", error);
      toast({ title: "Failed to like post.", variant: "destructive" });
    }
  };

  const handleSuperLikePost = async () => {
    if (!id || !user.id) {
      toast({ title: "Post ID or User ID is missing." });
      return;
    }

    if (user.id === postCreatorId) {
      toast({ description: "You cannot golden heart your own post." });
      return;
    }

    if (!canSuperLike) {
      toast({
        title: isSuperLiked
          ? "You have already given a golden heart to this post."
          : userLevel < 3
          ? "You need to be level 3 or higher to give a golden heart to a post!"
          : "You have reached your daily reaction limit.",
      });
      return;
    }

    const updatedSuperLikes = [...(post?.superLikedBy || []), user.id];

    try {
      await new Promise<void>((resolve, reject) => {
        superLikePost(
          {
            postId: id,
            superLikesArray: updatedSuperLikes,
            userId: user.id,
            isPoll: false,
          },
          {
            onSuccess: () => {
              setIsSuperLiked(true);
              resolve();
            },
            onError: (error) => reject(error),
          }
        );
      });

      await incrementSuperLikesToday(user.id).then((updatedUser) => {
        setUser({
          ...user,
          superLikesToday: updatedUser.superLikesToday,
          lastLikeReset: updatedUser.lastLikeReset,
        });
      });

      if (!post?.isAnonymous && postCreatorId) {
        await updateUserLevelAndPoints(
          postCreatorId,
          UserAction.POST_GOLDEN_HEART_RECEIVED
        );
      }

      toast({ title: "Post golden hearted successfully!" });
    } catch (error: any) {
      console.error("Error golden hearting post:", error);
      toast({
        title: `Failed to golden heart post: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const handleSimpleLikePost = async () => {
    if (!id || !user.id) {
      toast({ title: "Post ID or User ID is missing." });
      return;
    }

    if (user.id === postCreatorId) {
      toast({ description: "You cannot simple heart your own post." });
      return;
    }

    if (!canSimpleLike) {
      toast({
        title: isSimpleLiked
          ? "You have already given a simple heart to this post."
          : userLevel < 3
          ? "You need to be level 3 or higher to give a simple heart to a post!"
          : "You have reached your daily reaction limit.",
      });
      return;
    }

    const updatedSimpleLikes = [...(post?.simpleLikedBy || []), user.id];

    try {
      await new Promise<void>((resolve, reject) => {
        simpleLikePost(
          {
            postId: id,
            simpleLikesArray: updatedSimpleLikes,
            userId: user.id,
            isPoll: false,
          },
          {
            onSuccess: () => {
              setIsSimpleLiked(true);
              resolve();
            },
            onError: (error) => reject(error),
          }
        );
      });

      await incrementSimpleLikesToday(user.id).then((updatedUser) => {
        setUser({
          ...user,
          simpleLikesToday: updatedUser.simpleLikesToday,
          lastLikeReset: updatedUser.lastLikeReset,
        });
      });

      if (!post?.isAnonymous && postCreatorId) {
        await updateUserLevelAndPoints(
          postCreatorId,
          UserAction.POST_HEART_RECEIVED
        );
      }

      toast({ title: "Post simple hearted successfully!" });
    } catch (error: any) {
      console.error("Error simple hearting post:", error);
      toast({
        title: `Failed to simple heart post: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

const handleLockComments = async () => {
  if (!id) {
    toast({ description: "Post ID is missing." });
    return;
  }

  lockPostComments(
    { postId: id, duration: "permanent", lockedBy: user.id },
    {
      onSuccess: async () => {  // <-- make this async
        toast({
          description: `Comments locked permanently. -100 Point`,
        });

        try {
          await updateUserLevelAndPoints(postCreatorId, UserAction.LOCK_POST);
          
        } catch (error) {
          console.error("Error updating user level and points:", error);
          toast({
            description: `Failed to update user points.`,
            variant: "destructive",
          });
        }

        queryClient.invalidateQueries(["postById", id]);
      },
      onError: (error) => {
        console.error("Error locking comments:", error);
        toast({
          description: "Failed to lock comments.",
          variant: "destructive",
        });
      },
    }
  );

  setIsLockModalOpen(false);
};


  const handleUnlockComments = () => {
    if (!id) {
      toast({ description: "Post ID is missing." });
      return;
    }
    unlockPostComments(
      { postId: id, groupId: groupId },
      {
        onSuccess: () => {
          toast({ description: "Comments unlocked successfully." });
          queryClient.invalidateQueries(["postById", id]);
        },
        onError: (error) => {
          console.error("Error unlocking comments:", error);
          toast({
            description: "Failed to unlock comments.",
            variant: "destructive",
          });
        },
      }
    );
  };

  // Compute displayCategoryName
  const displayCategoryName = useMemo(() => {
    return post?.categoryName || categoryName || "Uncategorized";
  }, [post?.categoryName, categoryName, categoryId]);


  // Determine if RelatedPostsSidebar should be rendered
  const shouldShowSidebar = !post?.isAnonymous && displayCreatorId && displayCreatorId !== "unknown" && (isRelatedPostsLoading || relatedPosts?.length > 0);

  if (isPostLoading) return <Loader />;

  if (!post)
    return <p className="text-center py-4 text-light-2">Post not found</p>;

  if (groupId) {
    if (isGroupLoading) return <Loader />;

    if (!group)
      return <p className="text-center py-4 text-light-2">Group not found</p>;

    const isMember =
      group.memberIds.includes(user.id) ||
      group.admins.includes(user.id) ||
      group.creatorId === user.id;

    if (!isMember) {
      return (
        <GroupContentAccessDenied
          groupId={groupId}
          groupName={post.groupName}
          contentType="post"
        />
      );
    }
  }

  return (
    <div className="w-full post_details-container mt-8">
      <div className="flex">
        {shouldShowSidebar && (
          <div className="hidden xl:block w-80 flex-shrink-0 border border-primary-500/10 transition-all duration-500 hover:border-primary-500/20">
            <RelatedPostsSidebar
              creatorId={displayCreatorId || ""}
              currentPostId={id || ""}
              isAnonymous={post?.isAnonymous || false}
            />
          </div>
        )}
        {/* Main Content */}
        <div
          className={`${shouldShowSidebar ? "flex-1" : "w-full"} px-4 md:px-8`}
        >
          <div className="max-w-5xl mx-auto">
            <div className="block md:hidden w-full mb-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-light-3 hover:text-light-1 transition-colors duration-200"
              >
                <img
                  src="/assets/icons/back.svg"
                  alt="back"
                  width={24}
                  height={24}
                />
                <p className="small-medium lg:base-medium">Back</p>
              </button>
            </div>

            {isPostLoading || !post ? (
              <Loader />
            ) : (
              <>
                {groupId && (
                  <div className="mb-4 bg-dark-4 p-2 rounded-full shadow-sm hover:shadow-md flex justify-center w-full md:w-[1020px] mx-auto border border-primary-500/10 transition-all duration-500 hover:border-primary-500/20">
                    {isGroupLoading ? (
                      <p>Loading group...</p>
                    ) : group ? (
                      <Link
                        to={`/groups/${groupId}`}
                        className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-yellow-500 bg-clip-text text-transparent hover:underline"
                      >
                        {group.name}
                      </Link>
                    ) : (
                      <p>No group associated with this post.</p>
                    )}
                  </div>
                )}
                <div className="post_details-card relative w-full md:w-[1020px] mx-auto">
                  {post.isDraft && (
                    <div className="bg-blue-500/20 text-blue-400 px-6 py-3 border-b border-primary-500/10 transition-all duration-500 hover:border-primary-500/20">
                      <p className="text-sm font-semibold">
                        Draft Mode - Preview
                      </p>
                    </div>
                  )}

                  {post?.imageUrl ? (
                    <div className="flex flex-col xl:flex-row">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mx-2 md:mx-4 mt-4 mb-2 px-3">
                          <div className="flex items-center gap-3">
                            <CreatorInfo
                              creator={creatorData}
                              isAnonymous={post.isAnonymous}
                              gender={
                                post?.isAnonymous
                                  ? post.gender
                                  : creatorData?.gender || null
                              }
                              level={creatorLevel}
                              formattedDate={formattedDate}
                              location={post.location}
                            />
                          </div>
                        </div>

                        <div className="mx-2 md:mx-4">
                          <div className="overflow-hidden rounded-lg">
                            <div className="mx-2 md:mx-4">
                              <div className="w-full max-w-[300px] aspect-square overflow-hidden rounded-lg">
                                <img
                                  src={post?.imageUrl}
                                  alt="post"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {(displayCategoryName || post?.subCategory) && (
                          <div
                            className={`post-category-display text-silver rounded-full px-2 py-1 mx-2 md:mx-2 ${
                              groupId ? "" : "cursor-pointer"
                            }`}
                            onClick={
                              groupId
                                ? () =>
                                    console.log(
                                      `PostDetails: Category click disabled in group context for post ${post.$id}`
                                    )
                                : () => {
                                    navigate("/", {
                                      state: {
                                        categoryId: post.categoryId,
                                        subCategory: post.subCategory || null,
                                      },
                                    });
                                  }
                            }
                          >
                            <span
                              className={`text-xs md:text-xs font-bold tracking-wide ${
                                groupId ? "" : "hover:underline"
                              }`}
                            >
                              {displayCategoryName}
                              {post?.subCategory && (
                                <span
                                  className={`text-silver ${
                                    groupId ? "" : "hover:underline"
                                  }`}
                                >
                                  {" / "}
                                  {post.subCategory}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {!post?.isDraft && (
                          <div className="flex justify-between items-center px-2 mx-2 md:mx-4 mb-2">
                            <PostStats
                              post={post}
                              userId={user.id}
                              disabled={isCommentsLocked}
                            />
                          </div>
                        )}
                      </div>

                      <div className="post_details-info increased-height px-3 md:px-4">
                        <div className="spacer mt-9"></div>

                        <h1 className="font-bold text-base md:text-lg lg:text-2xl mb-2 text-light-1">
                          {post?.title || "No Title Available"}
                        </h1>

                        <hr className="border w-full border-primary-500/10 transition-all duration-500 hover:border-primary-500/20" />

                        <div className="flex flex-col flex-1 w-full small-medium lg:base-regular mt-2">
                          <div>
                            <DescriptionViewer
                              description={post?.description || ""}
                              maxLength={500}
                              createdAt={post.$createdAt || ""}
                            />
                          </div>

                          <ul className="flex flex-wrap gap-1 md:gap-2 mt-2">
                            {post?.tags.map((tag: string, index: number) => (
                              <li
                                key={`${tag}${index}`}
                                className="text-light-3 text-xs md:small-regular bg-dark-3 px-2 py-1 rounded-lg cursor-pointer hover:underline"
                                onClick={() =>
                                  navigate(`/?tag=${encodeURIComponent(tag)}`)
                                }
                              >
                                #{tag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col px-3 md:px-4 py-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <CreatorInfo
                            creator={creatorData}
                            isAnonymous={post.isAnonymous}
                            gender={
                              post?.isAnonymous
                                ? post.gender
                                : creatorData?.gender || null
                            }
                            level={creatorLevel}
                            formattedDate={formattedDate}
                            location={post.location}
                          />
                        </div>
                      </div>

                      <h1 className="font-bold text-base md:text-lg lg:text-2xl mb-2 text-light-1">
                        {post?.title || "No Title Available"}
                      </h1>

                      <hr className="border w-full border-primary-500/10 transition-all duration-500 hover:border-primary-500/20 mb-2" />

                      {post?.description && (
                        <div className="mb-4">
                          <DescriptionViewer
                            description={post.description}
                            maxLength={900}
                            createdAt={post.$createdAt || ""}
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {(displayCategoryName || post?.subCategory) && (
                          <div
                            className={`post-category-display text-silver rounded-full px-2 py-1 ${
                              groupId ? "" : "cursor-pointer"
                            }`}
                            onClick={
                              groupId
                                ? () =>
                                    console.log(
                                      `PostDetails: Category click disabled in group context for post ${post.$id}`
                                    )
                                : () => {
                                    navigate("/", {
                                      state: {
                                        categoryId: post.categoryId,
                                        subCategory: post.subCategory || null,
                                      },
                                    });
                                  }
                            }
                          >
                            <span
                              className={`text-xs md:text-xs font-bold tracking-wide ${
                                groupId ? "" : "hover:underline"
                              }`}
                            >
                              {displayCategoryName}
                              {post?.subCategory && (
                                <span
                                  className={`text-silver ${
                                    groupId ? "" : "hover:underline"
                                  }`}
                                >
                                  {" / "}
                                  {post.subCategory}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        <ul className="flex flex-wrap gap-1 md:gap-2 mt-2">
                          {post?.tags.map((tag: string, index: number) => (
                            <li
                              key={`${tag}${index}`}
                              className="text-light-3 text-xs md:small-regular bg-dark-3 px-2 py-1 rounded-lg cursor-pointer hover:underline"
                              onClick={() =>
                                navigate(`/?tag=${encodeURIComponent(tag)}`)
                              }
                            >
                              #{tag}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {!post?.isDraft && (
                        <div className="flex justify-between items-center mb-4">
                          <PostStats
                            post={post}
                            userId={user.id}
                            disabled={isCommentsLocked}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {!post?.isDraft && (
                    <div className="absolute top-2 right-3 z-30 flex items-center gap-2">
                      {isOwner && isWithinEditWindow && (
                        <Link to={`/update-post/${post.$id}`}>
                          <img
                            src="/assets/icons/edit.svg"
                            alt="edit"
                            width={24}
                            height={24}
                          />
                        </Link>
                      )}
                      {isOwner && isWithinEditWindow && (
                        <button
                          onClick={handleDeletePost}
                          disabled={isDeleting}
                        >
                          <img
                            src="/assets/icons/delete.svg"
                            alt="delete"
                            width={24}
                            height={24}
                          />
                        </button>
                      )}
                      <LockCommentsButton
                        isLocked={isCommentsLocked}
                        canUnlock={canUnlockComments}
                        handleLockOpen={() => setIsLockModalOpen(true)}
                        handleUnlock={handleUnlockComments}
                        canLock={canLock}
                      />
                      <ReactionButtons
                        canGreat={false}
                        isGreat={false}
                        handleGreat={() => {}}
                        greatCount={0}
                        canLike={canLike}
                        isLiked={isLiked}
                        handleLike={handleLikePost}
                        likeCount={post.likedBy?.length || 0}
                        canSuperLike={canSuperLike}
                        isSuperLiked={isSuperLiked}
                        handleSuperLike={handleSuperLikePost}
                        superLikeCount={post.superLikeCount || 0}
                        canSimpleLike={canSimpleLike}
                        isSimpleLiked={isSimpleLiked}
                        handleSimpleLike={handleSimpleLikePost}
                        simpleLikeCount={post.simpleLikeCount || 0}
                      />
                      <GreatButton item={post} showCount={true} />
                    </div>
                  )}
                  {post.isDraft && isOwner && (
                    <DraftControls
                      isDeleting={isDeleting}
                      handleDelete={handleDeletePost}
                      isPublishing={isPublishing}
                      handlePublish={handlePublishPost}
                      handleEdit={() => navigate(`/update-post/${post.$id}`)}
                    />
                  )}
                  <LockCommentsModal
                    isOpen={isLockModalOpen}
                    onClose={() => setIsLockModalOpen(false)}
                    onConfirm={handleLockComments}
                  />
                </div>

                {!post?.isDraft && (
                  <div className="bg-dark-2 rounded-xl shadow-xl p-6 w-full md:w-[1020px] mx-auto mt-10 relative z-10">
                    <h3 className="text-xl font-bold text-light-1 mb-6 pb-2 border-b border-primary-500/10 transition-all duration-500 hover:border-primary-500/20">
                      All Comments
                    </h3>
                    {isCommentsLocked && (
                      <p className="text-light-3 text-sm mb-6">
                        Comments are currently locked
                        {post.lockExpiry
                          ? ` until ${new Date(
                              post.lockExpiry
                            ).toLocaleString()}`
                          : " permanently"}
                        .
                      </p>
                    )}
                    {!isCommentsLocked && (
                      <div
                        ref={commentFormRef}
                        className="border-b border-primary-500/10 transition-all duration-500 hover:border-primary-500/20 pb-6 mb-6"
                      >
                        <CommentForm
                          id={id || ""}
                          disabled={isCommentsLocked}
                        />
                      </div>
                    )}
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <CommentList
                        id={id || ""}
                        postCreatorId={postCreatorId || ""}
                        currentUserId={user?.id || ""}
                        isPostAnonymous={post?.isAnonymous || false}
                      />
                    </div>
                  </div>
                )}
                <StickyHeader
                  isVisible={isStickyHeaderVisible}
                  title={post?.title || "No Title Available"}
                  isCommentsLocked={isCommentsLocked}
                  commentFormRef={commentFormRef}
                  hasSidebar={shouldShowSidebar}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetails;