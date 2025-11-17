import { useState } from "react";

const AdminsModal = ({
  group,
  selectedAdmins,
  modalSearchTerm,
  setModalSearchTerm,
  handleAdminSelection,
  handleAddAdmins,
  resetSelection,
  setShowManageAdmins,
}: {
  group: any;
  selectedAdmins: string[];
  modalSearchTerm: string;
  setModalSearchTerm: (term: string) => void;
  handleAdminSelection: (userId: string) => void;
  handleAddAdmins: () => void;
  resetSelection: () => void;
  setShowManageAdmins: (show: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState<"viewAdmins" | "manageAdmins">(
    "viewAdmins"
  );

  // Filter out users who are already admins
  const membersNotAdmins = group.memberIds.filter(
    (memberId: string) => !group.admins.includes(memberId)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
      <div className="bg-dark-2 p-6 rounded-lg w-full max-w-4xl shadow-xl relative border border-dark-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">Manage Admins</h2>
          <button
            onClick={() => {
              resetSelection();
              setShowManageAdmins(false);
            }}
            className="text-white text-2xl hover:text-gray-400 transition-all duration-200"
            aria-label="Close Modal">
            &times;
          </button>
        </div>

        {/* Tabs for Viewing & Managing Admins */}
        <div className="flex border-b border-gray-600">
          <button
            onClick={() => setActiveTab("viewAdmins")}
            className={`flex-1 py-2 text-center text-white ${
              activeTab === "viewAdmins"
                ? "border-b-2 border-primary-500"
                : "opacity-50"
            } transition-all duration-300`}>
            View Admins
          </button>
          <button
            onClick={() => setActiveTab("manageAdmins")}
            className={`flex-1 py-2 text-center text-white ${
              activeTab === "manageAdmins"
                ? "border-b-2 border-primary-500"
                : "opacity-50"
            } transition-all duration-300`}>
            Manage Admins
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === "viewAdmins" ? (
            // View Admins Tab
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {group.admins.length > 0 ? (
                group.admins.map((adminId: string) => (
                  <div
                    key={adminId}
                    className="flex justify-between items-center p-3 bg-dark-3 rounded-lg hover:bg-dark-4 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          group.memberImages[
                            group.memberIds.indexOf(adminId)
                          ] || "/assets/icons/profile-placeholder.svg"
                        }
                        alt="Admin"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <p className="text-white">
                        {group.memberNames[group.memberIds.indexOf(adminId)] ||
                          adminId}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center">
                  No admins assigned yet.
                </p>
              )}
            </div>
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
                            onClick={() => handleAdminSelection(userId)}
                            className="text-white hover:text-gray-300">
                            &times;
                          </button>
                        </div>
                      )
                    );
                  })}
                  <input
                    type="text"
                    placeholder="Search for members..."
                    className="flex-1 bg-transparent outline-none px-2 py-1"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* List of Users to Select as Admins */}
              {membersNotAdmins.length > 0 ? (
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {membersNotAdmins
                    .filter((id: string) =>
                      group.memberNames[group.memberIds.indexOf(id)]
                        .toLowerCase()
                        .includes(modalSearchTerm.toLowerCase())
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
                          onClick={() => handleAdminSelection(user.$id)}>
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
                              Added
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-400 text-center">No members found.</p>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={handleAddAdmins}
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

export default AdminsModal;
