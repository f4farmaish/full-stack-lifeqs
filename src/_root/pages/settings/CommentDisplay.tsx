import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { databases, appwriteConfig, Query } from "@/lib/appwrite/config";
import { getCurrentUser } from "@/services/authService";

interface CommentDisplaySettings {
  sortBy: "date" | "likes";
}

const fetchCommentSettings = async (userId: string) => {
  const user = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    userId,
    [Query.select(["commentSortBy"])]
  );
  return {
    sortBy: user.commentSortBy || "likes",
  };
};

const updateCommentSettings = async (userId: string, settings: CommentDisplaySettings) => {
  return await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    userId,
    {
      commentSortBy: settings.sortBy,
    }
  );
};

const CommentDisplay = () => {
  const { t } = useTranslation();
  const { data: currentUser } = useQuery(["currentUser"], getCurrentUser);
  const [settings, setSettings] = useState<CommentDisplaySettings>({
    sortBy: "likes",
  });
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | null }>({ message: "", type: null });
  const queryClient = useQueryClient();

  const { data: commentSettings, isLoading } = useQuery(
    ["commentSettings", currentUser?.$id],
    () => fetchCommentSettings(currentUser?.$id!),
    { enabled: !!currentUser }
  );

  // Sync local settings with fetched commentSettings
  useEffect(() => {
    if (commentSettings) {
      setSettings({ sortBy: commentSettings.sortBy });
    }
  }, [commentSettings]);

  const mutation = useMutation({
    mutationFn: () => updateCommentSettings(currentUser?.$id!, settings),
    onSuccess: async () => {
      // Invalidate and refetch queries
      await Promise.all([
        queryClient.invalidateQueries(["currentUser"]),
        queryClient.invalidateQueries(["commentSettings", currentUser?.$id]),
      ]);
      // Refetch currentUser to ensure context updates
      await queryClient.refetchQueries(["currentUser"]);
      setNotification({ message: t('settings.commentDisplay.settingsUpdatedSuccess'), type: "success" });
      setTimeout(() => setNotification({ message: "", type: null }), 3000);
    },
    onError: (error: any) => {
      setNotification({ message: `${t('settings.commentDisplay.settingsUpdateFailed')}: ${error.message}`, type: "error" });
      setTimeout(() => setNotification({ message: "", type: null }), 3000);
    },
  });

  if (isLoading || !currentUser) {
    return <div className="flex-center h-full bg-dark-2 text-gray-800 dark:text-light-1 h1-semibold px-6">{t('settings.commentDisplay.loading')}</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ sortBy: e.target.value as "date" | "likes" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="flex-center h-full bg-dark-2 px-6">
      <div className="w-full max-w-lg bg-dark-2 border-2 border-dark-4 rounded-xl p-8 sm:p-10 shadow-xl animate-fade-in-up">
        <h2 className="h1-semibold text-gray-800 dark:text-light-1 mb-8 text-center">{t('settings.commentDisplay.title')}</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="body-medium text-gray-800 dark:text-light-1 mb-3 block">{t('settings.commentDisplay.sortBy')}</label>
            <select
              name="sortBy"
              value={settings.sortBy}
              onChange={handleChange}
              className="w-full rounded-xl bg-dark-3 border border-dark-4 text-gray-800 dark:text-off-white px-5 py-4 text-base focus:ring-2 focus:ring-primary-500"
            >
              <option value="likes">{t('settings.commentDisplay.mostLiked')}</option>
              <option value="date">{t('settings.commentDisplay.newestFirst')}</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={mutation.isLoading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl px-6 py-4 text-base hover:from-primary-500 hover:to-primary-600 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {mutation.isLoading ? t('settings.commentDisplay.updating') : t('settings.commentDisplay.saveSettings')}
          </button>
        </form>
        {notification.message && (
          <div
            className={`mt-6 p-4 rounded-xl base-regular text-center ${
              notification.type === "success" ? "bg-green-900 text-green-200 bg-opacity-90" : "bg-red-900 text-red-200 bg-opacity-90"
            } animate-fade-in-up`}
          >
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentDisplay;