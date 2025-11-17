import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import GroupsByCategoryList from "@/components/groups/GroupsByCategoryList";
import GroupCard from "@/components/groups/GroupCard";
import Loader from "@/components/shared/Loader";
import { useSearchContext } from "@/context/SearchContext";
import { useInfiniteGroups } from "@/lib/react-query/queries";
import FilterButtons from "@/components/shared/FilterButtons";
import TagFilterHeader from "@/components/shared/TagFilterHeader";
import { FilterType } from "@/types";

const ViewGroups = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [subCategories, setSubCategories] = useState<string[] | null>(null);
  const [searchParams] = useSearchParams();
  const tagFromQuery = searchParams.get("tag");
  const { ref, inView } = useInView();
  const navigate = useNavigate();
  const location = useLocation();
  const { searchValue, setSearchContext } = useSearchContext();
  const [filter, setFilter] = useState<FilterType>("all");
  const [groupFilters, setGroupFilters] = useState<any[]>([]);

  // Set default context to "groups"
  useEffect(() => {
    setSearchContext("groups");
  }, [setSearchContext]);

  // Handle navigation state
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

  // Handle tag filter via URL
  useEffect(() => {
    if (tagFromQuery) {
      setSelectedCategoryId(null);
      setSubCategories(null);
    }
  }, [tagFromQuery]);

  const handleFilterChange = (filters: any[], filterType: FilterType) => {
    setGroupFilters(filters);
    setFilter(filterType);
  };

  // Optimized data fetch via custom hook
  const {
    data: groupsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: groupsLoading,
  } = useInfiniteGroups({
    categoryId: selectedCategoryId,
    subCategory: subCategories?.[0],
    search: searchValue,
    tag: tagFromQuery,
    filters: groupFilters,
  });

  // Memoized groups to prevent unnecessary re-renders
  const allGroups = useMemo(() => {
    return groupsData?.pages.flatMap((page) => page.documents) || [];
  }, [groupsData]);

  const handleCategorySelect = (
    categoryId: string | null,
    subCats: string[] | null
  ) => {
    navigate(location.pathname, {
      state: {
        categoryId,
        subCategory: subCats ? subCats[0] : null,
      },
    });
  };

  // Infinite scroll loader
  useEffect(() => {
    if (
      inView &&
      hasNextPage &&
      !isFetchingNextPage &&
      !searchValue &&
      !tagFromQuery
    ) {
      fetchNextPage();
    }
  }, [
    inView,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    searchValue,
    tagFromQuery,
  ]);

  return (
    <div className="home-container">
      {/* Categories or Subcategories */}
      <div className="-mb-4">
        <GroupsByCategoryList
          selectedCategoryId={selectedCategoryId}
          selectedSubCategory={subCategories?.[0] || null}
          setSelectedCategory={handleCategorySelect}
        />
      </div>

      {/* Divider with Text */}
      <div className="relative w-full flex items-center my-4 max-w-screen-lg mx-auto -mb-6">
        <div className="flex-grow flex items-center">
          <hr className="flex-grow border-t border-gray-500" />
          <span className="px-4 text-gray-300 text-sm font-semibold bg-dark-1">
            LIFEQS GROUPS
          </span>
          <hr className="flex-grow border-t border-gray-500" />
        </div>
        <FilterButtons
          contentType="groups"
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Tag Filter Heading */}
      <TagFilterHeader tag={tagFromQuery} resetPath="/groups" />

      {/* Groups List - Display two GroupCards per row in a column layout matching Questions */}
      <div className="w-full max-w-screen-lg mx-auto">
        {groupsLoading ? (
          <Loader />
        ) : allGroups.length === 0 ? (
          <p className="text-light-4 mt-6 text-center w-full">
            No groups found
          </p>
        ) : (
          <div className="columns-1 sm:columns-2 gap-4">
            {allGroups.map((group: any) => (
              <div key={group.$id} className="break-inside-avoid mb-4">
                <GroupCard
                  group={{
                    ...group,
                    categoryName: group.categoryName,
                    subCategory: group.subCategory,
                    tags: group.tags || [],
                  }}
                  onTitleClick={() => navigate(`/groups/${group.$id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Infinite Loading */}
      {(isFetchingNextPage || (hasNextPage && inView)) && (
        <div ref={ref} className="mt-12 flex items-center justify-center">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default ViewGroups;
