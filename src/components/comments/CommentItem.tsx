import { FC, useState, useEffect, useMemo } from "react";
import { Models } from "appwrite";
import { isValid } from "date-fns";
import {
  useDeleteComment,
  useGetUsersByIds,
  useLockComment,
  useUnlockComment,
  useGetReactionsByCommentId,
  useReactToComment,
  useIsBlocked
} from "@/lib/react-query/queries";
import { UserAction } from "@/lib/pointsMapping";
import {
  updateUserLevelAndPoints,
  incrementGreatCommentNumber,
} from "@/services/userService";
import { useToast } from "@/components/ui/use-toast";
import { toggleBestFlair } from "@/services/commentService";
import { client, appwriteConfig } from "@/lib/appwrite/config";
import { useQueryClient } from "@tanstack/react-query";
import { IComment, IReaction, UserDetails } from "@/types";
import CommentForm from "./CommentForm";
import ReplyList from "./ReplyList";
import ReactionPicker from "./ReactionPicker";
import BestFlair from "./BestFlair";
import CommentHeader from "./CommentHeader";
import CommentContent from "./CommentContent";
import ReactionCounts from "./ReactionCounts";
import ReactionModal from "./ReactionModal";
import { Link } from "react-router-dom";
import ImageGalleryModal from "../messages/ImageGalleryModal";
import parse from "html-react-parser";

interface CommentItemProps {
  comment: IComment;
  user: UserDetails;
  likes: Record<string, string[]>;
  isPoll: boolean;
  onLike: (commentId: string) => void;
  onAddSpecialReaction?: (commentId: string, reaction: string) => void;
  specialReactions?: string[];
  onReply: (commentId: string | null) => void;
  replyToCommentId: string | null;
  onFetchLikedUsers: (commentId: string) => void;
  likedUsers: Models.Document[];
  showLikeModal: boolean;
  setShowLikeModal: (v: boolean) => void;
  selectedCommentId: string | null;
  editMode: string | null;
  setEditMode: (id: string | null) => void;
  updatedContent: string;
  setUpdatedContent: (content: string) => void;
  onAddEdit: (id: string, isReply?: boolean) => void;
  showReplies: Record<string, number>;
  setRepliesToShow: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  postCreatorId?: string;
  currentUserId?: string;
  onToggleBestFlair?: () => void;
  disabled?: boolean;
  isPostAnonymous?: boolean;
  postId?: string;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CommentItem: FC<CommentItemProps> = ({
  comment,
  user,
  likes,
  isPoll,
  onLike,
  onAddSpecialReaction,
  specialReactions = ["😢", "😂", "🔥", "🎉", "🙏"],
  onReply,
  replyToCommentId,
  onFetchLikedUsers,
  editMode,
  setEditMode,
  updatedContent,
  setUpdatedContent,
  onAddEdit,
  showReplies,
  setRepliesToShow,
  disabled = false,
  postCreatorId,
  currentUserId,
  onToggleBestFlair,
  isPostAnonymous = false,
  postId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: lockComment } = useLockComment();
  const { mutate: unlockComment } = useUnlockComment();

  // Check if the comment creator is blocked
  const { data: isCommentCreatorBlocked } = useIsBlocked(
    currentUserId || "",
    comment.userIdString || ""
  );

  const lastComment =
    comment.edits && comment.edits.length > 0
      ? JSON.parse(comment.edits[comment.edits.length - 1])
      : { content: comment.content };

  const replies = comment.replies || [];
  const sortedReplies = (replies as IComment[]).sort(
    (a: IComment, b: IComment) =>
      new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
  );

  const repliesCount = sortedReplies.length;
  const repliesToShowCount = showReplies[comment.$id] || 2;
  const visibleReplies = sortedReplies.slice(0, repliesToShowCount);

  const userLevel = user.level || 0;

  const canUseSpecialReactions =
    userLevel >= 4 ||
    (user.isReaction &&
      user.expirationDateIsReaction &&
      isValid(new Date(user.expirationDateIsReaction)) &&
      new Date(user.expirationDateIsReaction) > new Date());

  const isPostCreator = currentUserId === postCreatorId;
  const hasBestFlair = comment.hasBestFlair || false;

  const { data: reactions = [] } = useGetReactionsByCommentId(comment.$id);
  const { mutate: reactToCommentMutate } = useReactToComment();

  const reactionCounts = useMemo(
    () =>
      reactions.reduce(
        (acc: Record<string, number>, r: IReaction) => {
          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
          return acc;
        },
        {}
      ),
    [reactions]
  );

  const userReactionEmoji = useMemo(
    () =>
      currentUserId
        ? reactions.find((r: IReaction) => r.userId === currentUserId)?.emoji || null
        : null,
    [reactions, currentUserId]
  );

  const [showPicker, setShowPicker] = useState(false);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const userIdsForSelectedEmoji = useMemo(
    () =>
      selectedEmoji && showReactionModal
        ? reactions.filter((r: IReaction) => r.emoji === selectedEmoji).map((r) => r.userId)
        : [],
    [selectedEmoji, showReactionModal, reactions]
  );

  const { data: reactionUsers = [] } = useGetUsersByIds(userIdsForSelectedEmoji);

  const { data: mentionedUsers = [] } = useGetUsersByIds(
    comment.mentionedUserIds || []
  );

  useEffect(() => {
    if (!comment.$id) return;

    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.reactionsCollectionId}.documents`,
      (response) => {
        const doc = response.payload as IReaction;
        if (doc && doc.commentId === comment.$id) {
          queryClient.invalidateQueries({ queryKey: ["reactions", comment.$id] });
        }
      }
    );

    return () => unsubscribe();
  }, [comment.$id, queryClient]);

  const renderContentWithMentions = (content: string) => {
    // Parse HTML content using html-react-parser
    return parse(content, {
      replace: (domNode) => {
        if (domNode.type === "text") {
          const text = domNode.data as string;
          const elements: React.ReactNode[] = [];
          let lastIndex = 0;

          const mentionedNames = mentionedUsers.map((u) => escapeRegExp(u.name));
          const mentionPattern = new RegExp(`@(${mentionedNames.join("|")})`, "g");

          let match;
          while ((match = mentionPattern.exec(text)) !== null) {
            const startIndex = match.index;
            const endIndex = startIndex + match[0].length;

            if (startIndex > lastIndex) {
              elements.push(text.slice(lastIndex, startIndex));
            }

            const mentionedName = match[1];
            const user = mentionedUsers.find((u) => u.name === mentionedName);
            if (user) {
              elements.push(
                <Link
                  key={`mention-${startIndex}`}
                  to={`/profile/${user.$id}`}
                  className="text-bleu-1 hover:underline"
                >
                  @{user.name}
                </Link>
              );
            } else {
              elements.push(match[0]);
            }

            lastIndex = endIndex;
          }

          if (lastIndex < text.length) {
            elements.push(text.slice(lastIndex));
          }

          return <>{elements}</>;
        }
        return undefined; // Let other nodes pass through unchanged
      },
    });
  };

  const handleDeleteComment = async () => {
    if (!comment.$id) {
      console.error("Comment id is missing. Unable to delete the Comment.");
      return;
    }

    const confirmation = window.confirm(
      "Are you sure you want to delete your Comment?"
    );
    if (!confirmation) {
      return;
    }

    const pointsWarning = window.confirm(
      "Warning: You will lose 10 Qpoints for deleting this comment. Do you want to continue?"
    );
    if (!pointsWarning) {
      return;
    }

    try {
      await deleteComment(comment.$id);
      await updateUserLevelAndPoints(
        comment?.userIdString,
        UserAction.DELETE_COMMENT
      );
      queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
      toast({
        title:
          "Sorry, -50 points have been deducted because you deleted your comment",
      });
    } catch (error: unknown) {
      console.error("Error deleting the comment:", error);
    }
  };

  const handleLockComment = () => {
    // Add validation before attempting to lock
    if (!comment.$id) {
      console.error("Comment ID is missing. Cannot lock comment.", comment);
      toast({ title: "Error: Comment ID is missing.", variant: "destructive" });
      return;
    }

    if (!comment.postIdString) {
      console.error("Post ID is missing. Cannot lock comment.", comment);
      toast({ title: "Error: Post ID is missing.", variant: "destructive" });
      return;
    }

    console.log("Attempting to lock comment:", {
      commentId: comment.$id,
      postId: comment.postIdString,
      isPoll: isPoll
    });
    lockComment(
      {
        commentId: comment.$id,
        postId: comment.postIdString,
        isPoll: isPoll,
      },
      {

        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
          toast({ title: "-25 point : Comment locked. No more replies allowed." });

            try {
                
                await updateUserLevelAndPoints(
                  comment?.userIdString,
                  UserAction.COMMENT_LOCK
                );
                queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
              } catch (error: unknown) {
                console.error("Error locked the comment:", error);
              }
        },
        onError: (error: unknown) => {
          console.error("Error locking comment:", error);
          toast({ title: "Failed to lock comment.", variant: "destructive" });
        },
      }
    );
  };

  const handleUnlockComment = () => {
    // Add validation before attempting to unlock
    if (!comment.$id) {
      console.error("Comment ID is missing. Cannot unlock comment.", comment);
      toast({ title: "Error: Comment ID is missing.", variant: "destructive" });
      return;
    }

    console.log("Attempting to unlock comment:", {
      commentId: comment.$id
    });

    unlockComment({ commentId: comment.$id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
        toast({ title: "Comment unlocked. Replies are now allowed." });
      },
      onError: (error: unknown) => {
        console.error("Error unlocking comment:", error);
        toast({ title: "Failed to unlock comment.", variant: "destructive" });
      },
    });
  };

  const handleToggleBestFlair = async (commentId: string) => {
    if (!postCreatorId) {
      toast({
        title: "Error",
        description: "Post creator ID is missing.",
        variant: "destructive",
      });
      return;
    }

    try {
      await toggleBestFlair(commentId, postCreatorId);
      if (!hasBestFlair) {
        await incrementGreatCommentNumber(comment.userIdString);
        await updateUserLevelAndPoints(
          comment?.userIdString,
          UserAction.BEST_COMMENT_FLAIR
        );
      }

      // Invalidate notifications cache for the comment author to show the new notification
      if (comment.userIdString) {
        queryClient.invalidateQueries(["notifications", comment.userIdString]);
      }

      if (onToggleBestFlair) {
        await onToggleBestFlair();
      }
      toast({
        title: "Success",
        description: `Best flair ${hasBestFlair ? "removed" : "added"} successfully`,
      });
    } catch (error) {
      console.error("Error toggling best flair:", error);
      toast({
        title: "Error",
        description: "Failed to toggle best flair",
        variant: "destructive",
      });
    }
  };

  const handleReaction = (reaction: string) => {
    if (!canUseSpecialReactions || !currentUserId) {
      toast({
        title: "Error",
        description: "You are not authorized to add reactions",
        variant: "destructive",
      });
      return;
    }

    const targetEmoji = userReactionEmoji === reaction ? null : reaction;
    reactToCommentMutate(
      { commentId: comment.$id, userId: currentUserId, emoji: targetEmoji },
      {
        onSuccess: () => {
          if (targetEmoji && onAddSpecialReaction) {
            onAddSpecialReaction(comment.$id, targetEmoji);
          }
        },
        onError: (error) => {
          console.error("Error handling reaction:", error);
          toast({
            title: "Error",
            description: "Failed to update reaction",
            variant: "destructive",
          });
        },
      }
    );
  };

  const commentCreationTime = new Date(comment.$createdAt).getTime();
  const currentTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const withinFiveMin = currentTime - commentCreationTime < fiveMinutes;

  return (
    <div className="relative">
      <ReactionPicker
        canUseSpecialReactions={canUseSpecialReactions}
        specialReactions={specialReactions}
        userReactionEmoji={userReactionEmoji}
        handleReaction={handleReaction}
        showPicker={showPicker}
        setShowPicker={setShowPicker}
      />
      <div
        className={`ml-8 flex flex-col gap-2 p-4 rounded-md ${
          hasBestFlair
            ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-dark-2 dark:to-amber-900/20 border border-amber-400 dark:border-amber-500/30"
            : "bg-dark-2 border border-dark-4"
        } ${comment.isLocked ? "opacity-40" : ""}`}
      >
        <BestFlair
          hasBestFlair={hasBestFlair}
          isPostCreator={isPostCreator}
          commentUserId={comment.userIdString}
          currentUserId={currentUserId}
          handleToggleBestFlair={handleToggleBestFlair}
          commentId={comment.$id}
        />
        <CommentHeader
          comment={comment}
          user={user}
          likes={likes}
          onLike={onLike}
          onFetchLikedUsers={onFetchLikedUsers}
          onReply={onReply}
          disabled={disabled}
          handleDeleteComment={handleDeleteComment}
          handleLockComment={handleLockComment}
          handleUnlockComment={handleUnlockComment}
          setEditMode={setEditMode}
          setUpdatedContent={setUpdatedContent}
          withinFiveMin={withinFiveMin}
          hasBestFlair={hasBestFlair}
          isPostAnonymous={isPostAnonymous}
          postCreatorId={postCreatorId}
          postId={postId}
          isCommentCreatorBlocked={isCommentCreatorBlocked}
        />
        <CommentContent
          editMode={editMode}
          commentId={comment.$id}
          updatedContent={updatedContent}
          setUpdatedContent={setUpdatedContent}
          onAddEdit={onAddEdit}
          setEditMode={setEditMode}
          hasBestFlair={hasBestFlair}
          renderContentWithMentions={renderContentWithMentions}
          content={lastComment.content}
          isCommentCreatorBlocked={isCommentCreatorBlocked}
          comment={comment}
        />
        {comment.imageUrls && comment.imageUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {comment.imageUrls.map((url: string, index: number) => (
              <img
                key={index}
                src={url}
                alt={`Comment image ${index + 1}`}
                className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setSelectedImageIndex(index);
                  setShowImageModal(true);
                }}
              />
            ))}
          </div>
        )}
        <ReactionCounts
          reactionCounts={reactionCounts}
          setSelectedEmoji={setSelectedEmoji}
          setShowReactionModal={setShowReactionModal}
        />
        {!comment.isLocked && replyToCommentId === comment.$id && (
          <CommentForm
            id={comment.postIdString}
            isPoll={isPoll}
            parentCommentId={comment.$id}
            onReplySuccess={() => onReply(null)}
            disabled={disabled}
            parentUserName={comment.isAnonymous ? "Anonymous" : comment.userName}
            parentUserId={comment.userIdString}
          />
        )}
        {!comment.isLocked && repliesCount > 0 && (
          <ReplyList
            replies={visibleReplies}
            user={user}
            editMode={editMode}
            setEditMode={setEditMode}
            updatedContent={updatedContent}
            setUpdatedContent={setUpdatedContent}
            onAddEdit={onAddEdit}
            showReplies={showReplies}
            setRepliesToShow={setRepliesToShow}
            commentId={comment.$id}
            totalReplies={repliesCount}
            likes={likes}
            onLike={onLike}
            onFetchLikedUsers={onFetchLikedUsers}
            disabled={disabled}
            onReply={onReply}
            replyToCommentId={replyToCommentId}
            parentIsLocked={comment.isLocked}
            isPostAnonymous={isPostAnonymous}
            postCreatorId={postCreatorId}
            postId={postId}
          />
        )}
        {comment.isLocked && repliesCount > 0 && (
          <div className="mt-2 p-2 text-xs text-light-4 italic border border-dark-4 rounded">
            This comment is locked. {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'} hidden.
          </div>
        )}
        <ReactionModal
          showReactionModal={showReactionModal}
          setShowReactionModal={setShowReactionModal}
          selectedEmoji={selectedEmoji}
          reactionUsers={reactionUsers as UserDetails[]}
        />
        {showImageModal && (
          <ImageGalleryModal
            images={comment.imageUrls}
            selectedIndex={selectedImageIndex}
            onClose={() => {
              setShowImageModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CommentItem;