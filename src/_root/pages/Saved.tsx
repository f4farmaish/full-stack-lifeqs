import { useState, useMemo } from "react";
import { GridPostList, Loader } from "@/components/shared";
import {
  useGetCurrentUser,
  useGetUserSavedItems,
} from "@/lib/react-query/queries";
import { Button } from "@/components/ui";
import { SavedContent } from "@/types";
import { useTranslation } from "react-i18next";

interface SavedProps {
  currentFilter?: "posts" | "polls" | "group" | null;
  onFilterChange?: (filter: "posts" | "polls" | "group" | null) => void;
}
const Saved = ({ currentFilter, onFilterChange }: SavedProps) => {
  const { t } = useTranslation();
  const { data: currentUser, isError: isUserError } = useGetCurrentUser();
  const safeCurrentUser = currentUser ?? undefined;
  const { data, isLoading, isError, fetchNextPage, hasNextPage } =
    useGetUserSavedItems(safeCurrentUser?.$id || "", {});

  // Use parent filter state if provided, otherwise use local state
  const [localFilter, setLocalFilter] = useState<
    "posts" | "polls" | "group" | null
  >(null);
  const filter = currentFilter !== undefined ? currentFilter : localFilter;
  const setFilter = onFilterChange || setLocalFilter;

  const savedItems = data?.pages.flatMap((page) => page.documents) ?? [];

  const filteredItems = useMemo(() => {
    if (!filter) return savedItems as SavedContent[]; // Show all items by default
    return (savedItems as SavedContent[]).filter((item) => {
      if (filter === "posts")
        return item.type === "post" && !item.groupIdString; // Non-group posts
      if (filter === "polls")
        return item.type === "poll" && !item.groupIdString; // Non-group polls
      if (filter === "group") return !!item.groupIdString; // All group items (posts/polls)
      return false;
    });
  }, [savedItems, filter]);

  // Handle filter button clicks
  // Handle filter button clicks
  const handleFilterClick = (newFilter: "posts" | "polls" | "group") => {
    setFilter(newFilter);
  };

  if (isLoading) return <Loader />;
  if (isError || isUserError) {
    return (
      <div className="flex flex-col items-center min-h-screen">
        <p className="text-light-4 text-center text-lg">
          {t("saved.errorLoading")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Render filter buttons */}
      <div className="flex justify-center max-w-5xl w-full mb-8 mx-auto gap-4">
        <Button
          onClick={() => handleFilterClick("posts")}
          className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
            filter === "posts" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
          }`}>
          <img
            src="/assets/icons/posts.svg"
            alt="posts"
            width={20}
            height={20}
          />
          {t("saved.questions")}
        </Button>
        <Button
          onClick={() => handleFilterClick("polls")}
          className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
            filter === "polls" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
          }`}>
          <img
            src="/assets/icons/polls.svg"
            alt="polls"
            width={20}
            height={20}
          />
          {t("saved.polls")}
        </Button>
        <Button
          onClick={() => handleFilterClick("group")}
          className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
            filter === "group" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
          }`}>
          <img
            src="/assets/icons/groups.svg"
            alt="group posts"
            width={20}
            height={20}
          />
          {t("saved.groupPosts")}
        </Button>
      </div>

      {/* Render filtered items */}
      {savedItems.length === 0 ? (
        <p className="text-light-4 text-center text-lg">{t("saved.noSavedItems")}</p>
      ) : (
        <ul className="w-full flex justify-center max-w-5xl">
          <GridPostList
            items={filteredItems}
            showStats={true}
            includeGroupItems={filter !== "polls"} // Include group items unless polls filter is active
            isSavedSection={true} // Pass prop for saved-specific rendering
          />
        </ul>
      )}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} className="mt-4">
          {t("saved.loadMore")}
        </Button>
      )}
    </div>
  );
};

export default Saved;
