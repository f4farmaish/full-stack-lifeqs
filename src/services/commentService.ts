import { account, appwriteConfig, databases } from "@/lib/appwrite/config";
import { getCurrentUser } from "./authService";
import { getPollById } from "./pollService";
import { deleteFile, getFileview, getPostById, uploadFile } from "./postService";
import { getGroupById, updateGroupActivityTimestamp } from "./groupService";
import { ID, Query } from "appwrite";
import { createNotification } from "./notificationsService";
import { awardCommentLikeBonusForOwner} from "./userService";
import { INotificationType, CommentData, Post, IPoll } from "@/types";
import { createReaction, deleteReaction } from "./reactionService";

export async function createComment(comment: CommentData) {
  try {
    // Verify user authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error("createComment: User is not authenticated");
      throw new Error("User is not authenticated.");
    }

    // Verify Appwrite session
    await account.get();

    // Fetch the associated post or poll
    const postOrPoll: Post | IPoll = comment.isPoll
      ? await getPollById(comment.postId)
      : await getPostById(comment.postId);

    if (!postOrPoll) {
      console.error(
        `createComment: Post/Poll not found for ID: ${comment.postId}`
      );
      throw new Error(`Post/Poll not found for ID: ${comment.postId}`);
    }

    // Check if post/poll is locked and comment is a reply
    if (comment.parentCommentId && postOrPoll.commentsLocked) {
      throw new Error("Cannot reply to comments on a locked post or poll.");
    }

    // Extract groupId safely, prioritizing CommentData's groupId
    const resolvedGroupId: string | null =
      comment.groupId || postOrPoll.groupIdString || null;

    // Verify group membership if groupId exists
    if (resolvedGroupId) {
      const group = await getGroupById(resolvedGroupId);
      if (!group || !group.memberIds.includes(currentUser.$id)) {
        console.error(
          `createComment: User ${currentUser.$id} is not a member of group ${resolvedGroupId}`
        );
        throw new Error("User is not a member of this group.");
      }
    }
    let parentCommentId = comment.parentCommentId || null;
    if (parentCommentId) {
      const parentComment = await getCommentById(parentCommentId);
      if (parentComment.isLocked) {
        throw new Error("Cannot reply to locked comment.");
      }
      // Find root parent for flattening
      parentCommentId = await findRootParentId(parentCommentId);
    }

    let imageUrls: string[] = [];
    let imageIds: string[] = [];
    if (comment.imageFiles && comment.imageFiles.length > 0) {
      for (const file of comment.imageFiles) {
        try {
          const uploadedFile = await uploadFile(file);
          if (uploadedFile) {
            const fileUrl = getFileview(uploadedFile.$id);
            if (fileUrl) {
              imageUrls.push(fileUrl);
              imageIds.push(uploadedFile.$id);
            }
          }
        } catch (error) {
          console.error("createComment: Failed to upload image:", error);
        }
      }
    }

    // Prepare the comment payload
    const commentPayload = {
      postIdString: comment.postId,
      userIdString: comment.userId,
      content: comment.content,
      isAnonymous: comment.isAnonymous,
      isPoll: comment.isPoll || false,
      createdAt: new Date().toISOString(),
      parentCommentId,
      userName: comment.userName,
      userImageUrl: comment.userImageUrl,
      likes: [],
      likeCount: 0,
      mentionedUserIds: comment.mentionedUserIds || [],
      groupId: resolvedGroupId ? [resolvedGroupId] : [],
      isLocked: false,
      replyCount: 0,
      imageUrls,
      imageIds,
    };

    // Create the comment in the database
    const newComment = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      ID.unique(),
      commentPayload
    );

    // Increment replyCount on parent if applicable
    if (parentCommentId) {
      const parent = await getCommentById(parentCommentId);
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        parentCommentId,
        { replyCount: (parent.replyCount || 0) + 1 }
      );
    }

    // Notify mentioned users
    await notifyMentionedUsers(comment, newComment.$id, postOrPoll);

    // Update group activity if applicable
    if (resolvedGroupId) {
      await updateGroupActivityTimestamp(resolvedGroupId);
    }

    // Notify the post/poll creator (if not a reply)
    const postCreatorId: string | null =
      postOrPoll.creatorId || postOrPoll.creator?.$id || null;
    if (
      !comment.parentCommentId &&
      postCreatorId &&
      postCreatorId !== comment.userId
    ) {
      await handlePostCommentNotification(comment, postCreatorId);
    }

    // Notify the parent comment owner if it's a reply
    if (comment.parentCommentId) {
      await handleReplyNotification(comment);
    }

    return newComment;
  } catch (error) {
    console.error("[createComment] Error creating comment:", error);
    throw error;
  }
}
//============================================================================================================
export async function getCommentsById(
  id: string,
  isPoll: boolean = false,
  limit: number = 20,
  cursor?: string,
  sortBy: "date" | "likes" = "likes"
) {
  try {
    let orderQuery;
    if (sortBy === "date") {
      orderQuery = Query.orderDesc("createdAt"); // Newest first
    } else if (sortBy === "likes") {
      orderQuery = Query.orderDesc("likeCount"); // Most liked first
    } else {
      orderQuery = Query.orderDesc("likeCount"); // Default to likes
    }

    const queries = [
      Query.equal("postIdString", id),
      orderQuery,
      Query.limit(limit),
    ];

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const commentsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      queries
    );

    return {
      documents: commentsResponse.documents,
      cursor: commentsResponse.documents.length
        ? commentsResponse.documents[commentsResponse.documents.length - 1].$id
        : null,
    };
  } catch (error) {
    console.error("Error fetching comments by ID:", error);
    throw error;
  }
}
//=========================================================================================================
export async function updateComment(commentId: string, content: string) {
  try {
    const comment = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId
    );

    const commentCreationTime = new Date(comment.$createdAt).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (currentTime - commentCreationTime > fiveMinutes) {
      throw new Error("Cannot edit after 5 minutes.");
    }

    const updatedComment = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId,
      { content }
    );

    return updatedComment;
  } catch (error) {
    console.error("Error updating the comment:", error);
    throw error;
  }
}
//=============================================================================================
export async function deleteComment(commentId: string) {
  try {
    const comment = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId
    );

    const creationTime = new Date(comment.$createdAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - creationTime > fiveMinutes) {
      throw new Error("Cannot delete after 5 minutes.");
    }

    if (comment.imageIds && comment.imageIds.length > 0) {
      await Promise.all(
        comment.imageIds.map(async (id: string) => {
          try {
            await deleteFile(id);
          } catch (error) {
            console.error(`Failed to delete image ${id} for comment ${commentId}:`, error);
          }
        })
      );
    }

    // Decrement replyCount on parent if applicable
    if (comment.parentCommentId) {
      const parent = await getCommentById(comment.parentCommentId);
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        comment.parentCommentId,
        { replyCount: Math.max(0, (parent.replyCount || 0) - 1) }
      );
    }

    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId
    );
  } catch (error) {
    console.error("Error deleting the comment:", error);
    throw error;
  }
}
//=================================================================================================
export async function lockComment({ commentId, postId, isPoll }: { commentId: string, postId: string, isPoll: boolean }) {
  try {
    // Validate input parameters
    if (!commentId || typeof commentId !== 'string') {
      throw new Error("Invalid comment ID provided.");
    }

    if (!postId || typeof postId !== 'string') {
      throw new Error("Invalid post ID provided.");
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("User is not authenticated.");
    }

    // Get the comment to check ownership
    const comment = await getCommentById(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }

    // Get the post/poll to check ownership
    const postOrPoll: Post | IPoll = isPoll
      ? await getPollById(postId)
      : await getPostById(postId);

    if (!postOrPoll) {
      throw new Error(`Post/Poll not found for ID: ${postId}`);
    }

    const postCreatorId = postOrPoll.creatorId || postOrPoll.creator?.$id;
    const isCommentOwner = comment.userIdString === currentUser.$id;
    const isPostOwner = postCreatorId === currentUser.$id;

    // Check if user can lock this comment
    if (!isCommentOwner && !isPostOwner) {
      throw new Error("You can only lock your own comments or comments on your posts.");
    }

    // If post owner is trying to lock someone else's comment, check the limit
    if (isPostOwner && !isCommentOwner) {
      // Count how many comments the post owner has locked on this post
      const lockedComments = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        [
          Query.equal("postIdString", postId),
          Query.equal("isLocked", true),
          Query.notEqual("userIdString", postCreatorId) // Don't count self-locked comments
        ]
      );

      if (lockedComments.total >= 5) {
        throw new Error("You can only lock up to 5 comments per post.");
      }
    }

    await lockRecursively(commentId, true, currentUser.$id);
  } catch (error) {
    console.error("Error locking comment:", error);
    throw error;
  }
}
//===================================================================================================
async function handlePostCommentNotification(
  comment: CommentData,
  postCreatorId: string
) {
  // Fetch the post or poll
  const postOrPoll = comment.isPoll
    ? await getPollById(comment.postId)
    : await getPostById(comment.postId);

  if (!postOrPoll) {
    console.error("Post/Poll not found:", comment.postId);
    return;
  }

  // Determine if it is a poll or a post
  let contentTitle: string;
  if ("question" in postOrPoll) {
    contentTitle = postOrPoll.question;
  } else if ("title" in postOrPoll) {
    contentTitle = postOrPoll.title;
  } else {
    console.error("Failed to retrieve content title for notification.");
    return;
  }

  // Truncate the title for readability
  const truncatedTitle =
    contentTitle.length > 80
      ? `${contentTitle.substring(0, 77)}...`
      : contentTitle;

  // Determine the post type
  const postTypeMessage = comment.isPoll ? "poll" : "question";
  let notificationMessage = `${comment.userName} commented on your ${postTypeMessage} \"${truncatedTitle}\"`;

  // Check for an existing notification
  const existingNotifications = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.notificationsCollectionId,
    [
      Query.equal("userId", postCreatorId),
      Query.equal("relatedEntityId", comment.postId),
      Query.equal("types", "COMMENT_POST"),
    ]
  );

  if (existingNotifications.documents.length > 0) {
    const notification = existingNotifications.documents[0];
    const firstCommenterName = notification.message.split(" ")[0];

    if (firstCommenterName !== comment.userName) {
      notificationMessage = `${comment.userName} and others commented on your ${postTypeMessage} \"${truncatedTitle}\"`;
    }

    // Update the existing notification while ensuring isRead is reset to false
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      notification.$id,
      {
        message: notificationMessage,
        isRead: false, // Reset to false to indicate new activity
        lastUpdatedAt: new Date().toISOString(),
      }
    );
  } else {
    // Create a new notification if none exist
    await createNotification({
      userId: postCreatorId,
      type: "COMMENT_POST",
      message: notificationMessage,
      relatedEntityId: comment.postId,
    });
  }
}

//===============================================================================
async function handleReplyNotification(comment: CommentData) {
  if (!comment.parentCommentId) {
    return;
  }

  const parentComment: any = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.commentsCollectionId,
    comment.parentCommentId
  );

  if (!parentComment) {
    console.error("Parent comment not found.");
    return;
  }

  if (parentComment.userIdString === comment.userId) {
    return;
  }

  const existingReplyNotifications = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.notificationsCollectionId,
    [
      Query.equal("userId", parentComment.userIdString),
      Query.equal("relatedEntityId", comment.parentCommentId),
      Query.equal("types", "REPLY_TO_COMMENT"),
    ]
  );

  let replyMessage = `${comment.userName} replied to your comment.`;

  if (existingReplyNotifications.documents.length > 0) {
    const notification = existingReplyNotifications.documents[0];
    replyMessage = `${comment.userName} and others replied to your comment.`;

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      notification.$id,
      {
        message: replyMessage,
        isRead: false,
        lastUpdatedAt: new Date().toISOString(),
      }
    );
  } else {
    await createNotification({
      userId: parentComment.userIdString,
      type: "REPLY_TO_COMMENT",
      message: replyMessage,
      relatedEntityId: comment.parentCommentId,
    });
  }
}
//===========================================================================================
export async function likeComment(commentId: string, likesArray: string[]) {
  try {
    // Fetch the comment
    const existingComment = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId
    );

    if (!existingComment) {
      throw new Error("Comment not found.");
    }

    // Update likes and likeCount in the database
    const updatedComment = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId,
      { likes: likesArray, likeCount: likesArray.length }
    );

    // Check if a new like was added
    const isLikedNow = likesArray.length > existingComment.likes.length;
    if (!isLikedNow) {
      return updatedComment;
    }

    // Fetch the comment author
    const commenterId = existingComment.userIdString;
    if (!commenterId) {
      console.error("Commenter ID undefined. Cannot send notification.");
      return updatedComment;
    }

    // Fetch the user who liked the comment
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error("Failed to retrieve current user.");
      return updatedComment;
    }

    // Fetch the associated post or poll
    const postOrPoll = existingComment.isPoll
      ? await getPollById(existingComment.postIdString)
      : await getPostById(existingComment.postIdString);

    if (!postOrPoll) {
      console.error("Post/Poll not found:", existingComment.postIdString);
      return updatedComment;
    }

    const postOwnerId = postOrPoll.creatorId || postOrPoll.creator?.$id;

    // Notification for post owner liking the comment
    if (currentUser.$id === postOwnerId) {
      const notificationMessage = "Your comment is liked by the asker.";
      const existingOwnerNotification = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [
          Query.equal("userId", commenterId),
          Query.equal("relatedEntityId", commentId),
          Query.equal("types", "LIKE_COMMENT_OWNER"),
        ]
      );

      if (existingOwnerNotification.documents.length === 0) {
        await createNotification({
          userId: commenterId,
          type: "LIKE_COMMENT_OWNER",
          message: notificationMessage,
          relatedEntityId: commentId,
        });
      }

      if (currentUser.$id != commenterId) {
        await awardCommentLikeBonusForOwner(commenterId, 5);
      }
    }

    // Notification for other members liking the comment
    if (currentUser.$id !== postOwnerId) {
      const existingMemberNotification = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [
          Query.equal("userId", commenterId),
          Query.equal("relatedEntityId", commentId),
          Query.equal("types", "LIKE_COMMENT_MEMBER"),
        ]
      );

      const totalLikes = likesArray.length;
      let notificationMessage =
        totalLikes > 1
          ? `${totalLikes} members liked your comment.`
          : "Your opinion is liked by a member.";

      if (existingMemberNotification.documents.length > 0) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          existingMemberNotification.documents[0].$id,
          {
            message: notificationMessage,
            isRead: false,
            lastUpdatedAt: new Date().toISOString(),
          }
        );
      } else {
        await createNotification({
          userId: commenterId,
          type: "LIKE_COMMENT_MEMBER",
          message: notificationMessage,
          relatedEntityId: commentId,
        });
      }
    }

    return updatedComment;
  } catch (error) {
    console.error("Error updating likes on comment:", error);
    throw error;
  }
}

//===================================================================================================
export async function toggleBestFlair(
  commentId: string,
  postCreatorId: string
) {
  try {
    // Verify that the user is authenticated
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("User is not authenticated.");
    }

    // Verify the Appwrite session
    await account.get();

    // Get the comment to check current best flair status
    const comment = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId
    );

    if (!comment) {
      throw new Error("Comment not found.");
    }

    // Fetch the associated post or poll to verify the creator
    const postOrPoll: any = comment.isPoll
      ? await getPollById(comment.postIdString)
      : await getPostById(comment.postIdString);

    if (!postOrPoll) {
      throw new Error(`Post/Poll not found for ID: ${comment.postIdString}`);
    }

    // Extract the post creator ID
    const actualPostCreatorId = postOrPoll.creatorId || postOrPoll.creator?.$id;

    // Verify that the current user is the post creator
    if (currentUser.$id !== actualPostCreatorId) {
      throw new Error("Only the post creator can toggle best flair.");
    }

    // Verify that the provided postCreatorId matches the actual creator
    if (postCreatorId !== actualPostCreatorId) {
      throw new Error("Invalid post creator ID.");
    }

    // Check if comment is anonymous - don't allow best flair for anonymous comments
    if (comment.isAnonymous) {
      throw new Error("Cannot mark anonymous comments as best.");
    }

    // Check if the comment author is the same as the post creator
    if (comment.userIdString === actualPostCreatorId) {
      throw new Error("Cannot mark your own comment as best.");
    }

    const currentBestFlair = comment.hasBestFlair || false;
    const newBestFlair = !currentBestFlair;

    // If setting to true, remove best flair from all other comments on this post
    if (newBestFlair) {
      // Find all comments with best flair on this post
      const bestComments = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        [
          Query.equal("postIdString", comment.postIdString),
          Query.equal("hasBestFlair", true),
        ]
      );

      // Remove best flair from all other comments
      for (const bestComment of bestComments.documents) {
        if (bestComment.$id !== commentId) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.commentsCollectionId,
            bestComment.$id,
            { hasBestFlair: false }
          );
        }
      }
    }

    // Update the comment's best flair status
    const updatedComment = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId,
      { hasBestFlair: newBestFlair }
    );

    // Send notification to comment author when selected as best
    if (newBestFlair) {
      const commentAuthorId = comment.userIdString;
      if (commentAuthorId && commentAuthorId !== actualPostCreatorId) {
        try {
          // Get the post creator's name for the notification
          const postCreator = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            actualPostCreatorId
          );

          const notificationMessage = `Your comment is selected as "Best" by ${postCreator.name}`;

          await createNotification({
            userId: commentAuthorId,
            type: "BEST_COMMENT_SELECTED",
            message: notificationMessage,
            relatedEntityId: commentId,
          });
        } catch (error) {
          console.error("Error sending best comment notification:", error);
        }
      }
    }

    return updatedComment;
  } catch (error) {
    console.error("Error toggling best flair:", error);
    throw error;
  }
}


//===================================================================================
async function notifyMentionedUsers(
  comment: CommentData,
  commentId: string,
  postOrPoll: any
) {
  const contentTitle = comment.isPoll ? postOrPoll.question : postOrPoll.title;
  const truncatedTitle =
    contentTitle.length > 80
      ? `${contentTitle.substring(0, 77)}...`
      : contentTitle;
  const notificationMessage = `${comment.userName} mentioned you in a comment on "${truncatedTitle}".`;

  const notificationPromises = comment.mentionedUserIds
    .filter((id) => id !== comment.userId)
    .map(async (mentionedUserId) => {
      await createNotification({
        userId: mentionedUserId,
        type: "MENTION_IN_COMMENT" as INotificationType,
        message: notificationMessage,
        relatedEntityId: commentId,
      });
    });

  await Promise.all(notificationPromises);
}

export async function reactToComment(
  commentId: string,
  userId: string,
  emoji: string
) {
  try {
    // Fetch the comment
    const existingComment = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId
    );

    if (!existingComment) {
      throw new Error("Comment not found.");
    }

    // Check if the user has already reacted with this emoji
    const existingReactions = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.reactionsCollectionId,
      [
        Query.equal("commentId", commentId),
        Query.equal("userId", userId),
        Query.equal("emoji", emoji),
      ]
    );

    let updatedReactionCount = existingComment.reactionCount || 0;
    let updatedReactions = existingComment.reactions || [];

    if (existingReactions.total > 0) {
      // User already reacted with this emoji, so remove the reaction
      await deleteReaction(existingReactions.documents[0].$id);
      updatedReactionCount = Math.max(0, updatedReactionCount - 1);
      updatedReactions = updatedReactions.filter(
        (reactionId: string) =>
          reactionId !== existingReactions.documents[0].$id
      );
    } else {
      // Add new reaction
      const newReaction = await createReaction(commentId, userId, emoji);
      updatedReactionCount += 1;
      updatedReactions = [...updatedReactions, newReaction.$id];
    }

    // Update comment with new reactionCount and reactions
    const updatedComment = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId,
      {
        reactionCount: updatedReactionCount,
        reactions: updatedReactions,
      }
    );

    // Send notification to comment author if a new reaction was added
    if (existingReactions.total === 0) {
      const commenterId = existingComment.userIdString;
      if (!commenterId) {
        console.error("Commenter ID undefined. Cannot send notification.");
        return updatedComment;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        console.error("Failed to retrieve current user.");
        return updatedComment;
      }

      // Fetch the associated post or poll
      const postOrPoll = existingComment.isPoll
        ? await getPollById(existingComment.postIdString)
        : await getPostById(existingComment.postIdString);

      if (!postOrPoll) {
        console.error("Post/Poll not found:", existingComment.postIdString);
        return updatedComment;
      }

      const postOwnerId = postOrPoll.creatorId || postOrPoll.creator?.$id;


      // Notification for other members reacting to the comment
      if (currentUser.$id !== postOwnerId && currentUser.$id !== commenterId) {
        const existingMemberNotification = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          [
            Query.equal("userId", commenterId),
            Query.equal("relatedEntityId", commentId),
            Query.equal("types", "REACT_COMMENT_MEMBER"),
          ]
        );

        const totalReactions = updatedReactionCount;
        let notificationMessage =
          totalReactions > 1
            ? `${totalReactions} members reacted to your comment.`
            : `Your comment received a ${emoji} reaction from a member.`;

        if (existingMemberNotification.documents.length > 0) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.notificationsCollectionId,
            existingMemberNotification.documents[0].$id,
            {
              message: notificationMessage,
              isRead: false,
              lastUpdatedAt: new Date().toISOString(),
            }
          );
        } 
        
      }
    }

    return updatedComment;
  } catch (error) {
    console.error("Error updating reactions on comment:", error);
    throw error;
  }
}
//================================================================================================
export async function unlockComment({ commentId }: { commentId: string }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("User is not authenticated.");
    }

    // Get the comment to check who locked it
    const comment = await getCommentById(commentId);
    if (!comment) {
      throw new Error("Comment not found.");
    }

    if (!comment.isLocked) {
      throw new Error("Comment is not locked.");
    }

    // Check if current user is the one who locked it
    if (comment.lockedBy !== currentUser.$id) {
      throw new Error("You can only unlock comments that you locked.");
    }
    await lockRecursively(commentId, false);
  } catch (error) {
    console.error("Error unlocking the comment:", error);
    throw error;
  }
}
//==============================================
export async function getCommentById(commentId: string) {
  try {
    // Validate commentId parameter
    if (!commentId || typeof commentId !== 'string' || commentId.trim() === '') {
      throw new Error(`Invalid commentId provided: ${commentId}`);
    }

    const comment = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId.trim()
    );
    return comment;
  } catch (error) {
    console.error("Error fetching comment by ID:", error);
    throw error;
  }
}

async function findRootParentId(commentId: string): Promise<string> {
  const comment = await getCommentById(commentId);
  if (!comment.parentCommentId) {
    return comment.$id;
  }
  return findRootParentId(comment.parentCommentId);
}

async function lockRecursively(commentId: string, isLocked: boolean, lockedBy?: string) {
  if (typeof commentId !== 'string' || commentId.length > 36) {
    throw new Error(`Invalid commentId: ${commentId}`);
  }
  try {
    const updateData: any = { isLocked };
    if (isLocked && lockedBy) {
      updateData.lockedBy = lockedBy;
    } else if (!isLocked) {
      updateData.lockedBy = null;
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId,
      updateData
    );

    const children = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      [Query.equal("parentCommentId", commentId), Query.limit(100)]
    );

    for (const child of children.documents) {
      await lockRecursively(child.$id, isLocked, lockedBy);
    }
  } catch (error) {
    console.error(`Error in recursive lock/unlock for comment ${commentId}:`, error);
    throw error;
  }
}
//=============================================================================================
// pollService.ts
export async function getUserCommentCount(userId: string): Promise<number> {
  if (!userId) {
    console.warn('Missing userId for getUserCommentCount');
    return 0;
  }
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      [Query.equal('userIdString', userId)] // Note: userIdString specific to Comments
    );
    return response.total;
  } catch (error) {
    console.error('Error fetching user comment count:', error);
    throw error;
  }
}