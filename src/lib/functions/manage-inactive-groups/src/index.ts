import { databases, appwriteConfig } from "./config";
import { Query, ID } from "node-appwrite";
import { Resend } from "resend";
import { groupInactivityConfig, postInactivityConfig } from "./utils";

function formatInactivityMessage(days: number): string {
  if (days < 30) {
    return `${days} days`;
  } else if (days < 60) {
    return "1 month";
  } else if (days < 365) {
    return `${Math.floor(days / 30)} months`;
  } else {
    return `${Math.floor(days / 365)} years`;
  }
}

async function handleNotification(
  {
    userId,
    type,
    message,
    relatedEntityId,
    inactivityDuration,
    subject,
    getEmailBody,
  }: {
    userId: string;
    type: string;
    message: string;
    relatedEntityId: string;
    inactivityDuration: number;
    subject: string;
    getEmailBody: (groupName: string, inactivityDuration: number) => string;
  },
  context: any
) {
  try {
    if (!userId || !message || !relatedEntityId || !type) {
      throw new Error("Invalid notification parameters.");
    }


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

    const shouldSendEmail = shouldConsiderEmail && (inactivityDuration >= lastEmailSentDays + 7);

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
      const notification = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        ID.unique(),
        {
          userId,
          types: type,
          message,
          relatedEntityId,
          isRead: true,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          lastEmailSentDays: inactivityDuration,
        }
      );
      notificationId = notification.$id;
    }

    if (shouldSendEmail && user.email) {
      try {
        const groupName = message.split('"')[1] || '';
        const emailBody = getEmailBody(groupName, inactivityDuration);
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailResponse = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@default.com",
          to: user.email,
          subject,
          text: emailBody,
        });
        if (emailResponse.data) {
          context.log(`Email sent to ${user.email} for notification ${notificationId || 'email-only'}, Resend ID: ${emailResponse.data.id}`);
        } else {
          context.error(`Email sending failed for ${user.email}: ${emailResponse.error?.message || 'Unknown error'}`);
        }
      } catch (emailError: any) {
        context.error(`Error sending email to ${user.email}: ${emailError.message}`);
      }
    }

    return { status, notificationId };
  } catch (error: any) {
    context.error(`Error handling notification: ${error.message}`);
    throw error;
  }
}

async function manageInactiveGroups(context: any) {
  try {

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

    const actionPromises: Promise<any>[] = [];

    for (const group of groups) {
      const lastActivityTimestamp = new Date(group.lastActivityTimestamp || group.$createdAt);
      const inactivityDuration = Math.floor(
        (currentDate.getTime() - lastActivityTimestamp.getTime()) / (1000 * 60 * 60 * 24)
      );


      if (lastActivityTimestamp < deletionThreshold) {
        actionPromises.push(
          databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.groupsCollectionId,
            group.$id
          )
        );
        context.log(`Scheduled deletion for group ${group.$id} (${group.name})`);
        continue;
      }

      const admins = group.admins || [];

      if (lastActivityTimestamp < warningThreshold) {
        const message = `Your group "${group.name}" will be deleted tomorrow due to prolonged inactivity.`;
        for (const adminId of admins) {
          actionPromises.push(
            handleNotification(
              {
                userId: adminId,
                type: "GROUP_DELETION_WARNING",
                message,
                relatedEntityId: group.$id,
                inactivityDuration,
                subject: "lifeQS: Group Deletion Warning",
                getEmailBody: (groupName, _) =>
                  `Hello,\n\nYour group "${groupName}" in the lifeQS app is scheduled for deletion tomorrow due to prolonged inactivity (6 months or more). Please log in to lifeQS to engage with your group.\n\nThank you,\nThe lifeQS Team`,
              },
              context
            )
          );
        }
      }

      if (inactivityDuration >= 7) {
        const message = `Your group "${group.name}" has been inactive for ${formatInactivityMessage(inactivityDuration)}.`;
        for (const adminId of admins) {
          actionPromises.push(
            handleNotification(
              {
                userId: adminId,
                type: "INACTIVE_GROUP",
                message,
                relatedEntityId: group.$id,
                inactivityDuration,
                subject: "lifeQS: Group Inactivity Alert",
                getEmailBody: (groupName, inactivityDuration) =>
                  `Hello,\n\nYour group "${groupName}" in the lifeQS app has been inactive for ${formatInactivityMessage(inactivityDuration)}. Please log in to lifeQS to engage with your group.\n\nThank you,\nThe lifeQS Team`,
              },
              context
            )
          );
        }
      }
    }

    await Promise.all(actionPromises);



    const lockThreshold = new Date(currentDate);
    lockThreshold.setDate(currentDate.getDate() - postInactivityConfig.INACTIVITY_LOCK_PERIOD);

    const lockPromises: Promise<any>[] = [];

    // Helper function for paginated document retrieval (used only for new locking logic)
    async function getAllDocuments(collectionId: string, baseQueries: string[] = []): Promise<any[]> {
      const documents: any[] = [];
      let cursor: string | undefined = undefined;
      do {
        const queries = [...baseQueries, Query.limit(100)];
        if (cursor) {
          queries.push(Query.cursorAfter(cursor));
        }
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          collectionId,
          queries
        );
        documents.push(...res.documents);
        cursor = res.documents.length > 0 ? res.documents[res.documents.length - 1].$id : undefined;
      } while (cursor);
      return documents;
    }

    // Process unlocked posts
    const unlockedPosts = await getAllDocuments(appwriteConfig.postsCollectionId, [Query.equal("commentsLocked", false)]);
    for (const post of unlockedPosts) {
      const commentQueries = [
        Query.equal("postIdString", post.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ];
      const commentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        commentQueries
      );
      const latestAtStr = commentsRes.documents.length > 0 ? commentsRes.documents[0].$createdAt : post.$createdAt;
      const latestAt = new Date(latestAtStr);
      const inactivityDuration = Math.floor(
        (currentDate.getTime() - latestAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (inactivityDuration >= postInactivityConfig.INACTIVITY_LOCK_PERIOD) {
        lockPromises.push(
          databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            post.$id,
            {
              commentsLocked: true,
              lockedBy: "system",
            }
          )
        );
      }
    }

    // Process unlocked polls (assuming similar comment structure)
    const unlockedPolls = await getAllDocuments(appwriteConfig.pollsCollectionId, [Query.equal("commentsLocked", false)]);
    for (const poll of unlockedPolls) {
      const commentQueries = [
        Query.equal("postIdString", poll.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(1),
      ];
      const commentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        commentQueries
      );
      const latestAtStr = commentsRes.documents.length > 0 ? commentsRes.documents[0].$createdAt : poll.$createdAt;
      const latestAt = new Date(latestAtStr);
      const inactivityDuration = Math.floor(
        (currentDate.getTime() - latestAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (inactivityDuration >= postInactivityConfig.INACTIVITY_LOCK_PERIOD) {
        lockPromises.push(
          databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.pollsCollectionId,
            poll.$id,
            {
              commentsLocked: true,
              lockedBy: "system",
            }
          )
        );
      }
    }

    await Promise.all(lockPromises);
    context.log("Post and poll locking processed successfully");

    context.log("All notifications and deletions processed successfully");
    return {
      statusCode: 204,
      body: "",
    };
  } catch (error: any) {
    context.error(`Error managing inactive groups: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

export default manageInactiveGroups;