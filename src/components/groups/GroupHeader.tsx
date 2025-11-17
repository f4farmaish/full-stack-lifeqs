import {
  Dispatch,
  SetStateAction,
  useState,
  useRef,
  useEffect,
  forwardRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import ShareButtons from "@/components/shared/ShareButtons";

// Define interfaces for type safety
interface Group {
  $id: string;
  creatorId: string;
  admins: string[];
  memberIds: string[];
  memberNames: string[];
  memberImages: string[];
  name: string;
  description: string;
  imageUrl?: string;
  categoryId: string | { $id: string };
  categoryName?: string;
  subCategory?: string;
  tags?: string[];
  [key: string]: any;
}

interface GroupHeaderProps {
  group: Group;
  isAdmin: boolean;
  setShowManageAdmins: Dispatch<SetStateAction<boolean>>;
  onTitleClick?: () => void;
}

const GroupHeader = forwardRef<HTMLDivElement, GroupHeaderProps>(
  ({ group, isAdmin, setShowManageAdmins, onTitleClick }, ref) => {
    const descriptionRef = useRef<HTMLParagraphElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [needsExpand, setNeedsExpand] = useState(false);
    const { toast } = useToast();
    const [isShareOpen, setIsShareOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
    }, [group]);
    const shareUrl = `${window.location.origin}/groups/${group.$id}`;
    const shareContent = `Join the group "${group.name}" on our platform! ${
      group.description ? group.description.slice(0, 100) + "..." : ""
    }`;

    const handleCopyLink = (url: string, itemId: string) => {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast({ title: "Link copied to clipboard!" });
        })
        .catch((err) => {
          console.error(`Failed to copy link for group ${itemId}:`, err);
          toast({ variant: "destructive", title: "Failed to copy link." });
        });
    };

    const handleToggleShare = () => {
      setIsShareOpen((prev) => !prev);
    };

    // Handle category/subcategory click - navigate to ViewGroups with filters
    const handleCategoryClick = () => {
      const categoryId =
        typeof group.categoryId === "object"
          ? group.categoryId.$id
          : group.categoryId;

      if (categoryId && group.subCategory) {
        navigate("/groups", {
          state: {
            categoryId: categoryId,
            subCategory: group.subCategory,
          },
        });
      } else if (categoryId) {
        navigate("/groups", {
          state: {
            categoryId: categoryId,
          },
        });
      }
    };

    // Handle tag click - navigate to ViewGroups with tag filter
    const handleTagClick = (tag: string) => {
      navigate(`/groups?tag=${encodeURIComponent(tag)}`);
    };

    useEffect(() => {
      if (descriptionRef.current) {
        const ref = descriptionRef.current;
        setNeedsExpand(ref.scrollHeight > ref.clientHeight);
      }
    }, [group.description]);

    // Handler for title click with debug log
    const handleTitleClick = () => {
      if (onTitleClick) {
        onTitleClick();
      }
    };

    return (
      <div
        ref={ref}
        className="relative w-full flex flex-col items-center text-center mb-10">
        {/* Container that matches posts width */}
        <div className="w-full max-w-screen-lg mx-auto bg-dark-1 rounded-3xl shadow-xl border border-dark-4/50 overflow-hidden animate-slide-in-left">
          {/* Group Image Banner - Now constrained to posts width */}
          {group.imageUrl ? (
            <div className="w-full h-48 md:h-72 relative overflow-hidden rounded-t-3xl">
              <img
                src={group.imageUrl}
                alt={group.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-dark-1/40 to-dark-1/80 transition-opacity duration-400 hover:opacity-90" />
              <div className="absolute top-4 right-4">
                <img
                  src="/assets/icons/share.svg"
                  alt="share"
                  width={32}
                  height={32}
                  className="cursor-pointer bg-dark-3/80 rounded-full p-1 hover:bg-dark-4/90 transition-colors"
                  onClick={handleToggleShare}
                />
                {isShareOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-dark-2 rounded-lg shadow-lg p-2 border border-dark-4">
                    <ShareButtons
                      shareUrl={shareUrl}
                      shareContent={shareContent}
                      handleCopyLink={handleCopyLink}
                      postId={group.$id}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-end mb-4 w-full px-4">
              <img
                src="/assets/icons/share.svg"
                alt="share"
                width={32}
                height={32}
                className="cursor-pointer bg-dark-3/80 rounded-full p-1 hover:bg-dark-4/90 transition-colors"
                onClick={handleToggleShare}
              />
              {isShareOpen && (
                <div className="mt-2 bg-dark-2 rounded-lg shadow-lg p-2 border border-dark-4">
                  <ShareButtons
                    shareUrl={shareUrl}
                    shareContent={shareContent}
                    handleCopyLink={handleCopyLink}
                    postId={group.$id}
                  />
                </div>
              )}
            </div>
          )}

          {/* Group Name and Member Count Container */}
          <div
            className={`relative z-20 ${
              group.imageUrl ? "-mt-10 md:-mt-16" : "mt-6"
            } bg-dark-1/90 backdrop-blur-lg rounded-2xl px-6 py-5 max-w-3xl mx-auto shadow-md border border-dark-4/50 transition-all duration-400 hover:shadow-xl hover:-translate-y-1 animate-pulse-glow group`}>
            <h1
              onClick={handleTitleClick}
              className="text-2xl md:text-3xl font-bold text-off-white tracking-tight transition-all duration-400 group-hover:brightness-125 cursor-pointer hover:underline">
              {group.name}
            </h1>
          </div>

          {/* Separator Line */}
          <div className="w-20 h-0.5 bg-bleu-1 rounded-full my-5 mx-auto shadow-sm transition-all duration-300 hover:w-28 hover:shadow-md animate-pulse-glow" />

          {/* Group Description (Always visible, clamped to 2 lines by default) */}
          {group.description && (
            <>
              <p
                ref={descriptionRef}
                className={`text-sm md:text-base text-light-3 max-w-2xl px-8 py-5 mt-4 mx-auto leading-relaxed whitespace-pre-line bg-dark-2/80 backdrop-blur-lg rounded-xl shadow-inner animate-accordion-down border border-dark-4/50 transition-all duration-400 hover:shadow-md overflow-hidden ${
                  expanded ? "" : "line-clamp-2"
                }`}>
                {group.description}
              </p>

              {/* Toggle Button if expansion is needed */}
              {(needsExpand || expanded) && (
                <button
                  onClick={() => {
                    setExpanded(!expanded);
                  }}
                  className="text-gray-500 text-sm md:text-base font-semibold px-5 py-2 bg-dark-2/70 backdrop-blur-sm rounded-full hover:bg-gradient-to-r hover:from-primary-500 hover:to-primary-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105 animate-pulse-glow group mt-4 mb-6"
                  aria-label={expanded ? "View Less" : "View All"}>
                  <span className="group-hover:brightness-125 transition-all duration-300">
                    {expanded ? "View Less" : "View All"}
                  </span>
                </button>
              )}
            </>
          )}

          {/* Category, Subcategory, and Tags Section */}
          <div className="px-8 py-5 bg-dark-2/60 backdrop-blur-lg border-t border-dark-4/30">
            {/* Category and Subcategory */}
            <div className="text-center mb-4">
              <p
                className="text-lg font-semibold text-light-2 cursor-pointer hover:underline hover:text-purple-400 transition-colors duration-300"
                onClick={handleCategoryClick}>
                {group.categoryName || "Unknown Category"}
                {group.subCategory ? ` / ${group.subCategory}` : ""}
              </p>
            </div>

            {/* Tags */}
            <div className="text-center">
              <div className="mb-2">
                <span className="text-sm font-semibold text-light-2">
                  Keywords:
                </span>
              </div>
              {group.tags && group.tags.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {group.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-dark-3 text-purple-400 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-purple-400 hover:text-dark-2 transition-all duration-300 hover:scale-105"
                      onClick={() => handleTagClick(tag)}>
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-light-4 italic">
                  No keywords available
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

GroupHeader.displayName = "GroupHeader";

export default GroupHeader;
