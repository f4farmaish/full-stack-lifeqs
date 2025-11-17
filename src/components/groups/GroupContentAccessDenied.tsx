// File: src/components/groups/GroupContentAccessDenied.tsx
// Replacement: Replace the entire file content with the following:

import { Button } from "@/components/ui/button";
import { useGetUserMembershipStatus } from "@/lib/react-query/queries";
import { useNavigate } from "react-router-dom";

interface GroupContentAccessDeniedProps {
  groupId: string;
  groupName: string;
  contentType: "post" | "poll";
}

const GroupContentAccessDenied = ({ groupId, groupName, contentType }: GroupContentAccessDeniedProps) => {
  const navigate = useNavigate();
  const { data: status, isPending: statusLoading } = useGetUserMembershipStatus(groupId);

  const handleRedirect = () => {
    navigate(`/groups/${groupId}`);
  };

  if (statusLoading) return <div className="flex items-center justify-center min-h-screen bg-dark-1 text-light-2 home-container">Loading...</div>;

  const commonClasses = "flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-dark-1 to-dark-3 text-light-1 p-8 home-container";

  if (status === "pending") {
    return (
      <div className={commonClasses}>
        <div className="bg-dark-2 p-8 rounded-xl shadow-lg max-w-md text-center">
          <h2 className="text-2xl font-bold text-primary-500 mb-4">Request Pending</h2>
          <p className="text-light-2 mb-6">Your request to join {groupName} is pending.</p>
          <div className="flex justify-center">
            <Button onClick={handleRedirect} className="shad-button_primary">
              View Group Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className={commonClasses}>
        <div className="bg-dark-2 p-8 rounded-xl shadow-lg max-w-md text-center">
          <h2 className="text-2xl font-bold text-primary-500 mb-4">Request Rejected</h2>
          <p className="text-light-2 mb-6">Your previous request was rejected.</p>
          <div className="flex justify-center">
            <Button onClick={handleRedirect} className="shad-button_primary">
              View Group Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={commonClasses}>
      <div className="bg-dark-2 p-8 rounded-xl shadow-lg max-w-md text-center">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">Private Group Content</h2>
        <p className="text-light-2 mb-6">This {contentType} is part of the private group {groupName}. You need to join the group to view this content.</p>
        <div className="flex justify-center">
          <Button onClick={handleRedirect} className="shad-button_primary">
            View Group Page
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupContentAccessDenied;