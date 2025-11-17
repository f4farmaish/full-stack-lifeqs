import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Client } from "appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { INotification } from "@/types";

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(appwriteConfig.url)
  .setProject(appwriteConfig.projectId);

export function useLiveNotifications(userId: string | null) {
  const queryClient = useQueryClient();
  const wsSubscription = useRef<(() => void) | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!userId) {
      console.warn("No user logged in. WebSocket will not connect.");
      wsSubscription.current?.();
      wsSubscription.current = null;
      return;
    }

    // Prevent duplicate WebSocket connections
    if (wsSubscription.current) {
      return;
    }


    wsSubscription.current = client.subscribe(
      [`databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.notificationsCollectionId}.documents`],
      (response) => {
        if (!response?.payload) return;

        const notification = response.payload as INotification;
        const eventTypes = response.events;


        // Handle NEW notifications
        if (eventTypes.includes("databases.*.collections.*.documents.*.create")) {

          queryClient.setQueryData(
            ["notifications", userId],
            (prevData: { documents: INotification[] } | undefined) => {
              const existingNotifications = prevData?.documents || [];
              const isDuplicate = existingNotifications.some((n) => n.$id === notification.$id);

              if (isDuplicate) return prevData;

              return {
                ...prevData,
                documents: [notification, ...existingNotifications],
              };
            }
          );

          queryClient.invalidateQueries(["notifications", userId]);

          queryClient.setQueryData(
            ["unreadNotifications", userId],
            (prevCount: number | undefined) => (prevCount || 0) + 1
          );
        }

        // Handle UPDATING existing notifications
        if (eventTypes.includes("databases.*.collections.*.documents.*.update")) {

          queryClient.setQueryData(
            ["notifications", userId],
            (prevData: { documents: INotification[] } | undefined) => {
              if (!prevData) return prevData;

              return {
                ...prevData,
                documents: prevData.documents.map((n) =>
                  n.$id === notification.$id && n.isRead !== notification.isRead
                    ? { ...n, isRead: notification.isRead }
                    : n
                ),
              };
            }
          );

          queryClient.invalidateQueries(["notifications", userId]);

          queryClient.setQueryData(
            ["unreadNotifications", userId],
            (prevCount: number | undefined) => {
              if (notification.isRead) {
                return prevCount && prevCount > 0 ? prevCount - 1 : 0;
              }
              return prevCount;
            }
          );

        }
      }
    );

    return () => {
      wsSubscription.current?.();
      wsSubscription.current = null;
    };
  }, [userId, queryClient]);
}
