import { useState } from "react";
import {
  useGetUserNotifications,
  useMarkNotificationAsRead,
} from "@/lib/react-query/queries";
import { useNavigate } from "react-router-dom";
import { INotification, NotificationCategory } from "@/types";
import { getNotificationCategory, getNotificationDestination } from "@/services/notificationsService";
import { useTranslation } from "react-i18next";

const NotificationModal = ({
  isOpen,
  onClose,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}) => {
  const { t } = useTranslation();
  const { data: notifications, isLoading } = useGetUserNotifications(userId);
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const [visibleNotifications, setVisibleNotifications] = useState(10); // Number of notifications to display initially
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [categoryFilters, setCategoryFilters] = useState<Set<NotificationCategory>>(
    new Set()
  );
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null); // New state for confirmation message
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleMarkAllAsRead = async () => {
    try {
      if (!notifications?.documents) return;

      const unreadNotifications = notifications.documents.filter(
        (notification) => !notification.isRead
      );

      if (unreadNotifications.length === 0) {
        setConfirmationMessage(t("notificationModal.noUnreadNotifications"));
      } else {
        const updatePromises = unreadNotifications.map((notification) =>
          markAsRead(notification.$id)
        );

        await Promise.all(updatePromises);
        setConfirmationMessage(t("notificationModal.allMarkedAsRead"));
      }

      // Clear confirmation message after 3 seconds
      setTimeout(() => {
        setConfirmationMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Error marking all as read:", error);
      setConfirmationMessage(t("notificationModal.failedToMarkAsRead"));
      setTimeout(() => {
        setConfirmationMessage(null);
      }, 3000);
    }
  };

  // Function to toggle a category filter
  const toggleCategoryFilter = (category: NotificationCategory) => {
    setCategoryFilters((prevFilters) => {
      const newFilters = new Set(prevFilters);
      if (newFilters.has(category)) {
        newFilters.delete(category);
      } else {
        newFilters.add(category);
      }
      return newFilters;
    });
  };

  // Filter notifications based on read and category filters
  const filteredNotifications =
    notifications?.documents.filter((notification) => {
      // Apply read/unread filter
      const readCondition = readFilter === "all" ? true : !notification.isRead;

      // Apply category filter
      const categoryCondition =
        categoryFilters.size === 0
          ? true
          : categoryFilters.has(getNotificationCategory(notification.types));

      return readCondition && categoryCondition;
    }) || [];

  // Handle "See More" click
  const handleSeeMore = () => {
    setVisibleNotifications((prev) => prev + 10); // Load 10 more notifications
  };

  // Handle "See Less" click
  const handleSeeLess = () => {
    setVisibleNotifications(10); // Reset to 10 notifications
  };

  async function handleNotificationClick(notification: INotification) {
    if (!notification.relatedEntityId) {
      console.warn("Notification has no related entity. Skipping navigation.");
      return;
    }

    const { destination, queryParams } = await getNotificationDestination(notification);

    if (!destination) {
      console.error("No valid destination found for notification:", notification);
      return;
    }


    onClose();
    navigate(`${destination}${queryParams}`);

    if (!notification.isRead) {
      markAsRead(notification.$id);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-dark-1 bg-opacity-75 backdrop-blur-md z-[1000] flex justify-center items-center animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-dark-3 rounded-xl shadow-lg w-[750px] max-h-[700px] overflow-hidden p-6 relative border border-dark-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          {/* Title */}
          <h2 className="text-xl font-semibold text-light-1">{t("notificationModal.title")}</h2>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-2xl font-bold text-light-1 hover:text-red-500 transition duration-200"
          >
            ×
          </button>
        </div>

        {/* Filter Buttons Row 1: Read Status and Mark All */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setReadFilter("all")}
            className={`px-3 py-1 rounded-xl text-sm transition duration-200 flex-1 ${
              readFilter === "all"
                ? "bg-primary-500 text-light-1"
                : "bg-dark-4 text-primary-500 hover:bg-dark-2"
            }`}
          >
            {t("notificationModal.allNotifications")}
          </button>
          <button
            onClick={() => setReadFilter("unread")}
            className={`px-3 py-1 rounded-xl text-sm transition duration-200 flex-1 ${
              readFilter === "unread"
                ? "bg-primary-500 text-light-1"
                : "bg-dark-4 text-primary-500 hover:bg-dark-2"
            }`}
          >
            {t("notificationModal.unread")}
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-1 rounded-xl text-sm bg-dark-4 text-light-1 hover:bg-dark-2 transition duration-200 flex-1 border border-light-3"
          >
            {t("notificationModal.markAllAsRead")}
          </button>
        </div>

        {/* Filter Buttons Row 2: Categories */}
        <div className="flex gap-2 mb-4">
          {(["questions", "polls", "groups"] as NotificationCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => toggleCategoryFilter(category)}
              className={`px-3 py-1 rounded-xl text-sm transition duration-200 flex-1 ${
                categoryFilters.has(category)
                  ? "bg-primary-500 text-light-1"
                  : "bg-dark-4 text-primary-500 hover:bg-dark-2"
              }`}
            >
              {t(`notificationModal.${category}`)}
            </button>
          ))}
        </div>

        {/* Confirmation Message */}
        {confirmationMessage && (
          <div className="mb-4 p-2 bg-dark-4 text-light-1 text-sm rounded-lg text-center">
            {confirmationMessage}
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <p className="text-light-3 text-center">{t("notificationModal.loading")}</p>
          ) : filteredNotifications.length === 0 ? (
            <p className="text-light-3 text-center">{t("notificationModal.noNotificationsFound")}</p>
          ) : (
            <ul className="space-y-3">
              {filteredNotifications
                .slice(0, visibleNotifications)
                .map((notification) => (
                  <li
                    key={notification.$id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 rounded-lg transition duration-200 cursor-pointer flex justify-between items-center ${
                      notification.isRead ? "bg-dark-4" : "bg-dark-2"
                    } hover:bg-dark-5 animate-fade-in-up`}
                  >
                    <p className="text-light-1">{notification.message}</p>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* "See More" and "See Less" Buttons */}
        <div className="flex flex-col items-center space-y-2">
          {filteredNotifications.length > visibleNotifications && (
            <button
              onClick={handleSeeMore}
              className="text-sm text-primary-500 hover:text-primary-600 transition duration-200"
            >
              {t("notificationModal.seeMore")}
            </button>
          )}
          {visibleNotifications > 10 && (
            <button
              onClick={handleSeeLess}
              className="text-sm text-primary-500 hover:text-primary-600 transition duration-200"
            >
              {t("notificationModal.seeLess")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;