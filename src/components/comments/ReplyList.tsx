import React from "react";
import ReplyItem from "./ReplyItem";
import { IComment, UserDetails } from "@/types";

interface ReplyListProps {
  replies: IComment[];
  user: UserDetails;
  editMode: string | null;
  setEditMode: (v: string | null) => void;
  updatedContent: string;
  setUpdatedContent: (v: string) => void;
  onAddEdit: (id: string, isReply?: boolean) => void;
  showReplies: Record<string, number>;
  setRepliesToShow: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  commentId: string;
  totalReplies: number;
  likes: Record<string, string[]>;
  onLike: (commentId: string) => void;
  onFetchLikedUsers: (commentId: string) => void;
  disabled: boolean;
  onReply: (commentId: string | null) => void;
  replyToCommentId: string | null;
  parentIsLocked: boolean;
  isPostAnonymous?: boolean;
  postCreatorId?: string;
  postId?: string;
}

const ReplyList: React.FC<ReplyListProps> = ({
  replies,
  user,
  editMode,
  setEditMode,
  updatedContent,
  setUpdatedContent,
  onAddEdit,
  showReplies,
  setRepliesToShow,
  commentId,
  totalReplies,
  disabled = false,
  onReply,
  replyToCommentId,
  parentIsLocked,
  isPostAnonymous = false,
  postCreatorId,
  postId,
}) => {
  const repliesToShowCount = showReplies[commentId] || 2;

  const handleViewMoreReplies = () => {
    setRepliesToShow((prev) => ({
      ...prev,
      [commentId]: repliesToShowCount + 4,
    }));
  };

  const handleViewLessReplies = () => {
    setRepliesToShow((prev) => ({
      ...prev,
      [commentId]: 2,
    }));
  };

  return (
    <div className="ml-4 mt-2 space-y-2">
      {replies.map((reply) => (
        <ReplyItem
          key={reply.$id}
          reply={reply}
          user={user}
          editMode={editMode}
          setEditMode={setEditMode}
          updatedContent={updatedContent}
          setUpdatedContent={setUpdatedContent}
          onAddEdit={onAddEdit}
          disabled={disabled}
          onReply={onReply}
          replyToCommentId={replyToCommentId}
          showReplies={showReplies}
          setRepliesToShow={setRepliesToShow}
          parentIsLocked={parentIsLocked}
          isPostAnonymous={isPostAnonymous}
          postCreatorId={postCreatorId}
          postId={postId}
        />
      ))}

      {totalReplies > 2 && (
        <div className="flex gap-2">
          {repliesToShowCount < totalReplies && (
            <button
              onClick={handleViewMoreReplies}
              className="text-xs text-blue-400 hover:text-blue-300">
              View More
            </button>
          )}
          {repliesToShowCount > 2 && (
            <button
              onClick={handleViewLessReplies}
              className="text-xs text-blue-400 hover:text-blue-300">
              View Less
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReplyList;