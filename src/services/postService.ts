import { ID, Models, Query } from "appwrite";
import { databases, appwriteConfig, storage } from "@/lib/appwrite/config";
import {
  IUpdatePost,
  INewPost,
  IPoll,
  IPollOption,
  SavedContent,
} from "@/types";
import { getUserById, updateUserLevelAndPoints } from "./userService";
import { getCurrentUser } from "./authService";
import { createNotification } from "./notificationsService";
import { getPollById } from "./pollService";
import { updateGroupActivityTimestamp } from "./groupService";
import { getGroupById } from "./groupService";
import { UserAction } from "@/lib/pointsMapping";
import { getBlockedUserIds } from "./blockService";

export async function createPost(post: INewPost): Promise<any> {
  try {
    let fileUrl: string | null = null;
    let fileId: string | null = null;

    // Upload image if present
    if (post.file && post.file.length > 0) {
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw new Error("File upload failed.");

      fileId = uploadedFile.$id;
      fileUrl = storage.getFileView(appwriteConfig.storageId, fileId).href;
    }

    // Get user info
    const user = await getUserById(post.userId);
    const creatorName = user?.name || "Unknown User";
    const creatorImageUrl = user?.imageUrl || "";

    // Normalize tags
    const tags = post.tags?.replace(/ /g, "").split(",").slice(0, 5) || [];

    // Normalize groupId
    const resolvedGroupId = post.groupId
      ? typeof post.groupId === "object"
        ? post.groupId.$id
        : post.groupId
      : null;

    // Fetch categoryName
    const categoryName =
      post.categoryName?.trim() ||
      (await getCategoryNameById(post.categoryId)) ||
      "Uncategorized";

    // Fetch groupName if groupId is provided
    let groupName = "";
    if (resolvedGroupId) {
      const group: any = await getGroupById(resolvedGroupId);
      groupName = group?.name || "Unnamed Group";
    }

    // Prepare payload
    const payload = {
      title: post.title,
      description: post.description || null,
      imageUrl: post.imageUrl || fileUrl || null,
      imageId: fileId || null,
      tags,
      subCategory: post.subCategory,
      categoryId: post.categoryId,
      categoryIdString: post.categoryId,
      categoryName: categoryName,
      groupId: resolvedGroupId || null,
      groupIdString: resolvedGroupId || null,
      groupName: groupName,
      creator: post.userId,
      creatorId: post.userId,
      creatorName,
      creatorImageUrl: creatorImageUrl,
      isAnonymous: post.isAnonymous || false,
      createdAt: new Date().toISOString(),
      isDraft: post.isDraft || false,
    };

    // Définir les permissions en fonction de isDraft
    const permissions = post.isDraft
      ? [
          `read:${post.userId}`,
          `update:${post.userId}`,
          `delete:${post.userId}`,
        ]
      : [`read:*`, `update:${post.userId}`, `delete:${post.userId}`];

    // Créer le document avec les permissions appropriées
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      { ...payload, $permissions: permissions }
    );

    // Mettre à jour l'activité du groupe uniquement pour les posts publiés
    if (resolvedGroupId && !post.isDraft) {
      await updateGroupActivityTimestamp(resolvedGroupId);
    }

    return newPost;
  } catch (error) {
    console.error("Error in createPost:", error);
    throw error;
  }
}
//==================================================================================
export async function getPostById(postId?: string): Promise<Post> {
  if (!postId) {
    console.error("getPostById: Post ID is required");
    throw new Error("Post ID is required");
  }

  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      [
        Query.select([
          "$id",
          "$createdAt",
          "title",
          "description",
          "imageUrl",
          "categoryName",
          "creatorName",
          "creatorImageUrl",
          "creatorId",
          "categoryIdString",
          "subCategory",
          "tags",
          "isAnonymous",
          "imageId",
          "greatBy",
          "greatCount",
          "groupIdString",
          "groupName",
          "likedBy",
          "superLikedBy",
          "superLikeCount",
          "simpleLikedBy",
          "simpleLikeCount",
          "commentsLocked",
          "lockExpiry",
          "lockedBy",
          "isInMainPage",
          "expirationDateMainPage",
          "isInCategoryPage",
          "expirationDateCategoryPage",
          "isInSubcategoryPage",
          "expirationDateSubcategoryPage",
          "isDraft",
          "createdAt",
        ]),
      ]
    );

    if (!post) {
      console.error("getPostById: Post not found", { postId });
      throw new Error("Post not found");
    }

    const formattedPost: Post = {
      ...post,
      type: "post",
      creator: post.creatorId || post.creator || "", // Use creatorId or fallback
      groupId: post.groupIdString ? { $id: post.groupIdString } : null,
      isDraft: post.isDraft || false,
    };

    return formattedPost;
  } catch (error) {
    console.error("getPostById: Error fetching post", { postId, error });
    throw error;
  }
}
//===========================================================
export async function getUserPosts(
  userId: string,
  limit = 10,
  cursor?: string,
  currentUserId?: string
) {
  try {
    if (!userId) throw new Error("User ID is required");

    const queries = [
      Query.equal("creator", userId),
      Query.limit(limit),
      Query.notEqual("isDraft", true), // Exclude draft posts
    ];

    // Hide anonymous posts from other users (only show to the post author)
    if (currentUserId !== userId) {
      queries.push(Query.equal("isAnonymous", false));
    }

    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    return response.documents;
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return [];
  }
}

//==============================================================================================
export async function updatePostWithEdits(post: IUpdatePost) {
  try {
    const existingPost = await getPostById(post.postId);
    if (!existingPost) throw new Error("Post not found");

    // Check if within 10-minute edit window only if not a draft
    if (!existingPost.isDraft) {
      const createdAt = new Date(existingPost.$createdAt);
      const now = new Date();
      const diffInMinutes = (now.getTime() - createdAt.getTime()) / 60000;
      if (diffInMinutes > 10) {
        throw new Error(
          "Post can only be edited within the first 10 minutes after creation."
        );
      }
    }

    // Prepare update payload
    const updatePayload: any = {};

    // Handle title update
    if (post.title !== existingPost.title) {
      updatePayload.title = post.title;
    }

    // Handle description update
    if (post.description !== existingPost.description) {
      updatePayload.description = post.description || null;
    }

    // Handle image updates
    if (post.file && post.file.length > 0) {
      // Upload new file
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw new Error("File upload failed");

      updatePayload.imageId = uploadedFile.$id;
      updatePayload.imageUrl = storage.getFileView(
        appwriteConfig.storageId,
        uploadedFile.$id
      ).href;

      // Delete old image if it exists
      if (existingPost.imageId) {
        await deleteFile(existingPost.imageId);
      }
    } else if (post.imageUrl) {
      // Validate existing image URL
      const imageUrlString =
        post.imageUrl instanceof URL ? post.imageUrl.toString() : post.imageUrl;
      const fileId = imageUrlString.split("/").pop()?.split("?")[0];
      if (fileId) {
        try {
          await storage.getFile(appwriteConfig.storageId, fileId);
          updatePayload.imageUrl = imageUrlString;
          updatePayload.imageId = fileId;
        } catch (error) {
          updatePayload.imageUrl = existingPost.imageUrl || null;
          updatePayload.imageId = existingPost.imageId || null;
        }
      } else {
        updatePayload.imageUrl = existingPost.imageUrl || null;
        updatePayload.imageId = existingPost.imageId || null;
      }
    } else {
      // No new file or URL provided, retain existing
      updatePayload.imageUrl = existingPost.imageUrl || null;
      updatePayload.imageId = existingPost.imageId || null;
    }

    // Handle category and subcategory updates (only for non-group posts)
    if (!existingPost.groupIdString && (post.categoryId || post.subCategory)) {
      const newCategoryId = post.categoryId || existingPost.categoryIdString;
      const newSubCategory = post.subCategory || existingPost.subCategory;

      // Fetch categoryName for the categoryId
      const categoryName = newCategoryId
        ? await getCategoryNameById(newCategoryId)
        : existingPost.categoryName;

      // Only update fields if they have changed to avoid unnecessary writes
      if (
        newCategoryId !== existingPost.categoryIdString ||
        categoryName !== existingPost.categoryName ||
        newSubCategory !== existingPost.subCategory
      ) {
        updatePayload.categoryId = newCategoryId;
        updatePayload.categoryIdString = newCategoryId;
        updatePayload.categoryName = categoryName;
        updatePayload.subCategory = newSubCategory;
      }
    } else {
      // Retain existing category and subcategory for group posts
      updatePayload.categoryId = existingPost.categoryIdString;
      updatePayload.categoryIdString = existingPost.categoryIdString;
      updatePayload.categoryName = existingPost.categoryName;
      updatePayload.subCategory = existingPost.subCategory;
    }

    // If no changes, return existing post
    if (Object.keys(updatePayload).length === 0) {
      return existingPost;
    }

    // Update the post with the payload
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      updatePayload
    );
  } catch (error) {
    console.error("Error updating post:", error);
    throw error;
  }
}
//=====================================================================================================

export async function deletePost(
  postId: string,
  imageId?: string
): Promise<{ status: string }> {
  try {
    if (!postId) {
      throw new Error("postId is missing.");
    }

    // Fetch the post to check deletion eligibility
    const post = await getPostById(postId);

    // Enforce 10-minute deletion window for non-draft posts
    if (!post.isDraft) {
      const createdAt = new Date(post.$createdAt);
      const now = new Date();
      const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      if (diffInMinutes > 10) {
        throw new Error(
          "Post can only be deleted within the first 10 minutes after creation."
        );
      }
    }

    // Fetch comments linked to this post
    const comments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      [Query.equal("postIdString", postId)]
    );

    // Delete all associated comments
    const deleteCommentsPromises = comments.documents.map((comment) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        comment.$id
      )
    );
    await Promise.all(deleteCommentsPromises);

    // Delete notifications associated with this post
    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [Query.equal("relatedEntityId", postId)]
    );

    const deleteNotificationsPromises = notifications.documents.map(
      (notification) =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          notification.$id
        )
    );
    await Promise.all(deleteNotificationsPromises);

    // Delete saves associated with this post
    const saves = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      [Query.equal("postId", postId)]
    );

    const deleteSavesPromises = saves.documents.map((save) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.savesCollectionId,
        save.$id
      )
    );
    await Promise.all(deleteSavesPromises);

    // Delete the post itself
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    // Delete the file linked to the post (if imageId is provided)
    if (imageId) {
      await deleteFile(imageId);
    }

    return { status: "Ok" };
  } catch (error) {
    console.error("Error while deleting the post:", error);
    throw error;
  }
}
//===============================================================================================
// Upload a file to storage
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );

    return uploadedFile;
  } catch (error) {}
}

// Generate a file view URL
export function getFileview(fileId: string) {
  try {
    const fileUrl = storage.getFileView(appwriteConfig.storageId, fileId).href;

    if (!fileUrl) throw new Error("Unable to generate file URL.");

    return fileUrl;
  } catch (error) {
    console.error("Error generating file view URL:", error);
  }
}

// Delete a file from storage
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);

    return { status: "ok" };
  } catch (error) {}
}

export async function searchPosts(
  searchTerm: string,
  groupId?: string,
  cursor?: string
) {
  try {
    if (!searchTerm.trim()) {
      console.warn("Empty search term provided. Returning empty result.");
      return { documents: [] };
    }

    // Construct queries based on search parameters
    const queries = [
      Query.search("title", searchTerm.toLowerCase()),
      Query.limit(10),
      Query.notEqual("isDraft", true), // Exclude draft posts
      Query.select([
        "$id",
        "title",
        "creatorName",
        "creatorId",
        "creatorImageUrl",
        "tags",
        "createdAt",
        "categoryIdString",
        "categoryName",
        "groupIdString",
        "groupName",
      ]),
      Query.orderDesc("createdAt"),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ...(groupId ? [Query.equal("groupIdString", groupId)] : []),
    ];

    // Fetch posts from Appwrite
    const posts = await databases.listDocuments<Models.Document>(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    return posts;
  } catch (error) {
    console.error("Error in searchPosts:", error);
    throw error;
  }
}
//====================================================================
export async function getInfinitePosts({
  pageParam,
  categoryId,
  subCategory,
  filters = [],
  currentUserId,
}: {
  pageParam?: string;
  categoryId?: string | null;
  subCategory?: string | null;
  filters?: any[];
  currentUserId?: string;
}) {
  try {
    const queries: any[] = [
      Query.limit(10),
      Query.notEqual("isDraft", true), // Exclude draft posts
      Query.select([
        "$id",
        "title",
        "categoryIdString",
        "subCategory",
        "imageUrl",
        "categoryName",
        "$createdAt",
        "groupIdString",
        "groupName",
        "creatorName",
        "creatorId",
        "creatorImageUrl",
        "likedBy",
        "isAnonymous",
        "createdAt",
      ]),
      ...filters,
    ];

    if (pageParam) {
      queries.push(Query.cursorAfter(pageParam));
    }

    if (categoryId) {
      queries.push(Query.equal("categoryIdString", categoryId));
    }

    if (subCategory) {
      queries.push(Query.equal("subCategory", subCategory));
    }

    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    // Filter out posts from blocked users
    let filteredPosts = posts;
    if (currentUserId) {
      try {
        const blockedUserIds = await getBlockedUserIds(currentUserId);
        filteredPosts = {
          ...posts,
          documents: posts.documents.filter(
            (post: any) => !blockedUserIds.includes(post.creatorId)
          )
        };
      } catch (error) {
        console.error("Error filtering blocked content:", error);
      }
    }

    return filteredPosts;
  } catch (error) {
    console.error("Error fetching posts:", {
      error,
      pageParam,
      categoryId,
      subCategory,
      filters,
    });
    throw error;
  }
}
//===============================================================================
export async function getRecentPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [
        Query.orderDesc("createdAt"),
        Query.limit(20),
        Query.notEqual("isDraft", true),
        Query.select([
          "$id",
          "title",
          "description",
          "imageUrl",
          "creatorName",
          "creatorId",
          "creatorImageUrl",
          "categoryIdString",
          "groupIdString",
          "categoryName",
          "groupName",
          "createdAt",
          "tags",
          "subCategory",
          "imageId",
          "isAnonymous",
          "likedBy",
        ]),
      ]
    );
    if (!posts || !posts.documents.length)
      throw new Error("No recent posts found");

    return posts;
  } catch (error) {
    console.error("Error fetching recent posts:", error);
    throw error;
  }
}
//===============================================

interface Post extends Models.Document {
  creator?: { $id: string; name: string; imageUrl?: string };
  groupIdString?: string;
  groupId?: { $id: string };
  categoryId?: string | { $id: string };
  isAnonymous?: boolean;
  gender?: string;
  location?: string;
  imageUrl?: string;
  imageId?: string;
  title?: string;
  description?: string;
  tags?: string[];
  subCategory?: string;
  greatBy?: string[];
  greatCount?: number;
  edits?: string[];
  $createdAt: string;
  commentsLocked?: boolean;
  lockExpiry?: string | null;
}

interface Poll extends Models.Document {
  question: string;
  creatorId: string;
  likedBy: string[];
}

export async function likePost(
  postId: string,
  likesArray: string[],
  isPoll: boolean = false
) {
  try {
    if (!postId) {
      console.error("likePost: Invalid postId provided:", postId);
      throw new Error("Post ID is required.");
    }

    const primaryCollectionId = isPoll
      ? appwriteConfig.pollsCollectionId
      : appwriteConfig.postCollectionId;
    const fallbackCollectionId = isPoll
      ? appwriteConfig.postCollectionId
      : appwriteConfig.pollsCollectionId;

    let existingDocument: Post | Poll;
    let correctCollectionId = primaryCollectionId;

    try {
      existingDocument = await databases.getDocument(
        appwriteConfig.databaseId,
        primaryCollectionId,
        postId,
        [Query.select(["likedBy", "creatorId"])]
      );
    } catch (error) {
      console.warn("likePost: Document not found in primary collection:", {
        postId,
        primaryCollectionId,
      });

      try {
        existingDocument = await databases.getDocument(
          appwriteConfig.databaseId,
          fallbackCollectionId,
          postId,
          [Query.select(["likedBy", "creatorId"])]
        );
        correctCollectionId = fallbackCollectionId;
      } catch (fallbackError) {
        console.error("likePost: Document not found in either collection:", {
          postId,
          primaryCollectionId,
          fallbackCollectionId,
        });
        throw new Error("Post or poll not found.");
      }
    }

    if (!existingDocument) {
      console.error("likePost: Document fetch returned null:", {
        postId,
        correctCollectionId,
      });
      throw new Error("Post or poll not found.");
    }

    // Filter out creatorId from likesArray to prevent self-liking
    const filteredLikesArray = likesArray.filter(
      (id) => id !== existingDocument.creatorId
    );

    // Update the document with filtered likesArray
    const updatedDocument = await databases.updateDocument(
      appwriteConfig.databaseId,
      correctCollectionId,
      postId,
      { likedBy: filteredLikesArray }
    );

    // Check if the user just liked or unliked the post/poll
    const isLikedNow =
      filteredLikesArray.length > (existingDocument.likedBy?.length || 0);

    if (!isLikedNow) {
      return updatedDocument;
    }

    // Fetch content data for notification
    const contentData =
      correctCollectionId === appwriteConfig.pollsCollectionId
        ? await getPollById(postId)
        : await getPostById(postId);

    if (!contentData || !contentData.creatorId) {
      console.warn(
        "likePost: Content or creator not found. Skipping notification:",
        postId
      );
      return updatedDocument;
    }

    const contentOwnerId = contentData.creatorId;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error("likePost: Failed to retrieve current user.");
      return updatedDocument;
    }

    // Skip notification if the liker is the content owner
    if (contentOwnerId === currentUser.$id) {
      return updatedDocument;
    }

    // Get the new like count after update
    const likeCount = updatedDocument.likedBy.length;

    // Extract title or question and truncate if necessary
    const contentTitle =
      correctCollectionId === appwriteConfig.pollsCollectionId
        ? (contentData as Poll).question
        : (contentData as Post).title || "Untitled Content";
    const truncatedTitle =
      contentTitle.length > 80
        ? contentTitle.substring(0, 77) + "..."
        : contentTitle;

    // Define notification message
    const notificationMessage =
      correctCollectionId === appwriteConfig.pollsCollectionId
        ? `Your poll "${truncatedTitle}" has ${likeCount} like${
            likeCount > 1 ? "s" : ""
          } now.`
        : `Your question "${truncatedTitle}" has ${likeCount} like${
            likeCount > 1 ? "s" : ""
          } now.`;

    // Check for an existing notification to update
    const existingNotification = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", contentOwnerId),
        Query.equal("relatedEntityId", postId),
        Query.equal("types", "LIKE_POST"),
        Query.limit(1),
      ]
    );

    if (existingNotification.documents.length > 0) {
      // Update existing notification
      const notificationId = existingNotification.documents[0].$id;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId,
        {
          message: notificationMessage,
          isRead: false,
          lastUpdatedAt: new Date().toISOString(),
        }
      );
    } else {
      // Create new notification
      await createNotification({
        userId: contentOwnerId,
        type: "LIKE_POST",
        message: notificationMessage,
        relatedEntityId: postId,
      });
    }

    return updatedDocument;
  } catch (error) {
    console.error("likePost: Error updating likes:", {
      postId,
      isPoll,
    });
    throw error;
  }
}
//===========================================================================================================
// File: src/lib/appwrite/postService.ts
// Replacement: Replace the entire savePost function with the following

export async function savePost(
  userId: string,
  postId: string,
  isPoll: boolean
) {
  try {
    if (!postId || !userId) {
      console.error("savePost: Invalid parameters provided:", {
        userId,
        postId,
      });
      throw new Error("User ID and Post ID are required.");
    }

    // Fetch creatorId to prevent self-saving
    let creatorId;
    const collectionId = isPoll
      ? appwriteConfig.pollsCollectionId
      : appwriteConfig.postCollectionId;

    try {
      const document = await databases.getDocument(
        appwriteConfig.databaseId,
        collectionId,
        postId,
        [Query.select(["creatorId"])]
      );
      creatorId = document.creatorId;
    } catch (error) {
      console.error("savePost: Document not found:", { postId, collectionId });
      throw new Error(`Post or poll with ID ${postId} not found.`);
    }

    if (userId === creatorId) {
      throw new Error("Cannot save your own content.");
    }

    const field = isPoll ? "pollId" : "postId";
    const existingSaves = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      [
        Query.equal("userId", userId),
        Query.equal(field, postId),
        Query.limit(1),
      ]
    );

    if (existingSaves.documents.length > 0) {
      return existingSaves.documents[0]; // Already saved
    }

    const saveData = {
      userId: userId,
      postId: isPoll ? null : postId,
      pollId: isPoll ? postId : null,
      isPoll,
    };

    const savedRecord = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      saveData
    );

    return savedRecord;
  } catch (error) {
    console.error("savePost: Error saving post or poll:", {
      userId,
      postId,
      isPoll,
      error,
    });
    throw error instanceof Error
      ? new Error(
          `Failed to save ${isPoll ? "poll" : "post"}: ${error.message}`
        )
      : new Error("An unknown error occurred.");
  }
}
//======================================================================

export async function deleteSavedPost(
  userId: string,
  postId: string,
  isPoll: boolean
) {
  try {
    const field = isPoll ? "pollId" : "postId";
    const saves = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      [Query.equal("userId", userId), Query.equal(field, postId)]
    );
    const deletePromises = saves.documents.map((save) =>
      databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.savesCollectionId,
        save.$id
      )
    );
    await Promise.all(deletePromises);

    return { status: "Ok" };
  } catch (error) {
    console.error("Error deleting saved post or poll:", error);
    throw error;
  }
}
//============================================================================================
export async function getGroupPosts(groupId: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [
        Query.equal("groupId", groupId),
        Query.notEqual("isDraft", true), // Exclude draft posts
      ]
    );

    // Ensure each post has groupId as a string
    const normalizedPosts = posts.documents.map((post) => ({
      ...post,
      groupId:
        typeof post.groupId === "object" ? post.groupId.$id : post.groupId,
    }));

    return normalizedPosts;
  } catch (error) {
    console.error("Error fetching group posts:", error);
    throw error;
  }
}
//=============================================================================

export async function fetchCombinedContent({
  pageParam,
  categoryId,
  subCategory,
  search,
  type,
  groupId,
  tag,
  currentUserId,
}: {
  pageParam?: string;
  categoryId?: string | null;
  subCategory?: string | null;
  search?: string;
  type?: string;
  groupId?: string | null;
  tag?: string | null;
  currentUserId?: string;
}): Promise<{ documents: (Models.Document & { type: "post" | "poll" })[] }> {
  const baseQueries: string[] = [Query.orderDesc("createdAt"), Query.limit(10)];

  if (pageParam) baseQueries.push(Query.cursorAfter(pageParam));
  if (categoryId) baseQueries.push(Query.equal("categoryIdString", categoryId));
  if (subCategory) baseQueries.push(Query.equal("subCategory", subCategory));
  if (groupId) baseQueries.push(Query.equal("groupIdString", groupId));

  const hasSearch = search && search.trim().length > 0;
  const hasTag = tag && tag.trim().length > 0;

  try {
    let postsResponse: Models.DocumentList<Models.Document> = {
      total: 0,
      documents: [],
    };
    let pollsResponse: Models.DocumentList<Models.Document> = {
      total: 0,
      documents: [],
    };

    // Fetch posts, excluding drafts
    if (!type || type === "post" || type === "user" || hasTag) {
      const postQueries = [...baseQueries, Query.notEqual("isDraft", true)];
      if (hasSearch) {
        postQueries.push(
          type === "user"
            ? Query.search("creatorName", search!.trim())
            : Query.search("title", search!.trim())
        );
      }
      // Exclude anonymous posts when searching for specific users
      if (type === "user") {
        postQueries.push(Query.equal("isAnonymous", false));
      }
      if (hasTag) {
        postQueries.push(Query.equal("tags", [tag!.trim()]));
      }
      postsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        postQueries
      );
    }

    // Fetch polls, excluding drafts (skip if tag filter is active, as polls have no tags)
    if (!hasTag && (!type || type === "poll" || type === "user")) {
      const pollQueries = [...baseQueries, Query.notEqual("isDraft", true)];
      if (hasSearch) {
        pollQueries.push(
          type === "user"
            ? Query.search("creatorName", search!.trim())
            : Query.search("question", search!.trim())
        );
      }
      // Exclude anonymous polls when searching for specific users
      if (type === "user") {
        pollQueries.push(Query.equal("isAnonymous", false));
      }
      pollsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.pollsCollectionId,
        pollQueries
      );
    }

    // Combine and map results
    const mappedData: (Models.Document & { type: "post" | "poll" })[] = [
      ...postsResponse.documents.map((doc) => ({
        ...doc,
        type: "post" as const,
      })),
      ...pollsResponse.documents.map((doc) => ({
        ...doc,
        type: "poll" as const,
      })),
    ];

    // Filter out content from blocked users
    let filteredData = mappedData;
    if (currentUserId) {
      try {
        const blockedUserIds = await getBlockedUserIds(currentUserId);
        filteredData = mappedData.filter(
          (item) => !blockedUserIds.includes(item.creatorId)
        );
      } catch (error) {
        console.error("Error filtering blocked content:", error);
        // If there's an error, continue without filtering
      }
    }

    // Sort by createdAt
    filteredData.sort(
      (a, b) =>
        new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
    );

    return { documents: filteredData };
  } catch (error) {
    console.error("Error fetching combined content:", {
      error,
      search,
      type,
      groupId,
      tag,
      queries: {
        posts: baseQueries,
        searchAttribute: hasSearch
          ? type === "user"
            ? "creatorName"
            : type === "poll"
            ? "question"
            : "title"
          : "none",
        tagFilter: hasTag ? "applied" : "none",
      },
    });
    return { documents: [] };
  }
}
//============================================================================
// Helper function to get category name by ID
export async function getCategoryNameById(categoryId: string): Promise<string> {
  try {
    const category = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId,
      categoryId,
      [Query.select(["name"])]
    );
    return category.name || "Uncategorized";
  } catch (error) {
    console.warn(`Failed to fetch category name for ID ${categoryId}:`, error);
    return "Uncategorized";
  }
}

// Update category name and synchronize with Posts and Polls
export async function updateCategory(
  categoryId: string,
  data: { name: string }
) {
  try {
    // Fetch current category to compare name
    const currentCategory = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId,
      categoryId,
      [Query.select(["name"])]
    );

    if (!currentCategory) throw new Error("Category not found");

    // Update category document
    const updatedCategory = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId,
      categoryId,
      { name: data.name }
    );

    // Check if name changed
    if (currentCategory.name !== data.name) {
      // Update Posts collection
      let lastPostId: string | undefined;
      while (true) {
        const postQueries = [
          Query.equal("categoryIdString", categoryId),
          Query.limit(100),
          Query.select(["$id", "categoryName"]),
        ];
        if (lastPostId) postQueries.push(Query.cursorAfter(lastPostId));

        const posts = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.postCollectionId,
          postQueries
        );

        if (posts.documents.length === 0) break;

        const updatePostPromises = posts.documents.map((post) => {
          if (post.categoryName !== data.name) {
            return databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.postCollectionId,
              post.$id,
              { categoryName: data.name }
            );
          }
          return Promise.resolve();
        });

        await Promise.all(updatePostPromises);
        lastPostId = posts.documents[posts.documents.length - 1].$id;

        if (posts.documents.length < 100) break;
      }

      // Update Polls collection
      let lastPollId: string | undefined;
      while (true) {
        const pollQueries = [
          Query.equal("categoryIdString", categoryId),
          Query.limit(100),
          Query.select(["$id", "categoryName"]),
        ];
        if (lastPollId) pollQueries.push(Query.cursorAfter(lastPollId));

        const polls = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          pollQueries
        );

        if (polls.documents.length === 0) break;

        const updatePollPromises = polls.documents.map((poll) => {
          if (poll.categoryName !== data.name) {
            return databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.pollsCollectionId,
              poll.$id,
              { categoryName: data.name }
            );
          }
          return Promise.resolve();
        });

        await Promise.all(updatePollPromises);
        lastPollId = polls.documents[polls.documents.length - 1].$id;

        if (polls.documents.length < 100) break;
      }
    }

    return updatedCategory;
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
}
//========================================================================================================================================================
export async function greatPost(
  postId: string,
  greatsArray: string[],
  isPoll = false
): Promise<Models.Document> {
  try {
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        greatBy: greatsArray,
        greatCount: greatsArray.length.toString(),
      }
    );

    const post = await getPostById(postId);
    if (!post) {
      console.error("greatPost: Failed to fetch post for notification", {
        postId,
      });
      return updatedPost;
    }

    if (post.isAnonymous) {
      return updatedPost;
    }

    const creatorId = post.creatorId;
    if (!creatorId) {
      return updatedPost;
    }

    const greatCount = greatsArray.length;
    const title = post.title || "Untitled Post";
    const truncatedTitle =
      title.length > 80 ? title.substring(0, 77) + "..." : title;
    const notificationMessage = `Your question "${truncatedTitle}" has ${greatCount} great${
      greatCount > 1 ? "s" : ""
    } now.`;

    const existingNotifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", creatorId),
        Query.equal("relatedEntityId", postId),
        Query.equal("types", "GREAT_POST"),
      ]
    );

    if (existingNotifications.documents.length > 0) {
      const notificationId = existingNotifications.documents[0].$id;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId,
        {
          message: notificationMessage,
          isRead: false,
          lastUpdatedAt: new Date().toISOString(),
        }
      );
    } else {
      await createNotification({
        userId: creatorId,
        type: "GREAT_POST",
        message: notificationMessage,
        relatedEntityId: postId,
      });
    }

    return updatedPost;
  } catch (error) {
    console.error("greatPost: Error marking post as Great:", error);
    throw error;
  }
}
//==================================================================================================================
export async function superLikePost(
  postId: string,
  superLikesArray: string[],
  isPoll: boolean = false
) {
  try {
    if (!postId) {
      console.error("superLikePost: Invalid postId provided:", postId);
      throw new Error("Post ID is required.");
    }

    const collectionId = isPoll
      ? appwriteConfig.pollsCollectionId
      : appwriteConfig.postCollectionId;

    const partial = await databases.getDocument(
      appwriteConfig.databaseId,
      collectionId,
      postId,
      [
        Query.select([
          "superLikedBy",
          "creatorId",
          "superLikeCount",
          "isAnonymous",
        ]),
      ]
    );

    if (!partial) {
      console.error("superLikePost: Post or poll not found:", {
        postId,
        collectionId,
      });
      throw new Error(`Post or poll with ID ${postId} not found.`);
    }

    const filteredSuperLikes = superLikesArray.filter(
      (id) => id !== partial.creatorId
    );

    const updatedSuperLikes = Array.isArray(partial.superLikedBy)
      ? [...new Set([...partial.superLikedBy, ...filteredSuperLikes])]
      : filteredSuperLikes;

    const updatedDocument = await databases.updateDocument(
      appwriteConfig.databaseId,
      collectionId,
      postId,
      {
        superLikedBy: updatedSuperLikes,
        superLikeCount: updatedSuperLikes.length,
      }
    );

    const isLikedNow =
      updatedSuperLikes.length > (partial.superLikedBy?.length || 0);
    if (!isLikedNow) {
      return updatedDocument;
    }

    const contentData = isPoll
      ? await getPollById(postId)
      : await getPostById(postId);
    if (!contentData || !contentData.creatorId) {
      console.warn(
        "superLikePost: Content or creator not found. Skipping notification:",
        postId
      );
      return updatedDocument;
    }

    if (contentData.isAnonymous) {
      return updatedDocument;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error("superLikePost: Failed to retrieve current user.");
      return updatedDocument;
    }

    if (contentData.creatorId === currentUser.$id) {
      return updatedDocument;
    }

    const superLikeCount = updatedSuperLikes.length;
    const contentTitle = isPoll
      ? contentData.question
      : contentData.title || (isPoll ? "Untitled Poll" : "Untitled Post");
    const truncatedTitle =
      contentTitle.length > 80
        ? contentTitle.substring(0, 77) + "..."
        : contentTitle;
    const notificationMessage = isPoll
      ? `Your poll "${truncatedTitle}" has ${superLikeCount} golden heart${
          superLikeCount > 1 ? "s" : ""
        } now.`
      : `Your question "${truncatedTitle}" has ${superLikeCount} golden heart${
          superLikeCount > 1 ? "s" : ""
        } now.`;

    const notificationType = isPoll ? "SUPER_LIKE_POLL" : "SUPER_LIKE_POST";

    const existingNotifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", contentData.creatorId),
        Query.equal("relatedEntityId", postId),
        Query.equal("types", notificationType),
      ]
    );

    if (existingNotifications.documents.length > 0) {
      const notificationId = existingNotifications.documents[0].$id;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId,
        {
          message: notificationMessage,
          isRead: false,
          lastUpdatedAt: new Date().toISOString(),
        }
      );
    } else {
      await createNotification({
        userId: contentData.creatorId,
        type: notificationType,
        message: notificationMessage,
        relatedEntityId: postId,
      });
    }

    return updatedDocument;
  } catch (error) {
    console.error("[superLikePost] Error:", { postId, isPoll, error });
    throw error instanceof Error
      ? new Error(
          `Failed to golden heart ${isPoll ? "poll" : "post"}: ${error.message}`
        )
      : new Error("An unknown error occurred.");
  }
}
//================================================================================================================
export async function simpleLikePost(
  postId: string,
  simpleLikesArray: string[],
  isPoll: boolean = false
): Promise<Models.Document> {
  try {
    if (!postId) {
      console.error("simpleLikePost: Invalid postId provided:", postId);
      throw new Error("Post ID is required.");
    }

    const collectionId = isPoll
      ? appwriteConfig.pollsCollectionId
      : appwriteConfig.postCollectionId;

    const partial = await databases.getDocument(
      appwriteConfig.databaseId,
      collectionId,
      postId,
      [
        Query.select([
          "simpleLikedBy",
          "creatorId",
          "simpleLikeCount",
          "isAnonymous",
        ]),
      ]
    );

    if (!partial) {
      console.error("simpleLikePost: Post or poll not found:", {
        postId,
        collectionId,
      });
      throw new Error(`Post or poll with ID ${postId} not found.`);
    }

    const filteredSimpleLikes = simpleLikesArray.filter(
      (id) => id !== partial.creatorId
    );

    const updatedSimpleLikes = Array.isArray(partial.simpleLikedBy)
      ? [...new Set([...partial.simpleLikedBy, ...filteredSimpleLikes])]
      : filteredSimpleLikes;

    const updatedDocument = await databases.updateDocument(
      appwriteConfig.databaseId,
      collectionId,
      postId,
      {
        simpleLikedBy: updatedSimpleLikes,
        simpleLikeCount: updatedSimpleLikes.length,
      }
    );

    const isLikedNow =
      updatedSimpleLikes.length > (partial.simpleLikedBy?.length || 0);
    if (!isLikedNow) {
      return updatedDocument;
    }

    const contentData = isPoll
      ? await getPollById(postId)
      : await getPostById(postId);
    if (!contentData || !contentData.creatorId) {
      console.warn(
        "simpleLikePost: Content or creator not found. Skipping notification:",
        postId
      );
      return updatedDocument;
    }

    if (contentData.isAnonymous) {
      return updatedDocument;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      console.error("simpleLikePost: Failed to retrieve current user.");
      return updatedDocument;
    }

    if (contentData.creatorId === currentUser.$id) {
      return updatedDocument;
    }

    const simpleLikeCount = updatedSimpleLikes.length;
    const contentTitle = isPoll
      ? contentData.question
      : contentData.title || (isPoll ? "Untitled Poll" : "Untitled Post");
    const truncatedTitle =
      contentTitle.length > 80
        ? contentTitle.substring(0, 77) + "..."
        : contentTitle;
    const notificationMessage = isPoll
      ? `Your poll "${truncatedTitle}" has ${simpleLikeCount} simple heart${
          simpleLikeCount > 1 ? "s" : ""
        } now.`
      : `Your question "${truncatedTitle}" has ${simpleLikeCount} simple heart${
          simpleLikeCount > 1 ? "s" : ""
        } now.`;

    const notificationType = isPoll ? "SIMPLE_LIKE_POLL" : "SIMPLE_LIKE_POST";

    const existingNotifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", contentData.creatorId),
        Query.equal("relatedEntityId", postId),
        Query.equal("types", notificationType),
      ]
    );

    if (existingNotifications.documents.length > 0) {
      const notificationId = existingNotifications.documents[0].$id;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        notificationId,
        {
          message: notificationMessage,
          isRead: false,
          lastUpdatedAt: new Date().toISOString(),
        }
      );
    } else {
      await createNotification({
        userId: contentData.creatorId,
        type: notificationType,
        message: notificationMessage,
        relatedEntityId: postId,
      });
    }

    return updatedDocument;
  } catch (error) {
    console.error("[simpleLikePost] Error:", { postId, isPoll, error });
    throw error instanceof Error
      ? new Error(
          `Failed to simple heart ${isPoll ? "poll" : "post"}: ${error.message}`
        )
      : new Error("An unknown error occurred.");
  }
}
//=================================================================================================================
// Update post attributes (e.g., isInMainPage, expirationDateMainPage)
export async function updatePost(
  postId: string,
  updates: {
    isInMainPage?: boolean;
    expirationDateMainPage?: string | null;
    isInCategoryPage?: boolean;
    expirationDateCategoryPage?: string | null;
    isInSubcategoryPage?: boolean;
    expirationDateSubcategoryPage?: string | null;
    isPinnedOnProfile?: boolean;
    expirationDateProfilePin?: string | null;
    isPinnedOnGroup?: boolean;
    expirationDateGroupPin?: string | null;
  }
) {
  try {
    // Validate postId
    if (!postId || typeof postId !== "string" || postId.trim() === "") {
      console.error("updatePost: Invalid postId provided:", postId);
      throw new Error("Post ID is required and must be a non-empty string.");
    }

    // Validate updates
    if (!updates || Object.keys(updates).length === 0) {
      console.warn("updatePost: No updates provided for post:", postId);
      throw new Error("At least one update field is required.");
    }

    // Prepare update payload with only provided fields
    const updatePayload: {
      isInMainPage?: boolean;
      expirationDateMainPage?: string | null;
      isInCategoryPage?: boolean;
      expirationDateCategoryPage?: string | null;
      isInSubcategoryPage?: boolean;
      expirationDateSubcategoryPage?: string | null;
      isPinnedOnProfile?: boolean;
      expirationDateProfilePin?: string | null;
      isPinnedOnGroup?: boolean;
      expirationDateGroupPin?: string | null;
    } = {};

    // Assign provided fields to payload
    if (updates.isInMainPage !== undefined) {
      updatePayload.isInMainPage = updates.isInMainPage;
    }
    if (updates.expirationDateMainPage !== undefined) {
      updatePayload.expirationDateMainPage = updates.expirationDateMainPage;
    }
    if (updates.isInCategoryPage !== undefined) {
      updatePayload.isInCategoryPage = updates.isInCategoryPage;
    }
    if (updates.expirationDateCategoryPage !== undefined) {
      updatePayload.expirationDateCategoryPage =
        updates.expirationDateCategoryPage;
    }
    if (updates.isInSubcategoryPage !== undefined) {
      updatePayload.isInSubcategoryPage = updates.isInSubcategoryPage;
    }
    if (updates.expirationDateSubcategoryPage !== undefined) {
      updatePayload.expirationDateSubcategoryPage =
        updates.expirationDateSubcategoryPage;
    }
    if (updates.isPinnedOnProfile !== undefined) {
      updatePayload.isPinnedOnProfile = updates.isPinnedOnProfile;
    }
    if (updates.expirationDateProfilePin !== undefined) {
      updatePayload.expirationDateProfilePin = updates.expirationDateProfilePin;
    }
    if (updates.isPinnedOnGroup !== undefined) {
      updatePayload.isPinnedOnGroup = updates.isPinnedOnGroup;
    }
    if (updates.expirationDateGroupPin !== undefined) {
      updatePayload.expirationDateGroupPin = updates.expirationDateGroupPin;
    }

    // Validate date fields
    const dateFields = [
      "expirationDateMainPage",
      "expirationDateCategoryPage",
      "expirationDateSubcategoryPage",
      "expirationDateProfilePin",
      "expirationDateGroupPin",
    ] as const;
    for (const field of dateFields) {
      const value = updatePayload[field];
      if (value !== undefined && value !== null) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.error(`updatePost: Invalid date format for ${field}:`, value);
          throw new Error(
            `Invalid date format for ${field}. Must be a valid ISO 8601 date string.`
          );
        }
        // Optionally normalize to ISO 8601 format
        updatePayload[field] = date.toISOString();
      }
    }

    // Check if post exists (optional, depending on Appwrite behavior)
    try {
      const existingPost = await getPostById(postId);
      if (!existingPost) {
        console.error("updatePost: Post not found:", postId);
        throw new Error("Post not found.");
      }
    } catch (err) {
      // If getPostById fails due to permissions or other issues, let updateDocument handle it
      console.warn(
        "updatePost: Failed to verify post existence, proceeding with update:",
        postId,
        err
      );
    }

    // Update the post
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      updatePayload
    );

    return updatedPost;
  } catch (error) {
    console.error("updatePost: Error updating post:", {
      postId,
      updates,
      error,
    });
    const errorMessage =
      error instanceof Error
        ? `Failed to update post: ${error.message}`
        : "An unknown error occurred while updating the post.";
    throw new Error(errorMessage);
  }
}
//=================================================================================
export async function lockComments(
  postId: string,
  duration: number | "permanent",
  lockedBy: string
): Promise<void> {
  try {
    let lockExpiry: string | null = null;
    if (duration !== "permanent") {
      if (duration < 1 || duration > 30) {
        throw new Error("Duration must be between 1 and 30 days");
      }
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + duration);
      lockExpiry = expiryDate.toISOString();
    }
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        commentsLocked: true,
        lockExpiry: lockExpiry,
        lockedBy: lockedBy,
      }
    );
  } catch (error) {
    console.error("Error locking comments for post:", error);
    throw error;
  }
}

// Update unlockComments function to enforce admin access control
export async function unlockComments(
  postId: string,
  userId: string,
  groupId?: string
): Promise<void> {
  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      [Query.select(["lockedBy", "groupIdString"])]
    );

    if (!post.lockedBy) {
      throw new Error("Comments are not locked or lockedBy is not set.");
    }

    let isGroupAdmin = false;
    if (groupId || post.groupIdString) {
      const effectiveGroupId = groupId || post.groupIdString;
      const group = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        effectiveGroupId,
        [Query.select(["admins"])]
      );
      isGroupAdmin = group.admins.includes(userId);
    }

    if (!isGroupAdmin && post.lockedBy !== userId) {
      throw new Error(
        "Only the admin who locked the comments or another group admin can unlock them."
      );
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        commentsLocked: false,
        lockExpiry: null,
        lockedBy: null,
      }
    );
  } catch (error) {
    console.error("Error unlocking comments for post:", error);
    throw error;
  }
}
//==============================================================================
export async function publishPost(postId: string): Promise<Models.Document> {
  try {
    if (!postId) {
      console.error("publishPost: Post ID is missing");
      throw new Error("Post ID is required");
    }

    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!post) {
      console.error("publishPost: Post not found", { postId });
      throw new Error("Post not found");
    }

    if (!post.isDraft) {
      console.warn("publishPost: Post is not a draft", { postId });
      throw new Error("Post is not a draft");
    }
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        isDraft: false,
        createdAt: new Date().toISOString(),
      }
    );

    // Update permissions to make it public
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        $permissions: [
          `read:*`,
          `update:${post.creator}`,
          `delete:${post.creator}`,
        ],
      }
    );

    const creatorId = post.creatorId;
    await updateUserLevelAndPoints(creatorId, UserAction.ASK_QUESTION);

    // Update group activity if applicable
    if (post.groupIdString) {
      await updateGroupActivityTimestamp(post.groupIdString);
    }

    return updatedPost;
  } catch (error) {
    console.error("publishPost: Error publishing post", { postId, error });
    throw error;
  }
}
//===================================================================
export async function getUserDrafts(
  userId: string,
  groupId?: string
): Promise<(Post | IPoll)[]> {
  try {
    if (!userId) {
      console.error("getUserDrafts: User ID is required");
      throw new Error("User ID is required");
    }

    // Fetch post drafts
    const postQueries = [
      Query.equal("creator", userId),
      Query.equal("isDraft", true),
      Query.select([
        "$id",
        "$createdAt",
        "title",
        "description",
        "imageUrl",
        "categoryName",
        "creatorName",
        "creatorImageUrl",
        "categoryIdString",
        "subCategory",
        "tags",
        "isAnonymous",
        "imageId",
        "groupIdString",
        "groupName",
        "isDraft",
      ]),
    ];
    if (groupId) {
      postQueries.push(Query.equal("groupIdString", groupId));
    }
    const postDraftsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postQueries
    );

    // Filter post drafts client-side for public drafts (groupIdString is null or empty)
    const postDrafts = groupId
      ? postDraftsResponse.documents
      : postDraftsResponse.documents.filter(
          (post) => !post.groupIdString || post.groupIdString === ""
        );

    // Fetch poll drafts
    const pollQueries = [
      Query.equal("creatorId", userId),
      Query.equal("isDraft", true),
      Query.select([
        "$id",
        "$createdAt",
        "question",
        "categoryIdString",
        "categoryName",
        "subCategory",
        "creatorName",
        "creatorId",
        "creatorImageUrl",
        "allowMultipleAnswers",
        "groupIdString",
        "groupName",
        "durationInDays",
        "totalVotes",
        "imageUrl",
        "description",
        "isAnonymous",
        "isDraft",
      ]),
    ];
    if (groupId) {
      pollQueries.push(Query.equal("groupIdString", groupId));
    }
    const pollDraftsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pollsCollectionId,
      pollQueries
    );

    // Filter poll drafts client-side for public drafts (groupIdString is null or empty)
    const pollDrafts = groupId
      ? pollDraftsResponse.documents
      : pollDraftsResponse.documents.filter(
          (poll) => !poll.groupIdString || poll.groupIdString === ""
        );

    // Fetch poll options for poll drafts
    const pollIds = pollDrafts.map((poll) => poll.$id);
    const optionsResponse = pollIds.length
      ? await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.pollOptionsCollectionId,
          [
            Query.equal("pollId", pollIds),
            Query.orderAsc("$createdAt"),
            Query.select(["$id", "optionText", "voteCount", "imageUrl"]),
          ]
        )
      : { documents: [] };

    const optionsMap: Record<string, IPollOption[]> = {};
    optionsResponse.documents.forEach((option) => {
      const pollId = option.pollId?.$id || option.pollId;
      optionsMap[pollId] = optionsMap[pollId] || [];
      optionsMap[pollId].push({
        $id: option.$id,
        pollId,
        optionText: option.optionText || "Untitled Option",
        voteCount: option.voteCount || 0,
        imageUrl: option.imageUrl || null,
      });
    });

    // Format post drafts
    const formattedPostDrafts: Post[] = postDrafts.map((post) => ({
      ...post,
      type: "post",
      $id: post.$id,
      $createdAt: post.$createdAt,
      $collectionId: post.$collectionId || appwriteConfig.postCollectionId,
      $databaseId: post.$databaseId || appwriteConfig.databaseId,
      $updatedAt: post.$updatedAt || post.$createdAt,
      $permissions: post.$permissions || [],
      creator: userId,
      creatorId: userId,
      createdAt: post.createdAt || post.$createdAt,
      groupId: post.groupIdString ? { $id: post.groupIdString } : null,
      groupIdString: post.groupIdString || "",
      categoryId: post.categoryIdString || "",
      isAnonymous: post.isAnonymous || false,
      imageUrl: post.imageUrl || null,
      description: post.description || null,
      tags: Array.isArray(post.tags) ? post.tags : [],
      greatBy: Array.isArray(post.greatBy) ? post.greatBy : [],
      greatCount: post.greatCount || 0,
      simpleLikedBy: Array.isArray(post.simpleLikedBy)
        ? post.simpleLikedBy
        : [],
      superLikedBy: Array.isArray(post.superLikedBy) ? post.superLikedBy : [],
      superLikeCount: post.superLikeCount || 0,
      simpleLikeCount: post.simpleLikeCount || 0,
      commentsLocked: post.commentsLocked || false,
      lockExpiry: post.lockExpiry || null,
      lockedBy: post.lockedBy || undefined,
      isDraft: post.isDraft || true,
      isInMainPage: post.isInMainPage || false,
      expirationDateMainPage: post.expirationDateMainPage || null,
      isInCategoryPage: post.isInCategoryPage || false,
      expirationDateCategoryPage: post.expirationDateCategoryPage || null,
      isInSubcategoryPage: post.isInSubcategoryPage || false,
      expirationDateSubcategoryPage: post.expirationDateSubcategoryPage || null,
    }));

    // Format poll drafts
    const formattedPollDrafts: IPoll[] = pollDrafts.map((poll) => ({
      type: "poll",
      $id: poll.$id,
      $createdAt: poll.$createdAt,
      $collectionId: poll.$collectionId || appwriteConfig.pollsCollectionId,
      $databaseId: poll.$databaseId || appwriteConfig.databaseId,
      $updatedAt: poll.$updatedAt || poll.$createdAt,
      $permissions: poll.$permissions || [],
      question: poll.question || "Untitled Poll",
      createdAt: poll.createdAt || poll.$createdAt,
      subCategory: poll.subCategory || "",
      allowMultipleAnswers: poll.allowMultipleAnswers || false,
      creatorId: poll.creatorId || userId,
      creator: poll.creatorId || userId,
      creatorName: poll.isAnonymous
        ? "Anonymous"
        : poll.creatorName || "Unknown User",
      creatorImageUrl: poll.isAnonymous
        ? "/assets/icons/profile-placeholder.svg"
        : poll.creatorImageUrl || "/assets/icons/profile-placeholder.svg",
      durationInDays: poll.durationInDays ?? 0,
      totalVotes: poll.totalVotes || 0,
      likes: poll.likedBy || [],
      saves: [],
      categoryId: poll.categoryIdString || "",
      categoryIdString: poll.categoryIdString || "",
      categoryName: poll.categoryName || "No Category",
      groupId: poll.groupIdString ? { $id: poll.groupIdString } : null,
      groupIdString: poll.groupIdString || "",
      groupName: poll.groupName || "",
      imageId: poll.imageId || undefined,
      imageUrl: poll.imageUrl || null,
      description: poll.description || null,
      isAnonymous: poll.isAnonymous || false,
      likedBy: poll.likedBy || [],
      superLikedBy: Array.isArray(poll.superLikedBy) ? poll.superLikedBy : [],
      simpleLikedBy: Array.isArray(poll.simpleLikedBy)
        ? poll.simpleLikedBy
        : [],
      superLikeCount: poll.superLikeCount || 0,
      simpleLikeCount: poll.simpleLikeCount || 0,
      options: optionsMap[poll.$id] || [],
      votedUsers: Array.isArray(poll.votedUsers) ? poll.votedUsers : [],
      commentsLocked: poll.commentsLocked || false,
      lockExpiry: poll.lockExpiry || null,
      lockedBy: poll.lockedBy || undefined,
      isDraft: poll.isDraft || true,
    }));

    // Combine and sort drafts by creation date
    const allDrafts = [...formattedPostDrafts, ...formattedPollDrafts].sort(
      (a, b) =>
        new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
    );

    return allDrafts;
  } catch (error) {
    console.error("getUserDrafts: Error fetching drafts", {
      userId,
      groupId,
      error,
    });
    throw error;
  }
}
// File: src/lib/appwrite/postService.ts
// Insertion: Add the following function after deleteSavedPost

export async function getUserSavedItems(
  userId: string,
  limit = 10,
  cursor?: string
): Promise<SavedContent[]> {
  try {
    if (!userId) {
      console.error("getUserSavedItems: User ID is required");
      throw new Error("User ID is required");
    }

    const queries = [Query.equal("userId", userId), Query.limit(limit)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const savesResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      queries
    );

    if (!savesResponse.documents.length) {
      return [];
    }

    // Separate postIds and pollIds
    const postIds: string[] = [];
    const pollIds: string[] = [];
    savesResponse.documents.forEach((save) => {
      if (save.isPoll && save.pollId) {
        pollIds.push(save.pollId);
      } else if (!save.isPoll && save.postId) {
        postIds.push(save.postId);
      }
    });

    // Fetch posts
    let posts: Post[] = [];
    if (postIds.length > 0) {
      const postQueries = [
        Query.equal("$id", postIds),
        Query.select([
          "$id",
          "$createdAt",
          "title",
          "description",
          "imageUrl",
          "categoryName",
          "creatorName",
          "creatorImageUrl",
          "creatorId",
          "categoryIdString",
          "subCategory",
          "tags",
          "isAnonymous",
          "imageId",
          "greatBy",
          "greatCount",
          "groupIdString",
          "groupName",
          "likedBy",
          "superLikedBy",
          "superLikeCount",
          "simpleLikedBy",
          "simpleLikeCount",
          "commentsLocked",
          "lockExpiry",
          "lockedBy",
          "isInMainPage",
          "expirationDateMainPage",
          "isInCategoryPage",
          "expirationDateCategoryPage",
          "isInSubcategoryPage",
          "expirationDateSubcategoryPage",
          "isDraft",
        ]),
      ];
      const postsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        postQueries
      );
      posts = postsResponse.documents.map((post) => ({
        ...post,
        type: "post",
        groupId: post.groupIdString ? { $id: post.groupIdString } : null,
        isDraft: post.isDraft || false,
      }));
    }

    // Fetch polls
    let polls: IPoll[] = [];
    if (pollIds.length > 0) {
      const pollQueries = [
        Query.equal("$id", pollIds),
        Query.select([
          "$id",
          "$createdAt",
          "question",
          "description",
          "imageUrl",
          "categoryName",
          "creatorName",
          "creatorImageUrl",
          "creatorId",
          "categoryIdString",
          "subCategory",
          "isAnonymous",
          "imageId",
          "greatBy",
          "greatCount",
          "groupIdString",
          "groupName",
          "likedBy",
          "superLikedBy",
          "superLikeCount",
          "simpleLikedBy",
          "simpleLikeCount",
          "commentsLocked",
          "lockExpiry",
          "lockedBy",
          "isDraft",
        ]),
      ];
      const pollsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.pollsCollectionId,
        pollQueries
      );

      // Fetch options for polls
      const optionsResponse = pollIds.length
        ? await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.pollOptionsCollectionId,
            [
              Query.equal("pollId", pollIds),
              Query.orderAsc("$createdAt"),
              Query.select(["$id", "optionText", "voteCount", "imageUrl"]),
            ]
          )
        : { documents: [] };

      const optionsMap: Record<string, IPollOption[]> = {};
      optionsResponse.documents.forEach((option) => {
        const pollId = option.pollId?.$id || option.pollId;
        optionsMap[pollId] = optionsMap[pollId] || [];
        optionsMap[pollId].push({
          $id: option.$id,
          pollId,
          optionText: option.optionText || "Untitled Option",
          voteCount: option.voteCount || 0,
          imageUrl: option.imageUrl || null,
        });
      });

      polls = pollsResponse.documents.map((poll) => ({
        type: "poll",
        $id: poll.$id,
        $createdAt: poll.$createdAt,
        $collectionId: poll.$collectionId || appwriteConfig.pollsCollectionId,
        $databaseId: poll.$databaseId || appwriteConfig.databaseId,
        $updatedAt: poll.$updatedAt || poll.$createdAt,
        $permissions: poll.$permissions || [],
        question: poll.question || "Untitled Poll",
        createdAt: poll.createdAt || poll.$createdAt,
        subCategory: poll.subCategory || "",
        allowMultipleAnswers: poll.allowMultipleAnswers || false,
        creatorId: poll.creatorId,
        creator: poll.creatorId,
        creatorName: poll.isAnonymous
          ? "Anonymous"
          : poll.creatorName || "Unknown User",
        creatorImageUrl: poll.isAnonymous
          ? "/assets/icons/profile-placeholder.svg"
          : poll.creatorImageUrl || "/assets/icons/profile-placeholder.svg",
        durationInDays: poll.durationInDays ?? 0,
        totalVotes: poll.totalVotes || 0,
        likes: poll.likedBy || [],
        saves: [],
        categoryId: poll.categoryIdString,
        categoryIdString: poll.categoryIdString,
        categoryName: poll.categoryName || "No Category",
        groupId: poll.groupIdString ? { $id: poll.groupIdString } : null,
        groupIdString: poll.groupIdString || "",
        groupName: poll.groupName || "",
        imageId: poll.imageId || undefined,
        imageUrl: poll.imageUrl || null,
        description: poll.description || null,
        isAnonymous: poll.isAnonymous || false,
        likedBy: poll.likedBy || [],
        superLikedBy: Array.isArray(poll.superLikedBy) ? poll.superLikedBy : [],
        simpleLikedBy: Array.isArray(poll.simpleLikedBy)
          ? poll.simpleLikedBy
          : [],
        superLikeCount: poll.superLikeCount || 0,
        simpleLikeCount: poll.simpleLikeCount || 0,
        options: optionsMap[poll.$id] || [],
        votedUsers: Array.isArray(poll.votedUsers) ? poll.votedUsers : [],
        commentsLocked: poll.commentsLocked || false,
        lockExpiry: poll.lockExpiry || null,
        lockedBy: poll.lockedBy || undefined,
        isDraft: poll.isDraft || false,
      }));
    }

    // Combine and sort by save date (but since we don't have save date, sort by content creation date)
    const allSaved = [...posts, ...polls].sort(
      (a, b) =>
        new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
    );

    return allSaved;
  } catch (error) {
    console.error("getUserSavedItems: Error fetching saved items", {
      userId,
      error,
    });
    throw error;
  }
}
