import {
  useGetCurrentUser,
  useUpdateNotificationPreferences,
} from "@/lib/react-query/queries";
import {
  INotificationType,
  INotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/types";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

const Notifications = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading, refetch } = useGetCurrentUser();
  const updateNotificationPreferencesMutation =
    useUpdateNotificationPreferences();

  if (isLoading || !currentUser) {
    return (
      <div className="flex-center h-full bg-dark-2 text-light-1 h1-semibold px-6">
        {t('settings.notifications.loading')}
      </div>
    );
  }

  // Default to all preferences enabled if none are set
  const currentPreferences: INotificationPreferences =
    currentUser.notificationPreferences?.length > 0
      ? currentUser.notificationPreferences
      : DEFAULT_NOTIFICATION_PREFERENCES;

  // Local state for temporary preferences
  const [tempPreferences, setTempPreferences] =
    useState<INotificationPreferences>(currentPreferences);

  // Check if preferences have changed to show Update button
  const hasChanges = useMemo(() => {
    const isDifferent =
      JSON.stringify(tempPreferences.sort()) !==
      JSON.stringify(currentPreferences.sort());

    return isDifferent;
  }, [tempPreferences, currentPreferences]);

  const allNotificationTypes: INotificationType[] = [
    "LIKE_POST",
    "COMMENT_POST",
    "POLL_RESULTS",
    "PARTIAL_RESULTS",
    "LIKE_COMMENT_OWNER",
    "LIKE_COMMENT_MEMBER",
    "REPLY_TO_COMMENT",
    "BEST_COMMENT_SELECTED",
    "NEW_MEMBERSHIP_REQUEST",
    "INACTIVE_GROUP",
    "GROUP_DELETION_WARNING",
    "MEMBERSHIP_REQUEST_APPROVED",
    "GROUP_INVITATION",
    "MENTION_IN_COMMENT",
  ];

  const handleToggle = (key: INotificationType) => {
    setTempPreferences((prev) => {
      let newPreferences: INotificationPreferences;
      if (prev.includes(key)) {
        newPreferences = prev.filter((type) => type !== key);
      } else {
        newPreferences = [...prev, key];
      }
      return newPreferences;
    });
  };

  const handleUpdate = () => {
    updateNotificationPreferencesMutation.mutate(
      {
        userId: currentUser.$id,
        preferences: tempPreferences,
      },
      {
        onSuccess: (updatedUser) => {
          // Optimistically update the cache
          queryClient.setQueryData(["currentUser"], (oldUser: any) => {
            if (!oldUser) return oldUser;
            return {
              ...oldUser,
              notificationPreferences: tempPreferences,
            };
          });
          // Invalidate and refetch to ensure backend sync
          queryClient.invalidateQueries({ queryKey: ["currentUser"] });
          refetch().then(() => {});
        },
        onError: (error: any) => {
          console.error("Failed to update preferences:", {
            error: error.message,
            userId: currentUser.$id,
            preferences: tempPreferences,
            timestamp: new Date().toISOString(),
          });
        },
      }
    );
  };

  return (
    <div className="flex-center h-full bg-dark-2 px-6">
      <div className="w-full max-w-lg bg-dark-2 border-2 border-dark-4 rounded-xl p-8 sm:p-10 shadow-xl animate-fade-in-up">
        <h2 className="h1-semibold text-light-1 mb-8 text-center">
          {t('settings.notifications.title')}
        </h2>
        <div className="space-y-4">
          {allNotificationTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={type}
                checked={tempPreferences.includes(type)}
                onChange={() => handleToggle(type)}
                className="text-primary-500 focus:ring-primary-500 h-4 w-4 rounded border-dark-4 bg-dark-3"
              />
              <label htmlFor={type} className="text-light-1 text-sm">
                {getLabelForType(type, t)}
              </label>
            </div>
          ))}
        </div>
        {hasChanges && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleUpdate}
              disabled={updateNotificationPreferencesMutation.isLoading}
              className={`bg-primary-500 text-light-1 font-semibold py-2 px-4 rounded hover:bg-primary-600 transition-colors ${
                updateNotificationPreferencesMutation.isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}>
              {updateNotificationPreferencesMutation.isLoading
                ? t('settings.notifications.saving')
                : t('settings.notifications.update')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const getLabelForType = (type: INotificationType, t: any): string => {
  switch (type) {
    case "LIKE_POST":
      return t('settings.notifications.likePost');
    case "COMMENT_POST":
      return t('settings.notifications.commentPost');
    case "POLL_RESULTS":
      return t('settings.notifications.pollResults');
    case "PARTIAL_RESULTS":
      return t('settings.notifications.partialResults');
    case "LIKE_COMMENT_OWNER":
      return t('settings.notifications.likeCommentOwner');
    case "LIKE_COMMENT_MEMBER":
      return t('settings.notifications.likeCommentMember');
    case "REPLY_TO_COMMENT":
      return t('settings.notifications.replyToComment');
    case "BEST_COMMENT_SELECTED":
      return t('settings.notifications.bestCommentSelected');
    case "NEW_MEMBERSHIP_REQUEST":
      return t('settings.notifications.newMembershipRequest');
    case "INACTIVE_GROUP":
      return t('settings.notifications.inactiveGroup');
    case "GROUP_DELETION_WARNING":
      return t('settings.notifications.groupDeletionWarning');
    case "MEMBERSHIP_REQUEST_APPROVED":
      return t('settings.notifications.membershipRequestApproved');
    case "GROUP_INVITATION":
      return t('settings.notifications.groupInvitation');
    case "MENTION_IN_COMMENT":
      return t('settings.notifications.mentionInComment');
    default:
      return type;
  }
};

export default Notifications;