import { databases } from "@/lib/appwrite/config";
import { ID, Query } from "appwrite";

import { appwriteConfig } from "@/lib/appwrite/config";

const DB_ID = appwriteConfig.databaseId;
const BLOCKED_COLLECTION_ID = appwriteConfig.blockedUsersCollectionId;


export const blockUser = async (blockerId: string, blockedId: string) => {
  const existing = await databases.listDocuments(DB_ID, BLOCKED_COLLECTION_ID, [
    Query.equal("blockerId", blockerId),
    Query.equal("blockedId", blockedId),
  ]);

  if (existing.documents.length > 0) {
    return existing.documents[0]; // Already blocked
  }

  return await databases.createDocument(DB_ID, BLOCKED_COLLECTION_ID, ID.unique(), {
    blockerId,
    blockedId,
  });
};


export const unblockUser = async (blockerId: string, blockedId: string) => {
  const res = await databases.listDocuments(DB_ID, BLOCKED_COLLECTION_ID, [
    Query.equal("blockerId", blockerId),
    Query.equal("blockedId", blockedId),
  ]);
  if (res.documents.length > 0) {
    return await databases.deleteDocument(DB_ID, BLOCKED_COLLECTION_ID, res.documents[0].$id);
  }
};

export const isBlocked = async (blockerId: string, blockedId: string) => {
  const res = await databases.listDocuments(DB_ID, BLOCKED_COLLECTION_ID, [
    Query.equal("blockerId", blockerId),
    Query.equal("blockedId", blockedId),
  ]);
  return res.documents.length > 0;
};

export const getBlockedUserIds = async (blockerId: string) => {
  const res = await databases.listDocuments(DB_ID, BLOCKED_COLLECTION_ID, [
    Query.equal("blockerId", blockerId),
  ]);
  return res.documents.map(doc => doc.blockedId);
};


export const filterBlockedContent = async (items: any[], currentUserId: string) => {
  if (!currentUserId) return items;

  try {
    const blockedIds = await getBlockedUserIds(currentUserId);
    return items.filter((item) => !blockedIds.includes(item.creator));
  } catch (error) {
    console.error("Failed to filter blocked content:", error);
    return items;
  }
};