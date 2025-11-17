import { Client, Account, Databases, Storage, Avatars, Query, Functions } from "appwrite";

// Configuration object for Appwrite
export const appwriteConfig = {
  url: import.meta.env.VITE_APPWRITE_URL,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: import.meta.env.VITE_APPWRITE_API_KEY, // Added for completeness
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  storageId: import.meta.env.VITE_APPWRITE_STORAGE_ID,
  userCollectionId: import.meta.env.VITE_APPWRITE_USER_COLLECTION_ID, // 68249c0a002549865580
  postCollectionId: import.meta.env.VITE_APPWRITE_POST_COLLECTION_ID, // 67f7c5cf00273095911d
  savesCollectionId: import.meta.env.VITE_APPWRITE_SAVES_COLLECTION_ID, // 67f7c73c003d471d442d
  categoriesCollectionId: import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID, // 67f7c1130010bda47b8c
  commentsCollectionId: import.meta.env.VITE_APPWRITE_COMMENTS_COLLECTION_ID, // 67f7c67e0001507c009d
  groupsCollectionId: import.meta.env.VITE_APPWRITE_GROUPS_COLLECTION_ID, // 67f7c3cb003789644369
  pollsCollectionId: import.meta.env.VITE_APPWRITE_POLLS_COLLECTION_ID, // 67f7c5040021439fde2a
  pollOptionsCollectionId: import.meta.env.VITE_APPWRITE_POLLOPTIONS_COLLECTION_ID, // 67f7c5920021e72c2986
  votesCollectionId: import.meta.env.VITE_APPWRITE_VOTES_COLLECTION_ID, // 67f7c72a001af1c72b93
  membershipRequestsCollectionId: import.meta.env.VITE_APPWRITE_MEMBERSHIPREQUESTS_COLLECTION_ID, // 67f7c769002bf52b1eb6
  notificationsCollectionId: import.meta.env.VITE_APPWRITE_NOTIFICATIONS_COLLECTION_ID, // 67f7c7eb002a8d09dd9a
  messagesCollectionId: import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID, // 67f7c965003ae7c054ef
  chatsCollectionId: import.meta.env.VITE_APPWRITE_CHATS_COLLECTION_ID, // 67f7c8d100161cbacdbd
  pointhistoryCollectionId: import.meta.env.VITE_APPWRITE_POINTHISTORY_COLLECTION_ID,
  blockedUsersCollectionId: import.meta.env.VITE_APPWRITE_BLOCKEDUSERS_COLLECTION_ID, // 67f7c4b1002c474e9432
  businessApplicationsCollectionId: import.meta.env.VITE_APPWRITE_BUSINESS_APPLICATIONS_COLLECTION_ID, // 682b1df700297ca6cc19
  deleteUserFunctionId: import.meta.env.VITE_APPWRITE_DELETE_USER_FUNCTION_ID, // Function ID for checkAndDeleteUser
  myCardCollectionId: import.meta.env.VITE_APPWRITE_MYCARD_COLLECTION_ID, // Function ID for checkAndDeleteUser
  transactionHistoryCollectionId: import.meta.env.VITE_APPWRITE_TRANSACTION_HISTORY_COLLECTION_ID, // Function ID for checkAndDeleteUser
  groupInvitationsCollectionId: import.meta.env.VITE_APPWRITE_GROUP_INVITATIONS_COLLECTION_ID,
  reactionsCollectionId: import.meta.env.VITE_APPWRITE_REACTIONS_COLLECTION_ID,
};

// Validate required environment variables
const requiredEnvVars = [
  "VITE_APPWRITE_URL",
  "VITE_APPWRITE_PROJECT_ID",
  // "VITE_APPWRITE_API_KEY"
  "VITE_APPWRITE_DATABASE_ID",
  "VITE_APPWRITE_STORAGE_ID",
  "VITE_APPWRITE_USER_COLLECTION_ID",
  "VITE_APPWRITE_POST_COLLECTION_ID",
  "VITE_APPWRITE_SAVES_COLLECTION_ID",
  "VITE_APPWRITE_CATEGORIES_COLLECTION_ID",
  "VITE_APPWRITE_COMMENTS_COLLECTION_ID",
  "VITE_APPWRITE_GROUPS_COLLECTION_ID",
  "VITE_APPWRITE_POLLS_COLLECTION_ID",
  "VITE_APPWRITE_POLLOPTIONS_COLLECTION_ID",
  "VITE_APPWRITE_VOTES_COLLECTION_ID",
  "VITE_APPWRITE_MEMBERSHIPREQUESTS_COLLECTION_ID",
  "VITE_APPWRITE_NOTIFICATIONS_COLLECTION_ID",
  "VITE_APPWRITE_MESSAGES_COLLECTION_ID",
  "VITE_APPWRITE_CHATS_COLLECTION_ID",
  "VITE_APPWRITE_POINTHISTORY_COLLECTION_ID",
  "VITE_APPWRITE_BLOCKEDUSERS_COLLECTION_ID",
  "VITE_APPWRITE_BUSINESS_APPLICATIONS_COLLECTION_ID",
  "VITE_APPWRITE_DELETE_USER_FUNCTION_ID",  
  "VITE_APPWRITE_MYCARD_COLLECTION_ID",
  "VITE_APPWRITE_TRANSACTION_HISTORY_COLLECTION_ID",
  "VITE_APPWRITE_REACTIONS_COLLECTION_ID",
];

const missingEnvVars = requiredEnvVars.filter(
  (key) => !import.meta.env[key] || import.meta.env[key] === ""
);

if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  throw new Error("Appwrite configuration is incomplete. Check .env file.");
}

// Derive Realtime endpoint from REST API URL
const getRealtimeEndpoint = (restUrl: string) => {
  try {
    const url = new URL(restUrl);
    const protocol = url.protocol === "https:" ? "wss://" : "ws://";
    return `${protocol}${url.host}/v1/realtime`;
  } catch (error) {
    console.error("Invalid Appwrite URL:", error);
    return "wss://cloud.appwrite.io/v1/realtime"; // Fallback to Appwrite Cloud
  }
};

// Initialize Appwrite client
export const client = new Client();
client
  .setEndpoint(appwriteConfig.url)
  .setProject(appwriteConfig.projectId)
  .setEndpointRealtime(getRealtimeEndpoint(appwriteConfig.url));

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export const functions = new Functions(client);
export { Query };