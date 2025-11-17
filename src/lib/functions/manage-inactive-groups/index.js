"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const node_appwrite_1 = require("node-appwrite");
const resend_1 = require("resend");
const utils_1 = require("./utils");
function formatInactivityMessage(days) {
    if (days < 30) {
        return `${days} days`;
    }
    else if (days < 60) {
        return "1 month";
    }
    else if (days < 365) {
        return `${Math.floor(days / 30)} months`;
    }
    else {
        return `${Math.floor(days / 365)} years`;
    }
}
async function handleNotification({ userId, type, message, relatedEntityId, inactivityDuration, subject, getEmailBody, }, context) {
    try {
        if (!userId || !message || !relatedEntityId || !type) {
            throw new Error("Invalid notification parameters.");
        }
        console.log(`Processing notification for user ${userId}, type: ${type}, group: ${relatedEntityId}`);
        const user = await config_1.databases.getDocument(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.userCollectionId, userId, [node_appwrite_1.Query.select(["notificationPreferences", "emailPreferences", "email"])]);
        const notificationPrefs = user.notificationPreferences || [];
        const emailPrefs = user.emailPreferences || [];
        const shouldCreateInApp = notificationPrefs.includes(type);
        const shouldConsiderEmail = emailPrefs.includes(type);
        if (!shouldCreateInApp && !shouldConsiderEmail) {
            context.log(`Skipped notification for user ${userId}: Preferences disabled`);
            console.log(`Skipped notification for user ${userId}`);
            return { status: "skipped", reason: "Preferences disabled" };
        }
        let existingNotification = null;
        let lastEmailSentDays = 0;
        if (shouldCreateInApp) {
            const existingNotifications = await config_1.databases.listDocuments(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.notificationsCollectionId, [
                node_appwrite_1.Query.equal("userId", userId),
                node_appwrite_1.Query.equal("relatedEntityId", relatedEntityId),
                node_appwrite_1.Query.equal("types", type),
                node_appwrite_1.Query.limit(1),
            ]);
            if (existingNotifications.documents.length > 0) {
                existingNotification = existingNotifications.documents[0];
                lastEmailSentDays = existingNotification.lastEmailSentDays || 0;
            }
        }
        const shouldSendEmail = shouldConsiderEmail && (inactivityDuration >= lastEmailSentDays + 7);
        let status = shouldCreateInApp ? "updated" : "email_only";
        let notificationId;
        if (shouldCreateInApp) {
            if (existingNotification) {
                await config_1.databases.updateDocument(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.notificationsCollectionId, existingNotification.$id, {
                    isRead: false,
                    lastUpdatedAt: new Date().toISOString(),
                    message,
                    ...(shouldSendEmail ? { lastEmailSentDays: inactivityDuration } : {}),
                });
                notificationId = existingNotification.$id;
            }
            else {
                const notification = await config_1.databases.createDocument(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.notificationsCollectionId, node_appwrite_1.ID.unique(), {
                    userId,
                    types: type,
                    message,
                    relatedEntityId,
                    isRead: false,
                    createdAt: new Date().toISOString(),
                    lastUpdatedAt: new Date().toISOString(),
                    lastEmailSentDays: shouldSendEmail ? inactivityDuration : 0,
                });
                status = "created";
                notificationId = notification.$id;
            }
        }
        else if (shouldSendEmail) {
            const notification = await config_1.databases.createDocument(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.notificationsCollectionId, node_appwrite_1.ID.unique(), {
                userId,
                types: type,
                message,
                relatedEntityId,
                isRead: true,
                createdAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
                lastEmailSentDays: inactivityDuration,
            });
            notificationId = notification.$id;
        }
        if (shouldSendEmail && user.email) {
            try {
                const groupName = message.split('"')[1] || '';
                const emailBody = getEmailBody(groupName, inactivityDuration);
                const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
                const emailResponse = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || "noreply@default.com",
                    to: user.email,
                    subject,
                    text: emailBody,
                });
                if (emailResponse.data) {
                    context.log(`Email sent to ${user.email} for notification ${notificationId || 'email-only'}, Resend ID: ${emailResponse.data.id}`);
                    console.log(`Email sent successfully to ${user.email}`);
                }
                else {
                    context.error(`Email sending failed for ${user.email}: ${emailResponse.error?.message || 'Unknown error'}`);
                    console.log(`Email sending failed for ${user.email}`);
                }
            }
            catch (emailError) {
                context.error(`Error sending email to ${user.email}: ${emailError.message}`);
                console.log(`Error sending email to ${user.email}: ${emailError.message}`);
            }
        }
        return { status, notificationId };
    }
    catch (error) {
        context.error(`Error handling notification: ${error.message}`);
        console.log(`Notification error: ${error.message}`);
        throw error;
    }
}
async function manageInactiveGroups(context) {
    try {
        console.log("Starting inactive groups management");
        const groupsResponse = await config_1.databases.listDocuments(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.groupsCollectionId);
        const groups = groupsResponse.documents;
        if (groups.length === 0) {
            context.log("No groups found, returning empty response");
            console.log("No groups found");
            return {
                statusCode: 204,
                body: "",
            };
        }
        const currentDate = new Date();
        const warningThreshold = new Date(currentDate);
        warningThreshold.setDate(currentDate.getDate() - utils_1.groupInactivityConfig.INACTIVITY_WARNING_PERIOD);
        const deletionThreshold = new Date(currentDate);
        deletionThreshold.setDate(currentDate.getDate() - utils_1.groupInactivityConfig.INACTIVITY_DELETION_PERIOD);
        const actionPromises = [];
        for (const group of groups) {
            const lastActivityTimestamp = new Date(group.lastActivityTimestamp || group.$createdAt);
            const inactivityDuration = Math.floor((currentDate.getTime() - lastActivityTimestamp.getTime()) / (1000 * 60 * 60 * 24));
            console.log(`Processing group ${group.$id}: inactivity ${inactivityDuration} days`);
            if (lastActivityTimestamp < deletionThreshold) {
                actionPromises.push(config_1.databases.deleteDocument(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.groupsCollectionId, group.$id));
                context.log(`Scheduled deletion for group ${group.$id} (${group.name})`);
                console.log(`Deleted group ${group.$id}`);
                continue;
            }
            const admins = group.admins || [];
            if (lastActivityTimestamp < warningThreshold) {
                const message = `Your group "${group.name}" will be deleted tomorrow due to prolonged inactivity.`;
                for (const adminId of admins) {
                    actionPromises.push(handleNotification({
                        userId: adminId,
                        type: "GROUP_DELETION_WARNING",
                        message,
                        relatedEntityId: group.$id,
                        inactivityDuration,
                        subject: "lifeQS: Group Deletion Warning",
                        getEmailBody: (groupName, _) => `Hello,\n\nYour group "${groupName}" in the lifeQS app is scheduled for deletion tomorrow due to prolonged inactivity (6 months or more). Please log in to lifeQS to engage with your group.\n\nThank you,\nThe lifeQS Team`,
                    }, context));
                }
            }
            if (inactivityDuration >= 7) {
                const message = `Your group "${group.name}" has been inactive for ${formatInactivityMessage(inactivityDuration)}.`;
                for (const adminId of admins) {
                    actionPromises.push(handleNotification({
                        userId: adminId,
                        type: "INACTIVE_GROUP",
                        message,
                        relatedEntityId: group.$id,
                        inactivityDuration,
                        subject: "lifeQS: Group Inactivity Alert",
                        getEmailBody: (groupName, inactivityDuration) => `Hello,\n\nYour group "${groupName}" in the lifeQS app has been inactive for ${formatInactivityMessage(inactivityDuration)}. Please log in to lifeQS to engage with your group.\n\nThank you,\nThe lifeQS Team`,
                    }, context));
                }
            }
        }
        await Promise.all(actionPromises);
        // Post and poll locking logic starts here
        console.log("Starting post and poll locking management");
        const lockThreshold = new Date(currentDate);
        lockThreshold.setDate(currentDate.getDate() - utils_1.postInactivityConfig.INACTIVITY_LOCK_PERIOD);
        const lockPromises = [];
        // Helper function for paginated document retrieval (used only for new locking logic)
        async function getAllDocuments(collectionId, baseQueries = []) {
            const documents = [];
            let cursor = undefined;
            do {
                const queries = [...baseQueries, node_appwrite_1.Query.limit(100)];
                if (cursor) {
                    queries.push(node_appwrite_1.Query.cursorAfter(cursor));
                }
                const res = await config_1.databases.listDocuments(config_1.appwriteConfig.databaseId, collectionId, queries);
                documents.push(...res.documents);
                cursor = res.documents.length > 0 ? res.documents[res.documents.length - 1].$id : undefined;
                console.log(`Fetched ${res.documents.length} documents from ${collectionId}`);
            } while (cursor);
            return documents;
        }
        // Process unlocked posts
        const unlockedPosts = await getAllDocuments(config_1.appwriteConfig.postsCollectionId, [node_appwrite_1.Query.equal("commentsLocked", false)]);
        for (const post of unlockedPosts) {
            const commentQueries = [
                node_appwrite_1.Query.equal("postIdString", post.$id),
                node_appwrite_1.Query.orderDesc("$createdAt"),
                node_appwrite_1.Query.limit(1),
            ];
            const commentsRes = await config_1.databases.listDocuments(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.commentsCollectionId, commentQueries);
            const latestAtStr = commentsRes.documents.length > 0 ? commentsRes.documents[0].$createdAt : post.$createdAt;
            const latestAt = new Date(latestAtStr);
            const inactivityDuration = Math.floor((currentDate.getTime() - latestAt.getTime()) / (1000 * 60 * 60 * 24));
            if (inactivityDuration >= utils_1.postInactivityConfig.INACTIVITY_LOCK_PERIOD) {
                lockPromises.push(config_1.databases.updateDocument(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.postsCollectionId, post.$id, {
                    commentsLocked: true,
                    lockedBy: "system",
                }));
                console.log(`Locked post ${post.$id} due to ${inactivityDuration} days inactivity`);
            }
        }
        // Process unlocked polls (assuming similar comment structure)
        const unlockedPolls = await getAllDocuments(config_1.appwriteConfig.pollsCollectionId, [node_appwrite_1.Query.equal("commentsLocked", false)]);
        for (const poll of unlockedPolls) {
            const commentQueries = [
                node_appwrite_1.Query.equal("postIdString", poll.$id),
                node_appwrite_1.Query.orderDesc("$createdAt"),
                node_appwrite_1.Query.limit(1),
            ];
            const commentsRes = await config_1.databases.listDocuments(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.commentsCollectionId, commentQueries);
            const latestAtStr = commentsRes.documents.length > 0 ? commentsRes.documents[0].$createdAt : poll.$createdAt;
            const latestAt = new Date(latestAtStr);
            const inactivityDuration = Math.floor((currentDate.getTime() - latestAt.getTime()) / (1000 * 60 * 60 * 24));
            if (inactivityDuration >= utils_1.postInactivityConfig.INACTIVITY_LOCK_PERIOD) {
                lockPromises.push(config_1.databases.updateDocument(config_1.appwriteConfig.databaseId, config_1.appwriteConfig.pollsCollectionId, poll.$id, {
                    commentsLocked: true,
                    lockedBy: "system",
                }));
                console.log(`Locked poll ${poll.$id} due to ${inactivityDuration} days inactivity`);
            }
        }
        await Promise.all(lockPromises);
        context.log("Post and poll locking processed successfully");
        console.log("Post and poll locking completed");
        // Post and poll locking logic ends here
        context.log("All notifications and deletions processed successfully");
        console.log("Management completed successfully");
        return {
            statusCode: 204,
            body: "",
        };
    }
    catch (error) {
        context.error(`Error managing inactive groups: ${error.message}`);
        console.log(`Error in management: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
}
exports.default = manageInactiveGroups;
