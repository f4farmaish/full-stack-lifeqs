import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { Loader, GridPostList } from "@/components/shared";
import TopicsList from "@/components/shared/TopicsList";
import { useSearchContext } from "@/context/SearchContext";
import { Models } from "appwrite";
import { useFetchCombinedContent } from "@/lib/react-query/queries";
import BackToTop from "@/components/shared/BackToTop";
import { useGetCurrentUser } from "@/lib/react-query/queries";
import TagFilterHeader from "@/components/shared/TagFilterHeader";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";


type CombinedContent = Models.Document & { type: "post" | "poll" };

const Home = () => {
  const { t } = useTranslation();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [subCategories, setSubCategories] = useState<string[] | null>(null);
  const { ref: inViewRef, inView } = useInView();
  const { searchValue, setSearchContext } = useSearchContext();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const topicsListRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [contentContainerPosition, setContentContainerPosition] = useState<{
    left: number;
    right: number;
    width: number;
  }>({ left: 0, right: 0, width: 0 });
  const { data: currentUser, isLoading: isUserLoading } = useGetCurrentUser();
  const [searchParams] = useSearchParams();
  const tagFromQuery = searchParams.get("tag");

  // Function to check if user has active ad-free status
  const isAdFreeActive = useMemo(() => {
    if (!currentUser) return false;
    if (!currentUser.isAdFree) return false;
    if (!currentUser.expirationDateIsAdFree) return true; // Permanent ad-free
    const expirationDate = new Date(currentUser.expirationDateIsAdFree);
    const today = new Date();
    return expirationDate > today; // Ad-free if expiration is in the future
  }, [currentUser]);

  // Function to handle back navigation
  const onGoBack = () => {
    navigate(-1);
  };

  // Set search context based on search input
  useEffect(() => {
    setSearchContext(searchValue.startsWith("@") ? "user" : "posts");
  }, [searchValue, setSearchContext]);

  // Handle state passed from navigation
  useEffect(() => {
    if (location.state?.categoryId || location.state?.subCategory) {
      const categoryId =
        typeof location.state.categoryId === "object"
          ? location.state.categoryId.$id
          : location.state.categoryId;

      const subCategory = location.state.subCategory;

      setSelectedCategoryId(categoryId || null);
      setSubCategories(subCategory ? [subCategory] : null);

      queryClient.invalidateQueries({ queryKey: ["combinedContent"] });
    } else {
      setSelectedCategoryId(null);
      setSubCategories(null);
    }
  }, [location.state]);

  useEffect(() => {
    if (tagFromQuery) {
      setSelectedCategoryId(null);
      setSubCategories(null);
      // Invalidate cache when switching to tag filter
      queryClient.invalidateQueries({ queryKey: ["combinedContent"] });
    }
  }, [tagFromQuery]);

  const {
    data: contentData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useFetchCombinedContent({
    categoryId: selectedCategoryId,
    subCategory: subCategories?.[0],
    search: searchValue.startsWith("@")
      ? searchValue.slice(1).trim()
      : searchValue.trim(),
    type: searchValue.startsWith("@") ? "user" : location.state?.type,
    tag: tagFromQuery,
  });

  // Update content container position for ad placement
  useEffect(() => {
    if (contentContainerRef.current) {
      const updatePosition = () => {
        const rect = contentContainerRef.current!.getBoundingClientRect();
        setContentContainerPosition({
          left: rect.left,
          right: rect.right,
          width: rect.width,
        });
      };

      // Initial position update
      updatePosition();

      // Update on resize and scroll
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition);

      // Use ResizeObserver for more accurate tracking
      const resizeObserver = new ResizeObserver(updatePosition);
      resizeObserver.observe(contentContainerRef.current);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition);
        resizeObserver.disconnect();
      };
    }
  }, [contentData, selectedCategoryId, subCategories]); // Re-run when content changes

  // Memoized content with sorting by highlight flags
  const allContent: any = useMemo(() => {
    const content =
      contentData?.pages.flatMap((page) =>
        page.documents.map((doc: any) => ({
          ...doc,
          type: (doc.question ? "poll" : "post") as "post" | "poll",
        }))
      ) || [];

    // Sort based on selection context
    return content.sort((a: any, b: any) => {
      // When a subcategory is selected
      if (subCategories && subCategories.length > 0) {
        if (a.isInSubcategoryPage === true && b.isInSubcategoryPage !== true)
          return -1;
        if (a.isInSubcategoryPage !== true && b.isInSubcategoryPage === true)
          return 1;
        if (a.isInCategoryPage === true && b.isInCategoryPage !== true)
          return -1;
        if (a.isInCategoryPage !== true && b.isInCategoryPage === true)
          return 1;
        if (a.isInMainPage === true && b.isInMainPage !== true) return -1;
        if (a.isInMainPage !== true && b.isInMainPage === true) return 1;
      }
      // When a category is selected (but no subcategory)
      else if (selectedCategoryId) {
        if (a.isInCategoryPage === true && b.isInCategoryPage !== true)
          return -1;
        if (a.isInCategoryPage !== true && b.isInCategoryPage === true)
          return 1;
        if (a.isInMainPage === true && b.isInMainPage !== true) return -1;
        if (a.isInMainPage !== true && b.isInMainPage === true) return 1;
      }
      // When no category or subcategory is selected
      else {
        if (a.isInMainPage === true && b.isInMainPage !== true) return -1;
        if (a.isInMainPage !== true && b.isInMainPage === true) return 1;
      }
      return 0;
    });
  }, [contentData, selectedCategoryId, subCategories]);

  const handleCategorySelect = (
    categoryId: string | { $id: string } | null,
    subCats: string[] | null
  ) => {
    const categoryStringId =
      categoryId && typeof categoryId === "object"
        ? categoryId.$id
        : categoryId;

    navigate(location.pathname, {
      state: {
        categoryId: categoryStringId,
        subCategory: subCats ? subCats[0] : null,
      },
    });
  };

  const handleCategoryClickFromPost = (
    categoryId: string | { $id: string },
    subCategory?: string
  ) => {
    const categoryStringId =
      typeof categoryId === "object" ? categoryId.$id : categoryId;

    navigate(location.pathname, {
      state: {
        categoryId: categoryStringId,
        subCategory: subCategory || null,
      },
    });
  };

  // Trigger infinite scroll
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !searchValue) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, searchValue]);

  const shouldShowSearchResults = searchValue !== "";
  const hasNoContent = useMemo(() => {
    return (
      !shouldShowSearchResults &&
      contentData?.pages.every((page) => !page.documents.length)
    );
  }, [shouldShowSearchResults, contentData]);

  // Calculate symmetric ad positions with perfect alignment
  const calculateAdPositions = () => {
    if (contentContainerPosition.width === 0)
      return { leftAdLeft: 0, rightAdLeft: 0 };

    const viewportWidth = window.innerWidth;
    const contentLeft = contentContainerPosition.left;
    const contentRight = contentContainerPosition.right;
    const adWidth = 238;
    const gap = 8; // Gap between ad and content

    // Calculate symmetric positions from content edges
    const leftAdRight = contentLeft - gap; // Right edge of left ad
    const rightAdLeft = contentRight + gap; // Left edge of right ad

    // Calculate left ad position (right edge minus width)
    const leftAdLeft = leftAdRight - adWidth;

    // Ensure ads don't go off screen (minimum 16px from viewport edges)
    const finalLeftAdLeft = Math.max(16, leftAdLeft);
    const finalRightAdLeft = Math.min(
      viewportWidth - adWidth - 16,
      rightAdLeft
    );

    return {
      leftAdLeft: finalLeftAdLeft,
      rightAdLeft: finalRightAdLeft,
    };
  };

  const { leftAdLeft, rightAdLeft } = calculateAdPositions();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1",
        alignItems: "center",
        gap: "2rem",
        paddingTop: "3rem",
        paddingBottom: "3rem",
        paddingLeft: "0",
        paddingRight: "0",
        maxWidth: "100vw",
        width: "100%",
        margin: "0",
        overflowX: "hidden",
      }}>
      <div style={{ marginBottom: "-1rem" }} ref={topicsListRef}>
        <TopicsList
          selectedCategoryId={selectedCategoryId}
          selectedSubCategory={subCategories?.[0] || null}
          setSelectedCategory={handleCategorySelect}
          onGoBack={onGoBack}
        />
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          display: "flex",
          alignItems: "center",
          margin: "1rem 0",
          marginBottom: "-0.5rem",
          maxWidth: "64rem",
          marginLeft: "auto",
          marginRight: "auto",
        }}>
        <hr
          style={{
            flexGrow: "1",
            borderTop: "1px solid var(--text-quaternary)",
            margin: "0",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "var(--background-1)",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            color: "var(--text-tertiary)",
            fontSize: "0.875rem",
            fontWeight: "600",
          }}>
          {t("home.lifeqsFeatured")}
        </span>
      </div>
      <TagFilterHeader tag={tagFromQuery} resetPath="/" />

      {/* Content container with ref for position calculation */}
      <div
        ref={contentContainerRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "64rem",
          marginLeft: "auto",
          marginRight: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}>
       
        {isLoading || isUserLoading ? (
          <Loader />
        ) : (
          <>
            {searchValue !== "" ? (
              <GridPostList
                items={allContent}
                selectedCategoryId={selectedCategoryId}
                subCategories={subCategories}
              />
            ) : hasNoContent ? (
              <p
                style={{
                  color: "var(--text-tertiary)",
                  marginTop: "1.5rem",
                  textAlign: "center",
                  width: "100%",
                }}>
                {t("home.noContentFound")}
              </p>
            ) : (
              <GridPostList
                items={allContent}
                onCategoryClick={handleCategoryClickFromPost}
                selectedCategoryId={selectedCategoryId}
                subCategories={subCategories}
              />
            )}
          </>
        )}
      </div>

      {!shouldShowSearchResults && hasNextPage && (
        <div ref={inViewRef} style={{ marginTop: "2.5rem" }}>
          <Loader />
        </div>
      )}

      <BackToTop />
    </div>
  );
};

export default Home;
