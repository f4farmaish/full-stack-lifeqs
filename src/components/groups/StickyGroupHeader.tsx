import React from "react";

interface Group {
  $id: string;
  name: string;
  memberIds: string[];
  [key: string]: any;
}

interface StickyGroupHeaderProps {
  group: Group;
  onTitleClick?: () => void;
  isVisible: boolean;
}

const StickyGroupHeader: React.FC<StickyGroupHeaderProps> = ({
  group,
  onTitleClick,
  isVisible,
}) => {
  const handleClick = () => {
    // Scroll to top smoothly
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Call the original onTitleClick handler if provided
    if (onTitleClick) {
      onTitleClick();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-dark-1/95 backdrop-blur-lg border-b border-dark-4/50 shadow-lg animate-slide-down">
      <div className="w-full max-w-screen-lg mx-auto px-4 py-3">
        <div
          onClick={handleClick}
          className="bg-dark-2/80 backdrop-blur-lg rounded-xl px-4 py-3 mx-auto max-w-3xl cursor-pointer transition-all duration-300 hover:bg-dark-3/80 hover:scale-[1.02] hover:shadow-xl group"
        >
          <h2 className="text-lg md:text-xl font-bold text-off-white text-center tracking-tight group-hover:text-bleu-1 transition-colors duration-300">
            {group.name}
          </h2>
          {group.memberIds && (
            <p className="text-xs text-light-3 text-center mt-1 opacity-80">
              {group.memberIds.length} member
              {group.memberIds.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickyGroupHeader;