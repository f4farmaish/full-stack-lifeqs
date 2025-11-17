import { useEffect, useState, useMemo } from "react";
import { useUserContext } from "@/context/AuthContext";
import {
  useVoteOnPoll,
  useGetPolls,
  useGetUserVotes,
} from "@/lib/react-query/queries";
import { useInView } from "react-intersection-observer";
import Loader from "@/components/shared/Loader";
import PollCard from "@/components/shared/PollCard";
import TopicsList from "@/components/shared/TopicsList";
import FilterButtons from "@/components/shared/FilterButtons";
import { useSearchContext } from "@/context/SearchContext";
import { useSearchParams } from "react-router-dom";
import { FilterType } from "@/types";
import { useTranslation } from "react-i18next";

// ViewPolls component displays polls with category filtering and a filter button
const ViewPolls = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUserContext();
  const voteMutation = useVoteOnPoll();
  const { ref, inView } = useInView();
  const { searchValue } = useSearchContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // State for votes, category, subcategory, and filter
  const [votedOptions, setVotedOptions] = useState<Record<string, string>>({});
  const [hasFetchedVotes, setHasFetchedVotes] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subCategories, setSubCategories] = useState<string[] | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [postFilters, setPostFilters] = useState<any[]>([]);

  // Synchronize state with URL query parameters
  useEffect(() => {
    const categoryId = searchParams.get("categoryId");
    const subCategory = searchParams.get("subCategory");
    setSelectedCategory(categoryId || null);
    setSubCategories(subCategory ? [subCategory] : null);
  }, [searchParams]);

  // Fetch user votes using React Query
  const {
    data: userVotesPages,
    isLoading: isLoadingVotes,
    error: votesError,
  } = useGetUserVotes(user?.id || "");

  // Map user votes to pollId:optionId
  useEffect(() => {
    if (userVotesPages && !hasFetchedVotes) {
      const allVotes = userVotesPages.pages.flat();
      const votesMap = allVotes.reduce((acc: Record<string, string>, vote) => {
        acc[vote.pollId] = vote.optionId;
        return acc;
      }, {});
      setVotedOptions(votesMap);
      setHasFetchedVotes(true);
    }
  }, [userVotesPages, hasFetchedVotes]);

  // Handle filter changes from FilterButtons
  const handleFilterChange = (filters: any[], filterType: FilterType) => {
    setPostFilters(filters);
    setFilter(filterType);
  };

  // Fetch polls using React Query with filters
  const {
    data: pollsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingPolls,
    isError,
    error: pollsError,
  } = useGetPolls({
    categoryId: selectedCategory,
    searchQuery: searchValue,
    filters: postFilters,
  });

  // Memoized polls to prevent unnecessary re-renders
  const allPolls = useMemo(
    () =>
      pollsData?.pages.flatMap((page) =>
        page.documents.map((poll) => ({
          ...poll,
          creatorId: poll.creatorId?.$id || poll.creatorId || null,
        }))
      ) || [],
    [pollsData]
  );

  // Filter polls: exclude group polls, apply search, subcategory, and top sorting
  const filteredPolls = useMemo(() => {
    let polls = allPolls;

    // Exclude polls in groups
    polls = polls.filter((poll: any) => !poll.groupId && !poll.groupIdString);
    // Apply search filter
    if (searchValue) {
      polls = polls.filter((poll) =>
        poll.question.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    // Apply subcategory filter
    if (subCategories && subCategories.length > 0) {
      polls = polls.filter((poll) =>
        subCategories.includes(poll.subCategory || "")
      );
    }

    // Apply sorting
    if (filter === "top") {
      polls = [...polls].sort((a, b) => {
        const aScore = (a.likedBy?.length || 0) + (a.totalVotes || 0);
        const bScore = (b.likedBy?.length || 0) + (b.totalVotes || 0);
        return bScore - aScore;
      });
    } else {
      polls = [...polls].sort(
        (a, b) =>
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
      );
    }

    return polls;
  }, [allPolls, searchValue, subCategories, filter]);

  // Handle infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !searchValue) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, searchValue]);

  // Handle vote submission
  const handleVote = (pollId: string, optionIds: string[]) => {
    if (!isAuthenticated) {
      alert(t("polls.mustLoginToVote"));
      return;
    }

    const poll = allPolls.find((p) => p.$id === pollId);
    if (poll?.durationInDays) {
      const createdAt = new Date(poll.$createdAt);
      const endDate = new Date(createdAt);
      endDate.setDate(endDate.getDate() + poll.durationInDays);
      if (new Date() > endDate) {
        alert(t("polls.pollClosed"));
        return;
      }
    }

    voteMutation.mutate(
      { pollId, optionIds, userId: user.id },
      {
        onSuccess: () => {
          setVotedOptions((prev) => ({
            ...prev,
            [pollId]: optionIds.join(","),
          }));
        },
        onError: (error) => {
          alert(t("polls.errorSubmittingVote"));
        },
      }
    );
  };

  // Handle category and subcategory selection from TopicsList
  const handleCategorySelect = (
    categoryId: string | { $id: string } | null,
    subCats: string[] | null
  ) => {
    const categoryStringId =
      typeof categoryId === "object" ? categoryId.$id : categoryId;
    const params = new URLSearchParams();
    if (categoryStringId) {
      params.set("categoryId", categoryStringId);
      if (subCats && subCats.length > 0) {
        params.set("subCategory", subCats[0]);
      }
    }
    setSearchParams(params);
  };

  // Handle category/subcategory click from PollCard
  const handleCategoryClickFromPoll = (
    categoryId: string | { $id: string },
    subCategory?: string
  ) => {
    const categoryStringId =
      typeof categoryId === "object" ? categoryId.$id : categoryId;
    const params = new URLSearchParams();
    params.set("categoryId", categoryStringId);
    if (subCategory) {
      params.set("subCategory", subCategory);
    }
    setSearchParams(params);
  };

  // Handle browser back button navigation
  const onGoBack = () => {
    setSearchParams({});
  };

  // Loading state
  if (isLoadingPolls || (isAuthenticated && isLoadingVotes)) {
    return (
      <div className="flex items-center justify-center home-container">
        <Loader />
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* TopicsList for category filtering */}
      <div className="-mb-4">
        <TopicsList
          selectedCategoryId={selectedCategory}
          selectedSubCategory={subCategories?.[0] || null}
          setSelectedCategory={handleCategorySelect}
          onGoBack={onGoBack}
        />
      </div>

      {/* Divider with title and filter button */}
      <div className="relative w-full flex items-center my-4 max-w-screen-lg mx-auto -mb-6">
        <div className="flex-grow flex items-center">
          <hr className="flex-grow border-t border-gray-500" />
          <span className="px-4 text-gray-300 text-sm font-semibold bg-dark-1">
            {t("polls.pollsFeatured")}
          </span>
          <hr className="flex-grow border-t border-gray-500" />
        </div>
        <FilterButtons
          contentType="polls"
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Polls List - Display two PollCards per row in a columns layout */}
      <div className="w-full max-w-screen-lg mx-auto">
        {filteredPolls.length === 0 ? (
          <p className="text-light-4 mt-6 text-center w-full">
            {t("polls.noPolls")}
          </p>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-2 gap-4">
            {filteredPolls.map((poll) => {
              const totalVotes = poll.options.reduce(
                (sum, option) => sum + option.voteCount,
                0
              );
              const votedOptionId = votedOptions[poll.$id];

              return (
                <div key={poll.$id} className="break-inside-avoid mb-4">
                  <PollCard
                    poll={poll}
                    votedOptionId={votedOptionId}
                    totalVotes={totalVotes}
                    handleVote={handleVote}
                    onCategoryClick={handleCategoryClickFromPoll}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Infinite Scroll Loader */}
      {hasNextPage && (
        <div ref={ref} className="mt-12 flex justify-center">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default ViewPolls;
