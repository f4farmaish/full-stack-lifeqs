import { Client, Databases } from "node-appwrite";

const client = new Client();

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || "");

export const databases = new Databases(client);

export const appwriteConfig = {
  databaseId: process.env.DATABASE_ID || "",
  notificationsCollectionId: process.env.NOTIFICATIONS_COLLECTION_ID || "",
  groupsCollectionId: process.env.GROUPS_COLLECTION_ID || "",
  userCollectionId: process.env.USER_COLLECTION_ID || "",
  postsCollectionId: process.env.POSTS_COLLECTION_ID || "",
  pollsCollectionId: process.env.POLLS_COLLECTION_ID || "",
  commentsCollectionId: process.env.COMMENTS_COLLECTION_ID || "",
};
