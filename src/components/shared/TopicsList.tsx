import React from "react";
import { Loader } from "@/components/shared";
import {
  FaHeart,
  FaGraduationCap,
  FaBaby,
  FaDog,
  FaRunning,
  FaUserFriends,
  FaBriefcase,
  FaPaintBrush,
  FaBuilding,
  FaPalette,
  FaPlusCircle,
  FaQuestion,
} from "react-icons/fa";
import { useCategories } from "@/lib/react-query/queries";
import { ICategory } from "@/types";
import { useTranslation } from "react-i18next";
import { getCategoryName, getSubcategories } from "@/lib/categoryTranslation";

// Category icons mapping
const categoryIcons: Record<string, JSX.Element> = {
  family: <FaUserFriends className="text-lg" />,
  health: <FaPlusCircle className="text-lg" />,
  "beauty & care": <FaPaintBrush className="text-lg" />,
  relationships: <FaHeart className="text-lg" />, // Updated from "relationship"
  "education & career": <FaGraduationCap className="text-lg" />,
  "hobbies & leisure": <FaPalette className="text-lg" />,
  household: <FaBuilding className="text-lg" />,
  sports: <FaRunning className="text-lg" />,
  "babies & kids": <FaBaby className="text-lg" />,
  animals: <FaDog className="text-lg" />,
  "society & economy": <FaBriefcase className="text-lg" />,
  others: <FaQuestion className="text-lg" />,
};

// Fixed list of category names (exactly 12, with "OTHERS" as the 12th)
const fixedCategoryNames = [
  "FAMILY",
  "BABIES & KIDS",
  "HEALTH",
  "BEAUTY & CARE",
  "HOBBIES & LEISURE",
  "RELATIONSHIPS",
  "EDUCATION & CAREER",
  "SPORTS",
  "HOUSEHOLD",
  "SOCIETY & ECONOMY",
  "ANIMALS",
  "OTHERS",
];

// Composed type for category data using central ICategory
type Category = ICategory & {
  icon: JSX.Element;
};

// Props type for TopicsList
type TopicsListProps = {
  selectedCategoryId: string | null;
  selectedSubCategory: string | null;
  setSelectedCategory: (
    categoryId: string | null,
    subCategories: string[] | null
  ) => void;
  onGoBack: () => void;
};

// TopicsList component displays categories and subcategories for filtering
const TopicsList: React.FC<TopicsListProps> = React.memo(
  ({ selectedCategoryId, selectedSubCategory, setSelectedCategory }) => {
    const { data: rawCategories = [], isLoading } = useCategories();
    const { i18n } = useTranslation();
    const currentLang = i18n.language.startsWith("lv") ? "lv" : "en";

    // Map database categories to fixed 12 categories
    const categories: Category[] = (() => {
      const mappedCategories: Category[] = [];
      const usedCategoryIds = new Set<string>();

      fixedCategoryNames.forEach((fixedName, index) => {
        const dbCategory = rawCategories.find(
          (cat) =>
            cat.name.toLowerCase() === fixedName.toLowerCase() &&
            !usedCategoryIds.has(cat.$id)
        );

        if (dbCategory) {
          mappedCategories.push({
            ...dbCategory,
            icon:
              categoryIcons[fixedName.toLowerCase()] || categoryIcons["others"],
          });
          usedCategoryIds.add(dbCategory.$id);
        } else {
          mappedCategories.push({
            $id: `fallback-${index}`,
            name: fixedName,
            subCategories:
              fixedName === "OTHERS"
                ? rawCategories
                    .filter((cat) => !usedCategoryIds.has(cat.$id))
                    .flatMap((cat) => cat.subCategories)
                : [],
            name_en: fixedName,
            name_lat: fixedName,
            subcategories_en:
              fixedName === "OTHERS"
                ? rawCategories
                    .filter((cat) => !usedCategoryIds.has(cat.$id))
                    .flatMap((cat) => cat.subCategories)
                : [],
            subcategories_lat:
              fixedName === "OTHERS"
                ? rawCategories
                    .filter((cat) => !usedCategoryIds.has(cat.$id))
                    .flatMap((cat) => cat.subCategories)
                : [],
            icon:
              categoryIcons[fixedName.toLowerCase()] || categoryIcons["others"],
          });
        }
      });

      while (mappedCategories.length < 12) {
        mappedCategories.push({
          $id: `fallback-${mappedCategories.length}`,
          name: "OTHERS",
          subCategories: [],
          name_en: "OTHERS",
          name_lat: "CITI",
          subcategories_en: [],
          subcategories_lat: [],
          icon: categoryIcons["others"],
        });
      }

      return mappedCategories.slice(0, 12);
    })();

    // Find active category for displaying subcategories
    const activeCategory = categories.find(
      (cat) => cat.$id === selectedCategoryId
    );
    const activeCategoryName = activeCategory
      ? getCategoryName(activeCategory, currentLang as "en" | "lv")
      : null;

    const activeSubcategoriesEnglish = activeCategory
      ? getSubcategories(activeCategory, "en")
      : [];
    const activeSubcategoriesDisplay = activeCategory
      ? getSubcategories(activeCategory, currentLang as "en" | "lv")
      : [];

    // Loading state
    if (isLoading) return <Loader />;

    return (
      <div className="mt-4">
        <div className="topics-list-inner">
          {activeCategoryName && (
            <div
              className="active-category-title-container flex justify-center items-center cursor-pointer"
              onClick={() => {
                setSelectedCategory(selectedCategoryId, null);
              }}>
              <div
                className={`active-category-title px-4 py-2 text-center ${
                  selectedCategoryId && !selectedSubCategory
                    ? "!bg-primary-500 !text-light-1"
                    : ""
                }`}>
                <h2
                  className={`active-category-text ${
                    selectedCategoryId && !selectedSubCategory
                      ? "font-bold"
                      : ""
                  }`}>
                  {activeCategoryName}
                </h2>
              </div>
            </div>
          )}

          {selectedCategoryId === null ? (
            <div className="category-filters-grid">
              {categories.map((category) => {
                const categoryName = getCategoryName(
                  category,
                  currentLang as "en" | "lv"
                );
                return (
                  <button
                    key={category.$id}
                    className="topic-card flex items-center gap-2 justify-center"
                    onClick={() => {
                      setSelectedCategory(category.$id, null);
                    }}>
                    {category.icon}
                    <span className="font-medium text-sm">{categoryName}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <div
                className={
                  activeSubcategoriesDisplay.length === 4
                    ? "subcategory-filters-grid-centered"
                    : "subcategory-filters-grid"
                }>
                {activeSubcategoriesDisplay.length > 0 ? (
                  activeSubcategoriesDisplay.map(
                    (subCategoryDisplay, index) => {
                      const subCategoryEnglish =
                        activeSubcategoriesEnglish[index];

                      return (
                        <button
                          key={subCategoryDisplay}
                          className={`topic-card flex items-center gap-2 justify-center ${
                            selectedSubCategory === subCategoryEnglish
                              ? "bg-primary-500 text-light-1"
                              : ""
                          } hover:bg-primary-600 hover:text-light-1`}
                          onClick={() => {
                            setSelectedCategory(
                              selectedCategoryId,
                              selectedSubCategory === subCategoryEnglish
                                ? null
                                : [subCategoryEnglish]
                            );
                          }}>
                          <span className="font-medium text-sm">
                            {subCategoryDisplay}
                          </span>
                        </button>
                      );
                    }
                  )
                ) : (
                  <p className="text-light-4 text-center col-span-6">
                    No subcategories available
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default TopicsList;
