import { appwriteConfig, databases } from "@/lib/appwrite/config";
import { Models, ID, Query } from "appwrite";

// Interface for MyCard data
interface MyCard {
  account_id: string;
  card_id: string;
  expired_at: string | null;
  is_active: boolean;
}

// Create a new card in the my_card collection
export const createMyCard = async (cardData: MyCard): Promise<Models.Document> => {
  try {
    const response = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.myCardCollectionId,
      ID.unique(),
      {
        account_id: cardData.account_id,
        card_id: cardData.card_id,
        expired_at: cardData.expired_at,
        is_active: cardData.is_active,
      }
    );
    return response;
  } catch (error) {
    console.error("Failed to create card:", error);
    throw error;
  }
};

// Fetch all cards for a given user by account_id
export const getMyCardsByUserId = async (accountId: string): Promise<Models.Document[]> => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.myCardCollectionId,
      [
        Query.equal("account_id", accountId),
        Query.orderDesc("$createdAt"), // Sort by creation date, newest first
      ]
    );
    return response.documents;
  } catch (error) {
    console.error("Failed to fetch cards for user:", error);
    throw error;
  }
};

// Update a card in the my_card collection
export const updateMyCard = async (documentId: string, updates: any): Promise<Models.Document> => {
  try {
    const response = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.myCardCollectionId,
      documentId,
      updates
    );
    return response;
  } catch (error) {
    console.error("Failed to update card:", error);
    throw error;
  }
};