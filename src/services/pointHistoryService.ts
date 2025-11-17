import { databases, appwriteConfig, Query } from "@/lib/appwrite/config";
import { ID, Models } from "appwrite";

// Define interface for point history document
export interface PointHistory extends Models.Document {
  userId: string;
  reason: string;
  point: number;
  createdAt: string;
}

// Create a point history record
export async function createPointHistory({
  userId,
  reason,
  point,
}: {
  userId: string;
  reason: string;
  point: number;
}) {
  try {
    // Verify user exists
    const userDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("$id", userId)]
    );

    if (userDocs.documents.length === 0) {
      console.error("No user found for userId:", userId);
      throw new Error("User not found");
    }

    const pointHistory = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.pointhistoryCollectionId,
      ID.unique(),
      {
        userId,
        reason,
        point,
      }
    );

    return pointHistory;
  } catch (error: any) {
    console.error("Failed to create point history:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
}

// Fetch point history for a user
export async function getPointHistoryByUser({
  userId,
  cursor,
}: {
  userId: string;
  cursor?: string;
}) {
  try {
    const queries = [Query.equal("userId", userId)];

    if (cursor) {
      queries.push(Query.cursorAfter(cursor));
    }

    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.pointhistoryCollectionId,
      queries
    );

    return response;
  } catch (error: any) {
    console.error("Failed to fetch point history:", {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
}