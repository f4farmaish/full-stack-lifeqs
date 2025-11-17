import { databases, appwriteConfig, Query } from "@/lib/appwrite/config";
import { ID } from "appwrite";
import { IReaction } from "@/types";

// Fetch all reactions for a comment
export async function getReactionsByCommentId(commentId: string): Promise<IReaction[]> {
  try {
    const response: any = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.reactionsCollectionId,
      [Query.equal("commentId", commentId)]
    );
    return response.documents as IReaction[];
  } catch (error) {
    console.error("Error fetching reactions for comment:", error);
    throw error;
  }
}

// Create a reaction
export async function createReaction(commentId: string, userId: string, emoji: string): Promise<IReaction> {
  try {
    // Validate emoji
    const validEmojis = ['😢', '😂', '🔥', '🎉', '🙏'];
    if (!validEmojis.includes(emoji)) {
      throw new Error("Invalid emoji");
    }

    // Create reaction document
    const reaction: any = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.reactionsCollectionId,
      ID.unique(),
      {
        userId,
        commentId,
        emoji,
        createdAt: new Date().toISOString()  // Set custom createdAt to avoid NULL
      }
    );

    return reaction as IReaction;
  } catch (error) {
    console.error("Error creating reaction:", error);
    throw error;
  }
}

// Delete a reaction
export async function deleteReaction(reactionId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.reactionsCollectionId,
      reactionId
    );
  } catch (error) {
    console.error("Error deleting reaction:", error);
    throw error;
  }
}

// Toggle/create reaction (handles one-per-user logic)
export async function reactToComment(commentId: string, userId: string, emoji: string | null): Promise<void> {
  try {
    const reactions = await getReactionsByCommentId(commentId);
    const existing = reactions.find((r: IReaction) => r.userId === userId);
    if (existing) {
      if (existing.emoji === emoji) {
        // Toggle off if same emoji
        await deleteReaction(existing.$id);
        return;
      } else {
        // Delete old reaction
        await deleteReaction(existing.$id);
      }
    }
    if (emoji) {
      // Create new reaction
      await createReaction(commentId, userId, emoji);
    }
  } catch (error) {
    console.error("Error in reactToComment:", error);
    throw error;
  }
}