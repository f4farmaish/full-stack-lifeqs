import React, { useState, useMemo } from "react";
import { CommentContentProps } from "@/types";

const CommentContent: React.FC<CommentContentProps> = React.memo(({
  editMode,
  commentId,
  updatedContent,
  setUpdatedContent,
  onAddEdit,
  setEditMode,
  hasBestFlair,
  renderContentWithMentions,
  content,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Define long content as >500 characters (approx 5 lines at ~100 chars/line)
  const MAX_CHARS = 500;
  const isLong = useMemo(() => content.length > MAX_CHARS, [content]);

  const truncatedContent = useMemo(() => {
    if (!isLong) return content;
    const truncated = content.slice(0, MAX_CHARS);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  }, [content, isLong]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  if (editMode === commentId) {
    return (
      <div>
        <textarea
          value={updatedContent}
          onChange={(e) => setUpdatedContent(e.target.value)}
          className="w-full bg-dark-3 text-sm border border-dark-4 resize-none text-light-1 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-bleu-1"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onAddEdit(commentId)}
            className="px-3 py-1 text-sm text-light-1 bg-bleu-1 rounded-md hover:bg-bleu-1/80 transition-colors duration-200"
          >
            Save Edit
          </button>
          <button
            onClick={() => setEditMode(null)}
            className="px-3 py-1 text-sm text-light-1 bg-dark-3 rounded-md hover:bg-dark-4 transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const displayContent = isExpanded ? content : truncatedContent;
  const displayElements = renderContentWithMentions(displayContent);

  return (
    <div
      className={`text-sm break-words ${
        hasBestFlair ? "text-amber-800 dark:text-amber-100" : "text-light-2"
      }`}
    >
      {displayElements}
      {isLong && !isExpanded && (
        <button
          onClick={handleExpand}
          className="text-blue-400 hover:text-blue-300 ml-1 bg-transparent border-none cursor-pointer text-sm p-0 font-normal underline"
        >
          Continue Reading
        </button>
      )}
    </div>
  );
});

export default CommentContent;