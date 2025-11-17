import { useState } from "react";
import {
  useGetCurrentUser,
  useCreateGroupInvitation,
} from "@/lib/react-query/queries";
import { useQueryClient } from "@tanstack/react-query";

// Define interfaces for type safety
interface Group {
  $id: string;
  creatorId: string;
  admins: string[];
  memberIds: string[];
  memberNames: string[];
  memberImages: string[];
  [key: string]: any;
}

interface User {
  $id: string;
  name: string;
  imageUrl?: string;
}

interface MembersModalProps {
  group: Group;
  usersNotInGroup: User[];
  selectedUsers: string[];
  modalSearchTerm: string;
  setModalSearchTerm: (term: string) => void;
  handleUserSelection: (userId: string) => void;
  handleAddMembers: () => void;
  resetSelection: () => void;
  setShowAddMembers: (show: boolean) => void;
  isAdmin: boolean;
  handleRemoveMember: (userId: string) => void;
  selectedAdmins: string[];
  adminSearchTerm: string;
  setAdminSearchTerm: (term: string) => void;
  handleAdminSelection: (userId: string) => void;
  handleAddAdmins: () => void;
  resetAdminSelection: () => void;
  downgradeAdminGroup: (data: { groupId: string; adminId: string }) => void;
}

const MembersModal = ({
  group,
  usersNotInGroup,
  selectedUsers,
  modalSearchTerm,
  setModalSearchTerm,
  handleUserSelection,
  resetSelection,
  setShowAddMembers,
  isAdmin,
  handleRemoveMember,
  selectedAdmins,
  adminSearchTerm,
  setAdminSearchTerm,
  handleAdminSelection,
  handleAddAdmins,
  resetAdminSelection,
  downgradeAdminGroup,
}: MembersModalProps) => {
  const [activeTab, setActiveTab] = useState<
    "viewMembers" | "inviteMembers" | "manageAdmins"
  >("viewMembers");
  const { data: currentUser } = useGetCurrentUser();
  const { mutate: createInvitation } = useCreateGroupInvitation();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Filter out users who are already admins for the Manage Admins tab
  const membersNotAdmins = group.memberIds.filter(
    (memberId: string) => !group.admins.includes(memberId)
  );

  const handleSendInvitations = () => {
    if (currentUser && selectedUsers.length > 0) {
      createInvitation(
        {
          groupId: group.$id,
          inviteeIds: selectedUsers,
          inviterId: currentUser.$id,
        },
        {
          onSuccess: () => {
            setSuccessMessage("Invitations sent successfully.");
            // Invalidate specific query to reload usersNotInGroup (excludes new pending invites)
            queryClient.invalidateQueries({ queryKey: ["usersNotInGroup", group.$id] });
            resetSelection();
            // Close modal after delay for message visibility
            setTimeout(() => {
              setShowAddMembers(false);
              setSuccessMessage(""); // Clear on close
            }, 1500);
          },
          onError: (error) => {
            console.error("[DEBUG] Error sending invitations:", error); // Debug log
            // Optional: Set error message state if needed (not in request)
          },
        }
      );
    } else {
      console.warn(
        "Cannot send invitations: No users selected or currentUser missing"
      ); // Debug log
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center pt-20 z-50">
      <div className="bg-dark-2 p-6 rounded-lg w-full max-w-4xl shadow-xl relative border border-dark-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">Manage Members</h2>
          <button
            onClick={() => {
              resetSelection();
              resetAdminSelection();
              setShowAddMembers(false);
            }}
            className="text-white text-2xl hover:text-gray-400 transition-all duration-200"
            aria-label="Close Modal">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => {
              setActiveTab("viewMembers");
            }}
            className={`flex-1 py-2 text-center text-white ${
              activeTab === "viewMembers"
                ? "border-b-2 border-primary-500"
                : "opacity-50"
            } transition-all duration-300`}>
            View Members
          </button>
          <button
            onClick={() => {
              setActiveTab("inviteMembers");
            }}
            className={`flex-1 py-2 text-center text-white ${
              activeTab === "inviteMembers"
                ? "border-b-2 border-primary-500"
                : "opacity-50"
            } transition-all duration-300`}>
            Invite Members
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab("manageAdmins");
              }}
              className={`flex-1 py-2 text-center text-white ${
                activeTab === "manageAdmins"
                  ? "border-b-2 border-primary-500"
                  : "opacity-50"
              } transition-all duration-300`}>
              Manage Admins
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === "viewMembers" ? (
            // View Members Tab
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {group.memberIds.length > 0 ? (
                (() => {
                  const sortedMemberIds = group.memberIds.slice().sort((a, b) => {
                    const aIndex = group.memberIds.indexOf(a);
                    const bIndex = group.memberIds.indexOf(b);
                    const isACreator = String(a) === String(group.creatorId);
                    const isBCreator = String(b) === String(group.creatorId);
                    const isAAdmin = group.admins.includes(a);
                    const isBAdmin = group.admins.includes(b);
                    if (isACreator && !isBCreator) return -1;
                    if (!isACreator && isBCreator) return 1;
                    if (isAAdmin && !isBAdmin) return -1;
                    if (!isAAdmin && isBAdmin) return 1;
                    return aIndex - bIndex;
                  });
                  return sortedMemberIds.map((memberId: string) => {
                    const isAdminMember = group.admins.includes(memberId);
                    const isCreator =
                      String(memberId) === String(group.creatorId);
                    const currentUserIsCreator =
                      String(currentUser?.$id) === String(group.creatorId);
                    const roleLabel = isCreator ? "Creator" : isAdminMember ? "Admin" : "Member";

                  

                    return (
                      <div
                        key={memberId}
                        className="flex justify-between items-center gap-3 p-3 bg-dark-3 rounded-lg hover:bg-dark-4 transition-all">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              group.memberImages[
                                group.memberIds.indexOf(memberId)
                              ] || "/assets/icons/profile-placeholder.svg"
                            }
                            alt="Member"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <p className="text-white">
                            {group.memberNames[
                              group.memberIds.indexOf(memberId)
                            ] || memberId}
                            <span className="text-sm text-light-4 ml-2">
                              ({roleLabel})
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {currentUserIsCreator &&
                            isAdminMember &&
                            !isCreator && (
                              <button
                                onClick={() => {
                                  downgradeAdminGroup({
                                    groupId: group.$id,
                                    adminId: memberId,
                                  });
                                }}
                                className="hover:opacity-80 transition-opacity text-red-500 text-sm font-semibold">
                                Downgrade to Member
                              </button>
                            )}
                          {isAdmin && !isAdminMember && !isCreator && (
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to delete this member?"
                                  )
                                ) {
                            
                                  handleRemoveMember(memberId);
                                }
                              }}
                              className="hover:opacity-80 transition-opacity"
                              aria-label="Delete Member">
                              <img
                                src="/assets/icons/delete.svg"
                                alt="delete"
                                width={24}
                                height={24}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="text-gray-400 text-center">No members yet.</p>
              )}
            </div>
          ) : activeTab === "inviteMembers" ? (
            // Invite Members Tab
            <>
              {/* Search & Selected Users */}
              <div className="w-full mb-4 relative">
                <div className="flex flex-wrap items-center bg-dark-3 text-white rounded-full p-2 gap-2">
                  {selectedUsers.map((userId) => {
                    const user = usersNotInGroup.find((u) => u.$id === userId);
                    return (
                      user && (
                        <div
                          key={userId}
                          className="bg-primary-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
                          <img
                            src={
                              user?.imageUrl ||
                              "/assets/icons/profile-placeholder.svg"
                            }
                            alt="User"
                            className="w-6 h-6 rounded-full"
                          />
                          {user?.name}
                          <button
                            onClick={() => {
                              handleUserSelection(userId);
                            }}
                            className="text-white hover:text-gray-300">
                            ×
                          </button>
                        </div>
                      )
                    );
                  })}
                  <input
                    type="text"
                    placeholder="Search for users..."
                    className="flex-1 bg-transparent outline-none px-2 py-1"
                    value={modalSearchTerm}
                    onChange={(e) => {
                      setModalSearchTerm(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* User List */}
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {usersNotInGroup.length > 0 ? (
                  usersNotInGroup
                    .filter((user) =>
                      user.name
                        .toLowerCase()
                        .includes(modalSearchTerm.toLowerCase())
                    )
                    .map((user) => (
                      <div
                        key={user.$id}
                        className={`flex justify-between items-center p-2 rounded cursor-pointer transition-all ${
                          selectedUsers.includes(user.$id)
                            ? "bg-dark-4 text-white"
                            : "hover:bg-dark-4"
                        }`}
                        onClick={() => {
                          handleUserSelection(user.$id);
                        }}>
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              user.imageUrl ||
                              "/assets/icons/profile-placeholder.svg"
                            }
                            alt="User"
                            className="w-10 h-10 rounded-full"
                          />
                          <p className="text-white">{user.name}</p>
                        </div>
                        {selectedUsers.includes(user.$id) && (
                          <span className="text-sm text-blue-300 font-semibold">
                            Selected
                          </span>
                        )}
                      </div>
                    ))
                ) : (
                  <p className="text-gray-400 text-center">No users found.</p>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    handleSendInvitations();
                  }}
                  disabled={selectedUsers.length === 0 || !currentUser}
                  className={`px-4 py-2 text-white bg-primary-500 rounded-lg ${
                    selectedUsers.length === 0 || !currentUser
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-primary-600"
                  }`}>
                  Send Invitations
                </button>
              </div>

              {successMessage && (
                <div className="mt-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-100 animate-fade-in">
                  {successMessage}
                </div>
              )}
            </>
          ) : (
            // Manage Admins Tab
            <>
              {/* Search & Selected Admins */}
              <div className="w-full mb-4 relative">
                <div className="flex flex-wrap items-center bg-dark-3 text-white rounded-full p-2 gap-2">
                  {selectedAdmins.map((userId) => {
                    const user = group.memberIds.includes(userId)
                      ? {
                          $id: userId,
                          name: group.memberNames[
                            group.memberIds.indexOf(userId)
                          ],
                          imageUrl:
                            group.memberImages[group.memberIds.indexOf(userId)],
                        }
                      : null;
                    return (
                      user && (
                        <div
                          key={userId}
                          className="bg-primary-500 text-white px-3 py-1 rounded-full flex items-center gap-2">
                          <img
                            src={
                              user.imageUrl ||
                              "/assets/icons/profile-placeholder.svg"
                            }
                            alt="User"
                            className="w-6 h-6 rounded-full"
                          />
                          {user.name}
                          <button
                            onClick={() => {
                              handleAdminSelection(userId);
                            }}
                            className="text-white hover:text-gray-300">
                            ×
                          </button>
                        </div>
                      )
                    );
                  })}
                  <input
                    type="text"
                    placeholder="Search for members..."
                    className="flex-1 bg-transparent outline-none px-2 py-1"
                    value={adminSearchTerm}
                    onChange={(e) => {
                      setAdminSearchTerm(e.target.value);
                    }}
                  />
                </div>
              </div>

              {/* List of Users to Select as Admins */}
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {membersNotAdmins.length > 0 ? (
                  (() => {
                    const sortedMembersNotAdmins = membersNotAdmins.slice().sort((a, b) => {
                      return group.memberIds.indexOf(a) - group.memberIds.indexOf(b);
                    });
                    return sortedMembersNotAdmins
                      .filter(
                        (id: string) =>
                          group.memberNames[group.memberIds.indexOf(id)]
                            ?.toLowerCase()
                            .includes(adminSearchTerm.toLowerCase())
                      )
                      .map((userId: string) => {
                        const user = {
                          $id: userId,
                          name: group.memberNames[
                            group.memberIds.indexOf(userId)
                          ],
                          imageUrl:
                            group.memberImages[group.memberIds.indexOf(userId)],
                        };
                        return (
                          <div
                            key={user.$id}
                            className={`flex justify-between items-center p-2 rounded cursor-pointer transition-all ${
                              selectedAdmins.includes(user.$id)
                                ? "bg-dark-4 text-white"
                                : "hover:bg-dark-4"
                            }`}
                            onClick={() => {
                              handleAdminSelection(user.$id);
                            }}>
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  user.imageUrl ||
                                  "/assets/icons/profile-placeholder.svg"
                                }
                                alt="User"
                                className="w-10 h-10 rounded-full"
                              />
                              <p className="text-white">{user.name}</p>
                            </div>
                            {selectedAdmins.includes(user.$id) && (
                              <span className="text-sm text-blue-300 font-semibold">
                                Selected
                              </span>
                            )}
                          </div>
                        );
                      });
                  })()
                ) : (
                  <p className="text-gray-400 text-center">No members found.</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    handleAddAdmins();
                  }}
                  disabled={selectedAdmins.length === 0}
                  className={`px-4 py-2 text-white bg-primary-500 rounded-lg ${
                    selectedAdmins.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-primary-600"
                  }`}>
                  Confirm Admins
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersModal;