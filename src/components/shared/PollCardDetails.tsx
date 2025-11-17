import { formatDistanceToNowStrict } from "date-fns";
import { useState, useMemo, useCallback } from "react";
import {
  useDeletePoll,
  useGetUserVotesForPoll,
  useGetUserById,
  useGetCurrentUser,
  useAwardVoteBonus,
  useGetVotedUsersForPoll,
  useGetGroupById,
  useLockPollComments,
  useUnlockPollComments,
} from "@/lib/react-query/queries";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { updateUserLevelAndPoints } from "@/services/userService";
import { UserAction } from "@/lib/pointsMapping";
import { PostStats } from "@/components/shared";
import VoteModal from "@/components/shared/VoteModal";
import LockCommentsModal from "@/components/comments/LockCommentsModal";
import { databases, appwriteConfig } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { IPoll, IPollOption } from "@/types";
import CreatorInfo from "../post/CreatorInfo";
import LockCommentsButton from "../post/LockCommentsButton";
import DescriptionViewer from "../post/DescriptionViewer";

interface PollCardDetailsProps {
  poll: IPoll | any;
  votedOptionId: string | null;
  totalVotes: number;
  handleVote: (pollId: string, optionIds: string[]) => void;
  isCompact?: boolean;
  onCategoryClick?: (categoryId: string, subCategory?: string) => void;
  disableCommentIcon?: boolean;
}

const PollCardDetails = ({
  poll,
  votedOptionId,
  totalVotes,
  handleVote,
  isCompact = false,
  onCategoryClick,
  disableCommentIcon = false,
}: PollCardDetailsProps) => {
  const { user: contextUser } = useUserContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: isUserLoading } = useGetCurrentUser();
  const {
    data: creator,
    isLoading: isCreatorLoading,
    error: userError,
  } = useGetUserById(poll?.creatorId || "");
  const { data: userVotes = [], isLoading: isVotesLoading } =
    useGetUserVotesForPoll(currentUser?.$id || "", poll?.$id || "");
  const { mutateAsync: awardVoteBonus } = useAwardVoteBonus();
  const { data: votedUsers, isLoading: isVotedUsersLoading } =
    useGetVotedUsersForPoll(poll?.$id || "");
  const { mutate: deletePoll } = useDeletePoll();
  const { mutate: lockPollComments } = useLockPollComments();
  const { mutate: unlockPollComments } = useUnlockPollComments();
  const groupId = poll?.groupIdString;
  const { data: group, isLoading: isGroupLoading } = useGetGroupById(groupId);

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [categoryCache, setCategoryCache] = useState<Record<string, string>>(
    {}
  );

  const isCreator = useMemo(
    () => contextUser.id === poll?.creatorId,
    [contextUser.id, poll?.creatorId]
  );
  const isGroupAdmin = useMemo(
    () => groupId && group && group.admins?.includes(contextUser.id),
    [groupId, group, contextUser.id]
  );
  const isGroupPoll = useMemo(() => !!groupId, [groupId]);
  const canLock = useMemo(() => {
    return isGroupPoll ? isCreator || isGroupAdmin : isCreator;
  }, [isGroupPoll, isCreator, isGroupAdmin]);

  const isPollExpired = useMemo(() => {
    if (!poll?.durationInDays || !poll.$createdAt) return false;
    const createdAt = new Date(poll.$createdAt);
    if (isNaN(createdAt.getTime())) return false;
    const endDate = new Date(createdAt);
    endDate.setDate(endDate.getDate() + (poll.durationInDays || 0));
    return new Date() > endDate;
  }, [poll?.durationInDays, poll?.$createdAt]);

  const showResults = useMemo(
    () => isPollExpired || !!votedOptionId,
    [isPollExpired, votedOptionId]
  );

  const isVoteDisabled = useMemo(
    () =>
      isPollExpired ||
      !!votedOptionId ||
      isUserLoading ||
      isVotesLoading ||
      isCreator,
    [isPollExpired, votedOptionId, isUserLoading, isVotesLoading, isCreator]
  );

  const isCommentsLocked = useMemo(() => {
    if (!poll?.commentsLocked) return false;
    if (!poll.lockExpiry) return true;
    const expiryDate = new Date(poll.lockExpiry);
    const now = new Date();
    return now < expiryDate;
  }, [poll?.commentsLocked, poll?.lockExpiry]);

  const canUnlockComments = useMemo(() => {
    if (!poll?.commentsLocked) {
      return false;
    }
    if (isGroupPoll) {
      const canUnlock = isGroupAdmin || poll.lockedBy === contextUser.id;
      return canUnlock;
    }
    const canUnlock =
      isCreator && (!poll.lockedBy || poll.lockedBy === contextUser.id);
    return canUnlock;
  }, [
    poll?.commentsLocked,
    poll?.lockedBy,
    isGroupAdmin,
    isCreator,
    contextUser.id,
    isGroupPoll,
    poll?.$id,
  ]);

  const postStatsDisabled = useMemo(
    () => disableCommentIcon || isCommentsLocked,
    [disableCommentIcon, isCommentsLocked]
  );

  const buttonText = useMemo(() => {
    if (isCreator) return "Cannot vote on own poll";
    if (isPollExpired) return "Poll Closed";
    if (votedOptionId) return "Already Voted";
    return "Submit Vote";
  }, [isCreator, isPollExpired, votedOptionId]);

  const creatorInfo = useMemo(() => {
    const info = {
      name: "Unknown User",
      imageUrl: "/assets/icons/profile-placeholder.svg" as string | null,
      level: "N/A",
    };
    if (poll?.isAnonymous) {
      info.name = "Anonymous";
      info.imageUrl = "/assets/icons/profile-placeholder.svg";
      info.level = creator?.level ? String(creator.level) : "N/A";
    } else if (isCreatorLoading) {
      info.name = "Loading...";
    } else if (creator) {
      info.name = creator.name || "Unknown User";
      info.imageUrl =
        creator.imageUrl || "/assets/icons/profile-placeholder.svg";
      info.level = creator.level ? String(creator.level) : "N/A";
    }
    return info;
  }, [
    creator,
    isCreatorLoading,
    poll?.isAnonymous,
    poll?.$id,
    poll?.creatorId,
    userError,
  ]);

  const pollStyles = useMemo(
    () => ({
      borderColor: "border-poll-border",
      bgColor: "bg-poll-bg",
      textColor: "text-poll-border",
    }),
    []
  );

  const createdAt = poll?.createdAt ? new Date(poll.createdAt) : null;
  const timeAgo = useMemo(
    () =>
      createdAt && !isNaN(createdAt.getTime())
        ? formatDistanceToNowStrict(createdAt, { addSuffix: true })
        : "Unknown Time",
    [createdAt]
  );

  const isWithin10Min = useMemo(() => {
    if (!createdAt) return false;
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return diffMinutes < 10;
  }, [createdAt, poll.$id]);

  const handleDeletePoll = useCallback(async () => {
    if (!poll?.$id) {
      toast({ description: "Poll ID is missing." });
      return;
    }
    const confirmation = window.confirm(
      isCreator
        ? "Are you sure you want to delete your poll?"
        : "Are you sure you want to delete this poll?"
    );
    if (!confirmation) return;

    if (isCreator) {
      const pointsWarning = window.confirm(
        "Warning: You will lose 15 Qpoints for deleting this poll. Do you want to continue?"
      );
      if (!pointsWarning) return;
    }

    try {
      await deletePoll({ pollId: poll.$id });
      if (isCreator) {
        await updateUserLevelAndPoints(poll.creatorId, UserAction.DELETE_POLL);
        toast({ description: "Poll deleted. -15 points deducted." });
      } else {
        toast({ description: "Poll deleted successfully." });
      }
      queryClient.invalidateQueries(["polls"]);
      queryClient.removeQueries(["pollById", poll.$id]);
      navigate(-1);
    } catch (error) {
      console.error("PollCardDetails: Error deleting poll:", error);
      toast({ description: "Failed to delete poll." });
    }
  }, [poll?.$id, isCreator, deletePoll, toast, queryClient, navigate]);

  const handleVoteSubmit = useCallback(async () => {
    if (!poll) {
      toast({ description: "Poll data is not available." });
      return;
    }
    if (isCreator) {
      toast({ description: "You cannot vote on your own poll." });
      return;
    }
    if (selectedOptions.length === 0) {
      toast({ description: "Please select at least one option to vote." });
      return;
    }
    if (!currentUser) {
      toast({ description: "You must be logged in to vote." });
      return;
    }
    try {
      localStorage.setItem(
        `poll_${poll.$id}_selectedOptions`,
        JSON.stringify(selectedOptions)
      );
      await handleVote(poll.$id, selectedOptions);
      await awardVoteBonus();
      await updateUserLevelAndPoints(currentUser?.$id, UserAction.VOTE_ON_POLL);
      toast({ description: "Thanks for voting! You've earned +3 points." });
    } catch (error) {
      console.error("PollCardDetails: Error submitting vote:", error);
      toast({ description: "Error submitting vote." });
    }
  }, [
    poll,
    selectedOptions,
    currentUser,
    handleVote,
    awardVoteBonus,
    toast,
    isCreator,
  ]);

  const handleOptionChange = useCallback(
    (optionId: string) => {
      if (!poll || isVoteDisabled) return;
      setSelectedOptions((prevSelected) => {
        if (poll.allowMultipleAnswers) {
          return prevSelected.includes(optionId)
            ? prevSelected.filter((id) => id !== optionId)
            : [...prevSelected, optionId];
        }
        return prevSelected[0] === optionId ? [] : [optionId];
      });
    },
    [poll, isVoteDisabled]
  );

  const handleLockComments = () => {
    if (!poll?.$id) {
      toast({ description: "Poll ID is missing." });
      return;
    }
    lockPollComments(
      { pollId: poll.$id, duration: "permanent", lockedBy: contextUser.id },
      {
        onSuccess: async ()  => {
          toast({
            description: `Comments locked permanently. -100`,
          });
        try {
          await updateUserLevelAndPoints(contextUser.id, UserAction.LOCK_POST);
          
        } catch (error) {
          console.error("Error updating user level and points:", error);
          toast({
            description: `Failed to update user points.`,
            variant: "destructive",
          });
        }
          queryClient.invalidateQueries(["pollById", poll.$id]);
        },
        onError: (error) => {
          console.error("PollCardDetails: Error locking comments:", error);
          toast({ description: "Failed to lock comments." });
        },
      }
    );
    setIsLockModalOpen(false);
  };

  const handleUnlockComments = useCallback(() => {
    if (!poll?.$id) {
      toast({ description: "Poll ID is missing." });
      return;
    }
    unlockPollComments(
      { pollId: poll.$id, userId: contextUser.id, groupId: poll.groupIdString },
      {
        onSuccess: () => {
          toast({ description: "Comments unlocked successfully." });
          queryClient.invalidateQueries(["pollById", poll.$id]);
        },
        onError: (error) => {
          console.error("PollCardDetails: Error unlocking comments:", error);
          toast({
            description:
              "Failed to unlock comments: Insufficient permissions or comments not locked.",
          });
        },
      }
    );
  }, [
    poll?.$id,
    poll?.groupIdString,
    unlockPollComments,
    toast,
    queryClient,
    contextUser.id,
    isCreator,
    isGroupAdmin,
    poll?.lockedBy,
  ]);

  const calculateRemainingTime = useCallback(() => {
    if (!poll?.durationInDays || !createdAt || isNaN(createdAt.getTime())) {
      return "No expiration";
    }
    const endDate = new Date(createdAt);
    endDate.setDate(endDate.getDate() + (poll.durationInDays || 0));
    if (new Date() > endDate) {
      return "Poll closed";
    }
    const remainingTime = formatDistanceToNowStrict(endDate, {
      addSuffix: true,
    });
    return `Time remaining: ${remainingTime}`;
  }, [poll?.durationInDays, createdAt]);

  const fetchCategoryIdByName = useCallback(
    async (categoryName: string): Promise<string | null> => {
      if (categoryCache[categoryName]) {
        return categoryCache[categoryName];
      }
      try {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.categoriesCollectionId,
          [Query.equal("name", categoryName), Query.limit(1)]
        );
        if (response.documents.length > 0) {
          const categoryId = response.documents[0].$id;
          setCategoryCache((prev) => ({ ...prev, [categoryName]: categoryId }));
          return categoryId;
        }
        return null;
      } catch (error) {
        console.error(
          `PollCardDetails: Error fetching category ID for ${categoryName}:`,
          error
        );
        return null;
      }
    },
    [categoryCache]
  );

  const handleSubCategoryFilterClick = useCallback(async () => {
    if (!poll?.categoryName) return;
    let categoryId: string | null = poll.categoryIdString || null;
    if (!categoryId) {
      categoryId = await fetchCategoryIdByName(poll.categoryName);
    }
    if (!categoryId) return;
    if (onCategoryClick) {
      onCategoryClick(categoryId, poll.subCategory);
    } else {
      // Navigate to home page with category filter
      navigate('/', {
        state: {
          categoryId: categoryId,
          subCategory: poll.subCategory || null,
        },
      });
    }
  }, [
    poll?.$id,
    poll?.categoryName,
    poll?.subCategory,
    poll?.categoryIdString,
    onCategoryClick,
    fetchCategoryIdByName,
    navigate,
  ]);

  const handleQuestionClick = useCallback(() => {
    if (!poll?.$id) return;
    if (poll.groupIdString) {
      navigate(`/groups/${poll.groupIdString}/polls/${poll.$id}`);
    } else {
      navigate(`/polls/${poll.$id}`);
    }
  }, [poll?.$id, poll?.groupIdString, navigate]);

  const handleVotesClick = useCallback(() => {
    if (!poll?.$id) return;
    setIsVoteModalOpen(true);
  }, [poll?.$id]);

  if (!poll) {
    return null;
  }

  if (isCreatorLoading) {
    return (
      <div
        className={
          isCompact
            ? "post-card relative"
            : "poll-card bg-dark-2 rounded-2xl border border-dark-4 p-4 sm:p-2 shadow-md"
        }>
        <p className="text-light-3">Loading user data...</p>
      </div>
    );
  }

  if (userError) {
    return (
      <div
        className={
          isCompact
            ? "post-card relative"
            : "bg-dark-2 rounded-2xl border border-dark-4 p-4 sm:p-2 shadow-md"
        }>
        <p className="text-light-3">Error loading user data</p>
      </div>
    );
  }

  return (
    <li
      className={
        isCompact
          ? `post-card relative break-inside-avoid rounded-xl mb-4 transition-all duration-200 hover:shadow-lg ${pollStyles.borderColor} border-2 overflow-hidden`
          : "poll-card bg-dark-2 rounded-2xl border border-dark-4 shadow-md transition-all hover:shadow-lg animate-fade-in-up mt-6"
      }>
      <div
        className={
          isCompact
            ? `${pollStyles.bgColor} bg-opacity-20 h-full flex flex-col rounded-xl`
            : undefined
        }>
        <div className="flex-between flex-col sm:flex-row gap-2 px-4 pt-4">
          <div className="flex-start"></div>
          <div className="flex-start gap-2">
            <div className="text-light-3 text-xs text-right">
              <span className="block">{timeAgo}</span>
              <span className="cursor-pointer hover:underline" onClick={handleVotesClick}>{totalVotes} votes</span>
              <span className="block">{poll.durationInDays && poll.durationInDays > 0 ? calculateRemainingTime() : "No expiration"}</span>
            </div>
          </div>
        </div>
        <div className="flex-start gap-2 items-center sm:-mt-9 mb-6 px-4">
          <CreatorInfo
            creator={creator}
            isAnonymous={poll.isAnonymous}
            gender={poll?.isAnonymous ? poll.gender : creator?.gender || null}
            level={creatorInfo.level}
            formattedDate={timeAgo}
            location={null}
          />
          {(isCreator || (isGroupAdmin && isGroupPoll)) && isWithin10Min && (
            <button onClick={handleDeletePoll} className="p-1 hover:bg-transparent">
              <img src="/assets/icons/delete.svg" alt="delete" width={18} height={18} className="opacity-70 hover:opacity-100 transition-opacity" />
            </button>
          )}
          <LockCommentsButton
            isLocked={isCommentsLocked}
            canUnlock={canUnlockComments}
            handleLockOpen={() => setIsLockModalOpen(true)}
            handleUnlock={handleUnlockComments}
            canLock={canLock}
          />
        </div>
        <div className="mb-2 px-4">
          {isCompact ? (
            <div className="flex flex-row gap-4 mb-4">
              {poll.imageUrl && (
                <div className="flex-shrink-0 cursor-pointer" onClick={handleQuestionClick}>
                  <img src={poll.imageUrl} alt="Poll main image" className="w-24 h-24 sm:w-36 sm:h-36 object-cover rounded-lg" loading="lazy" />
                </div>
              )}
              <h2 className={`text-lg font-bold ${pollStyles.textColor} flex-1`} style={{ marginTop: 0 }}>
                <span className="cursor-pointer" onClick={handleQuestionClick}>{poll.question}</span>
              </h2>
            </div>
          ) : (
            <div className={`poll-content-row ${!poll.imageUrl ? "no-image" : ""}`}>
              <div className="flex flex-col">
                {poll.imageUrl && (
                  <div className="poll-card-img cursor-pointer" onClick={handleQuestionClick}>
                    <img src={poll.imageUrl} alt="Poll main image" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                {(poll.categoryName || poll.subCategory) && (
                  <div
                    className={`poll-category-display text-silver rounded-full px-2 py-1 mt-2 ${groupId ? '' : 'cursor-pointer'}`}
                    onClick={groupId ? () => console.log(`PollCardDetails: Category click disabled in group context for poll ${poll.$id}`) : handleSubCategoryFilterClick}>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${groupId ? '' : 'hover:underline'}`}>
                      {poll.categoryName || "No Category"}
                      {poll.subCategory && <span className={`text-silver ${groupId ? '' : 'hover:underline'}`}>{" / "}{poll.subCategory}</span>}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 px-4 md:pl-9 md:pr-2">
                <h2 className="h3-bold text-light-1 mb-2 -mt-1">
                  <span className="cursor-pointer" onClick={handleQuestionClick}>{poll.question}</span>
                </h2>
                {poll.description && (
                  <div className="base-regular text-light-3 mb-2">
                    <DescriptionViewer description={poll.description} maxLength={800} createdAt={poll.createdAt || ""} />
                  </div>
                )}
                {poll.allowMultipleAnswers && (
                  <span className="inline-block text-light-2 small-semibold px-2 py-1 rounded-md">Multiple selections allowed</span>
                )}
              </div>
            </div>
          )}
          {isCompact && (poll.categoryName || poll.subCategory) && (
            <div className="flex items-center gap-2 mt-1 px-4">
              <p className={`text-xs text-silver transition-colors truncate max-w-full overflow-hidden whitespace-nowrap ${groupId ? '' : 'cursor-pointer hover:text-light-2'}`} onClick={groupId ? () => console.log(`PollCardDetails (compact): Category click disabled in group context for poll ${poll.$id}`) : handleSubCategoryFilterClick}>
                <span className={`inline-block ${groupId ? '' : 'hover:underline'}`}>{poll.categoryName || "No Category"} / {poll.subCategory || "None"}</span>
              </p>
            </div>
          )}
        </div>
        <div className="space-y-2 px-4">
          {poll.options.map((option: IPollOption) => {
            const percentage = totalVotes
              ? Math.round((option.voteCount / totalVotes) * 100)
              : 0;
            const isSelected = selectedOptions.includes(option.$id);
            let backgroundColor = "#2B2B2B";
            if (
              showResults &&
              votedOptionId &&
              votedOptionId.includes(option.$id)
            ) {
              backgroundColor = "#877EFF";
            }
            return (
              <div
                key={option.$id}
                className="poll-option flex items-center justify-between p-3 sm:p-2 rounded-lg bg-dark-3 hover:bg-dark-4 transition-colors cursor-pointer"
                style={{
                  background: showResults
                    ? `linear-gradient(to right, ${backgroundColor} ${percentage}%, #2B2B2B ${percentage}%)`
                    : backgroundColor,
                }}
                onClick={() =>
                  !votedOptionId && handleOptionChange(option.$id)
                }>
                <div className="flex items-center flex-1 gap-2">
                  {option.imageUrl && (
                    <div>
                      <img
                        src={option.imageUrl}
                        alt={`Option ${option.optionText}`}
                        className={`object-cover rounded-md ${
                          isCompact ? "w-6 h-6" : "w-20 h-12 sm:w-16 sm:h-10"
                        }`}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <label
                    htmlFor={`option-${option.$id}`}
                    className="base-medium text-light-2">
                    {option.optionText}
                  </label>
                </div>
                {showResults && (
                  <span className="small-semibold text-light-1">
                    {percentage}%
                  </span>
                )}
                {!votedOptionId && poll.allowMultipleAnswers && (
                  <input
                    type="checkbox"
                    id={`option-${option.$id}`}
                    checked={isSelected}
                    className="form-checkbox h-4 w-4 sm:h-3 sm:w-3 text-primary-500 focus:ring-0"
                    onChange={() => handleOptionChange(option.$id)}
                    disabled={isVoteDisabled}
                  />
                )}
                {!votedOptionId && !poll.allowMultipleAnswers && (
                  <input
                    type="radio"
                    name={`poll-${poll.$id}`}
                    id={`option-${option.$id}`}
                    checked={isSelected}
                    className="form-radio h-4 w-4 sm:h-3 sm:w-3 text-primary-500 focus:ring-0"
                    onChange={() => handleOptionChange(option.$id)}
                    disabled={isVoteDisabled}
                  />
                )}
              </div>
            );
          })}
        </div>
        {!votedOptionId && (
          <button
            onClick={handleVoteSubmit}
            className="w-full bg-primary-500 hover:bg-primary-600 text-light-1 small-semibold py-2 sm:py-1.5 rounded-lg transition-colors mt-5"
            disabled={isVoteDisabled}>
            {buttonText}
          </button>
        )}
        <div className="comments-section mt-4 px-4">
          <div className="post-stats-container p-3">
            <PostStats
              post={poll}
              userId={contextUser.id}
              isPoll={true}
              disabled={postStatsDisabled}
            />
          </div>
        </div>
        <LockCommentsModal
          isOpen={isLockModalOpen}
          onClose={() => setIsLockModalOpen(false)}
          onConfirm={handleLockComments}
        />
        {isVoteModalOpen && (
          <VoteModal
            isOpen={isVoteModalOpen}
            onClose={() => setIsVoteModalOpen(false)}
            votedUsers={votedUsers || []}
            pollId={poll.$id}
          />
        )}
      </div>
    </li>
  );
};

export default PollCardDetails;