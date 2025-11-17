import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import ShareButtons from "@/components/shared/ShareButtons";
import { IGroup } from "@/types";

type GroupCardProps = {
  group: IGroup;
  onTitleClick?: () => void;
  requestCount?: number;
  onRequestClick?: () => void;
};

const GroupCard = ({
  group,
  onTitleClick,
  requestCount,
  onRequestClick,
}: GroupCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Handle category/subcategory click
  const handleCategoryClick = () => {
    if (group.categoryId && group.subCategory) {
      navigate("/groups", {
        state: {
          categoryId: group.categoryId,
          subCategory: group.subCategory,
        },
      });
    }
  };

  // Prepare description with fallback
  const description =
    typeof group.description === "string" && group.description.trim() !== ""
      ? group.description
      : "No description available";

  const tags =
    Array.isArray(group.tags) && group.tags.length > 0
      ? group.tags
      : ["No tags available"];

  const shareUrl = `${window.location.origin}/groups/${group.$id}`;
  const shareContent = `Join this group: ${
    group.name
  } - ${group.description.slice(0, 100)}...`;

  const handleCopyLink = (url: string, itemId: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({ title: "Link copied to clipboard!" });
      })
      .catch((err) => {
        console.error(
          `GroupCard: Failed to copy link for group ${itemId}:`,
          err
        );
        toast({ variant: "destructive", title: "Failed to copy link." });
      });
  };

  const handleToggleShare = () => {
    setIsShareOpen((prev) => !prev);
  };

  return (
    <div className="post-card relative break-inside-avoid rounded-xl mb-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border-group-border border-2 overflow-hidden">
      <div className="bg-group-bg bg-opacity-20 h-full flex flex-col rounded-xl">
        <div className="absolute top-3 right-3 z-10">
          <img
            src="/assets/icons/share.svg"
            alt="share"
            width={35}
            height={35}
            className="cursor-pointer bg-dark-3/80 rounded-full p-2 hover:bg-dark-4/90 transition-colors"
            onClick={handleToggleShare}
          />
          {isShareOpen && (
            <div className="absolute top-12 right-0 bg-dark-2 rounded-lg shadow-lg p-2 border border-dark-4">
              <ShareButtons
                shareUrl={shareUrl}
                shareContent={shareContent}
                handleCopyLink={handleCopyLink}
                postId={group.$id}
              />
            </div>
          )}
        </div>

        {group.imageUrl && (
          <div className="w-full h-40 relative overflow-hidden rounded-t-xl">
            <img
              src={group.imageUrl}
              alt={group.name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onTitleClick?.()}
            />
          </div>
        )}
        <div className="p-3 relative group">
          {requestCount !== undefined && (
            <div
              className={`absolute top-0 right-2 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1
              transition-all duration-300 ease-in-out transform hover:scale-110 ${
                requestCount > 0
                  ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                  : "bg-gray-500 text-gray-300"
              }`}
              onClick={() => {
                if (requestCount > 0 && onRequestClick) {
                  onRequestClick();
                }
              }}>
              <img
                src="/assets/icons/click.svg"
                alt="Requests"
                className="w-4 h-4 opacity-90"
              />
              <span className="hover:underline hover:text-yellow-300">
                {requestCount} Requests
              </span>
            </div>
          )}

          {/* Group Name with Click Handler */}
          <h2
            className="text-lg font-bold text-light-1 text-center whitespace-normal break-words hover:underline hover:text-purple-400 cursor-pointer"
            onClick={() => {
              onTitleClick && onTitleClick();
            }}>
            {group.name}
          </h2>

          {/* Description - Always show two lines */}
          <p className="text-sm text-light-3 mt-2 text-center line-clamp-2">
            {description}
          </p>

          {/* Decorative underline */}
          <div className="mt-3 h-1 w-16 bg-purple-400 rounded-full mx-auto"></div>

          {/* Category and Subcategory */}
          <p
            className="text-sm text-light-2 mt-4 text-center cursor-pointer hover:underline hover:text-purple-400"
            onClick={handleCategoryClick}>
            {group.categoryName || "Unknown Category"}
            {group.subCategory ? ` / ${group.subCategory}` : ""}
          </p>

          {/* Tags */}
          {tags && (
            <div className="mt-2 text-sm text-light-3 text-center flex flex-wrap justify-center gap-1">
              <strong className="w-full text-light-2 text-xs">Keywords:</strong>
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-dark-2 text-purple-400 px-2 py-1 rounded-md text-xs whitespace-nowrap hover:underline cursor-pointer"
                  onClick={() =>
                    navigate(`/groups?tag=${encodeURIComponent(tag)}`)
                  }>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
