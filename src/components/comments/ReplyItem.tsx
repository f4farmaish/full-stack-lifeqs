import React, { useState, useMemo } from "react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { Link } from "react-router-dom";
import { checkIsLiked } from "@/lib/utils";
import { useDeleteComment, useGetUsersByIds, useLockComment, useUnlockComment, useIsBlocked } from "@/lib/react-query/queries";
import { UserAction } from "@/lib/pointsMapping";
import { updateUserLevelAndPoints } from "@/services/userService";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import CommentForm from "./CommentForm";
import { IComment, UserDetails } from "@/types";
import { escapeRegExp } from "@/lib/utils";
import parse from "html-react-parser";
import { AnonymousNumberManager } from "@/lib/anonymousUtils";

interface ReplyItemProps {
  reply: IComment;
  user: UserDetails;
  editMode: string | null;
  setEditMode: (id: string | null) => void;
  updatedContent: string;
  setUpdatedContent: (value: string) => void;
  onAddEdit: (id: string, isReply?: boolean) => void;
  disabled?: boolean;
  onReply?: (id: string | null) => void;
  replyToCommentId?: string | null;
  showReplies: Record<string, number>;
  setRepliesToShow: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  parentIsLocked: boolean;
  isPostAnonymous?: boolean;
  postCreatorId?: string;
  postId?: string;
}

const ReplyItem: React.FC<ReplyItemProps> = ({
  reply,
  user,
  editMode,
  setEditMode,
  updatedContent,
  setUpdatedContent,
  onAddEdit,
  disabled = false,
  onReply,
  replyToCommentId,
  showReplies,
  setRepliesToShow,
  parentIsLocked,
  isPostAnonymous = false,
  postCreatorId,
  postId,
}) => {
  // Check if the reply author is the post creator and the post is anonymous
  const isPostCreatorInAnonymousPost = isPostAnonymous && reply.userIdString === postCreatorId;

  // Generate anonymous user number for display
  const getAnonymousDisplayName = (reply: any) => {
    if (reply.isAnonymous && postId) {
      return AnonymousNumberManager.getAnonymousDisplayName(postId, reply.userIdString);
    }
    return reply.userName;
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if the reply creator is blocked
  const { data: isReplyCreatorBlocked } = useIsBlocked(
    user?.id || "",
    reply.userIdString || ""
  );

  const lastReply =
    reply.edits && reply.edits.length > 0
      ? JSON.parse(reply.edits[reply.edits.length - 1])
      : { content: reply.content };
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: lockComment } = useLockComment();
  const { mutate: unlockComment } = useUnlockComment();

  // Fetch mentioned users
  const { data: mentionedUsers = [] } = useGetUsersByIds(
    reply.mentionedUserIds || []
  );

  // Define long content as >500 characters (approx 5 lines at ~100 chars/line)
  const MAX_CHARS = 500;
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = useMemo(() => reply.content.length > MAX_CHARS, [reply.content]);

  const truncatedContent = useMemo(() => {
    if (!isLong) return reply.content;
    const truncated = reply.content.slice(0, MAX_CHARS);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  }, [reply.content, isLong]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  // Parse reply content for mentions and HTML
  const renderContentWithMentions = (content: string) => {
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
                  className="text-blue-500 hover:underline"
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

  const handleDeleteReply = async () => {
    if (!reply.$id) {
      console.error("Reply id is missing. Unable to delete the reply.");
      return;
    }

    const confirmation = window.confirm(
      "Are you sure you want to delete your reply?"
    );
    if (!confirmation) {
      return;
    }

    const pointsWarning = window.confirm(
      "Warning: You will lose 5 Qpoints for deleting this reply. Do you want to continue?"
    );
    if (!pointsWarning) {
      return;
    }

    try {
      await deleteComment(reply.$id);
      await updateUserLevelAndPoints(
        reply?.userIdString,
        UserAction.DELETE_REPLY
      );
      queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
      toast({
        title:
          "Sorry, -50 points have been deducted because you deleted your reply",
      });
    } catch (error: unknown) {
      console.error("Error deleting the reply:", error);
    }
  };

  const handleLockReply = () => {
    lockComment({ commentId: reply.$id, postId: reply.postIdString, isPoll: reply.isPoll }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
        toast({ title: "Reply locked. No more replies allowed." });
      },
      onError: (error: unknown) => {
        console.error("Error locking reply:", error);
        toast({ title: "Failed to lock reply.", variant: "destructive" });
      },
    });
  };

  const handleUnlockReply = () => {
    unlockComment({ commentId: reply.$id, postId: reply.postIdString, isPoll: reply.isPoll }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
        toast({ title: "Reply unlocked. Replies are now allowed." });
      },
      onError: (error: unknown) => {
        console.error("Error unlocking reply:", error);
        toast({ title: "Failed to unlock reply.", variant: "destructive" });
      },
    });
  };

  const handleReplyClick = () => {
    if (onReply) onReply(reply.$id);
  };

  const replyCreationTime = new Date(reply.$createdAt).getTime();
  const currentTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const withinFiveMin = currentTime - replyCreationTime < fiveMinutes;

  return (
    <div
      className={`flex flex-col gap-2 p-2 theme-bg-3 rounded-md ${
        reply.isLocked ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <img
          src={
            reply.isAnonymous || isPostCreatorInAnonymousPost
              ? "/assets/icons/profile-placeholder.svg"
              : reply.userImageUrl
          }
          alt={reply.isAnonymous ? "Anonymous" : isPostCreatorInAnonymousPost ? "Asker" : reply.userName}
          className="w-6 h-6 rounded-full"
        />
        <div>
          <div className="flex items-center justify-between">
            {reply.isAnonymous ? (
              <p className="text-sm font-medium text-light-1">{getAnonymousDisplayName(reply)}</p>
            ) : isPostCreatorInAnonymousPost ? (
              <p className="text-sm font-medium text-light-1">Asker</p>
            ) : (
              <Link
                to={`/profile/${reply.userIdString}`}
                className="text-sm font-medium text-light-1 hover:underline"
              >
                {reply.userName}
              </Link>
            )}
            <div className="w-8" />
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">
              {isValid(parseISO(reply.$createdAt))
                ? formatDistanceToNow(new Date(reply.$createdAt), {
                    addSuffix: true,
                  })
                : "Invalid date"}
            </p>
            {!isReplyCreatorBlocked && reply.userIdString === user.id && (
              <div className="flex gap-2">
                {withinFiveMin && (
                  <>
                    <button
                      onClick={() => {
                        setEditMode(reply.$id);
                        setUpdatedContent(reply.content);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteReply}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Delete
                    </button>
                  </>
                )}
                {!withinFiveMin && (
                  <button
                    onClick={handleLockReply}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Lock
                  </button>
                )}
              </div>
            )}
            {reply.userIdString === user.id && reply.isLocked && !parentIsLocked && (
              <button
                onClick={handleUnlockReply}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Unlock
              </button>
            )}
            {!disabled && !reply.isLocked && reply.userIdString !== user.id && (
              <button
                onClick={handleReplyClick}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {editMode === reply.$id ? (
        <div>
          <textarea
            value={updatedContent}
            onChange={(e) => setUpdatedContent(e.target.value)}
            className="w-full theme-bg-3 text-sm border-none resize-none text-light-1 rounded-md p-2"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onAddEdit(reply.$id, true)}
              className="px-3 py-1 text-sm text-light-1 bg-blue-500 rounded-md hover:bg-blue-600"
            >
              Save Edit
            </button>
            <button
              onClick={() => setEditMode(null)}
              className="px-3 py-1 text-sm text-light-1 bg-gray-500 rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-light-2 break-words">
          {renderContentWithMentions(isExpanded ? reply.content : truncatedContent)}
          {isLong && !isExpanded && (
            <button
              onClick={handleExpand}
              className="text-blue-400 hover:text-blue-300 ml-1 bg-transparent border-none cursor-pointer text-sm p-0 font-normal underline"
            >
              Continue Reading
            </button>
          )}
        </div>
      )}

      {replyToCommentId === reply.$id && (
        <CommentForm
          id={reply.postIdString}
          isPoll={reply.isPoll}
          parentCommentId={reply.$id}
          onReplySuccess={() => onReply && onReply(null)}
          disabled={disabled}
          parentUserName={reply.isAnonymous ? getAnonymousDisplayName(reply) : isPostCreatorInAnonymousPost ? "Asker" : reply.userName}
          parentUserId={reply.userIdString}
        />
      )}
    </div>
  );
};

export default ReplyItem;