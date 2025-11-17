// Updated messageService.ts with optimizations and proper error handling

import {
  appwriteConfig,
  databases,
  storage,
  Query,
} from "@/lib/appwrite/config";
import { ID, Models } from "appwrite";
import { IToggleLikeMessageParams } from "@/types";

export const toggleLikeMessage = async ({
  messageId,
  userId,
  currentLikedBy,
  chatId,
}: IToggleLikeMessageParams): Promise<string[]> => {
  try {


    const wasLiked = currentLikedBy.includes(userId);
    const updatedLikedBy = wasLiked
      ? currentLikedBy.filter((id) => id !== userId)
      : [...currentLikedBy, userId];

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      messageId,
      {
        likedBy: updatedLikedBy,
      }
    );

    // Handle chat update logic only if conditions are met
    const lastMessages = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [
        Query.equal("chatId", chatId),
        Query.orderDesc("timestamp"),
        Query.limit(1),
      ]
    );

    if (lastMessages.total > 0 && lastMessages.documents[0].$id === messageId) {
      // This is the last message in the chat
      const chats = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.chatsCollectionId,
        [Query.equal("chatId", chatId)]
      );

      if (chats.total > 0) {
        const chatDoc = chats.documents[0];

        if (!wasLiked) {
          // Adding a like - set to "reacted" regardless of previous likes
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.chatsCollectionId,
            chatDoc.$id,
            {
              lastMessage: "reacted to your message.",
              lastSenderId: userId,
              updatedAt: new Date().toISOString(),
            }
          );
        } else if (updatedLikedBy.length === 0) {
          // Removing the last like - revert to original message content
          const message = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.messagesCollectionId,
            messageId
          );

          let lastMessageText = "";
          if (message.content?.trim()) {
            lastMessageText = message.content.trim();
          } else if (message.imageUrls && message.imageUrls.length > 0) {
            lastMessageText = "[Image]";
          }

          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.chatsCollectionId,
            chatDoc.$id,
            {
              lastMessage: lastMessageText,
              lastSenderId: message.senderId,
              updatedAt: new Date().toISOString(),
            }
          );
        }
        // If removing but likes remain, or adding when already liked, no update needed
      }
    }

    return updatedLikedBy;
  } catch (error) {
    console.error("Error toggling message like:", error);
    throw error;
  }
};
// Upload chat image with optimized error handling
export const uploadChatImage = async (file: File): Promise<string> => {
  try {

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Image file too large. Maximum size is 10MB.");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed.");
    }

    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );


    const imageUrl = storage.getFileView(
      appwriteConfig.storageId,
      uploadedFile.$id
    ).href;

    return imageUrl;
  } catch (error) {
    console.error("Image upload failed:", error);
    throw error;
  }
};

// Fetch messages for a chat with pagination and caching optimization
export const fetchMessages = async ({
  chatId,
  limit,
  offset,
}: {
  chatId: string;
  limit: number;
  offset: number;
}): Promise<Models.DocumentList<Models.Document>> => {
  try {


    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [
        Query.equal("chatId", chatId),
        Query.orderDesc("timestamp"),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );


    return res;
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    throw error;
  }
};

// Mark a message as read with optimized update
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      messageId,
      { read: true }
    );

  } catch (error) {
    console.error("Failed to mark message as read:", error);
    throw error;
  }
};

// Batch mark multiple messages as read for optimization
export const batchMarkMessagesAsRead = async (
  messageIds: string[]
): Promise<void> => {
  try {

    const updatePromises = messageIds.map((messageId) =>
      databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        messageId,
        { read: true }
      )
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error("Failed to batch mark messages as read:", error);
    throw error;
  }
};

// Get message count for a chat (useful for pagination)
export const getMessageCount = async (chatId: string): Promise<number> => {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [
        Query.equal("chatId", chatId),
        Query.limit(1), // We only need count, not actual documents
      ]
    );

    return res.total;
  } catch (error) {
    console.error("Failed to get message count:", error);
    throw error;
  }
};

// Get unread message count for a user
export const getUnreadMessageCount = async (
  userId: string
): Promise<number> => {
  try {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [
        Query.equal("receiverId", userId),
        Query.equal("read", false),
        Query.limit(1), // We only need count
      ]
    );

    return res.total;
  } catch (error) {
    console.error("Failed to get unread message count:", error);
    throw error;
  }
};
