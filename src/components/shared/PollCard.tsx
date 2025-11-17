import PollCardDetails from "./PollCardDetails";
import { IPoll } from "@/types";

// Define props interface for PollCard
interface PollCardProps {
  poll: IPoll | undefined;
  votedOptionId: string | null;
  totalVotes: number;
  handleVote: (pollId: string, optionIds: string[]) => void;
  onCategoryClick?: (categoryId: string, subCategory?: string) => void;
}

// PollCard component renders PollCardDetails in compact mode
const PollCard = ({
  poll,
  votedOptionId,
  totalVotes,
  handleVote,
  onCategoryClick,
}: PollCardProps) => {
  if (!poll) {
    return null;
  }

  return (
    <PollCardDetails
      poll={poll}
      votedOptionId={votedOptionId}
      totalVotes={totalVotes}
      handleVote={handleVote}
      isCompact={true}
      onCategoryClick={onCategoryClick}
    />
  );
};

export default PollCard;
