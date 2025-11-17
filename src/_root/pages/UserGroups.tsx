import { useState, useMemo } from "react";
import { Models } from "appwrite";
import { useNavigate } from "react-router-dom";
import GroupCard from "@/components/groups/GroupCard";
import { Button } from "@/components/ui";
import { useTranslation } from "react-i18next";

// Interface for the group data expected by GroupCard
interface Group {
  name: string;
  description: string;
  categoryName?: string;
  subCategory?: string;
  tags?: string[];
  categoryId?: string;
  groupId: string; // Unique identifier for the group
  admins: string[];
  creatorId: string;
}

// Props interface for type safety
interface UserGroupsProps {
  userGroups: Models.Document[] | undefined;
  userId: string; // Add userId prop
}

// Component to display another user's groups using GroupCard, styled to match UserPosts
const UserGroups = ({ userGroups, userId }: UserGroupsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentFilter, setCurrentFilter] = useState<"joined" | "managed" | null>(null);

  // Validate and transform groups to match Group interface
  const validatedGroups: Group[] = useMemo(() => {
    return userGroups
      ? userGroups
          .filter(
            (group) =>
              typeof group.name === "string" &&
              typeof group.description === "string" &&
              typeof group.$id === "string" // Ensure group has a valid ID
          ) // Ensure required fields exist and are strings
          .map((group) => {
            const groupData = {
              name: group.name,
              description: group.description,
              categoryName: group.categoryName || t("userGroups.unknownCategory"), // Fallback if not provided
              subCategory: group.subCategory || undefined,
              tags: Array.isArray(group.tags) ? group.tags : undefined,
              categoryId: group.categoryIdString || group.categoryId?.$id || undefined, // Handle relationship or string
              groupId: group.$id, // Unique group ID for navigation
              admins: Array.isArray(group.admins) ? group.admins : [],
              creatorId: group.creatorId,
            };

            return groupData;
          })
      : [];
  }, [userGroups]);

  // Filter groups based on currentFilter
  const filteredGroups = useMemo(() => {
    if (!currentFilter) return validatedGroups; // Show all by default
    return validatedGroups.filter((group) => {
      if (currentFilter === "joined") return !group.admins.includes(userId);
      if (currentFilter === "managed") return group.admins.includes(userId);
      return false;
    });
  }, [validatedGroups, currentFilter, userId]);

  return (
    <div className="w-full">
      {/* Filter buttons */}
      <div className="flex justify-center max-w-5xl w-full mb-8 mx-auto gap-4">
        <Button
          onClick={() => setCurrentFilter("joined")}
          className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
            currentFilter === "joined" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
          }`}
          aria-label="Filter by joined groups">
          <img
            src="/assets/icons/joined.svg"
            alt="joined"
            width={20}
            height={20}
          />
          {t("userGroups.joined")}
        </Button>
        <Button
          onClick={() => setCurrentFilter("managed")}
          className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
            currentFilter === "managed" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
          }`}
          aria-label="Filter by managed groups">
          <img
            src="/assets/icons/created.svg"
            alt="managed"
            width={20}
            height={20}
          />
          {t("userGroups.managed")}
        </Button>
      </div>

      {/* Define custom grid styling for UserGroups with 4 columns */}
      <style>{`
        .user-groups-container .user-groups-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          width: 100%;
          padding: 0;
          margin: 0;
          list-style: none;
        }
        .user-groups-container .user-groups-grid > li {
          min-width: 300px;
          pointer-events: auto; /* Ensure grid items are clickable */
        }
      `}</style>

      {/* Display message if no groups are available, matching UserPosts styling */}
      {filteredGroups.length === 0 ? (
        <p className="text-light-4 text-center">{t("userGroups.noGroupsFound")}</p>
      ) : (
        // Render groups in a grid layout with 4 columns, custom gap, and wider cards
        <div className="user-groups-container">
          <ul className="user-groups-grid">
            {filteredGroups.map((group, index) => (
              <li key={`${group.name}-${index}`}>
                <GroupCard
                  group={group}
                  onTitleClick={() => {
                    navigate(`/groups/${group.groupId}`);
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserGroups;