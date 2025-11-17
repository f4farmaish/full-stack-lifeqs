import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useGetPollById,
  useVoteOnPoll,
  useGetCommentsByPostId,
  useGetUserVotesForPoll,
  useGetGroupById,
  useSuperLikePoll,
  useSimpleLikePoll,
  useDeletePoll,
  usePublishPoll,
} from "@/lib/react-query/queries";
import { Loader } from "@/components/shared";
import PollCardDetails from "@/components/shared/PollCardDetails";
import { useState, useEffect, useMemo, useRef } from "react";
import { useUserContext } from "@/context/AuthContext";
import CommentList from "@/components/comments/CommentList";
import CommentForm from "@/components/comments/CommentForm";
import { IPoll, IUser } from "@/types";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getUserLevelFromPoints } from "@/lib/levelUtils";
import { UserAction } from "@/lib/pointsMapping";
import {
  updateUserLevelAndPoints,
  incrementSuperLikesToday,
  incrementSimpleLikesToday,
} from "@/services/userService";
import GroupContentAccessDenied from "@/components/groups/GroupContentAccessDenied";
import ReactionButtons from "@/components/post/ReactionButtons";
import DraftControls from "@/components/post/DraftControls";
import GreatButton from "@/components/post/GreatButton";
import StickyHeader from "@/components/post/StickyHeader";
import { useScrollDetector } from "@/hooks/useScrollDetector";

interface UserContext {
  user: IUser;
  setUser: React.Dispatch<React.SetStateAction<IUser>>;
  isAuthenticated: boolean;
}

const PollDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { user, setUser, isAuthenticated } =
    useUserContext() as unknown as UserContext;

  // Fetch poll data
  const { data: poll, isLoading: isPollLoading } = useGetPollById(id);
  const groupId: string | undefined = poll?.groupIdString ?? undefined;
  const { data: group, isLoading: isGroupLoading } = useGetGroupById(groupId);
  const { data: userVotes = [], isLoading: isVotesLoading } =
    useGetUserVotesForPoll(user?.id || "", id || "");
  const { data: comments } = useGetCommentsByPostId(id || "", true);

  // State for reactions and voting
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [isSuperLiked, setIsSuperLiked] = useState(false);
  const [isSimpleLiked, setIsSimpleLiked] = useState(false);

  const commentFormRef = useRef<HTMLDivElement>(null);
  const { isVisible: isStickyHeaderVisible } = useScrollDetector({
    threshold: 1,
    scrollThreshold: 200,
    hideOnScrollUp: true,
  });


  // Mutations for reactions and draft actions
  const { mutate: superLikePoll, isLoading: isSuperLiking } =
    useSuperLikePoll();
  const { mutate: simpleLikePoll, isLoading: isSimpleLiking } =
    useSimpleLikePoll();
  const { mutate: voteOnPoll } = useVoteOnPoll();
  const { mutate: publishPollMutation, isLoading: isPublishing } =
    usePublishPoll();
  const { mutate: deletePollMutation, isLoading: isDeleting } = useDeletePoll();

  // Update reaction states
  useEffect(() => {
    if (poll && user?.id) {
      setIsSuperLiked(poll.superLikedBy?.includes(user.id) || false);
      setIsSimpleLiked(poll.simpleLikedBy?.includes(user.id) || false);
    }
  }, [poll, user?.id]);

  // Calculate if comments are locked
  const isCommentsLocked = useMemo(() => {
    if (!poll?.commentsLocked) return false;
    if (!poll.lockExpiry) return true; // Permanent lock
    const expiryDate = new Date(poll.lockExpiry);
    const now = new Date();
    return now < expiryDate; // Locked if current time is before expiry
  }, [poll?.commentsLocked, poll?.lockExpiry]);

  // Set voted option based on fetched votes
  useEffect(() => {
    if (!isVotesLoading && userVotes.length > 0 && !votedOptionId) {
      const vote = userVotes.find((v) => v.pollId === id);
      if (vote) {
        setVotedOptionId(vote.optionId);
      }
    }
  }, [isVotesLoading, userVotes, votedOptionId, id]);

  // User permissions
  const userLevel = getUserLevelFromPoints(user);
  const isOwner = user.id === poll?.creatorId;

  const isLikesTodayResetNeeded = (lastLikeReset?: string): boolean => {
    const today = new Date();
    if (!lastLikeReset) return true;
    const lastResetDate = new Date(lastLikeReset);
    if (isNaN(lastResetDate.getTime())) return true;
    return (
      lastResetDate.getUTCFullYear() !== today.getUTCFullYear() ||
      lastResetDate.getUTCMonth() !== today.getUTCMonth() ||
      lastResetDate.getUTCDate() !== today.getUTCDate()
    );
  };

  const canReact = useMemo(() => {
    if (!user || !isAuthenticated) return false;
    const isToday = !isLikesTodayResetNeeded(user.lastLikeReset);
    const likesToday = isToday
      ? (user.superLikesToday || 0) + (user.simpleLikesToday || 0)
      : 0;
    return (
      userLevel >= 3 &&
      likesToday < 2 &&
      !isSuperLiked &&
      !isSimpleLiked &&
      !isOwner // Prevent self-reactions on own polls
    );
  }, [
    user,
    isAuthenticated,
    userLevel,
    user?.superLikesToday,
    user?.simpleLikesToday,
    user?.lastLikeReset,
    isSuperLiked,
    isSimpleLiked,
    isOwner,
  ]);

  // Handle voting
  const handleVote = (pollId: string, optionIds: string[]) => {
    if (!isAuthenticated) {
      toast({ title: "You must be logged in to vote." });
      return;
    }
    if (poll.isDraft) {
      toast({ title: "Voting is disabled in draft mode." });
      return;
    }

    voteOnPoll(
      { pollId, optionIds, userId: user.id },
      {
        onSuccess: () => {
          setVotedOptionId(optionIds.join(","));
          toast({ title: "Vote submitted successfully!" });
        },
        onError: (error: any) => {
          console.error("Error submitting vote:", error);
          toast({
            title: `Error submitting vote: ${error.message || "Unknown error"}`,
          });
        },
      }
    );
  };

  // Handle publishing draft
  const handlePublish = () => {
    if (!id || !poll) {
      toast({ title: "Poll ID is missing." });
      return;
    }
    if (!poll.isDraft) {
      toast({ title: "This poll is already published." });
      return;
    }
    if (poll.creatorId !== user.id) {
      toast({ title: "You can only publish your own polls." });
      return;
    }

    publishPollMutation(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poll", id] });
        queryClient.invalidateQueries({ queryKey: ["userDrafts"] });
        toast({ title: "Poll published successfully!" });
        navigate(`/polls/${id}`);
      },
      onError: (error: any) => {
        console.error("Error publishing poll:", error);
        toast({
          title: `Failed to publish poll: ${error.message || "Unknown error"}`,
          variant: "destructive",
        });
      },
    });
  };

  // Handle deleting draft
  const handleDelete = () => {
    if (!id || !poll) {
      toast({ title: "Poll ID is missing." });
      return;
    }
    if (!poll.isDraft) {
      toast({ title: "Only draft polls can be deleted." });
      return;
    }
    if (poll.creatorId !== user.id) {
      toast({ title: "You can only delete your own polls." });
      return;
    }

    deletePollMutation(id, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["userDrafts"] });
        toast({ title: "Poll draft deleted successfully!" });
        navigate("/my-drafts");
      },
      onError: (error: any) => {
        console.error("Error deleting poll:", error);
        toast({
          title: `Failed to delete poll: ${error.message || "Unknown error"}`,
          variant: "destructive",
        });
      },
    });
  };

  // Reaction handlers
  const handleSuperLikePoll = async () => {
    if (!id || !user?.id) {
      toast({ title: "Poll ID or User ID is missing." });
      return;
    }
    if (poll.isDraft) {
      toast({ title: "Liking is disabled in draft mode." });
      return;
    }
    if (isOwner) {
      toast({ description: "You cannot golden heart your own poll." });
      return;
    }
    if (!canReact) {
      toast({
        title: isSuperLiked
          ? "You have already given a golden heart to this poll."
          : userLevel < 3
          ? "You need to be level 3 or higher to give a golden heart to a poll."
          : "You have reached your daily reaction limit.",
      });
      return;
    }

    const updatedSuperLikes = [...(poll?.superLikedBy || []), user.id];

    try {
      await new Promise<void>((resolve, reject) => {
        superLikePoll(
          {
            pollId: poll.$id,
            superLikesArray: updatedSuperLikes,
            userId: user.id,
          },
          {
            onSuccess: () => {
              setIsSuperLiked(true);
              resolve();
            },
            onError: (error) => reject(error),
          }
        );
      });

      await incrementSuperLikesToday(user.id).then((updatedUser) => {
        setUser({
          ...user,
          superLikesToday: updatedUser.superLikesToday,
          lastLikeReset: updatedUser.lastLikeReset,
        });
      });

      if (!poll?.isAnonymous && poll?.creatorId) {
        await updateUserLevelAndPoints(
          poll.creatorId,
          UserAction.POST_GOLDEN_HEART_RECEIVED
        );
      }

      toast({ title: "Poll golden hearted successfully!" });
    } catch (error: any) {
      console.error("Error golden hearting poll:", error);
      toast({
        title: `Failed to golden heart poll: ${
          error.message || "Unknown error"
        }`,
      });
    }
  };

  const handleSimpleLikePoll = async () => {
    if (!id || !user?.id) {
      toast({ title: "Poll ID or User ID is missing." });
      return;
    }
    if (poll.isDraft) {
      toast({ title: "Liking is disabled in draft mode." });
      return;
    }
    if (isOwner) {
      toast({ description: "You cannot simple heart your own poll." });
      return;
    }
    if (!canReact) {
      toast({
        title: isSimpleLiked
          ? "You have already given a simple heart to this poll."
          : userLevel < 3
          ? "You need to be level 3 or higher to give a simple heart to a poll."
          : "You have reached your daily reaction limit.",
      });
      return;
    }

    const updatedSimpleLikes = [...(poll?.simpleLikedBy || []), user.id];

    try {
      await new Promise<void>((resolve, reject) => {
        simpleLikePoll(
          {
            pollId: poll.$id,
            simpleLikesArray: updatedSimpleLikes,
            userId: user.id,
          },
          {
            onSuccess: () => {
              setIsSimpleLiked(true);
              resolve();
            },
            onError: (error) => reject(error),
          }
        );
      });

      await incrementSimpleLikesToday(user.id).then((updatedUser) => {
        setUser({
          ...user,
          simpleLikesToday: updatedUser.simpleLikesToday,
          lastLikeReset: updatedUser.lastLikeReset,
        });
      });

      if (!poll?.isAnonymous && poll?.creatorId) {
        await updateUserLevelAndPoints(
          poll.creatorId,
          UserAction.POST_HEART_RECEIVED
        );
      }

      toast({ title: "Poll simple hearted successfully!" });
    } catch (error: any) {
      console.error("Error simple hearting poll:", error);
      toast({
        title: `Failed to simple heart poll: ${
          error.message || "Unknown error"
        }`,
      });
    }
  };

  // Show loader while critical data is loading
  if (isPollLoading || isVotesLoading) {
    return <Loader />;
  }

  if (!poll) {
    return <div className="text-light-1 text-center">Poll not found</div>;
  }

  if (groupId) {
    if (isGroupLoading) {
      return <Loader />;
    }

    if (!group) {
      return <div className="text-light-1 text-center">Group not found</div>;
    }

    const isMember =
      group.memberIds.includes(user.id) ||
      group.admins.includes(user.id) ||
      group.creatorId === user.id;

    if (!isMember) {
      return (
        <GroupContentAccessDenied
          groupId={groupId}
          groupName={poll.groupName}
          contentType="poll"
        />
      );
    }
  }

  // Ensure poll options have default values
  const pollOptions = poll.options || [];
  const totalVotes = pollOptions.reduce(
    (sum: number, option: { voteCount: number }) =>
      sum + (option.voteCount || 0),
    0
  );

  // Check if user can manage the poll (creator and draft)
  const canManagePoll = poll.isDraft && user.id === poll.creatorId;

  return (
    <div className="w-full min-h-screen bg-dark-1">
      <div className="max-w-5xl mx-auto px-4 py-6 mt-10">
        {/* Group Badge */}
        {groupId && (
          <div className="mb-6 flex justify-center">
            <div className="mb-4 bg-dark-4 p-2 rounded-full shadow-sm transition-all duration-200 hover:shadow-md flex justify-center w-full md:w-[1020px] mx-auto">
              {isGroupLoading ? (
                <p className="text-white text-sm">Loading group...</p>
              ) : group ? (
                <Link
                  to={`/groups/${groupId}`}
                  className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-yellow-500 bg-clip-text text-transparent hover:underline">
                  {group.name}
                </Link>
              ) : (
                <p className="text-gray-300 text-sm">Group not found</p>
              )}
            </div>
          </div>
        )}
        {/* Poll Card Container */}
        <div className="bg-dark-2 rounded-[30px] border border-dark-4 shadow-xl overflow-hidden mb-8">
          {!poll.isDraft && userLevel >= 3 && (
            <div className="bg-dark-3 px-6 py-3 border-b border-dark-4">
              <div className="flex items-center justify-end gap-4">
                <ReactionButtons
                  canGreat={false}
                  isGreat={false}
                  handleGreat={() => {}}
                  greatCount={0}
                  canLike={false} // No regular like for polls
                  isLiked={false}
                  handleLike={() => {}}
                  likeCount={0}
                  canSuperLike={canReact}
                  isSuperLiked={isSuperLiked}
                  handleSuperLike={handleSuperLikePoll}
                  superLikeCount={poll.superLikeCount || 0}
                  canSimpleLike={canReact}
                  isSimpleLiked={isSimpleLiked}
                  handleSimpleLike={handleSimpleLikePoll}
                  simpleLikeCount={poll.simpleLikeCount || 0}
                  isPoll={true}
                />
                <GreatButton item={poll} showCount={true} />
              </div>
            </div>
          )}
          {poll.isDraft && (
            <div className="bg-blue-500/20 text-blue-400 px-6 py-3 border-b border-dark-4">
              <p className="text-sm font-semibold">Draft Mode - Preview</p>
            </div>
          )}
          <div className="p-6">
            <PollCardDetails
              poll={
                {
                  ...poll,
                  type: "poll",
                  $createdAt: poll.createdAt,
                } as IPoll & {
                  type: string;
                }
              }
              votedOptionId={votedOptionId}
              totalVotes={totalVotes}
              handleVote={handleVote}
              disableCommentIcon={true}
              disableVoting={poll.isDraft} // Disable voting in draft mode
            />
          </div>
          {canManagePoll && (
            <DraftControls
              isDeleting={isDeleting}
              handleDelete={handleDelete}
              isPublishing={isPublishing}
              handlePublish={handlePublish}
              handleEdit={() => navigate(`/update-poll/${id}`)}
            />
          )}
        </div>
        {!poll.isDraft && (
          <div className="bg-dark-2 rounded-xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-light-1 mb-6 pb-2 border-b border-dark-4">
              All Comments{" "}
            </h3>
            {!isCommentsLocked && (
              <div
                ref={commentFormRef}
                className="border-b border-dark-4 pb-6 mb-6">
                <CommentForm id={id || ""} isPoll={true} />
              </div>
            )}
            {isCommentsLocked && (
              <p className="text-light-3 text-sm mb-6">
                Comments are locked for this poll.
              </p>
            )}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <CommentList
                id={id || ""}
                isPoll={true}
                currentUserId={user.id}
                postCreatorId={poll.creatorId}
                isPostAnonymous={poll?.isAnonymous || false}
              />
            </div>
          </div>
        )}
      </div>
      <StickyHeader
        isVisible={isStickyHeaderVisible}
        title={poll?.question || "No Question Available"}
        isCommentsLocked={isCommentsLocked}
        commentFormRef={commentFormRef}
      />
    </div>
  );
};

export default PollDetails;
