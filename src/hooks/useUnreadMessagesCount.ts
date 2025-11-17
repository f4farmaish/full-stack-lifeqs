// hooks/useUnreadMessagesCount.ts
import { useEffect, useState } from "react";
import { Models, Query, RealtimeResponseEvent } from "appwrite";
import { appwriteConfig, databases, client } from "@/lib/appwrite/config";

export const useUnreadMessagesCount = (userId: string | undefined) => {
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadMessages = async () => {
      try {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          [Query.search("userIds", userId)]
        );

        let count = 0;
        for (const chat of res.documents) {
          const index = chat.userIds.findIndex((id: string) => id === userId);
          const lastSeenAt = chat.lastSeenAt?.[index];
          const updatedAt = chat.updatedAt || chat.createdAt;
          const isUnread = !lastSeenAt || new Date(updatedAt) > new Date(lastSeenAt);
          if (isUnread) count++;
        }

        setUnreadMessagesCount(count);
      } catch (err) {
        console.error("Failed to fetch unread messages:", err);
      }
    };

    fetchUnreadMessages();

    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.chatsCollectionId}.documents`,
      (res: RealtimeResponseEvent<Models.Document>) => {
        if (
          res.events.includes("databases.*.collections.*.documents.*.update") &&
          res.payload.userIds?.includes(userId)
        ) {
          fetchUnreadMessages();
        }
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return unreadMessagesCount;
};
