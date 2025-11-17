// Updated Sidebar.tsx
import { Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const Sidebar = ({
  onSelectOption,
  selectedOption,
}: {
  onSelectOption: (option: string) => void;
  selectedOption: string | null;
}) => {
  const { t } = useTranslation();
  const settingsOptions = [
    {
      id: "update-profile",
      label: t('settings.profileDetails'),
      route: "/settings/update-profile",
      icon: "/public/assets/icons/edit-profile.svg",
    },
    {
      id: "change-password",
      label: t('settings.changePasswordLabel'),
      route: "/settings/change-password",
      icon: "/public/assets/icons/password.svg",
    },
    {
      id: "change-email",
      label: t('settings.changeEmailLabel'),
      route: "/settings/change-email",
      icon: "/public/assets/icons/email.svg",
    },
    {
      id: "comment-display",
      label: t('settings.commentDisplayLabel'),
      route: "/settings/comment-display",
      icon: "/public/assets/icons/comments.svg",
    },
    {
      id: "notifications",
      label: t('settings.notificationsLabel'),
      route: "/settings/notifications",
      icon: "/public/assets/icons/notifications_setting.svg",
    },
    {
      id: "email-notifications",
      label: t('settings.emailNotificationsLabel'),
      route: "/settings/email-notifications",
      icon: "/public/assets/icons/email.svg",
    },
    {
      id: "delete-account",
      label: t('settings.deleteAccountLabel'),
      route: "/settings/delete-account",
      icon: "/public/assets/icons/delete_account.svg",
    },
  ];
  const [searchTerm, setSearchTerm] = useState("");

  const handleSelect = (optionId: string) => {
    onSelectOption(optionId);
  };

  const filteredOptions = settingsOptions.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-dark-3 flex flex-col mt-10">
      <div className="px-4 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-light-1">{t('settings.title')}</h2>
      </div>

      <div className="px-4 pb-2">
        <input
          type="text"
          placeholder={t('settings.searchPlaceholder')}
          className="w-full bg-dark-2 text-light-1 text-sm px-3 py-2 rounded-lg border border-dark-4 focus:outline-none focus:ring-2 focus:ring-light-3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div>
        {filteredOptions.length === 0 ? (
          <div className="text-light-4 px-4 py-3 text-sm">
            {t('settings.noSettingsFound')}
          </div>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = selectedOption === option.id;
            return (
              <Link
                key={option.id}
                to={option.route}
                onClick={() => handleSelect(option.id)}
                className={`block w-full px-4 py-3 text-left transition border-b border-dark-4 rounded-lg ${
                  isSelected
                    ? "bg-dark-4 text-white"
                    : "hover:bg-dark-4 text-light-1"
                }`}>
                <div className="flex items-center gap-3">
                  <img
                    src={option.icon}
                    alt={`${option.label} icon`}
                    className="w-6 h-6"
                  />
                  <div className="flex flex-col">
                    <span className="text-light-1 text-sm">{option.label}</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;