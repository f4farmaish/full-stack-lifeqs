import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";
import { Models } from "appwrite";
import { useTranslation } from "react-i18next";

// Define Notification Type
interface Notification {
  $id: string;
  message: string;
  isRead: boolean;
}

export function Notifications({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Initialize WebSocket for real-time notifications
  useLiveNotifications(userId);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Get the latest notifications from the cache
    const cachedNotifications = queryClient.getQueryData<{
      documents: Models.Document[];
    }>(["notifications", userId]);

    if (cachedNotifications?.documents) {
      setNotifications(
        cachedNotifications.documents.map((doc) => ({
          $id: doc.$id,
          message: doc.message || t("notifications.noMessage"),
          isRead: doc.isRead ?? false,
        }))
      );
    }
  }, [queryClient, userId, t]);

  // Handle marking notifications as read locally
  const handleMarkAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.$id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  return (
    <div className="p-4 w-80 bg-white shadow-lg rounded-lg">
      <h3 className="text-lg font-bold mb-2">{t("notifications.title")}</h3>
      {notifications.length === 0 ? (
        <p className="text-gray-500">{t("notifications.noNewNotifications")}</p>
      ) : (
        <ul>
          {notifications.map((notif) => (
            <li
              key={notif.$id}
              className={`p-2 cursor-pointer transition ${
                notif.isRead ? "text-gray-500" : "font-bold text-blue-600"
              }`}
              onClick={() => handleMarkAsRead(notif.$id)}>
              {notif.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
