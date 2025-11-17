import { useState, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { ReactionModalProps } from "@/types";

const ReactionModal: React.FC<ReactionModalProps> = memo(({
  showReactionModal,
  setShowReactionModal,
  selectedEmoji,
  reactionUsers,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Memoized filtered users to optimize performance
  const filteredUsers = useMemo(() => {
    return reactionUsers.filter((user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reactionUsers, searchTerm]);

  // Debounced search handler to reduce lag
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeout(() => setSearchTerm(value), 300);
  };

  if (!showReactionModal) return null;

  // Render modal in a portal to avoid parent container constraints
  return createPortal(
    <div
      className="fixed inset-0 bg-dark-1 bg-opacity-75 backdrop-blur-md z-[1000] flex justify-center items-center"
      onClick={() => setShowReactionModal(false)}>
      <div
        className="bg-dark-3 rounded-xl shadow-lg w-[550px] max-h-[600px] overflow-hidden p-6 relative border border-dark-4"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-light-1">
            Users who reacted with {selectedEmoji}
          </h2>
          <button
            onClick={() => setShowReactionModal(false)}
            className="text-xl font-bold text-light-1 hover:text-red-500 transition duration-200">
            ×
          </button>
        </div>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search users..."
          className="w-full p-2 mb-3 rounded-lg bg-dark-2 text-light-1 border border-dark-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
          defaultValue={searchTerm}
          onChange={handleSearchChange}
        />

        {/* List of Reacted Users */}
        <div className="max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-300">
          {filteredUsers.length === 0 ? (
            <p className="text-light-3 text-center">No users found.</p>
          ) : (
            <ul className="space-y-2">
              {filteredUsers.map((user) => (
                <li
                  key={user.$id}
                  className="flex items-center gap-2 p-2 hover:bg-dark-4 rounded-lg transition duration-200">
                  <a
                    href={`/profile/${user.$id}`}
                    className="flex items-center gap-2"
                    onClick={() => setShowReactionModal(false)}>
                    <img
                      src={
                        user.imageUrl || "/assets/icons/profile-placeholder.svg"
                      }
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-primary-500"
                      loading="lazy"
                    />
                    <span className="text-light-1 text-sm font-medium hover:underline">
                      {user.name}
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
});

export default ReactionModal;