"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appwriteConfig = exports.databases = void 0;
const node_appwrite_1 = require("node-appwrite");
const client = new node_appwrite_1.Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_PROJECT_ID || "");
exports.databases = new node_appwrite_1.Databases(client);
exports.appwriteConfig = {
    databaseId: process.env.DATABASE_ID || "",
    notificationsCollectionId: process.env.NOTIFICATIONS_COLLECTION_ID || "",
    groupsCollectionId: process.env.GROUPS_COLLECTION_ID || "",
    userCollectionId: process.env.USER_COLLECTION_ID || "",
    postsCollectionId: process.env.POSTS_COLLECTION_ID || "",
    pollsCollectionId: process.env.POLLS_COLLECTION_ID || "",
    commentsCollectionId: process.env.COMMENTS_COLLECTION_ID || "",
};
