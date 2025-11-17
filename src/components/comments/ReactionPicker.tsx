import React from "react";
import { MdSentimentSatisfied } from "react-icons/md";
import { ReactionPickerProps } from "@/types";

const ReactionPicker: React.FC<ReactionPickerProps> = React.memo(({
  canUseSpecialReactions,
  specialReactions,
  userReactionEmoji,
  handleReaction,
  showPicker,
  setShowPicker,
}) => {
  if (!canUseSpecialReactions) return null;

  return (
    <div>
      <button
        className="absolute -left-1 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-3 rounded z-10"
        onClick={() => setShowPicker(!showPicker)}
      >
        <MdSentimentSatisfied className="text-gray-400 text-3xl" />
      </button>
      {showPicker && (
        <div 
          className="absolute left-0 ml-8 top-1/2 -translate-y-1/2 z-20 bg-dark-3 border border-dark-4 rounded p-2 flex gap-1 shadow-lg"
          onMouseLeave={() => setShowPicker(false)}
        >
          {specialReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                handleReaction(emoji);
                setShowPicker(false);
              }}
              className={`p-1 rounded transition-colors duration-200 ${
                userReactionEmoji === emoji
                  ? "bg-bleu-1 text-white"
                  : "text-light-3 hover:bg-dark-4"
              }`}
            >
              <span className="text-lg">{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default ReactionPicker;