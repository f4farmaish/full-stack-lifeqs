import { appwriteConfig, databases } from "@/lib/appwrite/config";
import { Models, ID, Query } from "appwrite";

// Interface for TransactionHistory data
interface TransactionHistory {
  user_id: string;
  created_at: string;
  type: string;
  amount: number;
  details?: string;
  status: string;
}

// Create a new transaction in the TransactionHistory collection
export const createTransaction = async (transactionData: TransactionHistory): Promise<Models.Document> => {
  try {
    const response = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.transactionHistoryCollectionId,
      ID.unique(),
      {
        user_id: transactionData.user_id,
        created_at: transactionData.created_at,
        type: transactionData.type,
        amount: transactionData.amount,
        details: transactionData.details,
        status: transactionData.status,
      }
    );
    return response;
  } catch (error) {
    console.error("Failed to create transaction:", error);
    throw error;
  }
};

// Fetch all transactions for a given user by user_id
export const getTransactionsByUserId = async (userId: string): Promise<Models.Document[]> => {
  try {
    const response :any = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.transactionHistoryCollectionId,
      [
        Query.equal("user_id", userId),
        Query.orderDesc("$createdAt"), // Sort by creation date, newest first
      ]
    );
    return response.documents;
  } catch (error) {
    console.error("Failed to fetch transactions for user:", error);
    throw error;
  }
};