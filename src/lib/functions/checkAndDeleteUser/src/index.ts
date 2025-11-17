import { Client, Databases, Storage, Users, Query } from "node-appwrite";
import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID,
  APPWRITE_POST_COLLECTION_ID,
  APPWRITE_COMMENT_COLLECTION_ID,
  APPWRITE_POLL_COLLECTION_ID,
  APPWRITE_MESSAGE_COLLECTION_ID,
  APPWRITE_CHAT_COLLECTION_ID,
  APPWRITE_NOTIFICATION_COLLECTION_ID,
  APPWRITE_SAVES_COLLECTION_ID,
  APPWRITE_VOTES_COLLECTION_ID,
  APPWRITE_BLOCKED_USERS_COLLECTION_ID,
  APPWRITE_MEMBERSHIP_REQUESTS_COLLECTION_ID,
  APPWRITE_GROUPS_COLLECTION_ID,
  APPWRITE_STORAGE_ID,
} from "./config";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const users = new Users(client);

interface Payload {
  userId: string;
}

export default async function handler({ req, res, log, error }: any) {
  try {
    // Parse request payload
    const payload: Payload = JSON.parse(req.body);
    const { userId } = payload;

    if (!userId || typeof userId !== "string") {
      error("Invalid userId: Must be a non-empty string.");
      return res.json({ error: "Invalid userId" }, 400);
    }

    log(`Starting deletion process for user: ${userId}`);

    // Delete user document
    try {
      await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_USER_COLLECTION_ID,
        userId
      );
      log(`Deleted user document: ${userId}`);
    } catch (err) {
      error(`Failed to delete user document: ${err}`);
    }

    // Delete posts
    let lastPostId: string | undefined;
    while (true) {
      const queries = [Query.equal("creatorId", userId), Query.limit(100)];
      if (lastPostId) queries.push(Query.cursorAfter(lastPostId));

      const posts = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_POST_COLLECTION_ID,
        queries
      );

      if (posts.documents.length === 0) break;

      const deletePostPromises = posts.documents.map(async (post) => {
        if (post.imageId) {
          try {
            await storage.deleteFile(APPWRITE_STORAGE_ID, post.imageId);
            log(`Deleted post image: ${post.imageId}`);
          } catch (err) {
            error(`Failed to delete post image ${post.imageId}: ${err}`);
          }
        }
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_POST_COLLECTION_ID,
          post.$id
        );
        log(`Deleted post: ${post.$id}`);
      });

      await Promise.all(deletePostPromises);
      lastPostId = posts.documents[posts.documents.length - 1].$id;

      if (posts.documents.length < 100) break;
    }

    // Delete comments
    let lastCommentId: string | undefined;
    while (true) {
      const queries = [Query.equal("userIdString", userId), Query.limit(100)];
      if (lastCommentId) queries.push(Query.cursorAfter(lastCommentId));

      const comments = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COMMENT_COLLECTION_ID,
        queries
      );

      if (comments.documents.length === 0) break;

      const deleteCommentPromises = comments.documents.map((comment) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COMMENT_COLLECTION_ID,
          comment.$id
        )
      );

      await Promise.all(deleteCommentPromises);
      log(`Deleted ${comments.documents.length} comments`);
      lastCommentId = comments.documents[comments.documents.length - 1].$id;

      if (comments.documents.length < 100) break;
    }

    // Delete polls and associated poll options
    let lastPollId: string | undefined;
    while (true) {
      const queries = [Query.equal("creatorId", userId), Query.limit(100)];
      if (lastPollId) queries.push(Query.cursorAfter(lastPollId));

      const polls = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_POLL_COLLECTION_ID,
        queries
      );

      if (polls.documents.length === 0) break;

      const deletePollPromises = polls.documents.map(async (poll) => {
        // Delete poll options
        const options = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          "67f7c5920021e72c2986", // PollOptions collection
          [Query.equal("pollId", poll.$id), Query.limit(100)]
        );

        const deleteOptionPromises = options.documents.map((option) =>
          databases.deleteDocument(
            APPWRITE_DATABASE_ID,
            "67f7c5920021e72c2986",
            option.$id
          )
        );

        await Promise.all(deleteOptionPromises);
        log(`Deleted ${options.documents.length} poll options for poll: ${poll.$id}`);

        // Delete poll image
        if (poll.imageId) {
          try {
            await storage.deleteFile(APPWRITE_STORAGE_ID, poll.imageId);
            log(`Deleted poll image: ${poll.imageId}`);
          } catch (err) {
            error(`Failed to delete poll image ${poll.imageId}: ${err}`);
          }
        }

        // Delete poll
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_POLL_COLLECTION_ID,
          poll.$id
        );
        log(`Deleted poll: ${poll.$id}`);
      });

      await Promise.all(deletePollPromises);
      lastPollId = polls.documents[polls.documents.length - 1].$id;

      if (polls.documents.length < 100) break;
    }

    // Delete messages
    let lastMessageId: string | undefined;
    while (true) {
      const queries = [Query.equal("senderId", userId), Query.limit(100)];
      if (lastMessageId) queries.push(Query.cursorAfter(lastMessageId));

      const messages = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_MESSAGE_COLLECTION_ID,
        queries
      );

      if (messages.documents.length === 0) break;

      const deleteMessagePromises = messages.documents.map(async (message) => {
        if (message.imageUrls && message.imageUrls.length > 0) {
          for (const imageUrl of message.imageUrls) {
            const fileId = imageUrl.split("/").pop();
            if (fileId) {
              try {
                await storage.deleteFile(APPWRITE_STORAGE_ID, fileId);
                log(`Deleted message image: ${fileId}`);
              } catch (err) {
                error(`Failed to delete message image ${fileId}: ${err}`);
              }
            }
          }
        }
        await databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_MESSAGE_COLLECTION_ID,
          message.$id
        );
      });

      await Promise.all(deleteMessagePromises);
      log(`Deleted ${messages.documents.length} messages`);
      lastMessageId = messages.documents[messages.documents.length - 1].$id;

      if (messages.documents.length < 100) break;
    }

    // Delete chats
    let lastChatId: string | undefined;
    while (true) {
      const queries = [Query.contains("userIds", userId), Query.limit(100)];
      if (lastChatId) queries.push(Query.cursorAfter(lastChatId));

      const chats = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_CHAT_COLLECTION_ID,
        queries
      );

      if (chats.documents.length === 0) break;

      const deleteChatPromises = chats.documents.map((chat) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_CHAT_COLLECTION_ID,
          chat.$id
        )
      );

      await Promise.all(deleteChatPromises);
      log(`Deleted ${chats.documents.length} chats`);
      lastChatId = chats.documents[chats.documents.length - 1].$id;

      if (chats.documents.length < 100) break;
    }

    // Delete notifications
    let lastNotificationId: string | undefined;
    while (true) {
      const queries = [Query.equal("userId", userId), Query.limit(100)];
      if (lastNotificationId) queries.push(Query.cursorAfter(lastNotificationId));

      const notifications = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_NOTIFICATION_COLLECTION_ID,
        queries
      );

      if (notifications.documents.length === 0) break;

      const deleteNotificationPromises = notifications.documents.map((notification) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_NOTIFICATION_COLLECTION_ID,
          notification.$id
        )
      );

      await Promise.all(deleteNotificationPromises);
      log(`Deleted ${notifications.documents.length} notifications`);
      lastNotificationId = notifications.documents[notifications.documents.length - 1].$id;

      if (notifications.documents.length < 100) break;
    }

    // Delete saves
    let lastSaveId: string | undefined;
    while (true) {
      const queries = [Query.equal("user", userId), Query.limit(100)];
      if (lastSaveId) queries.push(Query.cursorAfter(lastSaveId));

      const saves = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_SAVES_COLLECTION_ID,
        queries
      );

      if (saves.documents.length === 0) break;

      const deleteSavePromises = saves.documents.map((save) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_SAVES_COLLECTION_ID,
          save.$id
        )
      );

      await Promise.all(deleteSavePromises);
      log(`Deleted ${saves.documents.length} saves`);
      lastSaveId = saves.documents[saves.documents.length - 1].$id;

      if (saves.documents.length < 100) break;
    }

    // Delete votes
    let lastVoteId: string | undefined;
    while (true) {
      const queries = [Query.equal("userId", userId), Query.limit(100)];
      if (lastVoteId) queries.push(Query.cursorAfter(lastVoteId));

      const votes = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_VOTES_COLLECTION_ID,
        queries
      );

      if (votes.documents.length === 0) break;

      const deleteVotePromises = votes.documents.map((vote) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_VOTES_COLLECTION_ID,
          vote.$id
        )
      );

      await Promise.all(deleteVotePromises);
      log(`Deleted ${votes.documents.length} votes`);
      lastVoteId = votes.documents[votes.documents.length - 1].$id;

      if (votes.documents.length < 100) break;
    }

    // Delete blocked users
    let lastBlockedId: string | undefined;
    while (true) {
      const queries = [Query.equal("blockerId", userId), Query.limit(100)];
      if (lastBlockedId) queries.push(Query.cursorAfter(lastBlockedId));

      const blockedUsers = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_BLOCKED_USERS_COLLECTION_ID,
        queries
      );

      if (blockedUsers.documents.length === 0) break;

      const deleteBlockedPromises = blockedUsers.documents.map((blocked) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_BLOCKED_USERS_COLLECTION_ID,
          blocked.$id
        )
      );

      await Promise.all(deleteBlockedPromises);
      log(`Deleted ${blockedUsers.documents.length} blocked users`);
      lastBlockedId = blockedUsers.documents[blockedUsers.documents.length - 1].$id;

      if (blockedUsers.documents.length < 100) break;
    }

    // Delete membership requests
    let lastRequestId: string | undefined;
    while (true) {
      const queries = [Query.contains("userId", userId), Query.limit(100)];
      if (lastRequestId) queries.push(Query.cursorAfter(lastRequestId));

      const requests = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_MEMBERSHIP_REQUESTS_COLLECTION_ID,
        queries
      );

      if (requests.documents.length === 0) break;

      const deleteRequestPromises = requests.documents.map((request) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_MEMBERSHIP_REQUESTS_COLLECTION_ID,
          request.$id
        )
      );

      await Promise.all(deleteRequestPromises);
      log(`Deleted ${requests.documents.length} membership requests`);
      lastRequestId = requests.documents[requests.documents.length - 1].$id;

      if (requests.documents.length < 100) break;
    }

    // Delete groups
    let lastGroupId: string | undefined;
    while (true) {
      const queries = [Query.equal("creatorId", userId), Query.limit(100)];
      if (lastGroupId) queries.push(Query.cursorAfter(lastGroupId));

      const groups = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_GROUPS_COLLECTION_ID,
        queries
      );

      if (groups.documents.length === 0) break;

      const deleteGroupPromises = groups.documents.map((group) =>
        databases.deleteDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_GROUPS_COLLECTION_ID,
          group.$id
        )
      );

      await Promise.all(deleteGroupPromises);
      log(`Deleted ${groups.documents.length} groups`);
      lastGroupId = groups.documents[groups.documents.length - 1].$id;

      if (groups.documents.length < 100) break;
    }

    // Delete user profile image
    try {
      const user = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_USER_COLLECTION_ID,
        userId,
        [Query.select(["imageId"])]
      );
      if (user.imageId) {
        await storage.deleteFile(APPWRITE_STORAGE_ID, user.imageId);
        log(`Deleted user profile image: ${user.imageId}`);
      }
    } catch (err) {
      error(`Failed to delete user profile image: ${err}`);
    }

    // Delete Appwrite user
    try {
      await users.delete(userId);
      log(`Deleted Appwrite user: ${userId}`);
    } catch (err) {
      error(`Failed to delete Appwrite user: ${err}`);
    }

    log(`Successfully deleted user and all associated data: ${userId}`);
    return res.json({ message: `User ${userId} deleted successfully` }, 200);
  } catch (err: any) {
    error(`Error deleting user: ${err.message}`);
    return res.json({ error: err.message }, 500);
  }
}