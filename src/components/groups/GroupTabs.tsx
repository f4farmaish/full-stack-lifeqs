import { Dispatch, SetStateAction } from "react";
import GridPostList from "@/components/shared/GridPostList";
import RequestsTab from "./RequestsTab";
import { useGetEffectiveMembers } from "@/lib/react-query/queries";

// Interface for typing props
interface GroupTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  posts: any[];
  group: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setShowAddMembers: (show: boolean) => void;
  currentUserId: string;
  handleLeaveGroup: () => void;
  selectedType: null | "post" | "poll";
  setSelectedType: Dispatch<SetStateAction<null | "post" | "poll">>;
}

const GroupTabs = ({
  activeTab,
  setActiveTab,
  isAdmin,
  posts,
  group,
  searchTerm,
  setSearchTerm,
  setShowAddMembers,
  currentUserId,
  handleLeaveGroup,
  selectedType,
  setSelectedType,
}: GroupTabsProps) => {
  // Fetch effective members using React Query
  const { data: effectiveMembers, isLoading } = useGetEffectiveMembers(
    group.$id,
    isAdmin
  );

  // Handle filter change to synchronize with parent state
  const handleFilterChange = (type: null | "post" | "poll") => {
    setSelectedType(type);
  };

  // Filter posts based on selected type
  const filteredItems = posts.filter((item) => {
    if (selectedType === "post") return item.type === "post";
    if (selectedType === "poll") return item.type === "poll";
    return true; // Show all posts by default
  });

  // Filter effective members based on the search term
  const filteredMembers =
    effectiveMembers?.filter((member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <>
      <div className="relative flex justify-center gap-6 mb-6 border-b border-gray-600">
        <div className="flex gap-6">
          {/* Buttons for Questions and Polls filters in the tab bar */}
          <button
            onClick={() => {
              setActiveTab("posts");
              handleFilterChange("post");
            }}
            className={`px-6 py-3 text-lg font-semibold border-b-2 leading-none ${
              activeTab === "posts" && selectedType === "post"
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:border-gray-500"
            } transition-all`}>
            Questions
          </button>
          <button
            onClick={() => {
              setActiveTab("posts");
              handleFilterChange("poll");
            }}
            className={`px-6 py-3 text-lg font-semibold border-b-2 leading-none ${
              activeTab === "posts" && selectedType === "poll"
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:border-gray-500"
            } transition-all`}>
            Polls
          </button>
          <button
            onClick={() => {
              setActiveTab("members");
              handleFilterChange(null); // Reset filter when switching tabs
            }}
            className={`px-6 py-3 text-lg font-semibold border-b-2 leading-none ${
              activeTab === "members"
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:border-gray-500"
            } transition-all`}>
            Members ({group.memberIds.length})
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab("requests");
                handleFilterChange(null); // Reset filter when switching tabs
              }}
              className={`px-6 py-3 text-lg font-semibold border-b-2 leading-none ${
                activeTab === "requests"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:border-gray-500"
              } transition-all`}>
              Requests
            </button>
          )}
        </div>
        {/* Updated Leave Group Button - More subtle styling */}
        <button
          onClick={handleLeaveGroup}
          className="absolute right-0 top-0 flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-red-400 bg-dark-3/50 hover:bg-dark-4/70 rounded-lg transition-all duration-300"
          aria-label="Leave the Group">
          <img
            src="/assets/icons/door.svg"
            alt="leave"
            width={20}
            height={20}
            className="opacity-60 hover:opacity-100 transition-opacity"
          />
        </button>
      </div>

      {/* Display filtered posts */}
      {activeTab === "posts" && (
        <div className="pt-7 flex flex-col gap-6 w-full max-w-screen-lg mx-auto justify-center">
          <GridPostList
            items={filteredItems}
            groupId={group.$id}
            showUser={true}
            showStats={true}
          />
        </div>
      )}
      {activeTab === "members" && (
        <div className="flex flex-col items-center mt-6 w-full">
          <div className="w-full max-w-screen-md flex justify-between items-center mb-6">
            <input
              type="text"
              placeholder="Search members..."
              className="flex-1 px-4 py-2 bg-dark-3 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 mr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isAdmin && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-transform font-semibold text-sm">
                Manage Members
              </button>
            )}
          </div>
          <div className="w-full max-w-screen-md flex flex-col gap-3">
            {isLoading ? (
              <p className="text-gray-400">Loading members...</p>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map(
                (member: {
                  id: string;
                  name: string;
                  image: string;
                  role: string;
                }) => {
                  return (
                    <a
                      key={member.id}
                      href={`/profile/${member.id}`}
                      className="flex items-center gap-4 py-2 hover:bg-dark-3 rounded-lg px-2 transition">
                      <img
                        src={member.image}
                        alt="User"
                        className="w-12 h-12 rounded-full border border-blue-500"
                      />
                      <p className="text-base font-semibold text-white">
                        {member.name}
                        <span className="text-sm text-gray-400 ml-2">
                          ({member.role})
                        </span>
                      </p>
                    </a>
                  );
                }
              )
            ) : (
              <p className="text-gray-400">No members found.</p>
            )}
          </div>
        </div>
      )}
      {activeTab === "requests" && isAdmin ? (
        <RequestsTab groupId={group.$id} adminId={currentUserId} />
      ) : (
        activeTab === "requests" && (
          <div className="text-gray-400 text-center mt-6">
            You do not have permission to view this section.
          </div>
        )
      )}
    </>
  );
};

export default GroupTabs;