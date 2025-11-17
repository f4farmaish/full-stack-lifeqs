import React from "react";
import { ReactionCountsProps } from "@/types";

const ReactionCounts: React.FC<ReactionCountsProps> = React.memo(({
  reactionCounts,
  setSelectedEmoji,
  setShowReactionModal,
}) => {
  if (!Object.keys(reactionCounts).some((key) => reactionCounts[key] > 0)) return null;

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {Object.entries(reactionCounts)
        .filter(([_, count]) => count > 0)
        .map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => {
              setSelectedEmoji(emoji);
              setShowReactionModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all duration-200 hover:scale-105 bg-dark-3 text-light-3 border border-dark-4 hover:bg-dark-4"
            title={`View users who reacted with ${emoji} (${count} reactions)`}
          >
            <span className="text-lg">{emoji}</span>
            <span className="text-xs font-medium">{count}</span>
          </button>
        ))}
    </div>
  );
});

export default ReactionCounts;