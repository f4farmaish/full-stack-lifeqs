import { appwriteConfig, databases, Query } from "@/lib/appwrite/config";
import { generateChatId } from "@/lib/utils";
import { ID } from "appwrite";
import { isBlocked } from "@/services/blockService";

const DATABASE_ID = appwriteConfig.databaseId;
const CHATS_COLLECTION = appwriteConfig.chatsCollectionId;
const MESSAGES_COLLECTION = appwriteConfig.messagesCollectionId;
const USERS_COLLECTION = appwriteConfig.userCollectionId;

export const sendMessage = async ({
  senderId,
  receiverId,
  content,
  imageUrls,
}: {
  senderId: string;
  receiverId: string;
  content: string;
  imageUrls?: string[];
}) => {
  // Check if either user has blocked the other
  const [senderBlocked, receiverBlocked] = await Promise.all([
    isBlocked(senderId, receiverId),
    isBlocked(receiverId, senderId)
  ]);

  if (senderBlocked || receiverBlocked) {
    throw new Error("Cannot send message. One of the users has blocked the other.");
  }

  // Use consistent chatId
  const chatId = generateChatId(senderId, receiverId);
  const now = new Date().toISOString();

  // 1. Check if chat already exists
  const existingChats = await databases.listDocuments(
    DATABASE_ID,
    CHATS_COLLECTION,
    [Query.equal("chatId", chatId)]
  );

  let chatDoc;

  // 2. If not exists, create new chat and fetch both users
  if (existingChats.total === 0) {
    const users = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION, [
      Query.equal("$id", [senderId, receiverId]),
    ]);

    const sender = users.documents.find((u) => u.$id === senderId);
    const receiver = users.documents.find((u) => u.$id === receiverId);

    const senderName = sender?.name || "Unknown";
    const senderImage = sender?.imageUrl || "";
    const receiverName = receiver?.name || "Unknown";
    const receiverImage = receiver?.imageUrl || "";

    const userIds = [senderId, receiverId];
    const userNames = [senderName, receiverName];
    const userImages = [senderImage, receiverImage];
    const lastSeenAt = userIds.map((id) => (id === senderId ? now : null));

    const createdChat = await databases.createDocument(
      DATABASE_ID,
      CHATS_COLLECTION,
      ID.unique(),
      {
        chatId,
        userIds,
        userNames,
        userImages,
        lastSeenAt,
        createdAt: now,
        updatedAt: now,
      }
    );

    chatDoc = createdChat;
  } else {
    chatDoc = existingChats.documents[0];
  }

  // 3. Send the message with imageUrls
  const newMessage = await databases.createDocument(
    DATABASE_ID,
    MESSAGES_COLLECTION,
    ID.unique(),
    {
      chatId,
      senderId,
      receiverId,
      content,
      imageUrls: imageUrls ?? [],
      timestamp: now,
      read: false,
    }
  );

  // 4. Update chat metadata
  if (chatDoc) {
    const userIds = chatDoc.userIds || [];
    const prevLastSeen = chatDoc.lastSeenAt || [];
    const updatedLastSeen = [...prevLastSeen];

    userIds.forEach((id: string, index: number) => {
      if (id === senderId) {
        updatedLastSeen[index] = now;
      }
    });

    let lastMessageText = "";
    if (content?.trim()) {
      lastMessageText = content.trim();
    } else if (imageUrls && imageUrls.length > 0) {
      lastMessageText = "[Image]";
    }

    await databases.updateDocument(DATABASE_ID, CHATS_COLLECTION, chatDoc.$id, {
      updatedAt: now,
      lastSeenAt: updatedLastSeen,
      lastMessage: lastMessageText,
      lastSenderId: senderId,
    });
  }

  return newMessage;
};
