import React from "react";
import { BestFlairProps } from "@/types";

const BestFlair: React.FC<BestFlairProps> = React.memo(({
  hasBestFlair,
  isPostCreator,
  commentUserId,
  currentUserId,
  handleToggleBestFlair,
  commentId,
}) => {
  return (
    <>
      {hasBestFlair && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold shadow-lg"
          title="Opinion is chosen as best by the Post owner"
        >
          <span>⭐</span>
          <span>BEST</span>
        </div>
      )}

      {isPostCreator && commentUserId !== currentUserId && (
        <button
          onClick={() => handleToggleBestFlair(commentId)}
          className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 ${
            hasBestFlair
              ? "bg-amber-500 text-black shadow-lg"
              : "bg-dark-3 text-light-3 hover:bg-dark-4"
          }`}
          title={hasBestFlair ? "Remove best flair" : "Mark as best answer"}>
          <span>{hasBestFlair ? "⭐" : "☆"}</span>
          <span className="hidden sm:inline">
            {hasBestFlair ? "BEST" : "Best"}
          </span>
        </button>
      )}
    </>
  );
});

export default BestFlair;