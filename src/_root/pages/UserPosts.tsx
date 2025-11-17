import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GridPostList, Loader } from "@/components/shared";
import { Button } from "@/components/ui";
import { Models } from "appwrite";
import { Post, IPoll } from "@/types";

interface UserPostsProps {
  userPosts?: Models.Document[];
  userPolls?: Models.Document[];
  userDrafts?: Models.Document[];
  isCurrentUser: boolean;
  currentFilter?: "posts" | "polls" | "drafts" | null;
  onFilterChange?: (filter: "posts" | "polls" | "drafts" | null) => void;
  onCategoryClick: (categoryId: string, subCategory?: string) => void;
}

const UserPosts = ({
  userPosts = [],
  userPolls = [],
  userDrafts = [],
  isCurrentUser,
  currentFilter,
  onFilterChange,
  onCategoryClick,
}: UserPostsProps) => {
  const { t } = useTranslation();
  const [localFilter, setLocalFilter] = useState<
    "posts" | "polls" | "drafts" | null
  >(null);
  const filter = currentFilter !== undefined ? currentFilter : localFilter;
  const setFilter = onFilterChange || setLocalFilter;

  const publicPosts = useMemo(
    () => userPosts.filter((post) => !post.groupIdString),
    [userPosts]
  );

  const publicPolls = useMemo(
    () => userPolls.filter((poll) => !poll.groupIdString),
    [userPolls]
  );

  const allItems = useMemo(() => {
    const combined = [
      ...(publicPosts || []).map((post) => ({
        ...post,
        type: "post" as const,
        title: (post as unknown as Post).title || "Untitled",
        content: (post as unknown as Post).content || "",
        imageUrl: (post as unknown as Post).imageUrl || "",
        caption: (post as unknown as Post).caption || "",
        tags: (post as unknown as Post).tags || [],
        isDraft: false,
      })),
      ...(publicPolls || []).map((poll) => ({
        ...poll,
        type: "poll" as const,
        title: (poll as unknown as IPoll).question || "Untitled",
        content: (poll as unknown as IPoll).question || "",
        imageUrl: (poll as unknown as IPoll).imageUrl || "",
        caption: (poll as unknown as IPoll).caption || "",
        tags: (poll as unknown as IPoll).tags || [],
        isDraft: false,
      })),
      ...(userDrafts || []).map((draft) => {
        const isPollDraft = !!(draft as unknown as IPoll).question;
        return {
          ...draft,
          type: isPollDraft ? ("poll" as const) : ("post" as const),
          title:
            (draft as unknown as Post).title ||
            (draft as unknown as IPoll).question ||
            "Untitled Draft",
          content:
            (draft as unknown as Post).content ||
            (draft as unknown as IPoll).question ||
            "",
          imageUrl:
            (draft as unknown as Post).imageUrl ||
            (draft as unknown as IPoll).imageUrl ||
            "",
          caption:
            (draft as unknown as Post).caption ||
            (draft as unknown as IPoll).caption ||
            "",
          tags:
            (draft as unknown as Post).tags ||
            (draft as unknown as IPoll).tags ||
            [],
          isDraft: true,
        };
      }),
    ];
    return combined;
  }, [publicPosts, publicPolls, userDrafts]);

  const filteredItems = useMemo(() => {
    if (!filter) return allItems;
    return allItems.filter((item) => {
      if (filter === "posts") return item.type === "post" && !item.isDraft;
      if (filter === "polls") return item.type === "poll" && !item.isDraft;
      if (filter === "drafts") return item.isDraft;
      return false;
    });
  }, [allItems, filter]);

  const handleFilterClick = (newFilter: "posts" | "polls" | "drafts") => {
    setFilter(newFilter);
  };

  if (!userPosts || !userPolls || !userDrafts) return <Loader />;

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* ✅ Filter buttons with translations */}
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
          {t("profile.Questions")}
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
          {t("profile.Polls")}
        </Button>

        {isCurrentUser && (
          <Button
            onClick={() => handleFilterClick("drafts")}
            className={`profile-tab flex items-center gap-2 px-5 py-3 rounded-lg text-light-1 transition-colors ${
              filter === "drafts" ? "!bg-dark-3" : "bg-dark-4 hover:bg-dark-3"
            }`}
            aria-label="Filter by drafts">
            <img
              src="/assets/icons/edit.svg"
              alt="drafts"
              width={20}
              height={20}
            />
            {t("profile.Drafts")}
          </Button>
        )}
      </div>

      {/* Render items */}
      {allItems.length === 0 ? (
        <p className="text-light-4 text-center text-lg">
          {t("profile.noPosts")}
        </p>
      ) : (
        <ul className="w-full flex justify-center max-w-5xl">
          <GridPostList
            items={filteredItems}
            showUser={false}
            showStats={filter !== "drafts"}
            includeGroupItems={false}
            onCategoryClick={onCategoryClick}
          />
        </ul>
      )}
    </div>
  );
};

export default UserPosts;
