import { RefObject } from "react";

interface StickyHeaderProps {
  isVisible: boolean;
  title: string; // Represents the post's title (from Posts collection) or poll's question (from Polls collection)
  isCommentsLocked: boolean;
  commentFormRef: RefObject<HTMLDivElement>;
  hasSidebar?: boolean;
}

const StickyHeader = ({
  isVisible,
  title,
  isCommentsLocked,
  commentFormRef,
  hasSidebar = false,
}: StickyHeaderProps) => {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-16 z-50 py-4 ${
        hasSidebar
          ? "left-80 right-0 px-4 md:px-8"
          : "left-0 right-0 px-4 md:px-8"
      }`}
    >
      {/* Modern glass container */}
      <div className="relative bg-dark-2/90 backdrop-blur-xl border border-dark-4/40 rounded-xl shadow-2xl shadow-black/25 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-dark-1/60 via-dark-2/40 to-dark-3/60"></div>
        
        {/* Animated top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/60 to-transparent"></div>
        
        {/* Content container */}
        <div className="relative w-full md:w-[1020px] mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Modern accent bar */}
            <div className="relative flex-shrink-0">
              <div className="w-1.5 h-7 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full shadow-lg shadow-primary-500/30"></div>
              <div className="absolute inset-0 w-1.5 h-7 bg-primary-500 rounded-full opacity-50 animate-pulse"></div>
            </div>
            
            {/* Enhanced title section */}
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-base md:text-lg lg:text-xl text-light-1 truncate leading-tight tracking-wide">
                {title}
              </h2>
              {/* Decorative underline */}
              <div className="w-8 h-0.5 bg-gradient-to-r from-primary-500/80 to-transparent rounded-full mt-1.5"></div>
            </div>
          </div>
          
          {/* Enhanced comment button */}
          <button
            onClick={() => {
              commentFormRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            className={`
              relative overflow-hidden flex items-center gap-3 px-5 py-2.5 rounded-lg font-semibold
              transition-all duration-300 ease-out text-sm whitespace-nowrap flex-shrink-0 ml-4
              group border
              ${
                isCommentsLocked
                  ? "bg-dark-4/60 text-light-4 cursor-not-allowed border-dark-4/50"
                  : `
                    bg-gradient-to-r from-primary-500 to-primary-600 
                    hover:from-primary-600 hover:to-primary-500
                    text-light-1 shadow-lg shadow-primary-500/20 
                    hover:shadow-xl hover:shadow-primary-500/30 
                    hover:scale-[1.02] active:scale-[0.98]
                    border-primary-500/30 hover:border-primary-400/50
                  `
              }
            `}
            disabled={isCommentsLocked}
          >
            {/* Shine effect for active button */}
            {!isCommentsLocked && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-light-1/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
            )}
            
            {/* Icon with hover effects */}
            <div className="relative">
              <svg
                className={`w-4 h-4 transition-all duration-300 ${
                  !isCommentsLocked ? "group-hover:scale-110" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isCommentsLocked
                      ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      : "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  }
                />
              </svg>
            </div>
            
            {/* Button text */}
            <span className="relative z-10 font-medium">
              {isCommentsLocked ? "Locked" : "Comment"}
            </span>
          </button>
        </div>
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-dark-4 to-transparent"></div>
      </div>
    </div>
  );
};

export default StickyHeader;