import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useUserContext } from "@/context/AuthContext";
import {
  useGetCommentsByPostId,
  useUpdateComment,
  useLikeComment,
  useGetPostById,
  useGetPollById,
} from "@/lib/react-query/queries";
import { Models, Query } from "appwrite";
import { getUsers } from "@/services/userService";
import CommentItem from "./CommentItem";
import LikeModal from "../shared/LikeModal";
import { getUserLevelFromPoints } from "@/lib/levelUtils";
import { AnonymousNumberManager } from "@/lib/anonymousUtils";

interface CommentListProps {
  id: string;
  isPoll?: boolean;
  postCreatorId?: string;
  currentUserId?: string;
  disabled?: boolean;
  groupId?: string | null;
  isPostAnonymous?: boolean;
}

const CommentList: React.FC<CommentListProps> = ({
  id,
  isPoll = false,
  postCreatorId,
  currentUserId,
  disabled = false,
  isPostAnonymous = false,
}) => {
  const { user } = useUserContext();
  const sortBy: string | undefined = user.commentSortBy; // Default to undefined if not set
  const {
    data: comments,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
  } = useGetCommentsByPostId(id, isPoll, sortBy);

  // Conditionally fetch post or poll data based on isPoll
  const { data: postData } = !isPoll ? useGetPostById(id) : { data: undefined };
  const { data: pollData } = isPoll
    ? useGetPollById(id, isPoll)
    : { data: undefined };

  // Determine commentsLocked based on isPoll
  const commentsLocked = isPoll
    ? pollData?.commentsLocked
    : postData?.commentsLocked;

  const { mutate: likeComment } = useLikeComment();
  const { mutate: updateComment } = useUpdateComment();

  const [likes, setLikes] = useState<Record<string, string[]>>({});
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [likedUsers, setLikedUsers] = useState<Models.Document[]>([]);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [updatedContent, setUpdatedContent] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [repliesToShow, setRepliesToShow] = useState<Record<string, number>>(
    {}
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [ setSelectedReaction] = useState<string | null>(null);

  const COMMENTS_PER_PAGE = 20;
  const MAX_PAGES = 50;

  const userLevel = getUserLevelFromPoints(user);
  const canUseSpecialReactions = userLevel > 1 && userLevel !== -3;
  const SPECIAL_REACTIONS = ["😢", "😂", "🔥", "🎉", "🙏"];

  useEffect(() => {
    if (comments?.pages) {
      const likesData: Record<string, string[]> = {};
      comments.pages
        .flatMap((page) => page.documents || [])
        .filter((doc) => !doc.parentCommentId)  // Only top-level comments
        .forEach((comment) => {
          likesData[comment.$id] =
            comment.likes?.map((user: any) => user.$id) || [];
        });
      setLikes(likesData);
    
    }
  }, [comments, sortBy]);

  const handleLikeComment = useCallback(
    (commentId: string) => {
      let updatedLikes = [...(likes[commentId] || [])];
      if (updatedLikes.includes(user.id)) {
        updatedLikes = updatedLikes.filter((id) => id !== user.id);
      } else {
        updatedLikes.push(user.id);
      }
      setLikes((prev) => ({ ...prev, [commentId]: updatedLikes }));
      likeComment({ commentId, likesArray: updatedLikes });
    },
    [likes, user.id, likeComment]
  );

  const handleAddSpecialReaction = useCallback(
    (commentId: string, reaction: string) => {
      if (!canUseSpecialReactions) return;
      setLikes((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), `${user.id}-${reaction}`],
      }));
      setSelectedReaction(null);
    },
    [canUseSpecialReactions, user.id]
  );

  const fetchLikedUsers = useCallback(
    async (commentId: string) => {
      if (!likes[commentId]?.length) return;
      try {
        const response = await getUsers(50, [
          Query.equal("$id", likes[commentId]),
        ]);
        setLikedUsers(response.documents || []);
        setSelectedCommentId(commentId);
        setIsModalOpen(true);
      } catch (error) {
        console.error(
          `CommentList: Error fetching liked users for comment ${commentId}:`,
          error
        );
      }
    },
    [likes]
  );

  const handleAddEdit = (commentId: string, isReply = false) => {
    if (updatedContent.trim() === "") return;
    updateComment(
      {
        commentId,
        content: updatedContent,
      },
      {
        onSuccess: () => {
          setEditMode(null);
          setUpdatedContent("");
        },
        onError: (error: unknown) => {
          console.error(
            `CommentList: Error updating comment ${commentId}:`,
            error
          );
          alert("An error occurred while updating the comment.");
        },
      }
    );
  };

  const sortedComments = useMemo(() => {
    const allComments =
      comments?.pages.flatMap((page) => page.documents || []) || [];

    // Always put best comments first, then apply the selected sorting
    return allComments.sort((a, b) => {
      // First priority: Best comments always go to the top
      if (a.hasBestFlair && !b.hasBestFlair) return -1;
      if (!a.hasBestFlair && b.hasBestFlair) return 1;

      // If both have best flair or neither has it, apply secondary sorting
      if (sortBy === "likes") {
        // Sort by likes (most liked first)
        const aLikes = (a.likes || []).length;
        const bLikes = (b.likes || []).length;

        // If likes are equal, sort by date (oldest first - ascending order)
        if (aLikes === bLikes) {
          return new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
        }

        return bLikes - aLikes;
      } else if (sortBy === "date") {
        // Sort by date only (oldest first - ascending order)
        return new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
      }

      // Default to likes-first sorting (most liked first, then by date ascending)
      const aLikes = (a.likes || []).length;
      const bLikes = (b.likes || []).length;

      if (aLikes === bLikes) {
        return new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
      }

      return bLikes - aLikes;
    });
  }, [comments, sortBy]);

  const commentMap: Record<string, any> = {};
  sortedComments.forEach((c) => {
    c.replies = [];
    commentMap[c.$id] = c;
  });
  sortedComments.forEach((c) => {
    if (c.parentCommentId && commentMap[c.parentCommentId]) {
      commentMap[c.parentCommentId].replies.push(c);
    }
  });
  const topLevelComments = sortedComments.filter((c) => !c.parentCommentId);

  // Initialize anonymous numbering system with all comments (including replies)
  useEffect(() => {
    if (sortedComments.length > 0) {
      AnonymousNumberManager.initializeFromComments(id, sortedComments);
    }
  }, [sortedComments, id]);

  const totalComments = topLevelComments.length;
  const totalPages = Math.min(
    Math.ceil(totalComments / COMMENTS_PER_PAGE) || 1,
    MAX_PAGES
  );
  const startIndex = (currentPage - 1) * COMMENTS_PER_PAGE;
  const endIndex = startIndex + COMMENTS_PER_PAGE;
  const currentComments = useMemo(
    () => topLevelComments.slice(startIndex, endIndex),
    [topLevelComments, startIndex, endIndex]
  );

  const Pagination = () => {
    const pageNumbers = [];
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    const handlePageChange = (page: number) => {
      if (page > currentPage && hasNextPage) {
        fetchNextPage();
      }
      setCurrentPage(page);
    };

    return (
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 text-sm rounded-md ${
            currentPage === 1
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}>
          Previous
        </button>
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-1 text-sm rounded-md ${
              currentPage === page
                ? "bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}>
            {page}
          </button>
        ))}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages && !hasNextPage}
          className={`px-3 py-1 text-sm rounded-md ${
            currentPage >= totalPages && !hasNextPage
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}>
          Next
        </button>
      </div>
    );
  };

  let renderContent: JSX.Element | null = null;
  if (!id) {
    renderContent = null;
  } else if (isLoading) {
    renderContent = <p>Loading comments...</p>;
  } else if (isError) {
    renderContent = <p>Error loading comments.</p>;
  } else {
    renderContent = (
      <div className="space-y-4 mt-6">
        {currentComments.map((comment) => (
          <CommentItem
            key={comment.$id}
            comment={comment}
            user={user}
            likes={likes}
            isPoll={isPoll}
            onLike={handleLikeComment}
            onAddSpecialReaction={
              canUseSpecialReactions ? handleAddSpecialReaction : undefined
            }
            specialReactions={
              canUseSpecialReactions ? SPECIAL_REACTIONS : undefined
            }
            onReply={setReplyToCommentId}
            replyToCommentId={replyToCommentId}
            onFetchLikedUsers={fetchLikedUsers}
            likedUsers={likedUsers}
            showLikeModal={isModalOpen}
            setShowLikeModal={setIsModalOpen}
            selectedCommentId={selectedCommentId}
            editMode={editMode}
            setEditMode={setEditMode}
            updatedContent={updatedContent}
            setUpdatedContent={setUpdatedContent}
            onAddEdit={handleAddEdit}
            showReplies={repliesToShow}
            setRepliesToShow={setRepliesToShow}
            postCreatorId={postCreatorId}
            currentUserId={currentUserId}
            disabled={disabled || commentsLocked}
            isPostAnonymous={isPostAnonymous}
            postId={id}
          />
        ))}

        {totalComments > 0 && <Pagination />}

        {isModalOpen && selectedCommentId && (
          <LikeModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedCommentId(null);
            }}
            likedUsers={likedUsers}
            postId={selectedCommentId}
          />
        )}
      </div>
    );
  }

  return renderContent;
};

export default CommentList;