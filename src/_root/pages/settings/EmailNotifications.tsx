import {
  useGetCurrentUser,
  useUpdateEmailPreferences,
} from "@/lib/react-query/queries";
import {
  INotificationType,
  INotificationPreferences,
  DEFAULT_EMAIL_PREFERENCES,
} from "@/types";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

const EmailNotifications = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading, refetch } = useGetCurrentUser();
  const updateEmailPreferencesMutation = useUpdateEmailPreferences();

  // Compute current preferences safely at top
  const currentPreferences: INotificationPreferences = useMemo(() => {
    if (!currentUser) return DEFAULT_EMAIL_PREFERENCES;
    return currentUser.emailPreferences?.length > 0
      ? currentUser.emailPreferences
      : DEFAULT_EMAIL_PREFERENCES;
  }, [currentUser]);

  // Initialize temp preferences with default
  const [tempPreferences, setTempPreferences] =
    useState<INotificationPreferences>(DEFAULT_EMAIL_PREFERENCES);

  // Sync temp with current when user loads
  useEffect(() => {
    setTempPreferences(currentPreferences);
  }, [currentPreferences]);

  // Check for changes
  const hasChanges = useMemo(() => {
    const isDifferent =
      JSON.stringify(tempPreferences.sort()) !==
      JSON.stringify(currentPreferences.sort());
    return isDifferent;
  }, [tempPreferences, currentPreferences]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex-center h-full bg-dark-2 text-light-1 h1-semibold px-6">
        {t('settings.emailNotifications.loading')}
      </div>
    );
  }

  const emailNotificationTypes: INotificationType[] = [
    "INACTIVE_GROUP",
    "GROUP_DELETION_WARNING",
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
    updateEmailPreferencesMutation.mutate(
      {
        userId: currentUser.$id,
        preferences: tempPreferences,
      },
      {
        onSuccess: () => {
          // Optimistically update the cache
          queryClient.setQueryData(["currentUser"], (oldUser: any) => {
            if (!oldUser) return oldUser;
            return {
              ...oldUser,
              emailPreferences: tempPreferences,
            };
          });
          // Invalidate and refetch to ensure backend sync
          queryClient.invalidateQueries({ queryKey: ["currentUser"] });
          refetch().then(() => {});
        },
        onError: (error: any) => {
          console.error("Failed to update email preferences:", {
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
          {t('settings.emailNotifications.title')}
        </h2>
        <div className="space-y-4">
          {emailNotificationTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={type}
                checked={tempPreferences.includes(type)}
                onChange={() => handleToggle(type)}
                className="text-primary-500 focus:ring-primary-500 h-4 w-4 rounded border-dark-4 bg-dark-3"
              />
              <label htmlFor={type} className="text-light-1 text-sm">
                {getEmailLabelForType(type, t)}
              </label>
            </div>
          ))}
        </div>
        {hasChanges && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleUpdate}
              disabled={updateEmailPreferencesMutation.isLoading}
              className={`bg-primary-500 text-light-1 font-semibold py-2 px-4 rounded hover:bg-primary-600 transition-colors ${
                updateEmailPreferencesMutation.isLoading
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}>
              {updateEmailPreferencesMutation.isLoading
                ? t('settings.emailNotifications.saving')
                : t('settings.emailNotifications.update')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const getEmailLabelForType = (type: INotificationType, t: any): string => {
  switch (type) {
    case "INACTIVE_GROUP":
      return t('settings.emailNotifications.inactiveGroup');
    case "GROUP_DELETION_WARNING":
      return t('settings.emailNotifications.groupDeletionWarning');
    default:
      return type;
  }
};

export default EmailNotifications;