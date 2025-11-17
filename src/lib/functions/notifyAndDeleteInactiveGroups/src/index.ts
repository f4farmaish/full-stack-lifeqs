import { databases, appwriteConfig } from "./config";
import { Query, ID } from "node-appwrite";
import { Resend } from "resend";
import { groupInactivityConfig } from "./utils";

// Send notification and email to user if preferences allow
export async function sendNotification(
  {
    userId,
    type,
    message,
    relatedEntityId,
    inactivityDuration,
  }: {
    userId: string;
    type: string;
    message: string;
    relatedEntityId: string;
    inactivityDuration: number;
  },
  context: any
) {
  try {
    // Validate input parameters
    if (!userId || !message || !relatedEntityId || !type) {
      throw new Error("Invalid notification parameters.");
    }

    // Fetch user's notification preferences, email preferences, and email
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      [Query.select(["notificationPreferences", "emailPreferences", "email"])]
    );

    const notificationPrefs: string[] = user.notificationPreferences || [];
    const emailPrefs: string[] = user.emailPreferences || [];

    const shouldCreateInApp = notificationPrefs.includes(type);
    const shouldConsiderEmail = emailPrefs.includes(type);

    if (!shouldCreateInApp && !shouldConsiderEmail) {
      context.log(`Skipped notification for user ${userId}: Preferences disabled`);
      return { status: "skipped", reason: "Preferences disabled" };
    }

    // Check for existing notification (only if in-app is enabled)
    let existingNotification = null;
    let lastEmailSentDays = 0;
    if (shouldCreateInApp) {
      const existingNotifications = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [
          Query.equal("userId", userId),
          Query.equal("relatedEntityId", relatedEntityId),
          Query.equal("types", type),
          Query.limit(1),
        ]
      );
      if (existingNotifications.documents.length > 0) {
        existingNotification = existingNotifications.documents[0];
        lastEmailSentDays = existingNotification.lastEmailSentDays || 0;
      }
    }

    let shouldSendEmail = shouldConsiderEmail && (inactivityDuration >= lastEmailSentDays + 7);

    let status: "created" | "updated" | "email_only" = shouldCreateInApp ? "updated" : "email_only";
    let notificationId: string | undefined;

    if (shouldCreateInApp) {
      if (existingNotification) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsCollectionId,
          existingNotification.$id,
          {
            isRead: false,
            lastUpdatedAt: new Date().toISOString(),
            message,
            ...(shouldSendEmail ? { lastEmailSentDays: inactivityDuration } : {}),
          }
        );
        notificationId = existingNotification.$id;
      } else {
        const notification = await databases.createDocument(
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
            lastEmailSentDays: shouldSendEmail ? inactivityDuration : 0,
          }
        );
        status = "created";
        notificationId = notification.$id;
      }
    } else if (shouldSendEmail) {
      // Create a notification for tracking email even if no in-app
      const notification = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        ID.unique(),
        {
          userId,
          types: type,
          message,
          relatedEntityId,
          isRead: true, // Mark as read since no in-app notification
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          lastEmailSentDays: inactivityDuration,
        }
      );
      notificationId = notification.$id;
    }

    // Send email if conditions met and user has email
    if (shouldSendEmail && user.email) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailResponse = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@default.com",
          to: user.email,
          subject: "lifeQS: Group Deletion Warning",
          text: `Hello,

Your group "${message.split('"')[1]}" in the lifeQS app is scheduled for deletion tomorrow due to prolonged inactivity (6 months or more). Please log in to lifeQS to engage with your group.

Thank you,
The lifeQS Team`,
        });
        if (emailResponse.data) {
          context.log(`Email sent to ${user.email} for notification ${notificationId || 'email-only'}, Resend ID: ${emailResponse.data.id}`);
        } else {
          context.error(`Email sending failed for ${user.email}: ${emailResponse.error?.message || 'Unknown error'}`);
        }
      } catch (emailError: any) {
        context.error(`Error sending email to ${user.email}: ${emailError.message}`);
        // Continue without throwing, as email is secondary
      }
    }

    return { status, notificationId };
  } catch (error: any) {
    context.error(`Error sending notification: ${error.message}`);
    throw error;
  }
}

// Check for inactive groups and delete or notify admins
export async function notifyAndDeleteInactiveGroups(context: any) {
  try {
    // Fetch all groups
    const groupsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.groupsCollectionId
    );

    const groups = groupsResponse.documents;
    if (groups.length === 0) {
      context.log("No groups found, returning empty response");
      return {
        statusCode: 204,
        body: "",
      };
    }

    const currentDate = new Date();
    const warningThreshold = new Date(currentDate);
    warningThreshold.setDate(currentDate.getDate() - groupInactivityConfig.INACTIVITY_WARNING_PERIOD);

    const deletionThreshold = new Date(currentDate);
    deletionThreshold.setDate(currentDate.getDate() - groupInactivityConfig.INACTIVITY_DELETION_PERIOD);

    const notificationPromises = [];
    const deletionPromises = [];

    for (const group of groups) {
      const lastActivityTimestamp = new Date(group.lastActivityTimestamp || group.$createdAt);
      const inactivityDuration = Math.floor(
        (currentDate.getTime() - lastActivityTimestamp.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Delete group if inactivity exceeds deletion period
      if (lastActivityTimestamp < deletionThreshold) {
        deletionPromises.push(
          databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.groupsCollectionId, group.$id)
        );
        context.log(`Scheduled deletion for group ${group.$id} (${group.name})`);
        continue;
      }

      // Send notification and email if inactivity exceeds warning period
      if (lastActivityTimestamp < warningThreshold) {
        const admins = group.admins || [];
        const message = `Your group "${group.name}" will be deleted tomorrow due to prolonged inactivity.`;

        for (const adminId of admins) {
          notificationPromises.push(
            sendNotification(
              {
                userId: adminId,
                type: "GROUP_DELETION_WARNING",
                message,
                relatedEntityId: group.$id,
                inactivityDuration,
              },
              context
            )
          );
        }
      }
    }

    // Execute notifications and deletions in parallel
    await Promise.all(notificationPromises);
    await Promise.all(deletionPromises);

    context.log("All notifications and deletions processed successfully");
    return {
      statusCode: 204,
      body: "",
    };
  } catch (error: any) {
    context.error(`Error checking inactive groups and deleting them: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Export default function for Appwrite
export default notifyAndDeleteInactiveGroups;