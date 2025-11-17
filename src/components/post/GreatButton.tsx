import { AiOutlineStar, AiFillStar } from "react-icons/ai";
import { useUserContext } from "@/context/AuthContext";
import { useGreatPost, useGreatPoll } from "@/lib/react-query/queries";
import { incrementGreatsToday, updateUserLevelAndPoints } from "@/services/userService"; 
import { UserAction } from "@/lib/pointsMapping";
import { useToast } from "@/components/ui/use-toast";
import { Post, IPoll } from "@/types";

type ContentItem = Post | IPoll;

interface GreatButtonProps {
  item: ContentItem;
  showCount?: boolean;
}

function isGreatsTodayResetNeeded(lastGreatReset?: string): boolean {
  const today = new Date();
  if (!lastGreatReset) return true;
  const lastResetDate = new Date(lastGreatReset);
  if (isNaN(lastResetDate.getTime())) return true;
  return (
    lastResetDate.getUTCFullYear() !== today.getUTCFullYear() ||
    lastResetDate.getUTCMonth() !== today.getUTCMonth() ||
    lastResetDate.getUTCDate() !== today.getUTCDate()
  );
}

const GreatButton = ({ item, showCount = false }: GreatButtonProps) => {
  const { user, setUser } = useUserContext();
  const { toast } = useToast();
  const greatPostMutation = useGreatPost();
  const greatPollMutation = useGreatPoll();

  const isGreat = item.greatBy?.includes(user.id) || false;

  const isToday = !isGreatsTodayResetNeeded(user.lastGreatReset);
  const greatsToday = isToday ? user.greatsToday || 0 : 0;
  const canGreat =
    (user.level >= 3 || user.tier === "gold") &&
    greatsToday < 2 &&
    !isGreat &&
    item.creatorId !== user.id;

  const handleClick = () => {
    if (!canGreat) {
      toast({ description: "You cannot mark this as great." });
      return;
    }

    const typeLabel = item.type === "post" ? "post" : "poll";
    const confirmationMessage = `Do you want to select this ${typeLabel} as ‘great’`;
    if (!window.confirm(confirmationMessage)) return;

    const updatedGreatsArray = [...(item.greatBy || []), user.id];

    const mutate = item.type === "post" ? greatPostMutation.mutate : greatPollMutation.mutate;
    const params =
      item.type === "post"
        ? { postId: item.$id, greatsArray: updatedGreatsArray, isPoll: false }
        : { pollId: item.$id, greatsArray: updatedGreatsArray };

    mutate(params, {
      onSuccess: () => {
        incrementGreatsToday(user.id)
          .then((updatedUser) => {
            setUser({
              ...user,
              greatsToday: updatedUser.greatsToday,
              lastGreatReset: updatedUser.lastGreatReset,
            });
          })
          .catch((error) => {
            console.error("Error incrementing greatsToday:", error);
          });

        if (!item.isAnonymous && item.creatorId) {
          updateUserLevelAndPoints(item.creatorId, UserAction.QUESTION_MARKED_GREAT)
            .catch((error) => {
              console.error("Error updating creator points for great:", error);
            });
        }

        toast({ title: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} marked as great successfully!` });
      },
      onError: (error: any) => {
        console.error("Error marking as great:", error);
        toast({ description: "Failed to mark as great.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleClick}
        disabled={!canGreat}
        className="p-1 rounded-full hover:bg-dark-4 transition-colors"
        title={isGreat ? "Marked as great" : "Mark as great (level 3+ or gold, max 2/day)"}
      >
        {isGreat ? (
          <AiFillStar className="text-yellow-400" size={20} />
        ) : (
          <AiOutlineStar className="text-gray-400 hover:text-yellow-400" size={20} />
        )}
      </button>
      {showCount && <span className="text-sm text-light-3">{item.greatCount || 0}</span>}
    </div>
  );
};

export default GreatButton;