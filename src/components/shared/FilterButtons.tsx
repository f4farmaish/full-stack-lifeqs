import { useState, useMemo } from "react";
import { Query } from "appwrite";
import { FilterType } from "@/types";
import { useTranslation } from "react-i18next";

interface FilterButtonsProps {
  contentType: "questions" | "polls" | "groups";
  onFilterChange: (filters: any[], filterType: FilterType) => void;
}

const FilterButtons = ({ contentType, onFilterChange }: FilterButtonsProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>("all");

  const getTimeFilter = () => {
    const now = new Date();
    if (filter === "last24h") {
      now.setHours(now.getHours() - 24);
      return now.toISOString();
    }
    if (filter === "last72h") {
      now.setDate(now.getDate() - 3);
      return now.toISOString();
    }
    if (filter === "last1month") {
      now.setDate(now.getDate() - 30);
      return now.toISOString();
    }
    return null;
  };

  const computedFilters = useMemo(() => {
    let filters: any[] = [];
    let orderAttr = "$createdAt";
    if (contentType === "groups") {
      if (filter === "top") {
        orderAttr = "memberCount";
      } else if (filter === "all") {
        orderAttr = "lastActivityTimestamp";
      }
    }
    filters.push(Query.orderDesc(orderAttr));
    const timeFilter = getTimeFilter();
    if (timeFilter) {
      filters.push(Query.greaterThanEqual("$createdAt", timeFilter));
    }
    return filters;
  }, [filter, contentType]);

  useMemo(() => {
    onFilterChange(computedFilters, filter);
  }, [computedFilters, filter, onFilterChange]);

  const handleFilterChange = () => {
    const filterOrder: FilterType[] = ["all", "top", "last24h", "last72h", "last1month"];
    const currentIndex = filterOrder.indexOf(filter);
    const nextIndex = (currentIndex + 1) % filterOrder.length;
    const nextFilter = filterOrder[nextIndex];
    setFilter(nextFilter);
  };

  const getFilterDisplayName = () => {
    switch (filter) {
      case "all":
        return contentType === "questions"
          ? t("filters.allQuestions")
          : contentType === "polls"
          ? t("filters.allPolls")
          : t("filters.allGroups");
      case "top":
        return t("filters.top");
      case "last24h":
        return t("filters.last24h");
      case "last72h":
        return t("filters.last72h");
      case "last1month":
        return t("filters.last1month");
      default:
        return contentType === "questions"
          ? t("filters.allQuestions")
          : contentType === "polls"
          ? t("filters.allPolls")
          : t("filters.allGroups");
    }
  };

  return (
    <div
      className="flex items-center gap-3 bg-dark-3 rounded-xl px-4 py-2 cursor-pointer ml-4"
      onClick={handleFilterChange}
    >
      <p className="small-medium md:base-medium text-light-2">
        {getFilterDisplayName()}
      </p>
      <img
        src="/assets/icons/filter.svg"
        width={20}
        height={20}
        alt="filter"
      />
    </div>
  );
};

export default FilterButtons;