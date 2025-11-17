import { useUserContext } from "@/context/AuthContext";
import { Loader, GridPostList } from "@/components/shared";
import { Link, useLocation } from "react-router-dom";
import { useGetUserDrafts, useGetGroupById } from "@/lib/react-query/queries";
import { Post, IPoll } from "@/types";
import { Component, ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";

class ErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="text-light-4 text-center">
          Something went wrong while rendering drafts.
        </p>
      );
    }
    return this.props.children;
  }
}

const MyDrafts = () => {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const location = useLocation();
  const groupId = location.state?.groupId;
  const filterFrom = location.state?.filterFrom;
  const {
    data: drafts,
    isLoading: isDraftsLoading,
    error,
  } = useGetUserDrafts(user.id, groupId);
  const { data: group, isLoading: isGroupLoading } = useGetGroupById(groupId);

  const draftItems: (Post | IPoll)[] = drafts
    ? drafts.filter((item: { type: string; groupIdString: string; isDraft: boolean }) => {
        const matchesGroup = groupId ? item.groupIdString === groupId : true;
        const matchesType = filterFrom
          ? item.type === filterFrom && item.isDraft
          : item.isDraft; // Show all drafts if no filterFrom
        return matchesGroup && matchesType;
      })
    : [];


  if (isDraftsLoading || (groupId && isGroupLoading)) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (error) {
    console.error("MyDrafts: Error fetching drafts", {
      error: error.message,
      userId: user.id,
      groupId,
      filterFrom,
    });
    return (
      <div className="flex-center w-full h-full">
        <p className="text-light-4">{t("myDrafts.errorLoadingDrafts")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="common-container">
        <div className="max-w-5xl flex-start gap-3 justify-start w-full">
          <img
            src="/assets/icons/drafts.svg"
            width={50}
            height={50}
            alt="drafts"
          />
          <h2 className="h3-bold md:h2-bold text-left w-full">
            {groupId && group
              ? `${t("myDrafts.title")} - ${filterFrom === "poll" ? t("myDrafts.polls") : t("myDrafts.posts")} - ${group.name}`
              : filterFrom === "poll"
              ? `${t("myDrafts.title")} - ${t("myDrafts.polls")}`
              : filterFrom === "post"
              ? `${t("myDrafts.title")} - ${t("myDrafts.posts")}`
              : t("myDrafts.title")}
          </h2>
        </div>
        {draftItems.length === 0 ? (
          <div className="text-light-4 mt-10 text-center w-full">
            <p>
              {groupId && group
                ? t("myDrafts.noDraftsForGroup")
                : filterFrom === "poll"
                ? t("myDrafts.noDraftsForType")
                : filterFrom === "post"
                ? t("myDrafts.noDraftsForType")
                : t("myDrafts.noDraftsYet")}
            </p>
            <div className="flex gap-4 justify-center mt-4">
              {(!filterFrom || filterFrom === "post") && (
                <Link
                  to={groupId ? `/groups/${groupId}/create-post-group` : "/create-post"}
                  className="inline-block"
                >
                  <button className="shad-button_primary rounded-full px-8 py-2">
                    {t("myDrafts.createFirstPost")}
                  </button>
                </Link>
              )}
              {(!filterFrom || filterFrom === "poll") && (
                <Link
                  to={groupId ? `/groups/${groupId}/create-poll` : "/create-poll"}
                  className="inline-block"
                >
                  <button className="shad-button_secondary rounded-full px-8 py-2">
                    {t("myDrafts.createFirstPoll")}
                  </button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <ErrorBoundary>
            <GridPostList
              items={draftItems}
              groupId={groupId}
              includeGroupItems={!groupId}
              filterFrom={filterFrom}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default MyDrafts;