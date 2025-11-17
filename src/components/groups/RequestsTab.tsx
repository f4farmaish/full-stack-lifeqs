import {
  useGetMembershipRequests,
  useAcceptMembershipRequest,
  useRejectMembershipRequest,
  useSetPendingMembershipRequest,
} from "@/lib/react-query/queries";
import MembershipRequestsTable from "@/components/groups/MembershipRequestsTable";
import { Loader } from "@/components/shared";

const RequestsTab = ({ groupId, adminId }: { groupId: string; adminId: string }) => {
  const { data, isLoading, error } = useGetMembershipRequests(groupId);
  const acceptRequestMutation = useAcceptMembershipRequest();
  const rejectRequestMutation = useRejectMembershipRequest();
  const setPendingRequestMutation = useSetPendingMembershipRequest();

  const requests = data?.documents ?? [];

  const handleAcceptRequest = (
    requestId: string,
    groupId: string,
    userId: string
  ) => {
    acceptRequestMutation.mutate({ requestId, groupId, userId, adminId });
  };

  const handleRejectRequest = (requestId: string) => {
    rejectRequestMutation.mutate({ requestId, adminId });
  };

  const handleSetPendingRequest = (requestId: string) => {
    setPendingRequestMutation.mutate(requestId);
  };

  if (isLoading) {
    return (
      <div className="text-white text-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center">Error loading requests.</p>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen w-full mt-[-100px]">
      <MembershipRequestsTable
        requests={requests}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
        onSetPendingRequest={handleSetPendingRequest}
      />
    </div>
  );
};

export default RequestsTab;