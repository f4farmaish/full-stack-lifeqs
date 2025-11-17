import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Loader from "../shared/Loader";
import { IUser } from "@/types";
import { UseMutateFunction } from "@tanstack/react-query";

interface UserProfileSectionProps {
  user: IUser;
  isLoading: boolean;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  signOut: UseMutateFunction<{} | undefined, unknown, void, unknown>;
  toggleNotificationModal: () => void;
}

const UserProfileSection = ({
  user,
  isLoading,
  unreadMessagesCount,
  unreadNotificationsCount,
  signOut,
  toggleNotificationModal,
}: UserProfileSectionProps) => {
  const { t, i18n } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Log props for debugging
  useEffect(() => {
    console.log("UserProfileSection props:", { userId: user.id, unreadMessagesCount, unreadNotificationsCount });
  }, [user.id, unreadMessagesCount, unreadNotificationsCount]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader />
      </div>
    );
  }

  // Handle no user state
  if (!user.id) {
    return (
      <div className="flex items-center gap-2">
        Please log in.
      </div>
    );
  }

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    console.log("Language changed to:", lang);
    i18n.changeLanguage(lang);
    setIsLangOpen(false);
  };

  return (
    <div className="flex items-center justify-end gap-2 md:gap-2">
      {/* Left side: Messages and Notifications (stacked vertically) */}
      <div className="flex flex-col items-center gap-2">
        {/* Messages Icon */}
        <button
          onClick={() => navigate("/MessagesPage")}
          className="relative flex items-center"
          aria-label={t('common.messages')}
        >
          <img
            src="/assets/icons/messages.svg"
            alt={t('common.messages')}
            className="h-6 w-6"
          />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        {/* Notifications Icon */}
        <button
          onClick={toggleNotificationModal}
          className="relative flex items-center"
          aria-label={t('common.notifications')}
        >
          <img
            src="/assets/icons/notifications.svg"
            alt={t('common.notifications')}
            className="h-6 w-6"
          />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>

      {/* Center: Clickable Profile (nickname and picture navigate to Profile) */}
      <button
        onClick={() => navigate(`/profile/${user.id}`)}
        className="flex items-center gap-2 focus:outline-none mx-2"
      >
        <img
          src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
          alt="profile"
          className="h-10 w-10 rounded-full border border-gray-500 hover:border-white cursor-pointer"
        />
        <div className="hidden md:block flex flex-col items-start">
          <p className="text-sm font-semibold cursor-pointer">{user.name}</p>
          <div className="flex gap-1 text-xs text-pink-1 font-semibold">
            <span>{t('common.level')}: {user.level} / {t('common.points')}: {user.point}</span>
          </div>
        </div>
      </button>

      {/* Right side: Languages and Logout (stacked vertically, icons only) */}
      <div className="flex flex-col items-center gap-2">
        {/* Languages Icon with Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setIsLangOpen((prev) => !prev)}
            className="flex items-center"
            aria-label={t('common.language')}
          >
            <img
              src="/assets/icons/language.svg"
              alt={t('common.language')}
              className="h-6 w-6"
            />
          </button>
          {isLangOpen && (
            <div
              className="absolute top-full right-0 mt-2 bg-dark-3 rounded-md shadow-lg p-2 z-50 border border-gray-700 min-w-[100px]"
            >
              <button
                onClick={() => handleLanguageChange("en")}
                className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm text-white hover:bg-dark-4 rounded-md"
              >
                {t('common.english')}
              </button>
              <button
                onClick={() => handleLanguageChange("lv")}
                className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm text-white hover:bg-dark-4 rounded-md"
              >
                {t('common.latvian')}
              </button>
            </div>
          )}
        </div>

        {/* Logout Icon */}
        <button
          onClick={() => {
            signOut();
          }}
          className="flex items-center"
          aria-label={t('common.logout')}
        >
          <img
            src="/assets/icons/logout.svg"
            alt={t('common.logout')}
            className="h-6 w-6 text-red-500 hover:text-red-400"
          />
        </button>
      </div>
    </div>
  );
};

export default UserProfileSection;