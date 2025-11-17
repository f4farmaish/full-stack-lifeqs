import { useState, useMemo } from "react";
import { GridPostList, Loader } from "@/components/shared";
import { Button } from "@/components/ui";
import {
  useGetCurrentUser,
  useGetLikedPosts,
  useGetLikedPolls,
} from "@/lib/react-query/queries";
import { useTranslation } from "react-i18next";

interface LikedPostsProps {
  currentFilter?: "posts" | "polls" | null;
  onFilterChange?: (filter: "posts" | "polls" | null) => void;
}

const LikedPosts = ({ currentFilter, onFilterChange }: LikedPostsProps) => {
  const { t } = useTranslation();
  const { data: currentUser } = useGetCurrentUser();
  const { data: likedPosts, isLoading: isPostsLoading } = useGetLikedPosts(
    currentUser?.$id || ""
  );
  const { data: likedPolls, isLoading: isPollsLoading } = useGetLikedPolls(
    currentUser?.$id || ""
  );

  // Use parent filter state if provided, otherwise use local state
  const [localFilter, setLocalFilter] = useState<"posts" | "polls" | null>(
    null
  );
  const filter = currentFilter !== undefined ? currentFilter : localFilter;
  const setFilter = onFilterChange || setLocalFilter;

  // Combine liked posts and polls
  const likedItems = useMemo(() => {
    const combined = [
      ...(likedPosts || []).map((post) => ({
        ...post,
        type: "post" as const,
        title: post.title,
      })),
      ...(likedPolls || []).map((poll) => ({
        ...poll,
        type: "poll" as const,
        title: poll.question,
      })),
    ];
    return combined;
  }, [likedPosts, likedPolls]);

  // Memoize filtered items
  const filteredItems = useMemo(() => {
    if (!filter) return likedItems; // Show all items by default
    return likedItems.filter((item) => {
      if (filter === "posts") return item.type === "post"; // Include group posts
      if (filter === "polls") return item.type === "poll";
      return false;
    });
  }, [likedItems, filter]);

  const handleFilterClick = (newFilter: "posts" | "polls") => {
    setFilter(newFilter);
  };

  if (!currentUser || isPostsLoading || isPollsLoading) return <Loader />;

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Filter buttons */}
      <div className="flex justify-center max-w-5xl w-full mb-8 mx-auto gap-4">
        <Button
          onClick={() => handleFilterClick("posts")}
          className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
            filter === "posts" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
          }`}
          aria-label="Filter by questions">
          <img
            src="/assets/icons/posts.svg"
            alt="posts"
            width={20}
            height={20}
          />
          {t("likedPosts.questions")}
        </Button>
        <Button
          onClick={() => handleFilterClick("polls")}
          className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
            filter === "polls" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
          }`}
          aria-label="Filter by polls">
          <img
            src="/assets/icons/polls.svg"
            alt="polls"
            width={20}
            height={20}
          />
          {t("likedPosts.polls")}
        </Button>
      </div>

      {/* Render items */}
      {likedItems.length === 0 ? (
        <p className="text-light-4 text-center text-lg">
          {t("likedPosts.noLikedPosts")}
        </p>
      ) : (
        <ul className="w-full flex justify-center max-w-5xl">
          <GridPostList
            items={filteredItems}
            showStats={false}
            includeGroupItems={filter !== "polls"}
          />
        </ul>
      )}
    </div>
  );
};

export default LikedPosts;
