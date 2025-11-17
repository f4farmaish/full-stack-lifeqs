import { useEffect, useState, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { Loader, PostCard } from "@/components/shared";
import TopicsList from "@/components/shared/TopicsList";
import FilterButtons from "@/components/shared/FilterButtons";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearchContext } from "@/context/SearchContext";
import { Models, AppwriteException } from "appwrite";
import { useGetPosts, useSearchPosts } from "@/lib/react-query/queries";
import { FilterType } from "@/types";
import { useTranslation } from "react-i18next";

// Define Post type based on database schema
type Post = Models.Document & {
  title: string;
  creatorId: string;
  creatorName: string;
  creatorImageUrl: string;
  categoryId: string;
  categoryName: string;
  subCategory: string;
  createdAt: string;
  isAnonymous: boolean;
  imageUrl?: string;
  tags?: string[];
  edits?: string[];
  groupIdString: string | null;
  likedBy: string[];
};

const Questions = () => {
  const { t } = useTranslation();
  // State for category and subcategory selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [subCategories, setSubCategories] = useState<string[] | null>(null);
  // State for filter to handle client-side sorting for "top"
  const [filter, setFilter] = useState<FilterType>("all");
  // State for filters from FilterButtons
  const [postFilters, setPostFilters] = useState<any[]>([]);
  // Hook for infinite scroll
  const { ref, inView } = useInView();
  // Search context for filtering posts
  const { searchValue, setSearchContext } = useSearchContext();
  // Location and navigation for handling state
  const location = useLocation();
  const navigate = useNavigate();

  // Set search context to "posts" when search value changes
  useEffect(() => {
    setSearchContext(searchValue.startsWith("@") ? "user" : "posts");
  }, [searchValue, setSearchContext]);

  // Handle category/subcategory passed via navigation
  useEffect(() => {
    if (location.state?.categoryId || location.state?.subCategory) {
      const categoryId =
        typeof location.state.categoryId === "object"
          ? location.state.categoryId.$id
          : location.state.categoryId;
      const subCategory = location.state.subCategory;

      setSelectedCategoryId(categoryId || null);
      setSubCategories(subCategory ? [subCategory] : null);
    } else {
      setSelectedCategoryId(null);
      setSubCategories(null);
    }
  }, [location.state]);

  // Handle filter changes from FilterButtons
  const handleFilterChange = (filters: any[], filterType: FilterType) => {
    setPostFilters(filters);
    setFilter(filterType);
  };

  // Fetch posts using React Query with filters
  const {
    data: postData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isPostsLoading,
    error: postsError,
  } = useGetPosts(selectedCategoryId, subCategories?.[0] || null, postFilters);

  // Fetch search results when searchValue is non-empty
  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useSearchPosts(searchValue, undefined, undefined);

  // Memoize posts with sorting for Top and search results
  const allPosts: Post[] = useMemo(() => {
    let posts: Post[] = [];

    if (searchValue && searchData) {
      // Use search results when searching
      posts = searchData.documents
        .filter((doc: Models.Document) => {
          const post = doc as Post;
          const isGlobal = post.groupIdString === "" || post.groupIdString === null;
          return isGlobal;
        })
        .map((doc: Models.Document) => {
          const post = doc as Post;
          return {
            ...post,
            type: "post",
          };
        });
    } else {
      // Use regular posts when not searching
      posts =
        postData?.pages.flatMap((page) => {
          const filteredDocs = page.documents
            .filter((doc: Models.Document) => {
              const post = doc as Post;
              const isGlobal = post.groupIdString === "" || post.groupIdString === null;
              return isGlobal;
            })
            .map((doc: Models.Document) => {
              const post = doc as Post;
              return {
                ...post,
                type: "post",
              };
            });
          return filteredDocs;
        }) || [];
    }

    // Apply client-side sorting for "top" filter
    if (filter === "top") {
      posts = [...posts].sort(
        (a, b) => (b.likedBy?.length || 0) - (a.likedBy?.length || 0)
      );
    }

    return posts;
  }, [postData, searchData, searchValue, filter, hasNextPage, isFetchingNextPage]);

  // Handle category selection from TopicsList
  const handleCategorySelect = (
    categoryId: string | { $id: string } | null,
    subCats: string[] | null
  ) => {
    const categoryStringId =
      typeof categoryId === "object" ? categoryId.$id : categoryId;
    navigate("/questions", {
      state: {
        categoryId: categoryStringId,
        subCategory: subCats ? subCats[0] : null,
      },
    });
  };

  // Handle category click from PostCard
  const handleCategoryClickFromPost = (
    categoryId: string | { $id: string },
    subCategory?: string
  ) => {
    const categoryStringId =
      typeof categoryId === "object" ? categoryId.$id : categoryId;
    navigate("/questions", {
      state: {
        categoryId: categoryStringId,
        subCategory: subCategory || null,
      },
    });
  };

  // Handle browser back button navigation
  const onGoBack = () => {
    navigate(-1);
  };

  // Trigger infinite scroll when the bottom loader is in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !searchValue) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, searchValue]);

  // Determine if search results or no content should be displayed
  const hasNoContent = useMemo(() => {
    const noContent =
      !searchValue &&
      (!postData || postData.pages.every((page) => !page.documents.length));
    return noContent;
  }, [searchValue, postData]);

  return (
    <div className="home-container">
      {/* Display TopicsList for category selection */}
      <div className="-mb-4">
        <TopicsList
          selectedCategoryId={selectedCategoryId}
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
            {t("questions.questionsFeatured")}
          </span>
          <hr className="flex-grow border-t border-gray-500" />
        </div>
        <FilterButtons
          contentType="questions"
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Display posts or loading/error states */}
      {(isPostsLoading && !searchValue) || (isSearchLoading && searchValue) ? (
        <Loader />
      ) : postsError || searchError ? (
        <p className="text-light-4 mt-6 text-center w-full">
          {t("questions.errorFetchingPosts")}{" "}
          {(postsError as AppwriteException)?.message ||
            (searchError as AppwriteException)?.message ||
            "Unknown error"}
        </p>
      ) : (
        <div className="w-full max-w-screen-lg mx-auto">
          {searchValue !== "" ? (
            // Render search results
            <div className="columns-1 sm:columns-2 md:columns-2 gap-4">
              {allPosts.length > 0 ? (
                allPosts.map((post) => (
                  <div key={post.$id} className="break-inside-avoid mb-4">
                    <PostCard post={post} />
                  </div>
                ))
              ) : (
                <p className="text-light-4 mt-6 text-center w-full">
                  {t("questions.noSearchResults")}
                </p>
              )}
            </div>
          ) : hasNoContent ? (
            // Display message if no posts are found
            <p className="text-light-4 mt-6 text-center w-full">
              {t("questions.noQuestionsFound")}
            </p>
          ) : (
            // Render posts normally
            <div className="columns-1 sm:columns-2 md:columns-2 gap-4">
              {allPosts.length > 0 ? (
                allPosts.map((post) => (
                  <div key={post.$id} className="break-inside-avoid mb-4">
                    <PostCard
                      post={post}
                      onCategoryClick={handleCategoryClickFromPost}
                    />
                  </div>
                ))
              ) : (
                <p className="text-light-4 mt-6 text-center w-full">
                  {t("questions.noQuestionsAvailable")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Infinite scroll loader */}
      {searchValue === "" && hasNextPage && (
        <div ref={ref} className="mt-10">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default Questions;