import { ID, Query } from "appwrite";
import { databases, appwriteConfig } from "@/lib/appwrite/config";
import {
  INotification,
  INotificationType,
  NotificationCategory,
} from "@/types";

// ============================== CREATE NOTIFICATION
export async function createNotification({
  userId,
  type,
  message,
  relatedEntityId,
}: {
  userId: string;
  type: INotificationType;
  message: string;
  relatedEntityId: string;
}) {
  try {
    if (!userId || !message || !relatedEntityId || !type) {
      throw new Error("Invalid parameters for notification.");
    }

    // Check user's notification preferences
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["notificationPreferences"])]
    );

    const preferences: string[] = user.notificationPreferences || [];

    // Auto-enable BEST_COMMENT_SELECTED for existing users who don't have it
    if (type === "BEST_COMMENT_SELECTED" && !preferences.includes(type)) {
      try {
        const updatedPreferences = [...preferences, "BEST_COMMENT_SELECTED"];
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          userId,
          { notificationPreferences: updatedPreferences }
        );
      } catch (error) {
        console.error("Error auto-enabling BEST_COMMENT_SELECTED:", error);
      }
    } else if (!preferences.includes(type)) {
      return;
    }

    // Check if the notification already exists (avoid duplicates)
    const existingNotifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal("userId", userId),
        Query.equal("relatedEntityId", relatedEntityId),
        Query.equal("types", type),
      ]
    );

    if (existingNotifications.documents.length > 0) {
      return;
    }

    // Create the notification
    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      ID.unique(),
      {
        userId,
        types: type,
        message,
        relatedEntityId,
        isRead: false,
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// ============================== FETCH USER NOTIFICATIONS

export async function getUserNotifications(
  userId: string,
  limit = 20,
  cursor?: string
) {
  try {
    const queries = [
      Query.equal("userId", userId),
      Query.orderDesc("lastUpdatedAt"), // Sort notifications by last update
      Query.limit(limit), // Limit results
    ];

    if (cursor) {
      queries.push(Query.cursorAfter(cursor)); // Pagination support
    }

    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      queries
    );

    return notifications;
  } catch (error) {
    console.error(" Error fetching notifications:", error);
    return { documents: [] }; // Return empty array on failure to prevent app crashes
  }
}

// ============================== MARK NOTIFICATION AS READ
export async function markNotificationAsRead(notificationId: string) {
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      notificationId,
      { isRead: true }
    );
  } catch (error) {
    console.error("Error updating notification:", error);
    throw error;
  }
}

// ============================== DELETE NOTIFICATION
export async function deleteNotification(notificationId: string) {
  try {
    return await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      notificationId
    );
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
}
//=====================================================================================================================
// ============================== GET NOTIFICATION CATEGORY
export function getNotificationCategory(
  type: INotificationType
): NotificationCategory {
  if (
    [
      "LIKE_POST",
      "COMMENT_POST",
      "REPLY_TO_COMMENT",
      "LIKE_COMMENT_OWNER",
      "LIKE_COMMENT_MEMBER",
      "MENTION_IN_COMMENT",
      "BEST_COMMENT_SELECTED",
      "SUPER_LIKE_POST",
      "SIMPLE_LIKE_POST",
      "GREAT_POST",
    ].includes(type)
  ) {
    return "questions";
  } else if (
    [
      "POLL_RESULTS",
      "PARTIAL_RESULTS",
      "SUPER_LIKE_POLL",
      "SIMPLE_LIKE_POLL",
      "GREAT_POLL",
    ].includes(type)
  ) {
    return "polls";
  } else {
    return "groups";
  }
}

// ============================== GET NOTIFICATION DESTINATION
export async function getNotificationDestination(
  notification: INotification
): Promise<{ destination: string; queryParams: string }> {
  let destination = "";
  let queryParams = "";

  try {
    if (!notification.relatedEntityId) {
      console.warn(
        "Notification has no relatedEntityId. Cannot determine destination."
      );
      return { destination: "", queryParams: "" };
    }

    if (["POLL_RESULTS", "PARTIAL_RESULTS"].includes(notification.types)) {
      destination = `/polls/${notification.relatedEntityId}`;
    } else if (notification.types === "GROUP_INVITATION") {
      const invitation = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupInvitationsCollectionId,
        notification.relatedEntityId
      );

      if (!invitation) {
        console.error(
          "Invitation not found for ID:",
          notification.relatedEntityId
        );
        return { destination: "", queryParams: "" };
      }

      const groupId = invitation.groupId;
      if (!groupId) {
        console.error("Invitation has no groupId:", invitation);
        return { destination: "", queryParams: "" };
      }

      destination = `/groups/${groupId}`;
      queryParams = "?tab=requests";
    } else if (
      notification.types === "MEMBERSHIP_REQUEST_APPROVED" ||
      notification.types === "GROUP_DELETION_WARNING" ||
      notification.types === "INACTIVE_GROUP"
    ) {
      destination = `/groups/${notification.relatedEntityId}`;
      queryParams = "?tab=requests";
    } else if (notification.types === "NEW_MEMBERSHIP_REQUEST") {
      const membershipRequest = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.membershipRequestsCollectionId,
        notification.relatedEntityId
      );

      if (!membershipRequest) {
        console.error("Membership request not found.");
        return { destination: "", queryParams: "" };
      }

      const groupId = Array.isArray(membershipRequest.groupId)
        ? membershipRequest.groupId[0]
        : membershipRequest.groupId;
      if (!groupId) {
        console.error("Membership request has no groupId.");
        return { destination: "", queryParams: "" };
      }

      destination = `/groups/${groupId}`;
      queryParams = "?tab=requests";
    } else if (
      [
        "REPLY_TO_COMMENT",
        "LIKE_COMMENT_OWNER",
        "LIKE_COMMENT_MEMBER",
        "MENTION_IN_COMMENT",
        "BEST_COMMENT_SELECTED",
      ].includes(notification.types)
    ) {
      const comment = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        notification.relatedEntityId
      );

      if (!comment) {
        console.error("Comment not found.");
        return { destination: "", queryParams: "" };
      }

      if (comment.isPoll && comment.postIdString) {
        destination = `/polls/${comment.postIdString}`;
      } else if (comment.postIdString) {
        destination = `/posts/${comment.postIdString}`;
      } else {
        console.error("Comment does not have a valid postIdString.");
        return { destination: "", queryParams: "" };
      }
    } else if (["COMMENT_POST"].includes(notification.types)) {
      let documentFound = false;

      try {
        const poll = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          notification.relatedEntityId
        );

        if (poll) {
          destination = `/polls/${notification.relatedEntityId}`;
          documentFound = true;
        }
      } catch (pollError) {
        console.warn("Poll not found, checking for post...");
      }

      if (!documentFound) {
        try {
          const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            notification.relatedEntityId
          );

          if (post) {
            destination = `/posts/${notification.relatedEntityId}`;
            documentFound = true;
          }
        } catch (postError) {
          console.error(
            "Neither poll nor post found for ID:",
            notification.relatedEntityId
          );
        }
      }

      if (!documentFound) {
        console.error(
          "No valid post or poll found for relatedEntityId:",
          notification.relatedEntityId
        );
        return { destination: "", queryParams: "" };
      }
    } else if (
      [
        "LIKE_POST",
        "SUPER_LIKE_POST",
        "SIMPLE_LIKE_POST",
        "GREAT_POST",
        "SUPER_LIKE_POLL",
        "SIMPLE_LIKE_POLL",
        "GREAT_POLL",
      ].includes(notification.types)
    ) {
      let documentFound = false;

      try {
        const poll = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          notification.relatedEntityId
        );

        if (poll) {
          destination = `/polls/${notification.relatedEntityId}`;
          documentFound = true;
        }
      } catch (pollError) {
        console.warn("Poll not found, checking for post...");
      }

      if (!documentFound) {
        try {
          const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            notification.relatedEntityId
          );

          if (post) {
            destination = `/posts/${notification.relatedEntityId}`;
            documentFound = true;
          }
        } catch (postError) {
          console.error(
            "Neither poll nor post found for ID:",
            notification.relatedEntityId
          );
        }
      }

      if (!documentFound) {
        console.error(
          "No valid post or poll found for relatedEntityId:",
          notification.relatedEntityId
        );
        return { destination: "", queryParams: "" };
      }
    } else {
      let documentFound = false;

      try {
        const poll = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.pollsCollectionId,
          notification.relatedEntityId
        );

        if (poll) {
          destination = `/polls/${notification.relatedEntityId}`;
          documentFound = true;
        }
      } catch (pollError) {
        console.warn("Poll not found, checking for post...");
      }

      if (!documentFound) {
        try {
          const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            notification.relatedEntityId
          );

          if (post) {
            destination = `/posts/${notification.relatedEntityId}`;
            documentFound = true;
          }
        } catch (postError) {
          console.error(
            "Neither poll nor post found for ID:",
            notification.relatedEntityId
          );
        }
      }

      if (!documentFound) {
        console.error(
          "No valid post or poll found for relatedEntityId:",
          notification.relatedEntityId
        );
        return { destination: "", queryParams: "" };
      }
    }

    if (!destination) {
      console.error(
        "No valid destination found for notification:",
        notification
      );
      return { destination: "", queryParams: "" };
    }

    return { destination, queryParams };
  } catch (error) {
    console.error("Error fetching notification destination:", error);
    return { destination: "", queryParams: "" };
  }
}
