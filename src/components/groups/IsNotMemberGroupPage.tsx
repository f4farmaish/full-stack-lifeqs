import {
  useCreateMembershipRequest,
  useDeleteMembershipRequest,
  useGetPendingInvitation,
} from "@/lib/react-query/queries";
import { getCurrentUser } from "@/services/authService";
import {
  getGroupById,
  getMembershipRequests,
  acceptGroupInvitation,
  declineGroupInvitation,
} from "@/services/groupService";
import { getUserById } from "@/services/userService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import ShareButtons from "@/components/shared/ShareButtons";

const IsNotMemberGroupPage = ({ group }: { group: any }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync: createMembershipRequest } = useCreateMembershipRequest();
  const { mutateAsync: deleteMembershipRequest } = useDeleteMembershipRequest();
  const { toast } = useToast();
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  // Fetch updated group data
  const { data: updatedGroup } = useQuery({
    queryKey: ["group", group.$id],
    queryFn: () => getGroupById(group.$id),
    enabled: !!currentUser,
  });

  // Check if user is still a member
  const isStillMember = updatedGroup?.memberIds?.includes(currentUser?.$id);

  // Fetch membership requests
  const { data: membershipRequests } = useQuery({
    queryKey: ["membershipRequests", group.$id, currentUser?.$id],
    queryFn: () => getMembershipRequests(group.$id),
    enabled: !!currentUser && !isStillMember,
  });

  // Fetch pending invitation
  const { data: pendingInvitation } = useGetPendingInvitation(
    group.$id,
    currentUser?.$id || "",
    !!currentUser && !isStillMember
  );

  // Get the last membership request for the current user
  const lastRequest = membershipRequests?.documents
    ?.filter((request: any) => request.userId[0] === currentUser?.$id)
    ?.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

  const isPending = lastRequest?.status === "pending";
  const isRejected = lastRequest?.status === "rejected";
  const rejectionDate = isRejected ? new Date(lastRequest.createdAt) : null;
  const now = new Date();
  const diffInDays = rejectionDate
    ? Math.floor(
        (now.getTime() - rejectionDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [adminDetails, setAdminDetails] = useState<any[]>([]);

  const shareUrl = `${window.location.origin}/groups/${group.$id}`;
  const shareContent = `Join the group "${group.name}" on our platform! ${
    group.description ? group.description.slice(0, 100) + "..." : ""
  }`;

  const handleCopyLink = (url: string, itemId: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({ title: "Link copied to clipboard!" });
      })
      .catch((err) => {
        console.error(`Failed to copy link for group ${itemId}:`, err);
        toast({ variant: "destructive", title: "Failed to copy link." });
      });
  };

  const handleToggleShare = () => {
    setIsShareOpen((prev) => !prev);
  };

  // Utility function to truncate group title to 10 words
  const truncateTitle = (title: string): string => {
    const words = title.trim().split(/\s+/);
    if (words.length <= 10) return title;
    return words.slice(0, 10).join(" ") + "...";
  };

  // Handle requesting to join the group
  const handleRequestToJoin = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return alert("You must be logged in to request to join a group.");
      }

      const updatedGroup = await getGroupById(group.$id);
      if (updatedGroup.memberIds.includes(currentUser.$id)) {
        return alert("You are already a member of this group.");
      }

      if (isPending) {
        return alert("You have already sent a membership request.");
      }
      if (isRejected && diffInDays < 14) {
        return alert(
          `Your last request was rejected. Please wait ${
            14 - diffInDays
          } more days or contact an admin.`
        );
      }

      await createMembershipRequest({
        groupId: [group.$id],
        userId: [currentUser.$id],
      });
      alert("Your request will be sent to group admins.");
    } catch (error: any) {
      console.error("Error submitting membership request:", error);
      const errorMessage =
        error?.message || "Failed to submit your request. Please try again.";
      if (errorMessage.includes("You must wait 2 weeks")) {
        alert(
          `You must wait ${
            14 - diffInDays
          } more days before sending a new request.`
        );
      } else {
        alert(errorMessage);
      }
    }
  };

  // Handle canceling a membership request
  const handleCancelRequest = async () => {
    try {
      if (!isPending) {
        return alert("No pending request found.");
      }
      await deleteMembershipRequest(lastRequest.$id);
      alert("Your request has been cancelled.");
    } catch (error) {
      console.error("Error cancelling membership request:", error);
      alert("Failed to cancel your request. Please try again.");
    }
  };

  // Handle accepting an invitation
  const handleAcceptInvitation = async () => {
    if (!pendingInvitation || !currentUser) {
      console.error("No pending invitation or user not found.");
      return alert("No pending invitation found.");
    }
    try {
      await acceptGroupInvitation(pendingInvitation.$id, currentUser.$id);
      navigate(`/groups/${group.$id}`);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      alert("Failed to accept invitation. Please try again.");
    }
  };

  // Handle declining an invitation
  const handleDeclineInvitation = async () => {
    if (!pendingInvitation || !currentUser) {
      console.error("No pending invitation or user not found.");
      return alert("No pending invitation found.");
    }
    try {
      await declineGroupInvitation(pendingInvitation.$id, currentUser.$id);
      queryClient.invalidateQueries([
        "groupInvitation",
        group.$id,
        currentUser.$id,
      ]);
      alert("Invitation declined.");
    } catch (error) {
      console.error("Error declining invitation:", error);
      alert("Failed to decline invitation. Please try again.");
    }
  };

  // Fetch admin details
  useEffect(() => {
    const fetchAdmins = async () => {
      if (group?.admins?.length > 0) {
        const adminsData = await Promise.all(
          group.admins.map(async (adminId: string) => {
            try {
              const user = await getUserById(adminId);
              return user;
            } catch (error) {
              console.error(
                "Error fetching admin details for ID:",
                adminId,
                error
              );
              return null;
            }
          })
        );
        setAdminDetails(adminsData.filter(Boolean));
      }
    };
    fetchAdmins();
  }, [group.admins]);

  return (
    <div className="w-full bg-gradient-to-br from-dark-2 via-dark-3 to-dark-4 flex items-center justify-center px-4 sm:px-8 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row bg-dark-1 rounded-xl shadow-2xl overflow-hidden max-w-7xl w-full relative">
        {/* Left Section (Main Content) */}
        <div className="lg:w-2/3 p-6 sm:p-10 flex flex-col justify-between">
          {group.imageUrl ? (
            <div className="w-full h-48 relative overflow-hidden rounded-t-xl mb-4">
              <img
                src={group.imageUrl}
                alt={group.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <img
                  src="/assets/icons/share.svg"
                  alt="share"
                  width={32}
                  height={32}
                  className="cursor-pointer bg-dark-3/80 rounded-full p-1 hover:bg-dark-4/90 transition-colors"
                  onClick={handleToggleShare}
                />
                {isShareOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-dark-2 rounded-lg shadow-lg p-2 border border-dark-4">
                    <ShareButtons
                      shareUrl={shareUrl}
                      shareContent={shareContent}
                      handleCopyLink={handleCopyLink}
                      postId={group.$id}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-end mb-4 w-full">
              <img
                src="/assets/icons/share.svg"
                alt="share"
                width={32}
                height={32}
                className="cursor-pointer bg-dark-3/80 rounded-full p-1 hover:bg-dark-4/90 transition-colors"
                onClick={handleToggleShare}
              />
              {isShareOpen && (
                <div className="mt-2 bg-dark-2 rounded-lg shadow-lg p-2 border border-dark-4">
                  <ShareButtons
                    shareUrl={shareUrl}
                    shareContent={shareContent}
                    handleCopyLink={handleCopyLink}
                    postId={group.$id}
                  />
                </div>
              )}
            </div>
          )}
          {/* Category + SubCategory Display */}
          {(group?.categoryName || group?.subCategory) && (
            <p
              className="text-xs font-bold text-light-3 mb-3 sm:mb-4 cursor-pointer hover:underline hover:text-purple-400 uppercase tracking-wide"
              onClick={() => {
                const categoryId =
                  typeof group.categoryId === "object"
                    ? group.categoryId.$id
                    : group.categoryId;

                if (categoryId && group.subCategory) {
                  navigate("/groups", {
                    state: {
                      categoryId,
                      subCategory: group.subCategory,
                    },
                  });
                }
              }}
            >
              {typeof group.categoryId === "object"
                ? group.categoryId.name
                : group.categoryName || "Unknown Category"}
              {group.subCategory ? ` / ${group.subCategory}` : ""}
            </p>
          )}

          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary-500 mb-3 sm:mb-4">
              {group?.name
                ? showFullTitle
                  ? group.name
                  : truncateTitle(group.name)
                : "Welcome to the Group"}
            </h1>
            {group?.name && group.name.trim().split(/\s+/).length > 10 && (
              <p
                className="text-primary-500 hover:underline cursor-pointer mb-3 sm:mb-4"
                onClick={() => setShowFullTitle(!showFullTitle)}
              >
                {showFullTitle ? "Show Less" : "Read More"}
              </p>
            )}
          </div>

          <div>
            <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-3 sm:mb-4">
              {showFullDescription ||
              !group.description ||
              group.description.length <= 300
                ? group.description ||
                  "Join our community to engage in meaningful discussions."
                : `${group.description.slice(0, 300)}...`}
            </p>
            {group.description && group.description.length > 300 && (
              <p
                className="text-primary-500 hover:underline cursor-pointer mb-3 sm:mb-4"
                onClick={() => setShowFullDescription(!showFullDescription)}
              >
                {showFullDescription ? "Show Less" : "Read More"}
              </p>
            )}
          </div>

          {/* Member Count Display */}
          {updatedGroup && updatedGroup.memberIds.length > 10 && (
            <p className="text-bleu-1 text-base mb-3 sm:mb-4">
              {updatedGroup.memberIds.length} members
            </p>
          )}

          {/* Tags Display */}
          {group?.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
              {group.tags.map((tag: string) => (
                <span
                  key={tag}
                  onClick={() =>
                    navigate(`/groups?tag=${encodeURIComponent(tag)}`)
                  }
                  className="cursor-pointer text-xs font-medium text-primary-500 bg-dark-4 px-3 py-1 rounded-full tracking-wide hover:bg-primary-600 hover:text-white transition duration-150 ease-in-out"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Conditional Button Rendering */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {pendingInvitation ? (
              <>
                <button
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-transform font-semibold text-base sm:text-lg"
                  onClick={handleAcceptInvitation}
                >
                  Accept
                </button>
                <button
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-transform font-semibold text-base sm:text-lg"
                  onClick={handleDeclineInvitation}
                >
                  Decline
                </button>
                <p className="text-gray-400 text-xs sm:text-sm">
                  You have been invited to join this group.
                </p>
              </>
            ) : isPending ? (
              <>
                <button
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-transform font-semibold text-base sm:text-lg"
                  onClick={handleCancelRequest}
                >
                  Cancel Request
                </button>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Your request is pending approval.
                </p>
              </>
            ) : (
              <>
                <button
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-lg hover:scale-105 hover:shadow-xl transition-transform font-semibold text-base sm:text-lg"
                  onClick={handleRequestToJoin}
                >
                  Request to Join
                </button>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Join the group to unlock discussions and more!
                </p>
              </>
            )}
          </div>
        </div>

        {/* Right Section (Admin Info - Blue Zone) */}
        {adminDetails.length > 0 && (
          <div className="lg:w-1/3 bg-dark-1 border-t lg:border-t-0 lg:border-l border-dark-4 pt-4 sm:pt-6 px-4 sm:px-6 pb-6 sm:pb-8 flex flex-col items-start justify-start relative">
            <h2 className="text-xl sm:text-2xl font-semibold text-light-3 mb-3 sm:mb-4 ml-1 tracking-widest">
              Group Admins
            </h2>
            <div className="w-full flex flex-col gap-3 sm:gap-4">
              {adminDetails.map((admin) => (
                <a
                  key={admin.$id}
                  href={`/profile/${admin.$id}`}
                  className="flex items-center gap-3 p-2 hover:bg-dark-3 rounded-md transition-colors"
                >
                  <img
                    src={
                      admin.imageUrl || "/assets/icons/profile-placeholder.svg"
                    }
                    alt={admin.name}
                    className="w-8 sm:w-9 h-8 sm:h-9 rounded-full object-cover"
                  />
                  <span className="text-white text-sm font-medium truncate">
                    {admin.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IsNotMemberGroupPage;