import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { Models } from "appwrite";
import useDebounce from "@/hooks/useDebounce";
import { useTranslation } from "react-i18next";

type VoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  votedUsers: Models.Document[];
  pollId: string;
};

const VoteModal = ({ isOpen, onClose, votedUsers, pollId }: VoteModalProps) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);


  // Memoized filtered users to optimize performance
  const filteredUsers = useMemo(() => {
    return votedUsers.filter((user) =>
      (user.name || "").toLowerCase().includes((debouncedSearchTerm || "").toLowerCase())
    );
  }, [votedUsers, debouncedSearchTerm]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  );

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, pollId]);

  // Reset search term when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen, pollId]);

  if (!isOpen) {
    return null;
  }

  // Render modal in a portal to avoid parent container constraints
  return createPortal(
    <div
      className="fixed inset-0 bg-dark-1 bg-opacity-75 backdrop-blur-md z-[1000] flex justify-center items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vote-modal-title"
    >
      <div
        className="bg-dark-3 rounded-xl shadow-lg w-[550px] max-h-[600px] overflow-hidden p-6 relative border border-dark-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 id="vote-modal-title" className="text-lg font-semibold text-light-1">
            {t("voteModal.votedBy")}
          </h2>
          <button
            onClick={() => {
              onClose();
            }}
            className="text-xl font-bold text-light-1 hover:text-red-500 transition duration-200"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder={t("voteModal.searchUsers")}
          className="w-full p-2 mb-3 rounded-lg bg-dark-2 text-light-1 border border-dark-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={searchTerm}
          onChange={handleSearchChange}
          aria-label="Search users who voted"
          autoFocus
        />

        {/* List of Voted Users */}
        <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-300">
          {votedUsers.length === 0 ? (
            <p className="text-light-3 text-center">{t("voteModal.noVotesYet")}</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-light-3 text-center">{t("voteModal.noUsersFound")}</p>
          ) : (
            <ul className="space-y-2">
              {filteredUsers.map((user) => (
                <li
                  key={user.$id}
                  className="flex items-center gap-2 p-2 hover:bg-dark-4 rounded-lg transition duration-200"
                >
                  <a
                    href={`/profile/${user.$id}`}
                    className="flex items-center gap-2"
                    aria-label={`View ${user.name || t("voteModal.unknownUser")}'s profile`}
                  >
                    <img
                      src={
                        user.imageUrl || "/assets/icons/profile-placeholder.svg"
                      }
                      alt={`${user.name || t("voteModal.unknownUser")}'s profile`}
                      className="w-8 h-8 rounded-full border border-primary-500"
                      loading="lazy"
                    />
                    <span className="text-light-1 text-sm font-medium hover:underline">
                      {user.name || t("voteModal.unknownUser")}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default memo(VoteModal);