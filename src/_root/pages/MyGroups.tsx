import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import GroupCard from "@/components/groups/GroupCard";
import { Loader } from "@/components/shared";
import { useSearchContext } from "@/context/SearchContext";
import { useMutation } from "@tanstack/react-query";
import RequestModal from "@/components/groups/RequestModal";
import {
  acceptMembershipRequest,
  setPendingMembershipRequest,
  rejectMembershipRequest,
  getMembershipRequests,
} from "@/services/groupService";
import { getCurrentUser } from "@/services/authService";
import {
  useGetGroups,
  useGetMembershipRequestsByGroup,
} from "@/lib/react-query/queries";
import { useTranslation } from "react-i18next";

interface MyGroupsProps {
  currentFilter?: "joined" | "created" | "requests" | null;
  onFilterChange?: (filter: "joined" | "created" | "requests" | null) => void;
}
const MyGroups = ({ currentFilter, onFilterChange }: MyGroupsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Use parent filter state if provided, otherwise use local state
  const [localActiveTab, setLocalActiveTab] = useState<
    "all" | "joined" | "created" | "requests"
  >("all");
  const activeTab =
    currentFilter !== undefined ? currentFilter || "all" : localActiveTab;
  const setActiveTab = onFilterChange
    ? (tab: "joined" | "created" | "requests") => onFilterChange(tab)
    : (tab: "all" | "joined" | "created" | "requests") =>
        setLocalActiveTab(tab);
  const { searchValue } = useSearchContext();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedGroupRequests, setSelectedGroupRequests] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Determine container class based on route
  const isProfileRoute = location.pathname.startsWith("/profile");
  const containerClass = isProfileRoute
    ? "flex flex-col gap-4"
    : "home-container";

  // Fetch the current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  // Fetch all groups using useGetGroups
  const { data, isLoading: groupsLoading } = useGetGroups("", searchValue);
  const allGroups = data?.pages.flatMap((page) => page.documents) || [];

  // Fetch membership requests for groups where the user is an admin
  const adminGroups = allGroups.filter((group: any) =>
    group.admins.includes(currentUser?.$id)
  );
  const membershipRequestsQueries = useQueries({
    queries: adminGroups.map((group: any) => ({
      queryKey: ["membershipRequestsByGroup", group.$id],
      queryFn: () => getMembershipRequests(group.$id),
      enabled: !!currentUser && !groupsLoading,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 10,
      select: (data: { documents: any[] }) => ({
        groupId: group.$id,
        requests: data.documents || [],
      }),
    })),
  });

  const membershipRequests = membershipRequestsQueries
    .map((query) => query.data)
    .filter(
      (data): data is { groupId: string; requests: any[] } =>
        !!data && data.requests.length > 0
    );
  const adminRequestsLoading = membershipRequestsQueries.some(
    (query) => query.isLoading
  );

  // Fetch membership requests for the selected group (for modal)
  const {
    data: groupRequests = [],
    isLoading: requestsLoading,
    isError,
    error,
  } = useGetMembershipRequestsByGroup(selectedGroupId || "");

  // Calculate total pending requests
  const totalPendingRequests = useMemo(() => {
    if (
      !membershipRequestsQueries.every((query) => query.status === "success")
    ) {
      return null; // Return null if not all queries are loaded
    }
    return membershipRequestsQueries.reduce((total, query) => {
      if (query.data) {
        const pending = query.data.requests.filter(
          (req) => req.status === "pending"
        ).length;
        return total + pending;
      }
      return total;
    }, 0);
  }, [membershipRequestsQueries]);

  // Mutations for membership request actions
  const { mutateAsync: rejectRequest } = useMutation({
    mutationFn: ({
      requestId,
      adminId,
    }: {
      requestId: string;
      adminId: string;
    }) => rejectMembershipRequest({ requestId, adminId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["membershipRequestsByGroup"]);
    },
    onError: (error) => {
      console.error("Error rejecting membership request:", error);
    },
  });

  const { mutateAsync: setPendingRequest } = useMutation({
    mutationFn: (requestId: string) => setPendingMembershipRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries(["membershipRequestsByGroup"]);
    },
    onError: (error) => {
      console.error("Error setting membership request to pending:", error);
    },
  });

  const { mutateAsync: acceptRequest } = useMutation({
    mutationFn: ({
      requestId,
      groupId,
      userId,
      adminId,
    }: {
      requestId: string;
      groupId: string;
      userId: string;
      adminId: string;
    }) => acceptMembershipRequest({ requestId, groupId, userId, adminId }),
    onSuccess: () => {
      queryClient.invalidateQueries(["membershipRequestsByGroup"]);
    },
    onError: (error) => {
      console.error("Error accepting membership request:", error);
    },
  });

  // Handle opening the requests modal
  const handleOpenRequestsModal = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  // Update selectedGroupRequests when groupRequests data changes
  useEffect(() => {
    if (selectedGroupId && groupRequests.length > 0 && !requestsLoading) {
      setSelectedGroupRequests(groupRequests);
      setIsRequestModalOpen(true);
    } else if (isError) {
      console.error("Error fetching membership requests:", error);
    }
  }, [groupRequests, requestsLoading, isError, error, selectedGroupId]);

  if (
    userLoading ||
    groupsLoading ||
    (selectedGroupId && requestsLoading) ||
    adminRequestsLoading
  ) {
    return <Loader />;
  }

  const userId = currentUser?.$id;

  // Filter groups created by the user
  const myCreatedGroups = allGroups.filter((group: any) =>
    group.admins.includes(userId)
  );

  // Filter groups joined by the user
  const myJoinedGroups = allGroups.filter(
    (group: any) =>
      group.memberIds.includes(userId) && !group.admins.includes(userId)
  );

  // Filter groups where the user is an admin with pending requests
  const myAdminGroupsWithRequests = allGroups.filter((group: any) => {
    const requestsForGroup = membershipRequests.find(
      (req: any) => req.groupId === group.$id
    );
    if (!requestsForGroup) return false;
    const pendingRequests = requestsForGroup.requests.filter(
      (req: any) => req.status === "pending"
    );
    return group.admins.includes(userId) && pendingRequests.length > 0;
  });

  // All groups (joined + managed)
  const allUserGroups = allGroups.filter((group: any) =>
    group.memberIds.includes(userId)
  );

  const handleSetPendingRequest = async (requestId: string) => {
    try {
      await setPendingRequest(requestId);
      setSelectedGroupRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.$id === requestId
            ? { ...request, status: "pending" }
            : request
        )
      );
      queryClient.invalidateQueries(["membershipRequestsByGroup"]);
    } catch (error) {
      console.error("Error setting membership request to pending:", error);
    }
  };

  const handleAcceptRequest = async (
    requestId: string,
    groupId: string,
    userId: string
  ) => {
    if (!currentUser?.$id) {
      console.error("No current user found");
      return;
    }
    try {
      await acceptRequest({
        requestId,
        groupId,
        userId,
        adminId: currentUser.$id,
      });
      setSelectedGroupRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.$id === requestId
            ? { ...request, status: "accepted" }
            : request
        )
      );
      queryClient.invalidateQueries(["membershipRequestsByGroup"]);
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!currentUser?.$id) {
      console.error("No current user found");
      return;
    }
    try {
      await rejectRequest({ requestId, adminId: currentUser.$id });
      setSelectedGroupRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.$id === requestId
            ? { ...request, status: "rejected" }
            : request
        )
      );
      queryClient.invalidateQueries(["membershipRequestsByGroup"]);
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  return (
    <div className={containerClass}>
      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setSelectedGroupId(null);
        }}
        requests={selectedGroupRequests}
        handleAcceptRequest={handleAcceptRequest}
        handleRejectRequest={handleRejectRequest}
        handleSetPendingRequest={handleSetPendingRequest}
      />

      <div className="max-w-7xl mx-auto mt-5">
        <div className="flex justify-center max-w-5xl w-full mb-10 mx-auto gap-1">
          <button
            onClick={() => {
              setActiveTab("joined");
            }}
            className={`profile-tab relative flex items-center justify-center gap-1 min-w-[90px] px-2 py-1 text-sm ${
              activeTab === "joined" && "!bg-dark-3"
            }`}>
            <img
              src="/assets/icons/joined.svg"
              alt="Joined Groups"
              width={20}
              height={20}
            />
            {t("myGroups.joinedGroups")}
            {myJoinedGroups.length > 0 && (
              <span className="absolute top-[-6px] right-[-6px] bg-red-500 text-bleu-1 text-xs font-medium px-1 py-0.5 rounded-full">
                {myJoinedGroups.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("created");
            }}
            className={`profile-tab relative flex items-center justify-center gap-1 min-w-[90px] px-2 py-1 text-sm ${
              activeTab === "created" && "!bg-dark-3"
            }`}>
            <img
              src="/assets/icons/created.svg"
              alt="Managed Groups"
              width={18}
              height={18}
            />
            {t("myGroups.createdGroups")}
            {myCreatedGroups.length > 0 && (
              <span className="absolute top-[-6px] right-[-6px] bg-red-500 text-bleu-1 text-xs font-medium px-1 py-0.5 rounded-full">
                {myCreatedGroups.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("requests");
            }}
            className={`profile-tab relative flex items-center justify-center gap-1 min-w-[90px] px-2 py-1 text-sm ${
              activeTab === "requests" && "!bg-dark-3"
            }`}>
            <img
              src="/assets/icons/requests.svg"
              alt="Membership Requests"
              width={18}
              height={18}
            />
            {t("myGroups.membershipRequests")}
            {totalPendingRequests !== null && totalPendingRequests > 0 && (
              <span className="absolute top-[-6px] right-[-6px] bg-red-500 text-bleu-1 text-xs font-medium px-1 py-0.5 rounded-full">
                {totalPendingRequests}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-8 justify-center">
          {activeTab === "all" && (
            <div className="w-full">
              {allUserGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {allUserGroups.map((group: any) => (
                    <GroupCard
                      key={group.$id}
                      group={group}
                      onTitleClick={() => {
                        navigate(`/groups/${group.$id}`);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center">
                  {t("myGroups.noGroupsJoined")}
                </p>
              )}
            </div>
          )}

          {activeTab === "joined" && (
            <div className="w-full">
              {myJoinedGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {myJoinedGroups.map((group: any) => (
                    <GroupCard
                      key={group.$id}
                      group={group}
                      onTitleClick={() => {
                        navigate(`/groups/${group.$id}`);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center">
                  {t("myGroups.noGroupsJoined")}
                </p>
              )}
            </div>
          )}

          {activeTab === "created" && (
            <div className="w-full">
              {myCreatedGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {myCreatedGroups.map((group: any) => (
                    <GroupCard
                      key={group.$id}
                      group={group}
                      onTitleClick={() => {
                        navigate(`/groups/${group.$id}`);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center">
                  {t("myGroups.noGroupsCreated")}
                </p>
              )}
            </div>
          )}

          {activeTab === "requests" && (
            <div className="w-full">
              {myAdminGroupsWithRequests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {myAdminGroupsWithRequests.map((group: any) => {
                    const pendingRequests =
                      membershipRequests
                        .find((req: any) => req.groupId === group.$id)
                        ?.requests.filter(
                          (req: any) => req.status === "pending"
                        ) || [];

                    return (
                      <GroupCard
                        key={group.$id}
                        group={group}
                        onTitleClick={() => {
                          navigate(`/groups/${group.$id}`);
                        }}
                        requestCount={pendingRequests.length}
                        onRequestClick={() => {
                          handleOpenRequestsModal(group.$id);
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-center">
                  {t("myGroups.noPendingRequests")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyGroups;
