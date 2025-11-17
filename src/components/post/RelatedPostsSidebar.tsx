import React from "react";
import { GridPostList, Loader } from "@/components/shared";
import { useGetRelatedPosts } from "@/lib/react-query/queries";
import { useTranslation } from "react-i18next";

interface RelatedPostsSidebarProps {
  creatorId: string;
  currentPostId: string;
  isAnonymous: boolean;
}

const RelatedPostsSidebar: React.FC<RelatedPostsSidebarProps> = ({
  creatorId,
  currentPostId,
  isAnonymous,
}) => {
  const { t } = useTranslation();

  const shouldFetchRelatedPosts =
    !isAnonymous && creatorId && creatorId !== "unknown";

  const {
    data: relatedPosts = [],
    isLoading: isRelatedPostsLoading,
    error: relatedPostsError,
  } = useGetRelatedPosts(creatorId, currentPostId, shouldFetchRelatedPosts);



  if (isAnonymous) {
    return null;
  }

  if (!creatorId || creatorId === "unknown") {
    return null;
  }

  if (relatedPostsError) {
    console.error(
      "RelatedPostsSidebar: Error loading related posts",
      relatedPostsError
    );
    return (
      <div className="fixed left-0 top-20 w-80 h-screen">
        <div className="bg-dark-2 rounded-r-xl p-4 h-full">
          <h3 className="text-lg font-semibold text-light-3 mb-4">
            {t("relatedPostsSidebar.title")}
          </h3>
          <p className="text-light-3 text-sm">{t("relatedPostsSidebar.failedToLoad")}</p>
        </div>
      </div>
    );
  }

  if (isRelatedPostsLoading) {
    return (
      <div className="fixed left-0 top-20 w-80 h-screen">
        <div className="bg-dark-3 rounded-r-xl p-4 h-full">
          <h3 className="text-lg font-semibold text-light-3 mb-4">
            {t("relatedPostsSidebar.title")}
          </h3>
          <div className="flex justify-center py-4">
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  if (!relatedPosts || relatedPosts.length === 0) {
    return (
      <div className="fixed left-0 top-20 w-80 h-screen">
        <div className="bg-dark-2 rounded-r-xl p-4 h-full">
          <h3 className="text-lg font-semibold text-light-3 mb-4">
            {t("relatedPostsSidebar.title")}
          </h3>
          <p className="text-light-3 text-sm">
            {t("relatedPostsSidebar.noOtherPosts")}
          </p>
        </div>
      </div>
    );
  }



  return (
    <div className="fixed left-0 top-20 w-80 h-screen">
      <div className="bg-dark-1 rounded-r-xl p-4 h-full overflow-y-auto custom-scrollbar">
        <h3 className="text-lg font-semibold text-light-3 mb-4">
          More Related Posts
        </h3>
        <div className="space-y-4">
          <GridPostList
            items={relatedPosts}
            showUser={false}
            showStats={false}
            layout="list"
          />
        </div>
      </div>
    </div>
  );
};

export default RelatedPostsSidebar;
