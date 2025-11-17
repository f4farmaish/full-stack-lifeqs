import React from "react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { checkIsLiked } from "@/lib/utils";
import { CommentHeaderProps } from "@/types";
import { Link } from "react-router-dom";
import { AnonymousNumberManager } from "@/lib/anonymousUtils";


const CommentHeader: React.FC<CommentHeaderProps> = React.memo(({
  comment,
  user,
  likes,
  onLike,
  onFetchLikedUsers,
  onReply,
  disabled,
  handleDeleteComment,
  handleLockComment,
  handleUnlockComment,
  setEditMode,
  setUpdatedContent,
  withinFiveMin,
  hasBestFlair,
  isPostAnonymous = false,
  postCreatorId,
  postId,
}) => {
  // Check if the commenter is the post creator and the post is anonymous
  const isPostCreatorInAnonymousPost = isPostAnonymous && comment.userIdString === postCreatorId;

  // Generate anonymous user number for display
  const getAnonymousDisplayName = (comment: any) => {
    if (comment.isAnonymous && postId) {
      return AnonymousNumberManager.getAnonymousDisplayName(postId, comment.userIdString);
    }
    return comment.userName;
  };

  return (
    <div className="flex items-center gap-2">
      <img
        src={
          comment.isAnonymous || isPostCreatorInAnonymousPost
            ? "/assets/icons/profile-placeholder.svg"
            : comment.userImageUrl
        }
        alt={comment.isAnonymous ? "Anonymous" : isPostCreatorInAnonymousPost ? "Asker" : comment.userName}
        className="w-8 h-8 rounded-full border border-light-4"
      />

      <div>
        <div className="flex items-center gap-2">
          {comment.isAnonymous ? (
            <p className={`text-sm font-medium ${hasBestFlair ? "text-amber-300" : "text-light-1"}`}>
              {getAnonymousDisplayName(comment)}
            </p>
          ) : isPostCreatorInAnonymousPost ? (
            <p className={`text-sm font-medium ${hasBestFlair ? "text-amber-300" : "text-light-1"}`}>
              Asker
            </p>
          ) : (
            <Link
              to={`/profile/${comment.userIdString}`}
              className={`text-sm font-medium ${hasBestFlair ? "text-amber-300" : "text-light-1"} hover:underline`}
            >
              {comment.userName}
            </Link>
          )}
          <div className="flex gap-2 items-center">
            <img
              src={`${
                checkIsLiked(likes[comment.$id] || [], user.id)
                  ? "/assets/icons/liked.svg"
                  : "/assets/icons/like.svg"
              }`}
              alt="like"
              width={15}
              height={15}
              onClick={comment.isLocked ? undefined : () => onLike(comment.$id)}
              className={comment.isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-110 transition-transform duration-200"}
            />
            <p
              className="text-[10px] lg:text-xs cursor-pointer hover:underline text-light-3"
              onClick={() => onFetchLikedUsers(comment.$id)}>
              {likes[comment.$id]?.length || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-light-3">
              {isValid(parseISO(comment.$createdAt))
                ? formatDistanceToNow(new Date(comment.$createdAt), {
                    addSuffix: true,
                  })
                : "Invalid date"}
            </p>
            {comment.isLocked && (
              <span className="text-xs text-light-4 flex items-center gap-1">
                🔒 Locked
              </span>
            )}
          </div>
          {comment.userIdString === user.id && !comment.isLocked && (
            <div className="flex gap-2">
              {withinFiveMin && (
                <>
                  <button
                    onClick={() => {
                      setEditMode(comment.$id);
                      setUpdatedContent(comment.content);
                    }}
                    className="text-xs text-bleu-1 hover:text-bleu-1/80 transition-colors duration-200">
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteComment}
                    className="text-xs text-bleu-1 hover:text-bleu-1/80 transition-colors duration-200">
                    Delete
                  </button>
                </>
              )}
              {!withinFiveMin && (
                <button
                  onClick={handleLockComment}
                  className="text-xs text-bleu-1 hover:text-bleu-1/80 transition-colors duration-200">
                  <img
                src="/assets/icons/lock.svg"
                alt="lock"
                width={12}
                height={12}
                className="text-white"
              />
                </button>

              )}
            </div>
          )}
          {/* Post owner can lock other people's comments */}
          {postCreatorId === user.id && comment.userIdString !== user.id && !comment.isLocked && (
            <button
              onClick={handleLockComment}
              className="text-xs text-red hover:text-red/80 transition-colors duration-200">
              Lock
            </button>
          )}
          {!disabled &&
            !comment.isLocked &&
            comment.userIdString !== user.id && (
              <button
                onClick={() => onReply(comment.$id)}
                className="text-xs text-bleu-1 hover:text-bleu-1/80 transition-colors duration-200">
                Reply
              </button>
            )}
          {/* Only the person who locked the comment can unlock it */}
          {comment.lockedBy === user.id && comment.isLocked && (
            <button
              onClick={handleUnlockComment}
              className="text-xs text-bleu-1 hover:text-bleu-1/80 transition-colors duration-200">
                            <img
                src="/assets/icons/unlock.svg"
                alt="unlock"
                width={12}
                height={12}
                className="text-white"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default CommentHeader;