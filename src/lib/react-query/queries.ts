import { ID, Models, Query } from "appwrite";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useQueries,
} from "@tanstack/react-query";

import { databases,appwriteConfig } from "@/lib/appwrite/config";

import {
  getUserVotedPollsCount,
  greatPoll,
  lockComments,
  publishPoll,
  unlockComments,
} from "@/services/pollService";

import { QUERY_KEYS } from "@/lib/react-query/queryKeys";
import {
  ContactFormData,
  GroupContent,
  IChatMessage,
  IGroupInvitation,
  INewPost,
  INewUser,
  INotification,
  INotificationPreferences,
  IPoll,
  IReaction,
  IToggleLikeMessageParams,
  IUpdatePost,
  IUpdateUser,
  Post,
  UserDetails,
} from "@/types";
import {
  getUserNotifications,
  markNotificationAsRead,
} from "@/services/notificationsService";
import {
  createUserAccount,
  signInAccount,
  signOutAccount,
  getAccount,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  updateUserEmail,
  createPasswordRecovery,
  updatePasswordRecovery,
  signInWithGoogle,
  signInWithFacebook,
} from "@/services/authService";
import {
  createPost,
  getPostById,
  getUserPosts,
  deletePost,
  getRecentPosts,
  getInfinitePosts,
  searchPosts,
  savePost,
  deleteSavedPost,
  fetchCombinedContent,
  getCategoryNameById,
  likePost,
  greatPost,
  superLikePost,
  simpleLikePost,
  lockComments as lockPostComments,
  unlockComments as unlockPostComments,
  getUserDrafts,
  publishPost,
  getUserSavedItems,
  updatePostWithEdits,
} from "@/services/postService";

import {
  getUsers,
  updateUser,
  getUserPolls,
  getUserGroups,
  awardLikeBonusForQuestionForOwner,
  getUserById,
  awardVoteBonusForCurrentUser,
  incrementGreatsToday,
  getUsersByPointHistory,
  checkNicknameAvailability,
  updateNotificationPreferences,
  updateUserLevelAndPoints,
  increaseWalletBalance,
  decreaseWalletBalance,
  incrementSuperLikesToday,
  incrementSimpleLikesToday,
  searchUsersByPrefix,
  getUserDocumentsByIds,
  updateEmailPreferences,
} from "@/services/userService";
import {
  getPolls,
  createPoll,
  voteOnPoll,
  deletePoll,
  getVotesByUser,
  getPollById,
  getVotesByUserForPoll,
  getVotedUsersForPoll,
  simpleLikePoll,
  superLikePoll,
} from "@/services/pollService";
import {
  acceptGroupInvitation,
  acceptMembershipRequest,
  addMemberToGroup,
  createGroupInvitation,
  createMembershipRequest,
  declineGroupInvitation,
  deleteMembershipRequest,
  fetchGroupContent,
  fetchGroupsByCategory,
  getEffectiveMembers,
  getGroupById,
  getGroups,
  getMembershipRequests,
  getPendingInvitation,
  getUserMembershipStatus,
  getUsersNotInGroup,
  rejectMembershipRequest,
  removeMemberFromGroup,
  setPendingMembershipRequest,
} from "@/services/groupService";
import {
  createComment,
  deleteComment,
  getCommentsById,
  getUserCommentCount,
  likeComment,
  lockComment,
  unlockComment,
  updateComment,
} from "@/services/commentService";
import { useMemo } from "react";
import { UserAction } from "@/lib/pointsMapping";
import {
  getPointHistoryByUser,
  createPointHistory,
} from "@/services/pointHistoryService";
import {
  blockUser,
  isBlocked,
  unblockUser,
  getBlockedUserIds,
} from "@/services/blockService";
import { getAllCategories } from "@/services/categoryService";
import {
  fetchMessages,
  markMessageAsRead,
  toggleLikeMessage,
} from "@/services/messageService";
import { toast } from "react-hot-toast";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui";
import { CommentData } from "@/types";
import { sendContactEmail } from "@/services/contact";
import { getReactionsByCommentId, reactToComment } from "@/services/reactionService";

// ============================================================
// AUTH QUERIES
// ============================================================

export const useCreateUserAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: INewUser) => createUserAccount(user),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
    onError: (error) => {
      console.error("Error creating user account:", error);
    },
  });
};

export const useSignInAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: { email: string; password: string }) =>
      signInAccount(user),
    onSuccess: () => {
      // Invalidate currentUser query to ensure auth state updates
      queryClient.invalidateQueries(["currentUser"]);
    },
    onError: (error: any) => {
      // Log detailed error for debugging
      console.error("Error in useSignInAccount:", {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// Hook for signing out a user
export const useSignOutAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOutAccount,
    onSuccess: () => {
      // Invalidate currentUser query to ensure auth state updates
      queryClient.invalidateQueries(["currentUser"]);
    },
    onError: (error: any) => {
      // Log detailed error for debugging
      console.error("Error in useSignOutAccount:", {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
      });
    },
  });
};

// ============================================================
// POST QUERIES
// ============================================================

// Hook to simple like a post or poll

// Hook to simple like a poll
export const useSimpleLikePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pollId,
      simpleLikesArray,
      userId,
    }: {
      pollId: string;
      simpleLikesArray: string[];
      userId: string;
    }) => {
      if (!pollId) {
        console.error("useSimpleLikePoll: Missing pollId");
        throw new Error("Poll ID is required.");
      }
      if (!userId) {
        console.error("useSimpleLikePoll: Missing userId");
        throw new Error("User ID is required.");
      }

      // Call the service function to handle simple likes and notifications

      const updatedDocument = await simpleLikePoll(pollId, simpleLikesArray);

      if (!updatedDocument) {
        console.error(
          "useSimpleLikePoll: Failed to update simple like status, no document returned:",
          { pollId }
        );
        throw new Error("Failed to update simple like status.");
      }

      // Increment user's simpleLikesToday count
      await incrementSimpleLikesToday(userId);

      return updatedDocument;
    },

    onMutate: async ({ pollId, simpleLikesArray }) => {
      // Cancel ongoing queries to avoid race conditions
      await queryClient.cancelQueries([QUERY_KEYS.GET_POLL_BY_ID, pollId]);
      await queryClient.cancelQueries([QUERY_KEYS.GET_CURRENT_USER]);

      // Snapshot previous poll and user data
      const previousPoll = queryClient.getQueryData([
        QUERY_KEYS.GET_POLL_BY_ID,
        pollId,
      ]);
      const previousUser = queryClient.getQueryData([
        QUERY_KEYS.GET_CURRENT_USER,
      ]);

      // Optimistically update poll's simpleLikedBy and simpleLikeCount
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POLL_BY_ID, pollId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const updatedSimpleLikes = Array.isArray(oldData.simpleLikedBy)
            ? [...new Set([...oldData.simpleLikedBy, ...simpleLikesArray])]
            : simpleLikesArray;
          return {
            ...oldData,
            simpleLikedBy: updatedSimpleLikes,
            simpleLikeCount: updatedSimpleLikes.length,
          };
        }
      );

      // Optimistically update user's simpleLikesToday and lastLikeReset
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        (oldData: any) => {
          if (!oldData) return oldData;
          const today = new Date().toDateString();
          const lastReset = oldData.lastLikeReset
            ? new Date(oldData.lastLikeReset).toDateString()
            : null;
          const simpleLikesToday =
            lastReset === today ? (oldData.simpleLikesToday || 0) + 1 : 1;
          return {
            ...oldData,
            simpleLikesToday,
            lastLikeReset: new Date().toISOString(),
          };
        }
      );

      return { previousPoll, previousUser };
    },

    onError: (error: any, { pollId, userId }, context) => {
      console.error("useSimpleLikePoll: Error simple liking poll:", error);
      // Revert to previous data on error
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POLL_BY_ID, pollId],
        context?.previousPoll
      );
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        context?.previousUser
      );
      toast.error(
        `Failed to simple like poll: ${error.message || "Unknown error"}`
      );
    },

    onSuccess: (updatedDocument, { pollId, userId }) => {
      if (!updatedDocument?.$id) {
        console.warn(
          "useSimpleLikePoll: No $id in updated document:",
          updatedDocument
        );
        return;
      }

      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_POLL_BY_ID, pollId]);
      queryClient.invalidateQueries(["polls"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_USER_BY_ID, userId]);
      toast.success("Poll simple liked successfully!");
    },
  });
};

// Hook to super like a poll
export const useSuperLikePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pollId,
      superLikesArray,
      userId,
    }: {
      pollId: string;
      superLikesArray: string[];
      userId: string;
    }) => {
      if (!pollId) {
        console.error("useSuperLikePoll: Missing pollId");
        throw new Error("Poll ID is required.");
      }
      if (!userId) {
        console.error("useSuperLikePoll: Missing userId");
        throw new Error("User ID is required.");
      }

      // Call the service function to handle super likes and notifications
      const updatedDocument = await superLikePoll(pollId, superLikesArray);

      if (!updatedDocument) {
        console.error(
          "useSuperLikePoll: Failed to update super like status, no document returned:",
          { pollId }
        );
        throw new Error("Failed to update super like status.");
      }

      // Increment user's superLikesToday count
      await incrementSuperLikesToday(userId);

      return updatedDocument;
    },

    onMutate: async ({ pollId, superLikesArray }) => {
      // Cancel ongoing queries to avoid race conditions
      await queryClient.cancelQueries([QUERY_KEYS.GET_POLL_BY_ID, pollId]);
      await queryClient.cancelQueries([QUERY_KEYS.GET_CURRENT_USER]);

      // Snapshot previous poll and user data
      const previousPoll = queryClient.getQueryData([
        QUERY_KEYS.GET_POLL_BY_ID,
        pollId,
      ]);
      const previousUser = queryClient.getQueryData([
        QUERY_KEYS.GET_CURRENT_USER,
      ]);

      // Optimistically update poll's superLikedBy and superLikeCount
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POLL_BY_ID, pollId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const updatedSuperLikes = Array.isArray(oldData.superLikedBy)
            ? [...new Set([...oldData.superLikedBy, ...superLikesArray])]
            : superLikesArray;
          return {
            ...oldData,
            superLikedBy: updatedSuperLikes,
            superLikeCount: updatedSuperLikes.length,
          };
        }
      );

      // Optimistically update user's superLikesToday and lastLikeReset
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        (oldData: any) => {
          if (!oldData) return oldData;
          const today = new Date().toDateString();
          const lastReset = oldData.lastLikeReset
            ? new Date(oldData.lastLikeReset).toDateString()
            : null;
          const superLikesToday =
            lastReset === today ? (oldData.superLikesToday || 0) + 1 : 1;
          return {
            ...oldData,
            superLikesToday,
            lastLikeReset: new Date().toISOString(),
          };
        }
      );

      return { previousPoll, previousUser };
    },

    onError: (error: any, { pollId }, context) => {
      console.error("useSuperLikePoll: Error super liking poll:", error);
      // Revert to previous data on error
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POLL_BY_ID, pollId],
        context?.previousPoll
      );
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        context?.previousUser
      );
      toast.error(
        `Failed to super like poll: ${error.message || "Unknown error"}`
      );
    },

    onSuccess: (updatedDocument, { pollId, userId }) => {
      if (!updatedDocument?.$id) {
        console.warn(
          "useSuperLikePoll: No $id in updated document:",
          updatedDocument
        );
        return;
      }

      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_POLL_BY_ID, pollId]);
      queryClient.invalidateQueries(["polls"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_USER_BY_ID, userId]);
      toast.success("Poll super liked successfully!");
    },
  });
};

// Hook to simple like a post
export const useSimpleLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      simpleLikesArray,
      userId,
      isPoll = false,
    }: {
      postId: string;
      simpleLikesArray: string[];
      userId: string;
      isPoll?: boolean;
    }) => {
      if (!postId) {
        console.error("useSimpleLikePost: Missing postId");
        throw new Error("Post ID is required.");
      }
      if (!userId) {
        console.error("useSimpleLikePost: Missing userId");
        throw new Error("User ID is required.");
      }

      // Call the service function to handle simple likes and notifications
      const updatedDocument = await simpleLikePost(
        postId,
        simpleLikesArray,
        isPoll
      );

      if (!updatedDocument) {
        console.error(
          "useSimpleLikePost: Failed to update simple like status, no document returned:",
          { postId, isPoll }
        );
        throw new Error("Failed to update simple like status.");
      }

      // Increment user's simpleLikesToday count
      await incrementSimpleLikesToday(userId);

      return updatedDocument;
    },

    onMutate: async ({ postId, simpleLikesArray }) => {
      // Cancel ongoing queries to avoid race conditions
      await queryClient.cancelQueries([QUERY_KEYS.GET_POST_BY_ID, postId]);
      await queryClient.cancelQueries([QUERY_KEYS.GET_CURRENT_USER]);

      // Snapshot previous post and user data
      const previousPost = queryClient.getQueryData([
        QUERY_KEYS.GET_POST_BY_ID,
        postId,
      ]);
      const previousUser = queryClient.getQueryData([
        QUERY_KEYS.GET_CURRENT_USER,
      ]);

      // Optimistically update post's simpleLikedBy and simpleLikeCount
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POST_BY_ID, postId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const updatedSimpleLikes = Array.isArray(oldData.simpleLikedBy)
            ? [...new Set([...oldData.simpleLikedBy, ...simpleLikesArray])]
            : simpleLikesArray;
          return {
            ...oldData,
            simpleLikedBy: updatedSimpleLikes,
            simpleLikeCount: updatedSimpleLikes.length,
          };
        }
      );

      // Optimistically update user's simpleLikesToday and lastLikeReset
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        (oldData: any) => {
          if (!oldData) return oldData;
          const today = new Date().toDateString();
          const lastReset = oldData.lastLikeReset
            ? new Date(oldData.lastLikeReset).toDateString()
            : null;
          const simpleLikesToday =
            lastReset === today ? (oldData.simpleLikesToday || 0) + 1 : 1;
          return {
            ...oldData,
            simpleLikesToday,
            lastLikeReset: new Date().toISOString(),
          };
        }
      );

      return { previousPost, previousUser };
    },

    onError: (error: any, { postId, userId }, context) => {
      console.error("useSimpleLikePost: Error simple liking post:", error);
      // Revert to previous data on error
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POST_BY_ID, postId],
        context?.previousPost
      );
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        context?.previousUser
      );
      toast.error(
        `Failed to simple like post: ${error.message || "Unknown error"}`
      );
    },

    onSuccess: (updatedDocument, { postId, userId }) => {
      if (!updatedDocument?.$id) {
        console.warn(
          "useSimpleLikePost: No $id in updated document:",
          updatedDocument
        );
        return;
      }

      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_POST_BY_ID, postId]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_RECENT_POSTS]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_USER_BY_ID, userId]);
      toast.success("Post simple liked successfully!");
    },
  });
};

// Hook to super like a post
export const useSuperLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      superLikesArray,
      userId,
      isPoll = false,
    }: {
      postId: string;
      superLikesArray: string[];
      userId: string;
      isPoll?: boolean;
    }) => {
      if (!postId) {
        console.error("useSuperLikePost: Missing postId");
        throw new Error("Post ID is required.");
      }
      if (!userId) {
        console.error("useSuperLikePost: Missing userId");
        throw new Error("User ID is required.");
      }

      // Call the service function to handle super likes and notifications
      const updatedDocument = await superLikePost(
        postId,
        superLikesArray,
        isPoll
      );

      if (!updatedDocument) {
        console.error(
          "useSuperLikePost: Failed to update super like status, no document returned:",
          { postId, isPoll }
        );
        throw new Error("Failed to update super like status.");
      }

      // Increment user's superLikesToday count
      await incrementSuperLikesToday(userId);

      return updatedDocument;
    },

    onMutate: async ({ postId, superLikesArray }) => {
      // Cancel ongoing queries to avoid race conditions
      await queryClient.cancelQueries([QUERY_KEYS.GET_POST_BY_ID, postId]);
      await queryClient.cancelQueries([QUERY_KEYS.GET_CURRENT_USER]);

      // Snapshot previous post and user data
      const previousPost = queryClient.getQueryData([
        QUERY_KEYS.GET_POST_BY_ID,
        postId,
      ]);
      const previousUser = queryClient.getQueryData([
        QUERY_KEYS.GET_CURRENT_USER,
      ]);

      // Optimistically update post's superLikedBy and superLikeCount
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POST_BY_ID, postId],
        (oldData: any) => {
          if (!oldData) return oldData;
          const updatedSuperLikes = Array.isArray(oldData.superLikedBy)
            ? [...new Set([...oldData.superLikedBy, ...superLikesArray])]
            : superLikesArray;
          return {
            ...oldData,
            superLikedBy: updatedSuperLikes,
            superLikeCount: updatedSuperLikes.length,
          };
        }
      );

      // Optimistically update user's superLikesToday and lastLikeReset
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        (oldData: any) => {
          if (!oldData) return oldData;
          const today = new Date().toDateString();
          const lastReset = oldData.lastLikeReset
            ? new Date(oldData.lastLikeReset).toDateString()
            : null;
          const superLikesToday =
            lastReset === today ? (oldData.superLikesToday || 0) + 1 : 1;
          return {
            ...oldData,
            superLikesToday,
            lastLikeReset: new Date().toISOString(),
          };
        }
      );

      return { previousPost, previousUser };
    },

    onError: (error: any, { postId }, context) => {
      console.error("useSuperLikePost: Error super liking post:", error);
      // Revert to previous data on error
      queryClient.setQueryData(
        [QUERY_KEYS.GET_POST_BY_ID, postId],
        context?.previousPost
      );
      queryClient.setQueryData(
        [QUERY_KEYS.GET_CURRENT_USER],
        context?.previousUser
      );
      toast.error(
        `Failed to super like post: ${error.message || "Unknown error"}`
      );
    },

    onSuccess: (updatedDocument, { postId, userId }) => {
      if (!updatedDocument?.$id) {
        console.warn(
          "useSuperLikePost: No $id in updated document:",
          updatedDocument
        );
        return;
      }

      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_POST_BY_ID, postId]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_RECENT_POSTS]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_USER_BY_ID, userId]);
      toast.success("Post super liked successfully!");
    },
  });
};

export const useGetPosts = (
  categoryId?: string | null,
  subCategory?: string | null,
  filters: any[] = []
) => {
  const { user } = useUserContext();

  return useInfiniteQuery({
    queryKey: ["posts", categoryId, subCategory, filters, user?.id], // Include user ID in cache key
    queryFn: ({ pageParam }) =>
      getInfinitePosts({
        pageParam,
        categoryId,
        subCategory,
        filters,
        currentUserId: user?.id,
      }),
    getNextPageParam: (lastPage: any) => {
      if (!lastPage || lastPage.documents.length === 0) {
        return null;
      }
      return lastPage.documents[lastPage.documents.length - 1].$id;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
//========================================================================================
export const useSearchPosts = (
  searchTerm: string,
  groupId?: string,
  cursor?: string
) => {
  return useQuery({
    queryKey: ["searchPosts", searchTerm, groupId, cursor], // Ensure proper cache key
    queryFn: () => searchPosts(searchTerm, groupId, cursor), // Call the optimized function
    enabled: !!searchTerm, // Only execute if searchTerm is not empty
    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes to reduce API calls
    keepPreviousData: true, // Enable pagination while keeping previous results
  });
};

export const useGetRecentPosts = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
    queryFn: getRecentPosts,
    staleTime: 1000 * 60 * 5, // 5 minutes cache freshness
    cacheTime: 1000 * 60 * 10, // 10 minutes in memory
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
    refetchOnReconnect: false, // Prevent refetch on network reconnect
    retry: 2, // Limit retries to avoid 524 errors
    select: (data) => data.documents, // Extract documents directly
    onError: (error) => console.error("Error fetching recent posts:", error),
  });
};

//==============================================

interface InfiniteGroupsParams {
  categoryId?: string | null;
  subCategory?: string | null;
  search?: string;
  tag?: string | null;
  filters?: any[]; // Filters for sorting and time-based queries
}

export const useInfiniteGroups = ({
  categoryId,
  subCategory,
  search,
  tag,
  filters,
}: InfiniteGroupsParams) => {
  return useInfiniteQuery<{
    documents: any[];
    total: number;
  }>({
    queryKey: ["groups", { categoryId, subCategory, search, tag, filters }],
    queryFn: async ({ pageParam = "" }) => {
      return getGroups({
        pageParam,
        categoryId: categoryId || "",
        subCategory: subCategory || "",
        search: search || "",
        tag: tag || "",
        filters,
      });
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage?.documents?.length) return undefined;
      return lastPage.documents[lastPage.documents.length - 1].$id;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
};
//==========================================================
export const useFetchCombinedContent = ({
  categoryId,
  subCategory,
  search,
  type,
  groupId,
  tag,
}: {
  categoryId?: string | null;
  subCategory?: string | null;
  search?: string;
  type?: string;
  groupId?: string | null;
  tag?: string | null;
}) => {
  const { user } = useUserContext();

  return useInfiniteQuery({
    queryKey: [
      "combinedContent",
      categoryId,
      subCategory,
      search,
      type,
      groupId,
      tag,
      user?.id,
    ],
    queryFn: ({ pageParam }) =>
      fetchCombinedContent({
        pageParam,
        categoryId,
        subCategory,
        search,
        type,
        groupId,
        tag,
        currentUserId: user?.id,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.documents?.length) return null;
      return lastPage.documents[lastPage.documents.length - 1].$id;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes stale time
    cacheTime: 1000 * 60 * 30, // 30 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
//====================================================================================

// Hook to create a post
// Hook to create a post
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: INewPost) => createPost(post),
    onSuccess: async (data) => {
      // Invalidate the queries for Home and Explore pages
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POSTS],
      });

      // Update user's lastPostDate and postsToday
      try {
        const today = new Date().toDateString();
        const userId = data.creatorId; // Assuming creatorId is returned in the post data
        const currentUser = queryClient.getQueryData([
          QUERY_KEYS.GET_CURRENT_USER,
        ]) as any;

        if (!userId) {
          throw new Error("User ID not found in post data");
        }

        // Prepare updated user data
        const updatedUserData: IUpdateUser = {
          userId: userId,
          lastPostDate: today,
          postsToday: (currentUser?.postsToday || 0) + 1,
          greatCommentNumber: undefined,
        };

        // Call updateUser to update lastPostDate and postsToday
        await updateUser(updatedUserData);

        // Invalidate user-specific queries to reflect updated lastPostDate and postsToday
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.GET_CURRENT_USER],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.GET_USER_BY_ID, userId],
        });

        toast.success("Post created and user data updated successfully");
      } catch (error: any) {
        console.error(
          "Error updating user lastPostDate and postsToday:",
          error
        );
        toast.error(
          `Failed to update post tracking: ${error.message || "Unknown error"}`
        );
      }
    },
    onError: (error: any) => {
      console.error("Error creating post:", error);
      toast.error(`Failed to create post: ${error.message || "Unknown error"}`);
    },
  });
};
export const useGetPostById = (postId: string) => {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPostById(postId),
    enabled: !!postId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGetUserPosts = (userId: string, limit = 10, currentUserId?: string) => {
  return useQuery({
    queryKey: ["userPosts", userId, limit, currentUserId],
    queryFn: () => getUserPosts(userId, limit, undefined, currentUserId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useGetUserPolls = (userId: string, limit = 10, currentUserId?: string) => {
  return useQuery({
    queryKey: ["userPolls", userId, limit, currentUserId],
    queryFn: () => getUserPolls(userId, limit, undefined, currentUserId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useGetUserGroups = (userId: string, limit = 10) => {
  return useQuery({
    queryKey: ["userGroups", userId, limit],
    queryFn: () => getUserGroups(userId, limit),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: IUpdatePost) => updatePostWithEdits(post), // Corrected here
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POST_BY_ID, data?.$id],
      });
    },
  });
};

//=====================================================================================

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getAllCategories,
    staleTime: 1000 * 60 * 10, // 10 minutes de cache
    cacheTime: 1000 * 60 * 30, // 30 minutes en mémoire
    refetchOnWindowFocus: false,
  });
};

//=======================================================================

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      imageId,
    }: {
      postId: string;
      imageId?: string;
    }) => {
      if (!postId) throw new Error("postId is missing.");
      return deletePost(postId, imageId);
    },
    onSuccess: (_, variables) => {
      // Immediately update the paginated posts used on Home (Infinite Query)
      queryClient.setQueriesData(["content"], (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            documents: page.documents.filter(
              (doc: any) => doc.$id !== variables.postId
            ),
          })),
        };
      });

      // Immediately update recent posts used on Explore
      queryClient.setQueryData(
        [QUERY_KEYS.GET_RECENT_POSTS],
        (oldData: any) => {
          if (!oldData?.documents) return oldData;

          return {
            ...oldData,
            documents: oldData.documents.filter(
              (doc: any) => doc.$id !== variables.postId
            ),
          };
        }
      );

      // Immediately update general paginated posts
      queryClient.setQueriesData(["posts"], (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            documents: page.documents.filter(
              (doc: any) => doc.$id !== variables.postId
            ),
          })),
        };
      });

      // Completely remove the specific cache for the deleted post
      queryClient.removeQueries([QUERY_KEYS.GET_POST_BY_ID, variables.postId]);

      // Invalidate additional caches for safety
      queryClient.invalidateQueries(["userPosts"]);
      queryClient.invalidateQueries(["comments", variables.postId]);
      queryClient.invalidateQueries(["notifications"]);
    },
    onError: (error) => {
      console.error("Error during deletion:", error);
    },
  });
};

export const useDeletePoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pollId: any) => {
      if (!pollId) {
        console.error(" pollId is missing. Aborting deletion.");
        throw new Error("pollId is required for deletion.");
      }

      return deletePoll(pollId);
    },

    onSuccess: (_, variables) => {
      const { pollId } = variables;

      // Update paginated content (Home & Group Pages)
      queryClient.setQueriesData(["content"], (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            documents: page.documents.filter((doc: any) => doc.$id !== pollId),
          })),
        };
      });

      // Remove cache for deleted poll
      queryClient.removeQueries([QUERY_KEYS.GET_POLL_BY_ID, pollId]);

      // Invalidate related caches
      queryClient.invalidateQueries(["userPolls"]); // Refresh user polls
      queryClient.invalidateQueries(["notifications"]); // Refresh notifications
    },

    onError: (error, variables) => {
      console.error(` Error deleting poll with ID: ${variables.pollId}`, error);
    },
  });
};

//==========================================================================================

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      likesArray,
      isPoll = false,
    }: {
      postId: string;
      likesArray: string[];
      isPoll?: boolean;
    }) => {
      if (!postId) {
        console.error("useLikePost: Missing postId");
        throw new Error("Post ID is required.");
      }

      // Call the service function to handle likes and notifications
      const updatedDocument = await likePost(postId, likesArray, isPoll);

      const likeCount = updatedDocument.likedBy.length;
      if (likeCount == 10) {
        await updateUserLevelAndPoints(
          updatedDocument.creatorId,
          UserAction.QUESTION_ASKER_LIKE_10
        );
      } else if (likeCount == 50) {
        await updateUserLevelAndPoints(
          updatedDocument.creatorId,
          UserAction.QUESTION_ASKER_LIKE_50
        );
      }

      if (!updatedDocument) {
        console.error(
          "useLikePost: Failed to update likes, no document returned:",
          { postId, isPoll }
        );
        throw new Error("Failed to update likes.");
      }

      // Award bonus points if applicable (only for questions)
      if (!isPoll) {
        const likeCount = updatedDocument.likedBy.length; // Use likedBy instead of likes
        let bonusPoints = 0;

        if (likeCount === 10) {
          await awardLikeBonusForQuestionForOwner(
            updatedDocument.creatorId,
            10
          );
          bonusPoints = 10;
        } else if (likeCount === 5) {
          await awardLikeBonusForQuestionForOwner(updatedDocument.creatorId, 5);
          bonusPoints = 5;
        }
      }

      return updatedDocument;
    },

    onSuccess: (updatedDocument) => {
      if (!updatedDocument?.$id) {
        console.warn(
          "useLikePost: No $id in updated document:",
          updatedDocument
        );
        return;
      }

      const postId = updatedDocument.$id;

      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_POST_BY_ID, postId]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_RECENT_POSTS]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
  });
};
//========================================================================================================

export const useGetUserSavedItems = (
  userId: string,
  { pageParam }: { pageParam?: string }
) => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.GET_USER_SAVED_ITEMS, userId],
    queryFn: async ({ pageParam }) => {
      const savedItems = await getUserSavedItems(userId, 10, pageParam);
      return { documents: savedItems };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.documents.length < 10) return undefined;
      return lastPage.documents[lastPage.documents.length - 1].$id;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};
//================================================================================================
// For useSavePost:
export const useSavePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      postId,
      isPoll,
    }: {
      userId: string;
      postId: string;
      isPoll: boolean;
    }) => savePost(userId, postId, isPoll),
    onSettled: (_data, _error, variables) => {
      if (variables) {
        const { postId, isPoll, userId } = variables;
        queryClient.invalidateQueries(["isSaved", postId, isPoll, userId]);
      }
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
  });
};

// For useDeleteSavedPost:
export const useDeleteSavedPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      postId,
      isPoll,
    }: {
      userId: string;
      postId: string;
      isPoll: boolean;
    }) => deleteSavedPost(userId, postId, isPoll),
    onSettled: (_data, _error, variables) => {
      if (variables) {
        const { postId, isPoll, userId } = variables;
        queryClient.invalidateQueries(["isSaved", postId, isPoll, userId]);
      }
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
  });
};
// ============================================================
// USER QUERIES
// ============================================================
export const useGetCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        const user = await getCurrentUser();
        // No logging or throwing here; return null if no user (handled as data: null)
        return user;
      } catch (error: any) {
        // Only log unexpected errors (not handled in getCurrentUser)
        if (error.code !== 401) {
          console.error("[useGetCurrentUser] Unexpected error:", {
            message: error.message,
            code: error.code,
          });
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Reduce retries to minimize requests on failure
    refetchOnWindowFocus: false, // Disable refetch on focus to avoid continuous calls
  });
};
//====================================================================
interface User extends Models.Document {
  $id: string;
  name: string;
  imageUrl?: string;
  point: number;
  isOnline: boolean;
  level: number;
  gender?: string;
  dateOfBirth?: string;
}

export const useGetUsers = (limit: number = 6, filters: any[] = []) => {
  return useInfiniteQuery({
    queryKey: ['getUsers', limit, filters] as const, 
    queryFn: ({ pageParam = 0 }) => getUsers(limit, pageParam, filters),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.documents.length < limit) return undefined;
      return allPages.flatMap(page => page.documents).length;
    },
    initialPageParam: 0,
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    cacheTime: 1000 * 60 * 10, // 10 minutes in memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
    select: (data: { pages: Models.DocumentList<User>[] }) => data.pages.flatMap(page => page.documents),
    onError: (error: unknown) => console.error('useGetUsers: Error fetching users:', error),
  });
};
//=========================================================================

export const useGetUserVotesForPoll = (userId: string, pollId: string) => {
  return useQuery({
    queryKey: ["userVotesForPoll", userId, pollId],
    queryFn: () => getVotesByUserForPoll(userId, pollId),
    enabled: !!userId && !!pollId,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    cacheTime: 1000 * 60 * 30, // Keep in memory for 30 minutes
    refetchOnWindowFocus: false, // Prevent refetch on focus
    refetchOnReconnect: false, // Prevent refetch on reconnect
    retry: 2, // Retry failed requests twice
    onError: (error) => {
      console.error("Error loading user votes for poll:", error);
    },
  });
};

//====================================================================

export const useAwardVoteBonus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => awardVoteBonusForCurrentUser(),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]); // Refresh user data
    },
    onError: (error) => {
      console.error("Error awarding vote bonus:", error);
    },
  });
};

//===================================================================================
// Fetch user by ID
export const useGetUserById = (
  userId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<UserDetails, Error>({
    queryKey: ["user", userId],
    queryFn: () => getUserById(userId),
    enabled:
      !!userId &&
      typeof userId === "string" &&
      userId.length <= 36 &&
      (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Retry once on failure
    select: (data) => {
      return { ...data, id: data.$id };
    },
    onError: (error) => {
      console.error(
        `[useGetUserById] Error fetching user for userId: ${userId}`,
        {
          message: error.message,
          stack: error.stack,
        }
      );
    },
  });
};
//=====================================================================================================
// Hook to update greatsToday count
export const useUpdateGreatsToday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => incrementGreatsToday(userId),
    onSuccess: (updatedUser) => {
      // Invalidate user-related queries to ensure UI updates
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
      queryClient.invalidateQueries({
        queryKey: ["user", updatedUser.$id],
      });
    },
    onError: (error) => {
      console.error("Error updating greatsToday:", error);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: IUpdateUser) => updateUser(user),
    onSuccess: (data) => {
      // Invalidate user-specific queries
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_USER_BY_ID, data?.$id],
      });
      // Invalidate post-related queries to reflect updated creator name
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
      });
      queryClient.invalidateQueries({
        queryKey: ["userPosts"],
      });
      // Invalidate poll-related queries
      queryClient.invalidateQueries({
        queryKey: ["polls"],
      });
      queryClient.invalidateQueries({
        queryKey: ["userPolls"],
      });
      // Invalidate combined content queries (used in feeds)
      queryClient.invalidateQueries({
        queryKey: ["combinedContent"],
      });
    },
    onError: (error) => {
      console.error("Error updating user:", error);
    },
  });
};

export const getCategories = async () => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId // ID de la collection des catégories
    );

    // Retourne uniquement les catégories principales
    return response.documents.map((category) => ({
      $id: category.$id,
      name: category.name,
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories :", error);
    throw error;
  }
};

// ============================================================
// COMMENT QUERIES
// ============================================================
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comment: CommentData) => createComment(comment),
    onSuccess: (newComment) => {
      const postId = newComment.postIdString;
      const isPoll = newComment.isPoll || false;

      // Optimistically update the comment cache
      queryClient.setQueryData(
        ["comments", postId, isPoll],
        (prevData: any) => {
          if (!prevData) return prevData;

          return {
            ...prevData,
            pages: [
              {
                documents: [newComment, ...prevData.pages[0].documents],
                cursor: prevData.pages[0].cursor,
              },
              ...prevData.pages.slice(1),
            ],
          };
        }
      );

      // Invalidate to ensure consistency
      queryClient.invalidateQueries(["comments", postId, isPoll]);
    },
    onError: (error: any) => {
      console.error("useCreateComment: Error creating comment:", error);
    },
  });
};
//========================================================================================================
export const useGetCommentsByPostId = (
  postId: string,
  isPoll: boolean = false,
  sortBy: "date" | "likes" = "likes"
) => {
  return useInfiniteQuery({
    queryKey: ["comments", postId, isPoll, sortBy],
    queryFn: ({ pageParam }) =>
      getCommentsById(postId, isPoll, 20, pageParam, sortBy),
    enabled: !!postId,
    getNextPageParam: (lastPage, allPages) => {
      const MAX_PAGES = 50;
      if (allPages.length >= MAX_PAGES) {
        return undefined;
      }
      const cursor = lastPage.cursor || undefined;
      return cursor;
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};
//============================================================================================
export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
    },
    onError: (error) => {
      console.error("Error in useUpdateComment:", error);
    },
  });
};
//==============================================================================
export const useUnlockComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId ) => unlockComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commentsByPostId"] });
    },
    onError: (error) => {
      console.error("Error in useUnlockComment:", error);
    },
  });
};
//=======================================================================

// Hook to delete a comment
export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries(["comments"]);
    },
  });
};

// ============================================================
// GROUP QUERIES
// ============================================================

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (group: {
      name: string;
      description: string;
      categoryId: string;
      subCategory: string;
      creatorId: string;
    }) => {
      const groupId = ID.unique(); // Generate a unique document ID here

      return await databases.createDocument(
        appwriteConfig.databaseId, // Database ID
        appwriteConfig.groupsCollectionId, // Collection ID for groups
        groupId, // Pass the unique group ID here
        {
          ...group,
          isPrivate: true,
          createdAt: new Date().toISOString(),
        },
        [] // Empty permissions, or define custom permissions here
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_GROUPS]); // Refresh the groups data on success
    },
    onError: (error: any) => {
      console.error("Error creating group:", error);
      if (
        error?.message?.includes(
          "Document with the requested ID already exists"
        )
      ) {
        throw new Error("Group ID conflict occurred. Try again.");
      }
    },
  });
};

export const useGetGroups = (subCategory?: string, searchQuery?: string) => {
  return useInfiniteQuery({
    queryKey: ["groups", subCategory, searchQuery],
    queryFn: ({ pageParam = "" }) =>
      getGroups({ pageParam, subCategory, search: searchQuery }),
    getNextPageParam: (lastPage) => {
      if (lastPage.documents.length === 0) return null;
      const lastDocument = lastPage.documents[lastPage.documents.length - 1];
      return lastDocument ? lastDocument.$id : null;
    },
  });
};

// Hook to fetch users not in a group
export const useFetchUsersNotInGroup = (groupId: string) => {
  return useQuery({
    queryKey: ["usersNotInGroup", groupId],
    queryFn: async () => {
      const users = await getUsersNotInGroup(groupId);

      return users;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Hook to add a member to a group
export const useAddMemberToGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      userIds,
    }: {
      groupId: string;
      userIds: string[];
    }) => addMemberToGroup({ groupId, userIds }),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries(["group", groupId]); // Refresh group data
      queryClient.invalidateQueries(["usersNotInGroup", groupId]); // Refresh available users
    },
    onError: (error) => {
      console.error(" Error while adding multiple members:", error);
    },
  });
};

export const useGetGroupsByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ["groupsByCategory", categoryId],
    queryFn: () => fetchGroupsByCategory(categoryId),
    enabled: !!categoryId, // Only fetch if categoryId is defined
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes to prevent unnecessary fetches
    onError: (error) =>
      console.error("Error in useGetGroupsByCategory:", error),
  });
};

export const useCreatePoll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPoll,
    onSuccess: () => {
      queryClient.invalidateQueries(["polls"]);
    },
  });
};

export const useGetPolls = ({
  categoryId,
  searchQuery,
  filters = [],
}: {
  categoryId?: string | null;
  searchQuery?: string;
  filters?: any[];
}) => {
  return useInfiniteQuery({
    queryKey: ["polls", categoryId, searchQuery, filters],
    queryFn: ({ pageParam = "" }) =>
      getPolls(pageParam, categoryId, searchQuery, filters),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.documents?.length) return null;
      return lastPage.documents[lastPage.documents.length - 1].$id;
    },
    staleTime: 1000 * 60 * 5, // 5 min of freshness
    cacheTime: 1000 * 60 * 30, // 30 min in memory
    refetchOnWindowFocus: false, // no refetch on tab focus
    refetchOnReconnect: false, // no auto refetch on reconnect
    keepPreviousData: true, // for smoother UX on param change
    retry: 2, // Limit retries to avoid Error 524
    onError: (error) => {
      console.error("Error loading polls:", error);
    },
  });
};

// Hook to vote on a poll
export const useVoteOnPoll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pollId,
      optionIds,
      userId,
    }: {
      pollId: string;
      optionIds: string[];
      userId: string;
    }) => voteOnPoll({ pollId, optionIds, userId }),

    onMutate: async ({ pollId, userId }) => {
      // Cancel ongoing queries to avoid race conditions
      await queryClient.cancelQueries(["votedUsers", pollId]);

      // Snapshot previous votedUsers data
      const previousVotedUsers = queryClient.getQueryData<
        VotedUser[] | undefined
      >(["votedUsers", pollId]);

      // Optimistically update votedUsers
      queryClient.setQueryData<VotedUser[] | undefined>(
        ["votedUsers", pollId],
        (old: VotedUser[] | undefined) => {
          if (!old)
            return [{ $id: userId, name: "Unknown User", imageUrl: null }];
          if (old.some((user) => user.$id === userId)) return old;
          return [
            ...old,
            { $id: userId, name: "Unknown User", imageUrl: null },
          ];
        }
      );

      return { previousVotedUsers };
    },

    onError: (error, { pollId }, context) => {
      console.error("useVoteOnPoll: Error voting on poll ID:", pollId, error);
      // Revert to previous votedUsers on error
      queryClient.setQueryData(
        ["votedUsers", pollId],
        context?.previousVotedUsers
      );
    },

    onSuccess: (_, { pollId }) => {
      queryClient.invalidateQueries(["polls"]);
      queryClient.invalidateQueries(["userVotes"]);
      queryClient.invalidateQueries(["votedUsers", pollId]);
    },
  });
};

export const useGetPollById = (pollId: string, isPoll: boolean) => {
  return useQuery({
    queryKey: ["poll", pollId],
    queryFn: () => getPollById(pollId),
    enabled: !!pollId && isPoll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateMembershipRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<
    Models.Document,
    Error,
    { groupId: string[]; userId: string[] }
  >({
    mutationFn: ({ groupId, userId }) =>
      createMembershipRequest(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["membershipRequests"]);
    },
    onError: (error) => {
      console.error("Error creating membership request:", error);
    },
  });
};

// Hook to fetch membership requests for a specific group
export const useGetMembershipRequestsByGroup = (groupId: string) => {
  return useQuery({
    queryKey: ["membershipRequestsByGroup", groupId],
    queryFn: () => getMembershipRequests(groupId),
    enabled: !!groupId, // Only fetch if groupId is provided
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes to reduce API calls
    cacheTime: 1000 * 60 * 10, // Keep in memory for 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
    refetchOnReconnect: false, // Prevent refetch on network reconnect
    retry: 2, // Limit retries to avoid Error 524
    select: (data) => data.documents, // Extract documents directly
    onError: (error) =>
      console.error("Error fetching membership requests:", error),
  });
};

//===================================================================

export const useGetUserVotes = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ["userVotes", userId],
    queryFn: ({ pageParam = "" }) => getVotesByUser(userId, pageParam),
    getNextPageParam: (lastPage) => {
      if (!lastPage?.length) return null;
      return lastPage[lastPage.length - 1].$id;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    cacheTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onError: (error) => {
      console.error("Error loading user votes:", error);
    },
  });
};

//=============================================================================

export function useGetAccount() {
  return useQuery({
    queryKey: ["account"], // Unique key for caching
    queryFn: getAccount,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    cacheTime: 1000 * 60 * 60, // Keep data in cache for 1 hour
    retry: false, // Avoid retrying failed requests unnecessarily
  });
}

//============================================================================

export const useGetGroupContent = (groupId: string, search?: string) => {
  return useInfiniteQuery({
    queryKey: ["groupContent", groupId, search],
    queryFn: ({ pageParam }) =>
      fetchGroupContent({ pageParam, groupId, search }),
    getNextPageParam: (lastPage) => {
      if (lastPage.documents.length === 0) return null;
      return lastPage.documents[lastPage.documents.length - 1].$id;
    },
    enabled: !!groupId,
  });
};

export const useGetMembershipRequests = (groupId: string, enabled: boolean) => {
  return useQuery<{ documents: Models.Document[] }, Error>({
    queryKey: ["membershipRequests", groupId],
    queryFn: () => getMembershipRequests(groupId),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useAcceptMembershipRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      groupId,
      userId,
      adminId,
    }: {
      requestId: string;
      groupId: string;
      userId: string;
      adminId: string;
    }) => acceptMembershipRequest({ requestId, groupId, userId, adminId }),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries(["membershipRequests", groupId]);
      queryClient.invalidateQueries(["group", groupId]); // Refresh group data to reflect new member
    },
    onError: (error) => {
      console.error("Error accepting membership request:", error);
    },
  });
};

export const useRejectMembershipRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      adminId,
    }: {
      requestId: string;
      adminId: string;
    }) => rejectMembershipRequest({ requestId, adminId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["membershipRequests"]);
    },
    onError: (error) => {
      console.error("Error rejecting membership request:", error);
    },
  });
};

// Add this mutation hook to the existing queries
export const useDeleteMembershipRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (requestId) => deleteMembershipRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries(["membershipRequests"]);
    },
    onError: (error) => {
      console.error("Error deleting membership request:", error);
    },
  });
};

export const useSetPendingMembershipRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => setPendingMembershipRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries(["membershipRequests"]);
    },
    onError: (error) => {
      console.error("Error setting membership request to pending:", error);
    },
  });
};

// ============================== GET USER NOTIFICATIONS

export function useGetUserNotifications(userId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => getUserNotifications(userId),
    enabled: !!userId, // Only run if userId is provided
    staleTime: 1000 * 60 * 2, // Keep data fresh for 2 minutes
    cacheTime: 1000 * 60 * 10, // Cache notifications for 10 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches when tab regains focus
    onSuccess: (data) => {
      const unreadCount = data.documents.filter((n) => !n.isRead).length;
      queryClient.setQueryData(["unreadNotifications", userId], unreadCount);
    },
  });
}

// ============================== MARK NOTIFICATION AS READ

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationAsRead(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries(["notifications"]); // Prevent race conditions

      const previousNotifications = queryClient.getQueryData<{
        documents: any[];
      }>(["notifications"]);

      queryClient.setQueryData(
        ["notifications"],
        (oldData: { documents: any[] } | undefined) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            documents: oldData.documents.map((n) =>
              n.$id === notificationId ? { ...n, isRead: true } : n
            ),
          };
        }
      );

      return { previousNotifications };
    },
    onError: (error, notificationId, context) => {
      console.error("Error marking notification as read:", error);

      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(["notifications"]);
    },
  });
}

//============================================================

export const useGetCategoryNameById = (categoryId?: string) => {
  return useQuery({
    queryKey: ["categoryName", categoryId],
    queryFn: () => getCategoryNameById(categoryId!),
    enabled: !!categoryId, // Only fetch if categoryId is defined
    staleTime: 1000 * 60 * 60, // Cache for 1 hour as category names rarely change
    cacheTime: 1000 * 60 * 120, // Keep in memory for 2 hours
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
    refetchOnReconnect: false, // Prevent refetch on network reconnect
    retry: 2, // Limit retries to avoid overloading the backend
    onError: (error) => console.error("Error fetching category name:", error),
  });
};

// ============================== REACT QUERY HOOK FOR LIKE COMMENT

export const useLikeComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      likesArray,
    }: {
      commentId: string;
      likesArray: string[];
    }) => {
      return await likeComment(commentId, likesArray);
    },

    onSuccess: async (updatedComment) => {
      if (!updatedComment?.$id) return;

      const likeCount = updatedComment.likes.length;
      if (likeCount == 10) {
        await updateUserLevelAndPoints(
          updatedComment.userIdString,
          UserAction.COMMENT_LIKED_10
        );
      } else if (likeCount == 50) {
        await updateUserLevelAndPoints(
          updatedComment.userIdString,
          UserAction.COMMENT_LIKED_50
        );
      }

      // Invalidate the cache of comments to refresh the likes count
      queryClient.invalidateQueries(["comments", updatedComment.postIdString]);

      // Invalidate notifications to refresh the UI
      queryClient.invalidateQueries(["notifications"]);

      // Optimized refetch of notifications
      queryClient.fetchQuery(["notifications"], () =>
        getUserNotifications(updatedComment.userIdString)
      );
    },

    onError: (error) => {
      console.error("Mutation error for likeComment:", error);
    },
  });
};

//===================================================================

export const useIsBlocked = (blockerId: string, blockedId: string) => {
  return useQuery({
    queryKey: ["isBlocked", blockerId, blockedId],
    queryFn: () => isBlocked(blockerId, blockedId),
    enabled: !!blockerId && !!blockedId, // only run if IDs exist
  });
};

export const useGetBlockedUserIds = (userId: string) => {
  return useQuery({
    queryKey: ["blockedUserIds", userId],
    queryFn: () => getBlockedUserIds(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockerId,
      blockedId,
      unblock = false,
    }: {
      blockerId: string;
      blockedId: string;
      unblock?: boolean;
    }) => {
      return unblock
        ? unblockUser(blockerId, blockedId)
        : blockUser(blockerId, blockedId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isBlocked"] });
      queryClient.invalidateQueries({ queryKey: ["blockedUserIds"] });
      queryClient.invalidateQueries({ queryKey: ["combinedContent"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      // Force refetch all queries
      queryClient.refetchQueries({ queryKey: ["combinedContent"] });
    },
  });
};

export const useMessages = (chatId: string, limit: number) => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.MESSAGES, chatId],
    queryFn: ({ pageParam = 0 }) => 
      fetchMessages({ chatId, limit, offset: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, page) => acc + page.documents.length, 0);
      return totalFetched < lastPage.total ? totalFetched : undefined;
    },
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!chatId,
    refetchOnWindowFocus: false,
  });
};
// Mark message as read mutation
export const useMarkMessageAsRead = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markMessageAsRead,
    onMutate: async (messageId: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.MESSAGES, chatId] });

      const previousData = queryClient.getQueryData([QUERY_KEYS.MESSAGES, chatId]);

      queryClient.setQueryData([QUERY_KEYS.MESSAGES, chatId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            documents: page.documents.map((msg: IChatMessage) =>
              msg.$id === messageId ? { ...msg, read: true } : msg
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (error, messageId, context) => {
      // Revert optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData([QUERY_KEYS.MESSAGES, chatId], context.previousData);
      }
      console.error("Failed to mark message as read:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESSAGES, chatId] });
    },
  });
};

// Toggle message like mutation
export const useToggleMessageLike = (chatId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLikeMessage,
    onMutate: async ({ messageId, userId, currentLikedBy }: IToggleLikeMessageParams) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.MESSAGES, chatId] });

      const previousData = queryClient.getQueryData([QUERY_KEYS.MESSAGES, chatId]);

      const isAlreadyLiked = currentLikedBy.includes(userId);
      const updatedLikedBy = isAlreadyLiked
        ? currentLikedBy.filter((id) => id !== userId)
        : [...currentLikedBy, userId];

      queryClient.setQueryData([QUERY_KEYS.MESSAGES, chatId], (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            documents: page.documents.map((msg: IChatMessage) =>
              msg.$id === messageId ? { ...msg, likedBy: updatedLikedBy } : msg
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData([QUERY_KEYS.MESSAGES, chatId], context.previousData);
      }
      console.error("Failed to toggle message like:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESSAGES, chatId] });
    },
  });
};

export const useFetchSavedItems = (
  currentUser: Models.Document | undefined
) => {
  const userId = currentUser?.$id;
  const {
    data: saves = [],
    isLoading: savesLoading,
    isError,
  } = useGetUserSaves(userId);

  // Memoize queries to ensure stable array
  const queries = useMemo(
    () =>
      saves.map((save: SaveDocument) => ({
        queryKey: [
          save.isPoll ? "savedPoll" : "savedPost",
          save.isPoll ? save.polls?.$id : save.post?.$id,
        ],
        queryFn: async () => {
          const itemId = save.isPoll ? save.polls?.$id : save.post?.$id;
          if (!itemId) return null;
          try {
            const data = save.isPoll
              ? await getPollById(itemId)
              : await getPostById(itemId);
            return data
              ? { ...data, type: save.isPoll ? "poll" : "post" }
              : null;
          } catch (error) {
            console.error(
              `Error fetching ${save.isPoll ? "poll" : "post"} ${itemId}:`,
              error
            );
            return null;
          }
        },
        enabled: !!save.isPoll ? !!save.polls?.$id : !!save.post?.$id,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        retry: 1, // Limit retries
      })),
    [saves]
  );

  const results = useQueries({ queries });

  // Combine results and filter out null values
  const savedItems = useMemo(
    () =>
      results
        .map((result) => result.data)
        .filter(
          (item): item is SavedItem => item !== null && item !== undefined
        ),
    [results]
  );

  // Determine loading state
  const isLoading = savesLoading || results.some((result) => result.isLoading);

  return {
    savedItems,
    isLoading,
    isError,
  };
};
// ============================================================
// POINT HISTORY QUERIES
// ============================================================

export const useGetPointHistory = (userId: string) => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.GET_POINT_HISTORY, userId],
    queryFn: ({ pageParam }) =>
      getPointHistoryByUser({ userId, cursor: pageParam }),
    getNextPageParam: (lastPage: any) => {
      if (!lastPage || lastPage.documents.length === 0) {
        return null; // Stop pagination when no more data
      }
      return lastPage.documents[lastPage.documents.length - 1].$id; // Return last document ID for cursor
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2, // Retry failed requests twice
    enabled: !!userId, // Only run if userId is provided
  });
};

export const useCreatePointHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPointHistory,
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_POINT_HISTORY],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
    },
    onError: (error) => {
      console.error("Failed to create point history:", error);
    },
  });
};
// Hook to fetch a group by ID

export const useGetGroupById = (
  groupId: string | null | undefined,
  enabled: boolean = true
) => {
  return useQuery<Models.Document, Error>({
    queryKey: ["group", groupId],
    queryFn: async () => {
      if (!groupId || typeof groupId !== "string") {
        console.error("useGetGroupById: Invalid groupId, aborting query", {
          groupId,
        });
        throw new Error("Invalid groupId: groupId must be a non-empty string");
      }
      const group = await getGroupById(groupId);
      return group;
    },
    enabled: enabled && !!groupId && typeof groupId === "string",
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });
};

//==========================================================================================

export const useGreatPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      greatsArray,
      isPoll = false,
    }: {
      postId: string;
      greatsArray: string[];
      isPoll?: boolean;
    }) => {
      if (!postId) {
        console.error("useGreatPost: Missing postId");
        throw new Error("Post ID is required.");
      }

      // Call the service function to handle "Great" and notifications
      const updatedDocument = await greatPost(postId, greatsArray, isPoll);

      if (!updatedDocument) {
        console.error(
          "useGreatPost: Failed to update Great status, no document returned:",
          { postId, isPoll }
        );
        throw new Error("Failed to update Great status.");
      }

      // Award bonus points if applicable (only for questions)
      if (!isPoll) {
        const greatCount = updatedDocument.greatBy.length;
        let bonusPoints = 0;

        if (greatCount === 10) {
          await awardLikeBonusForQuestionForOwner(
            updatedDocument.creatorId,
            10
          );
          bonusPoints = 10;
        } else if (greatCount === 50) {
          await awardLikeBonusForQuestionForOwner(
            updatedDocument.creatorId,
            50
          );
          bonusPoints = 50;
        }

        if (bonusPoints > 0) {
        }
      }

      return updatedDocument;
    },

    onSuccess: (updatedDocument) => {
      if (!updatedDocument?.$id) {
        console.warn(
          "useGreatPost: No $id in updated document:",
          updatedDocument
        );
        return;
      }

      const postId = updatedDocument.$id;

      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_POST_BY_ID, postId]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_RECENT_POSTS]);
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
  });
};

//----------------------------------------------------

//======================================================================
// Define a minimal type for voted users to match the expected structure
interface VotedUser extends Partial<Models.Document> {
  $id: string;
  name: string;
  imageUrl: string | null;
}

// Hook to fetch voted users for a poll
export const useGetVotedUsersForPoll = (pollId: string) => {
  return useQuery({
    queryKey: ["votedUsers", pollId],
    queryFn: () => getVotedUsersForPoll(pollId),
    enabled: !!pollId,
    staleTime: 1000 * 60 * 2, // Reduced to 2 minutes for fresher data
    cacheTime: 1000 * 60 * 10, // Keep in memory for 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on focus
    refetchOnReconnect: false, // Prevent refetch on reconnect
    retry: 2, // Retry failed requests twice
    onError: (error) => {
      console.error(
        "useGetVotedUsersForPoll: Error fetching voted users for poll ID:",
        pollId,
        error
      );
    },
  });
};
//==========================================================================================================
export const useGetUsersByPointHistory = (
  dateRange?: { startDate?: string; endDate: string },
  filters: any[] = []
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USERS_BY_POINT_HISTORY, { dateRange, filters }],
    queryFn: () => getUsersByPointHistory(dateRange, filters),
    enabled: !!dateRange,
    staleTime: 1000 * 60 * 5, // 5 minutes cache freshness
    cacheTime: 1000 * 60 * 10, // 10 minutes in memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
    select: (data) => {
      return data.documents;
    },
    onError: (error) =>
      console.error("useGetUsersByPointHistory: Error fetching users:", error),
  });
};
//=============================================================================
export const useVerifyEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, secret }: { userId: string; secret: string }) =>
      verifyEmail(userId, secret),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
    onError: (error) => {
      console.error("Error verifying email:", error);
    },
  });
};
//============================================================================
export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      resendVerificationEmail(email, password),
    onSuccess: () => {},
    onError: (error) => {
      console.error("Error resending verification email:", error);
    },
  });
};
//===============================================================================
export const useUpdateUserEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      originalEmail,
      newEmail,
      password,
    }: {
      accountId: string;
      originalEmail: string;
      newEmail: string;
      password: string;
    }) => updateUserEmail(accountId, originalEmail, newEmail, password),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
    onError: (error) => {
      console.error("Error updating user email:", error);
    },
  });
};
//==================================================================================
export const useCreatePasswordRecovery = () => {
  return useMutation({
    mutationFn: ({
      email,
      redirectUrl,
    }: {
      email: string;
      redirectUrl: string;
    }) => createPasswordRecovery(email, redirectUrl),
    onSuccess: () => {},
    onError: (error) => {
      console.error("Error sending password recovery email:", error);
    },
  });
};

export const useUpdatePasswordRecovery = () => {
  return useMutation({
    mutationFn: ({
      userId,
      secret,
      password,
      confirmPassword,
    }: {
      userId: string;
      secret: string;
      password: string;
      confirmPassword: string;
    }) => updatePasswordRecovery(userId, secret, password, confirmPassword),
    onSuccess: () => {},
    onError: (error) => {
      console.error("Error resetting password:", error);
    },
  });
};
//====================================================================

export const useSignInWithGoogle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => signInWithGoogle(),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
    onError: (error: any) => {
      console.error("Erreur dans useSignInWithGoogle:", {
        message: error.message,
        code: error.code,
        type: error.type,
      });
    },
  });
};

export const useSignInWithFacebook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => signInWithFacebook(),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
    onError: (error: any) => {
      console.error("Erreur dans useSignInWithFacebook:", {
        message: error.message,
        code: error.code,
        type: error.type,
      });
    },
  });
};
//===========================================================================================
// Hook to check nickname availability
export const useCheckNicknameAvailability = (nickname: string) => {
  return useQuery({
    queryKey: ["checkNickname", nickname],
    queryFn: () => checkNicknameAvailability(nickname),
    enabled: !!nickname && nickname.length >= 3, // Only run if nickname is at least 3 characters
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    retry: 2, // Limit retries to avoid overloading
    onError: (error) => {
      console.error("Error checking nickname availability:", error);
    },
  });
};

//User Wallet

// Mutation to increase wallet balance
export const useIncreaseWalletBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      increaseWalletBalance(userId, amount),
    onSuccess: (variables) => {
      // Invalidate user query to refresh walletBalance
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      toast.success(`Wallet topped up by €${variables.amount}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to top up wallet");
    },
  });
};

// Mutation to decrease wallet balance
export const useDecreaseWalletBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, amount }: { userId: string; amount: number }) =>
      decreaseWalletBalance(userId, amount),
    onSuccess: (variables) => {
      // Invalidate user query to refresh walletBalance
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      toast.success(`€${variables.amount} deducted from wallet`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deduct from wallet");
    },
  });
};
//===================================================================
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      preferences,
    }: {
      userId: string;
      preferences: INotificationPreferences;
    }) => updateNotificationPreferences(userId, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEYS.GET_CURRENT_USER]);
    },
    onError: (error) => {
      console.error("Error updating notification preferences:", error);
    },
  });
};
//=========================================================================================
export const useCheckFileExists = (fileId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.CHECK_FILE_EXISTS, fileId],
    queryFn: async () => {
      if (!fileId) {
        return false;
      }

      try {
        // Check if file exists by making a HEAD request or similar
        const response = await fetch(`/api/files/${fileId}/exists`, {
          method: "HEAD",
        });

        const exists = response.ok;
        return exists;
      } catch (error) {
        console.error("Error checking file existence:", error);
        // If we can't check, assume it exists to avoid blocking the UI
        return true;
      }
    },
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};
//============================================================================================
export const useGetUserMembershipStatus = (groupId?: string) => {
  const { data: currentUser } = useGetCurrentUser();

  return useQuery({
    queryKey: ["membershipStatus", groupId, currentUser?.$id],
    queryFn: () => getUserMembershipStatus(groupId!, currentUser!.$id),
    enabled: !!groupId && !!currentUser?.$id,
  });
};
//=============================================================================================

export const useLockPostComments = () => {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  return useMutation({
    mutationFn: ({
      postId,
      duration,
    }: {
      postId: string;
      duration: number | "permanent";
    }) => lockPostComments(postId, duration, user.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["postById", variables.postId]);
    },
    onError: (error) => {
      console.error("Error in lock post comments mutation:", error);
    },
  });
};

export const useUnlockPostComments = () => {
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  return useMutation({
    mutationFn: ({ postId, groupId }: { postId: string; groupId?: string }) =>
      unlockPostComments(postId, user.id, groupId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["postById", variables.postId]);
    },
    onError: (error) => {
      console.error("Error in unlock post comments mutation:", error);
    },
  });
};

// Type definition for lockPollComments mutation parameters
export type LockPollCommentsParams = {
  pollId: string;
  duration: number | "permanent";
  lockedBy: string;
};

// Type definition for unlockPollComments mutation parameters
export type UnlockPollCommentsParams = {
  pollId: string;
  groupId?: string;
  userId: string;
};

export const useLockPollComments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, duration, lockedBy }: LockPollCommentsParams) =>
      lockComments(pollId, duration, lockedBy),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["pollById", variables.pollId]);
    },
    onError: (error) => {
      console.error("Error in lock poll comments mutation:", error);
    },
  });
};

export const useUnlockPollComments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, groupId, userId }: UnlockPollCommentsParams) =>
      unlockComments(pollId, userId, groupId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(["pollById", variables.pollId]);
    },
    onError: (error) => {
      console.error("Error in unlock poll comments mutation:", error);
    },
  });
};
//=================================================================================
export const useAcceptGroupInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { invitationId: string; userId: string }>({
    mutationFn: ({ invitationId, userId }) =>
      acceptGroupInvitation(invitationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["group"]);
      queryClient.invalidateQueries(["groupInvitation"]);
    },
    onError: (error) => {
      console.error("Error accepting group invitation:", error);
    },
  });
};

// Hook to decline a group invitation
export const useDeclineGroupInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { invitationId: string; userId: string }>({
    mutationFn: ({ invitationId, userId }) =>
      declineGroupInvitation(invitationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["groupInvitation"]);
    },
    onError: (error) => {
      console.error("Error declining group invitation:", error);
    },
  });
};

export const useCreateGroupInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGroupInvitation,

    onError: (error) => {
      console.error("[DEBUG] Mutation error in useCreateGroupInvitation:", error);
    },
  });
};
//======================================================================================
export const useGetGroupInvitations = (userId: string) => {
  return useQuery({
    queryKey: ["groupInvitations", userId],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments<IGroupInvitation>(
          appwriteConfig.databaseId,
          appwriteConfig.groupInvitationsCollectionId,
          [
            Query.equal("inviteeId", userId),
            Query.equal("status", "pending"),
            Query.orderDesc("createdAt"),
            Query.limit(10),
          ]
        );

        // Fetch group, inviter, and notification details in bulk
        const groupIds = response.documents.map(
          (invitation) => invitation.groupId
        );
        const inviterIds = response.documents.map(
          (invitation) => invitation.inviterId
        );
        const invitationIds = response.documents.map(
          (invitation) => invitation.$id
        );
        const uniqueIds = [...new Set([...groupIds, ...inviterIds])];

        const [groupsResponse, usersResponse, notificationsResponse] =
          await Promise.all([
            databases.listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.groupsCollectionId,
              groupIds.length > 0 ? [Query.equal("$id", groupIds)] : []
            ),
            databases.listDocuments(
              appwriteConfig.databaseId,
              appwriteConfig.userCollectionId,
              uniqueIds.length > 0 ? [Query.equal("$id", uniqueIds)] : []
            ),
            databases.listDocuments<INotification>(
              appwriteConfig.databaseId,
              appwriteConfig.notificationsCollectionId,
              invitationIds.length > 0
                ? [
                    Query.equal("relatedEntityId", invitationIds),
                    Query.equal("types", "GROUP_INVITATION"),
                  ]
                : []
            ),
          ]);

        const groupMap = Object.fromEntries(
          groupsResponse.documents.map((group) => [group.$id, group.name])
        );
        const userMap = Object.fromEntries(
          usersResponse.documents.map((user) => [
            user.$id,
            user.name || "Anonymous",
          ])
        );
        const notificationMap = Object.fromEntries(
          notificationsResponse.documents.map((notification) => [
            notification.relatedEntityId,
            notification.message,
          ])
        );

        const enrichedInvitations = response.documents.map((invitation) => ({
          ...invitation,
          groupName: groupMap[invitation.groupId] || "Unknown Group",
          inviterName: userMap[invitation.inviterId] || "Anonymous",
          message:
            notificationMap[invitation.$id] || "Invitation to join a group",
        }));

        return { documents: enrichedInvitations };
      } catch (error) {
        console.error("Error fetching group invitations:", error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
//============================================================
export const useGetEffectiveMembers = (groupId: string, isAdmin: boolean) => {
  return useQuery(["effectiveMembers", groupId, isAdmin], () =>
    getEffectiveMembers(groupId, isAdmin)
  );
};
//===========================================================================
export const useGetPendingInvitation = (
  groupId: string,
  userId: string,
  enabled: boolean
) => {
  return useQuery<Models.Document | null, Error>({
    queryKey: ["groupInvitation", groupId, userId],
    queryFn: () => getPendingInvitation(groupId, userId),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });
};
//=======================================================================

export const useFetchGroupContent = ({
  groupId,
  search,
}: {
  groupId: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ["groupContent", groupId, search],
    queryFn: async () => {
      const response = await fetchGroupContent({
        groupId,
        search,
        pageParam: undefined,
      });
      return response.documents as unknown as GroupContent[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    enabled: !!groupId, // Only fetch if groupId is provided
  });
};

export const useGetLikedPosts = (userId: string) => {
  return useQuery<(Post & Models.Document)[]>({
    queryKey: ["likedPosts", userId],
    queryFn: async () => {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        [Query.equal("likedBy", userId)]
      );
      return response.documents as (Post & Models.Document)[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGetLikedPolls = (userId: string) => {
  return useQuery<(IPoll & Models.Document)[]>({
    queryKey: ["likedPolls", userId],
    queryFn: async () => {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.pollsCollectionId,
        [Query.equal("likedBy", userId)]
      );
      return response.documents as (IPoll & Models.Document)[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
//=================================================================================
// File: src/lib/react-query/queries.ts (or the file containing useSavePost and useDeleteSavedPost)
// Insertion: Add the following function after useDeleteSavedPost

export const useIsSaved = (postId: string, isPoll: boolean, userId: string) => {
  return useQuery({
    queryKey: ["isSaved", postId, isPoll, userId],
    queryFn: async () => {
      if (!userId || !postId) {
        return { isSaved: false };
      }
      const field = isPoll ? "pollId" : "postId";
      const saves = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.savesCollectionId,
        [
          Query.equal("userId", userId),
          Query.equal(field, postId),
          Query.limit(1),
        ]
      );
      return { isSaved: saves.documents.length > 0 };
    },
    enabled: !!userId && !!postId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};
//===============================================================================================
// Interface for saved items
interface SavedItem extends Models.Document {
  type: "post" | "poll";
  groupIdString?: string;
}

// Interface for save documents
interface SaveDocument extends Models.Document {
  isPoll: boolean;
  post?: { $id: string };
  polls?: { $id: string };
  user: { $id: string };
}
export const useGetUserSaves = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["userSaves", userId],
    queryFn: async () => {
      if (!userId) return [];
      const saves = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.savesCollectionId,
        [Query.equal("user", userId)]
      );
      return saves.documents as SaveDocument[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1, // Limit retries to avoid excessive API calls
  });
};
//========================================================================
// In ./lib/react-query/queries.ts
export const useSearchUsersByPrefix = (prefix: string | null, limit = 10) => {
  return useQuery({
    queryKey: ["searchUsers", prefix],
    queryFn: () => searchUsersByPrefix(prefix || "", limit),
    enabled: !!prefix && prefix.length >= 1,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
//==============================================================================

// Fetch user details by IDs for mentions
export const useGetUsersByIds = (userIds: string[]) => {
  return useQuery<UserDetails[], Error>({
    queryKey: ["usersByIds", userIds.sort().join(",")], // Sort for consistent cache key
    queryFn: async () => {
      const users = await getUserDocumentsByIds(userIds);
      return users as UserDetails[];
    },
    enabled: !!userIds && userIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};
//===================================================================
export const usePublishPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => publishPost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["userPosts"] });
    },
    onError: (error: any) => {
      console.error("Error publishing post:", error);
    },
  });
};
//=======================================================================
export const useGetUserDrafts = (userId: string, groupId?: string) => {
  return useQuery({
    queryKey: ["userDrafts", userId, groupId],
    queryFn: async () => {
      if (!userId) {
        console.warn("useGetUserDrafts: No userId provided");
        return { documents: [], total: 0 };
      }
      const drafts = await getUserDrafts(userId, groupId);
      return drafts;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    onError: (error) => {
      console.error("useGetUserDrafts: Query error", {
        userId,
        groupId,
        error,
      });
    },
  });
};
//===================================================================================
export const usePublishPoll = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (pollId: string) => publishPoll(pollId),
    onSuccess: (_, pollId) => {
      // Invalidate queries to refresh poll and drafts data
      queryClient.invalidateQueries({ queryKey: ["poll", pollId] });
      queryClient.invalidateQueries({ queryKey: ["userDrafts"] });
      toast({
        title: "Poll published successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to publish poll",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });
};
//==========================================================================================
export const useUpdateEmailPreferences = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      preferences,
    }: {
      userId: string;
      preferences: INotificationPreferences;
    }) => {
      const result = await updateEmailPreferences(userId, preferences);
      return result;
    },
  });
};
//===============================================================
export const useGreatPoll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pollId,
      greatsArray,
    }: {
      pollId: string;
      greatsArray: string[];
    }) => greatPoll(pollId, greatsArray),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pollById"] });
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
    onError: (error) => {
      console.error("useGreatPoll: Mutation error", error);
    },
  });
};
//================================================================================
export const useLockComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, postId, isPoll }: {
      commentId: string;
      postId: string;
      isPoll: boolean;
    }) => lockComment({ commentId, postId, isPoll }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['commentsByPostId'] });
    },
    onError: (error) => {
      console.error("Error in useLockComment:", error);
    },
  });
};
//=======================================================================
export const useSendContactEmail = () => {
  return useMutation({
    mutationFn: (data: ContactFormData) => sendContactEmail(data),
    onSuccess: (data) => {
    },
    onError: (error) => {
      console.error('Failed to send contact email:', error);
    },
  });
};
//==========================================================================
export const useGetReactionsByCommentId = (commentId: string) => {
  return useQuery<IReaction[]>({
    queryKey: ["reactions", commentId],
    queryFn: () => getReactionsByCommentId(commentId),
    enabled: !!commentId,
    staleTime: 300000, // 5 minutes to reduce refetches
  });
};

export const useReactToComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, userId, emoji }: { commentId: string; userId: string; emoji: string | null }) =>
      reactToComment(commentId, userId, emoji),
    onSuccess: (_, { commentId }) => {
      queryClient.invalidateQueries({ queryKey: ["reactions", commentId] });
    },
  });
};
//======================================================================================================
export const useFetchGroup = (groupId: string) => {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById(groupId),
    enabled: !!groupId, // Avoid query if no groupId
  });
};

// Add this new mutation hook at the end of the file (after useFetchGroup)
export const useRemoveMemberFromGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeMemberFromGroup,
    onSuccess: (_, variables) => {
      const { groupId } = variables;
      // Targeted invalidations: Refresh group data (for modal prop) and effective members (for tabs list)
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["effectiveMembers", groupId] });
    },
    onError: (error, variables) => {
      const { groupId, userId } = variables;
      console.error(`[DEBUG] Mutation error removing ${userId} from ${groupId}:`, error);
    },
  });
};
//=======================================================================================================
export const useGetUserVotedPollsCount = (userId?: string) =>
  useQuery<number>({
    queryKey: ['userVotedPollsCount', userId],
    queryFn: () => getUserVotedPollsCount(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

export const useGetUserCommentCount = (userId?: string) =>
  useQuery<number>({
    queryKey: ['userCommentCount', userId],
    queryFn: () => getUserCommentCount(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  //===================================================================

export const useGetRelatedPosts = (creatorId: string, currentPostId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["relatedPosts", creatorId, currentPostId],
    queryFn: () => getUserPosts(creatorId, 6), // Fetch 6 related posts
    enabled: enabled && !!creatorId && creatorId !== "unknown",
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    select: (data) => {
      
      if (!data || !Array.isArray(data)) {
        console.warn("useGetRelatedPosts: Invalid data format received", data);
        return [];
      }
      
      // Filter out current post and drafts, then limit to 4 posts
      const filteredPosts = data
        .filter((post) => {
          const isNotCurrentPost = post.$id !== currentPostId;
          const isNotDraft = !post.isDraft;
          return isNotCurrentPost && isNotDraft;
        })
        .slice(0, 4)
        .map((post) => ({ ...post, type: "post" as const }));
      

      
      return filteredPosts;
    },
  });
};