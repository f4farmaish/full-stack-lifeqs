import { useState, useMemo } from "react";
import {
  useAddMemberToGroup,
  useFetchUsersNotInGroup,
  useGetCurrentUser,
  useRemoveMemberFromGroup,
} from "@/lib/react-query/queries";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { appwriteConfig, databases } from "@/lib/appwrite/config";
import { createNotification } from "@/services/notificationsService";

import { GroupContent, IGroup, MinimalUser } from "@/types";
import GroupHeader from "./GroupHeader";
import GroupTabs from "./GroupTabs";
import MembersModal from "./MembersModal";
import StickyGroupHeader from "./StickyGroupHeader";
import { useScrollDetector } from "@/hooks/useScrollDetector";

interface IsMemberGroupPageProps {
  group: IGroup;
  posts: GroupContent[];
}

const IsMemberGroupPage = ({ group, posts }: IsMemberGroupPageProps) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get("tab") || "posts";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showManageAdmins, setShowManageAdmins] = useState(false);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"post" | "poll" | null>(
    null
  );

  const { mutate: addMember } = useAddMemberToGroup();
  const { data: usersNotInGroup = [] } = useFetchUsersNotInGroup(
    group?.$id || ""
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUserDoc } = useGetCurrentUser();
  const currentUser = useMemo<MinimalUser | null>(() => {
    if (!currentUserDoc) return null;
    return {
      $id: currentUserDoc.$id,
      name: currentUserDoc.name || "Unknown User",
      imageUrl: currentUserDoc.imageUrl,
    };
  }, [currentUserDoc]);

  const { mutate: removeMember } = useRemoveMemberFromGroup();

  const { isVisible: isStickyVisible, resetVisibility } = useScrollDetector({
    threshold: 1,
    scrollThreshold: 150,
    hideOnScrollUp: true,
    hideScrollThreshold: 30,
  });

  const isAdmin = currentUser ? group.admins.includes(currentUser.$id) : false;
  const isCreator = currentUser
    ? String(currentUser.$id) === String(group.creatorId)
    : false;

  const handleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      console.warn("No users selected for addition");
      return;
    }
    await addMember({ groupId: group.$id, userIds: selectedUsers });
    setSelectedUsers([]);
    setModalSearchTerm("");
    setShowAddMembers(false);
  };

  const resetSelection = () => {
    setSelectedUsers([]);
    setModalSearchTerm("");
  };

  const { mutate: downgradeAdminGroup } = useMutation({
    mutationFn: async ({
      groupId,
      adminId,
    }: {
      groupId: string;
      adminId: string;
    }) => {
      const groupData = group;

      if (String(adminId) === String(groupData.creatorId)) {
        console.warn(
          "Cannot downgrade creator:",
          adminId,
          "in group:",
          groupId
        );
        throw new Error("Cannot downgrade the group creator");
      }

      const updatedAdmins = groupData.admins.filter(
        (id: string) => id !== adminId
      );

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        groupId,
        { admins: updatedAdmins }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["group", group.$id]);
    },
    onError: (error) => {
      console.error("Error downgrading admin:", error);
    },
  });

  const handleLeaveGroup = () => {
    if (!currentUser) {
      console.error("Cannot leave group: Current user not found.");
      return;
    }
    if (isCreator) {
      alert(
        "As the group creator, you cannot leave the group. Consider transferring ownership or deleting the group."
      );
      console.warn("Cannot leave: User is creator");
      return;
    }
    if (isAdmin && group.admins.length === 1) {
      alert("You must assign another admin to the group before leaving.");
      console.warn("Cannot leave: Last admin");
      return;
    }

    if (window.confirm("Are you sure you want to leave this group?")) {
      removeMember({ groupId: group.$id, userId: currentUser.$id });
    }
  };

  const handleAdminSelection = (userId: string) => {
    setSelectedAdmins((prev) => {
      const updated = prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      return updated;
    });
  };

  const handleAddAdmins = async () => {
    if (selectedAdmins.length === 0) {
      console.warn("No admins selected to add");
      return;
    }

    if (group.admins.length + selectedAdmins.length > 5) {
      alert("You cannot have more than 5 admins in a group.");
      console.warn("Admin limit reached");
      return;
    }

    try {
      const updatedAdmins = [...group.admins, ...selectedAdmins];
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.groupsCollectionId,
        group.$id,
        {
          admins: updatedAdmins,
        }
      );

      // Send notifications to newly promoted admins
      if (currentUser && selectedAdmins.length > 0) {
        const promoterName = currentUser.name || "Someone";
        const groupName = group.name || "a group";

        const notificationPromises = selectedAdmins.map(async (adminId) => {
          try {
            await createNotification({
              userId: adminId,
              type: "GROUP_ADMIN_PROMOTION",
              message: `${promoterName} made you an admin for group "${groupName}"`,
              relatedEntityId: group.$id,
            });
          } catch (error) {
            console.error("Error sending admin promotion notification:", error);
          }
        });

        await Promise.all(notificationPromises);
      }

      setSelectedAdmins([]);
      setAdminSearchTerm("");
      setShowManageAdmins(false);

      queryClient.invalidateQueries(["group", group.$id]);
    } catch (error) {
      console.error("Error adding admins:", error);
      alert("Failed to add admins. Please try again.");
    }
  };

  const resetAdminSelection = () => {
    setSelectedAdmins([]);
    setAdminSearchTerm("");
  };

  const handleResetFilter = () => {
    setSelectedType(null);
    setActiveTab("posts");
    resetVisibility();
  };

  const handleTitleClick = () => {
    handleResetFilter();
  };

  return (
    <div className="w-full min-h-screen bg-black flex items-center flex-col p-4">
      <StickyGroupHeader
        group={group}
        onTitleClick={handleTitleClick}
        isVisible={isStickyVisible}
      />

      <div className="w-full max-w-screen-lg mx-auto">
        <GroupHeader
          group={group}
          isAdmin={isAdmin}
          setShowManageAdmins={setShowManageAdmins}
          onTitleClick={handleTitleClick}
        />

        <GroupTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          posts={posts}
          group={group}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setShowAddMembers={setShowAddMembers}
          currentUserId={currentUser?.$id || ""}
          handleLeaveGroup={handleLeaveGroup}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
        />

        {showAddMembers && (
          <MembersModal
            group={group}
            usersNotInGroup={usersNotInGroup}
            selectedUsers={selectedUsers}
            modalSearchTerm={modalSearchTerm}
            setModalSearchTerm={setModalSearchTerm}
            handleUserSelection={handleUserSelection}
            handleAddMembers={handleAddMembers}
            resetSelection={resetSelection}
            setShowAddMembers={setShowAddMembers}
            isAdmin={isAdmin}
            handleRemoveMember={(userId: string) =>
              removeMember({ groupId: group.$id, userId })
            }
            selectedAdmins={selectedAdmins}
            adminSearchTerm={adminSearchTerm}
            setAdminSearchTerm={setAdminSearchTerm}
            handleAdminSelection={handleAdminSelection}
            handleAddAdmins={handleAddAdmins}
            resetAdminSelection={resetAdminSelection}
            downgradeAdminGroup={downgradeAdminGroup}
          />
        )}
      </div>
    </div>
  );
};

export default IsMemberGroupPage;
