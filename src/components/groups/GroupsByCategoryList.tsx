import React, { useEffect, useState } from "react";
import { Loader } from "@/components/shared";
import { ICategory } from "@/types";
import { useCategories } from "@/lib/react-query/queries";
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

// Icon mapping for known categories
const categoryIcons: Record<string, JSX.Element> = {
  family: <FaUserFriends className="text-lg" />,
  health: <FaPlusCircle className="text-lg" />,
  "beauty & care": <FaPaintBrush className="text-lg" />,
  relationships: <FaHeart className="text-lg" />, // Updated from "relationship"
  "education & career": <FaGraduationCap className="text-lg" />,
  "hobbies & leisure": <FaPalette className="text-lg" />,
  household: <FaBuilding className="text-lg" />,
  sports: <FaRunning className="text-lg" />,
  "babies & kids": <FaBaby className="text-lg" />, // Updated from "babies and kids"
  animals: <FaDog className="text-lg" />,
  "society & economy": <FaBriefcase className="text-lg" />,
  others: <FaQuestion className="text-lg" />, // Updated from "other"
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

// Props type for GroupsByCategoryList
type GroupsByCategoryListProps = {
  selectedCategoryId: string | null;
  selectedSubCategory: string | null;
  setSelectedCategory: (
    categoryId: string | null,
    subCategories: string[] | null
  ) => void;
};

// GroupsByCategoryList component displays categories and subcategories for filtering
const GroupsByCategoryList: React.FC<GroupsByCategoryListProps> = React.memo(
  ({ selectedCategoryId, selectedSubCategory, setSelectedCategory }) => {
    const { data: rawCategories, isLoading, isError } = useCategories();
    const [categories, setCategories] = useState<Category[]>([]);

    // Enrich categories with icons and enforce fixed order after fetch
    useEffect(() => {
      if (rawCategories) {
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
                categoryIcons[fixedName.toLowerCase()] ||
                categoryIcons["others"],
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
              icon:
                categoryIcons[fixedName.toLowerCase()] ||
                categoryIcons["others"],
            });
          }
        });

        while (mappedCategories.length < 12) {
          mappedCategories.push({
            $id: `fallback-${mappedCategories.length}`,
            name: "OTHERS",
            subCategories: [],
            icon: categoryIcons["others"],
          });
        }

        setCategories(mappedCategories.slice(0, 12));
      }
    }, [rawCategories]);

    if (isLoading) return <Loader />;
    if (isError)
      return (
        <div className="text-red-500 text-center">
          Failed to load categories.
        </div>
      );

    const activeCategory = categories.find(
      (cat) => cat.$id === selectedCategoryId
    );
    const activeCategoryName = activeCategory ? activeCategory.name : null;

    const handleCategoryClick = (categoryId: string, categoryName: string) => {
      setSelectedCategory(categoryId, null);
    };

    const handleSubcategoryClick = (
      categoryId: string,
      subCategory: string
    ) => {
      setSelectedCategory(
        categoryId,
        selectedSubCategory === subCategory ? null : [subCategory]
      );
    };

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
                    ? "!bg-purple-500 !text-white"
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
              {categories.map((category) => (
                <button
                  key={category.$id}
                  className={`topic-card flex items-center gap-2 justify-center ${
                    selectedCategoryId === category.$id
                      ? "bg-purple-500 text-white"
                      : ""
                  }`}
                  onClick={() =>
                    handleCategoryClick(category.$id, category.name)
                  }>
                  {category.icon}
                  <span className="font-medium text-sm">{category.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <div
                className={
                  activeCategory?.subCategories.length === 4
                    ? "subcategory-filters-grid-centered"
                    : "subcategory-filters-grid"
                }>
                {activeCategory && activeCategory.subCategories.length > 0 ? (
                  activeCategory.subCategories.map((subCategory) => (
                    <button
                      key={subCategory}
                      className={`topic-card flex items-center gap-2 justify-center ${
                        selectedSubCategory === subCategory
                          ? "bg-purple-500 text-white"
                          : ""
                      } hover:bg-purple-400 hover:text-white`}
                      onClick={() =>
                        handleSubcategoryClick(selectedCategoryId!, subCategory)
                      }>
                      <span className="font-medium text-sm">{subCategory}</span>
                    </button>
                  ))
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

export default GroupsByCategoryList;
