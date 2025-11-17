import { Models } from "appwrite";
import { Link, useNavigate } from "react-router-dom";
import { PostStats } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import GreatButton from "../post/GreatButton";
import ColoredAvatar from "@/components/shared/ColoredAvatar";
import { databases, appwriteConfig } from "@/lib/appwrite/config";
import { Query } from "appwrite";
import { UserDetails } from "@/types";
import { GridPostListProps } from "@/types";
import { useTranslation } from "react-i18next";

const GridPostList = ({
  items = [],
  showUser = true,
  showStats = true,
  onCategoryClick,
  groupId,
  includeGroupItems = false,
  selectedCategoryId = null,
  subCategories = null,
  filterFrom,
  isSavedSection = false,
  layout = "grid",
}: GridPostListProps) => {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const navigate = useNavigate();

  // Function to handle copying URL to clipboard
  const handleCopyLink = (url: string, itemId: string) => {
    if (!navigator.clipboard) {
      console.error("GridPostList: Clipboard API not supported");
      alert(t("gridPostList.copyNotSupported"));
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert(t("gridPostList.linkCopied"));
      })
      .catch((error) => {
        console.error(`GridPostList: Failed to copy URL for ${itemId}:`, error);
        alert(t("gridPostList.copyFailed"));
      });
  };

  // Function to format share content
  const formatShareContent = (title: string, isPoll: boolean): string => {
    const prefix = isPoll ? t("gridPostList.poll") + " " : t("gridPostList.question") + " ";
    const formattedTitle = title && title.trim() ? title : t("gridPostList.untitled");
    return `${prefix}${formattedTitle}`;
  };

  // Determine badge text and visibility based on highlight flags and selection context
  const getBadge = (item: Models.Document & { type: "post" | "poll" }) => {
    // Subcategory selected: show badges for subcategory, category, or main page highlights
    if (subCategories && subCategories.length > 0) {
      if (item.isInSubcategoryPage === true) {
        return {
          text: t("gridPostList.subcategoryHighlight"),
          color: "bg-purple-500 text-white",
        };
      }
      if (item.isInCategoryPage === true) {
        return { text: t("gridPostList.categoryHighlight"), color: "bg-blue-500 text-white" };
      }
      if (item.isInMainPage === true) {
        return {
          text: t("gridPostList.mainPageHighlight"),
          color: "bg-yellow-500 text-black",
        };
      }
    }
    // Category selected: show badges for category or main page highlights
    else if (selectedCategoryId) {
      if (item.isInCategoryPage === true) {
        return { text: t("gridPostList.categoryHighlight"), color: "bg-blue-500 text-white" };
      }
      if (item.isInMainPage === true) {
        return {
          text: t("gridPostList.mainPageHighlight"),
          color: "bg-yellow-500 text-black",
        };
      }
    }
    // No category/subcategory: show badge only for main page highlights
    else {
      if (item.isInMainPage === true) {
        return {
          text: t("gridPostList.mainPageHighlight"),
          color: "bg-yellow-500 text-black",
        };
      }
    }
    return null;
  };

  // Validate items to prevent TypeError
  if (!Array.isArray(items)) {
    console.warn("GridPostList: Invalid items prop, expected array", { items });
    return (
      <p className="text-light-4 mt-10 text-center w-full">
        {t("gridPostList.noPosts")}
      </p>
    );
  }

  const filteredItems = items.filter((item) => {
    // Allow drafts for the current user, and include posts/polls
    const isOwnDraft = item.isDraft && item.creatorId === user.id;
    const hasValidType =
      isOwnDraft || item.type === "post" || item.type === "poll" || !item.type;
    // Drafts may not have a question, so only require title for non-drafts
    const hasValidTitleOrQuestion = item.isDraft
      ? item.title || item.question
      : item.title || item.question;
    // Check if item belongs to the group
    const isGroupItem = groupId
      ? item.groupIdString === groupId ||
        (typeof item.groupId === "object" && item.groupId?.$id === groupId) ||
        (typeof item.groupId === "string" && item.groupId === groupId)
      : false;
    const isGlobalItem = !item.groupId && !item.groupIdString;

    // For drafts, only show the current user's drafts
    const isValidDraft = !item.isDraft || isOwnDraft;

    return (
      hasValidType &&
      hasValidTitleOrQuestion &&
      isValidDraft &&
      (groupId ? isGroupItem : includeGroupItems || isGlobalItem)
    );
  });

  // Extract unique creator IDs for non-anonymous items
  const uniqueCreatorIds = Array.from(
    new Set(
      filteredItems
        .filter((item) => !item.isAnonymous && !item.isDraft)
        .map((item) => {
          if (typeof item.creatorId === "string") return item.creatorId;
          if (
            typeof item.creator === "object" &&
            item.creator &&
            "$id" in item.creator
          )
            return item.creator.$id;
          return null;
        })
        .filter((id): id is string => id !== null)
    )
  );

  // Fetch creator data for all unique creator IDs at once
  const { data: creatorsData } = useQuery({
    queryKey: ["users", uniqueCreatorIds.sort()],
    queryFn: async () => {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [
          Query.equal("$id", uniqueCreatorIds),
          Query.select(["$id", "name", "imageUrl", "level", "gender"]),
        ]
      );
      return response.documents;
    },
    enabled: uniqueCreatorIds.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Create a mapping of creator IDs to their data for quick lookup
  const creatorMap =
    creatorsData?.reduce(
      (map, creator) => {
        map[creator.$id] = creator;
        return map;
      },
      {} as Record<string, Models.Document>
    ) || {};



  return (
    <div className="justify-center">
      {layout === "grid" ? (
        <div className="columns-4 lg:columns-4 md:columns-3 sm:columns-2 gap-4">
          {filteredItems.map((item) => {
            const isPoll = item.type === "poll";
            let title: string;
            if (isPoll) {
              title = item.question || t("gridPostList.untitledPoll");
            } else if (item.isDraft) {
              title = item.title || item.question || t("gridPostList.untitledDraft");
            } else if (item.edits && item.edits.length > 0) {
              try {
                const latestEdit = JSON.parse(
                  item.edits[item.edits.length - 1]
                );
                title =
                  latestEdit.title !== undefined && latestEdit.title !== null
                    ? latestEdit.title
                    : item.title || t("gridPostList.untitled");
              } catch (error) {
                console.error(
                  `GridPostList: Failed to parse latest edit for post ${item.$id}`,
                  error
                );
                title = item.title || t("gridPostList.untitled");
              }
            } else {
              title = item.title || t("gridPostList.untitled");
            }

            const categoryName =
              item.categoryName ||
              (typeof item.categoryId === "object" &&
              item.categoryId &&
              "$id" in item.categoryId
                ? (item.categoryId as Models.Document).name
                : null) ||
              t("gridPostList.uncategorized");

            const subCategoryName = item.subCategory || t("gridPostList.none");

            const creatorId =
              (typeof item.creatorId === "string" ? item.creatorId : null) ||
              (typeof item.creator === "object" &&
              item.creator &&
              "$id" in item.creator
                ? (item.creator as unknown as Models.Document).$id
                : null) ||
              "unknown";

            const creatorName = item.isAnonymous
              ? t("gridPostList.anonymous")
              : item.creatorName ||
                (typeof item.creator === "object" &&
                item.creator &&
                "$id" in item.creator
                  ? (item.creator as unknown as Models.Document).name
                  : null) ||
                creatorMap[creatorId]?.name ||
                t("gridPostList.unknownCreator");

            const creatorImage = item.isAnonymous
              ? "/assets/icons/profile-placeholder.svg"
              : item.creatorImageUrl ||
                (typeof item.creator === "object" &&
                item.creator &&
                "$id" in item.creator
                  ? (item.creator as unknown as Models.Document).imageUrl
                  : null) ||
                creatorMap[creatorId]?.imageUrl ||
                "/assets/icons/profile-placeholder.svg";

            const creatorGender =
              (typeof item.creator === "object" &&
              item.creator &&
              "$id" in item.creator
                ? (item.creator as unknown as Models.Document).gender
                : item.gender) ||
              creatorMap[creatorId]?.gender ||
              null;

            const creatorLevel = item.isAnonymous
              ? t("gridPostList.na")
              : creatorMap[creatorId]?.level?.toString() || t("gridPostList.na");

            const basePath =
              item.groupIdString || groupId
                ? `/groups/${item.groupIdString || groupId}/${
                    isPoll ? "polls" : "posts"
                  }`
                : `/${isPoll ? "polls" : "posts"}`;
            const itemUrl = item.isDraft
              ? isPoll
                ? `/polls/${item.$id}`
                : `/posts/${item.$id}`
              : `${basePath}/${item.$id}`;
            const shareUrl = item.isDraft
              ? ""
              : `${window.location.origin}${itemUrl}`;
            const shareContent = item.isDraft
              ? ""
              : formatShareContent(title, isPoll);

            const typeStyles = {
              post: {
                borderColor: "border-post-border",
                bgColor: "bg-post-bg",
                textColor: "text-post-border",
              },
              poll: {
                borderColor: "border-poll-border",
                bgColor: "bg-poll-bg",
                textColor: "text-poll-border",
              },
              group: {
                borderColor: "border-group-border",
                bgColor: "bg-group-bg",
                textColor: "text-group-border",
              },
              draft: {
                borderColor: "border-blue-500",
                bgColor: "bg-blue-500/10",
                textColor: "text-blue-500",
              },
            };

            const styles = item.isDraft
              ? typeStyles.draft
              : item.groupId || item.groupIdString
              ? typeStyles.group
              : isPoll
              ? typeStyles.poll
              : typeStyles.post;

            const isGroupItem = !!item.groupIdString;
            const displayType = item.isDraft
              ? isPoll
                ? t("gridPostList.pollDraft")
                : t("gridPostList.postDraft")
              : item.groupIdString
              ? isPoll
                ? t("gridPostList.groupPoll")
                : t("gridPostList.groupQuestion")
              : isPoll
              ? t("gridPostList.poll")
              : t("gridPostList.question");

            const badge = getBadge(item);

            const dummyUserForAnonymous: Partial<UserDetails> = {
              $id: "anonymous",
              name: t("gridPostList.anonymous"),
              imageUrl: creatorImage,
              gender: creatorGender || undefined,
              level: 1,
            };

            return (
              <div
                key={item.$id}
                className={`post-card relative break-inside-avoid rounded-xl mb-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${styles.borderColor} border-2 overflow-hidden`}>
                <div
                  className={`${styles.bgColor} bg-opacity-20 h-full flex flex-col rounded-xl`}>
                  <div className="p-4 flex flex-col gap-3">
                    {badge && (
                      <div
                        className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${badge.color} shadow-md`}>
                        {badge.text}
                      </div>
                    )}
                    {!item.isDraft && (
                      <div className="absolute top-1 left-2 z-10">
                        <GreatButton item={item} showCount={false} />
                      </div>
                    )}
                    <Link
                      to={itemUrl}
                      className={`font-medium text-base ${styles.textColor} break-words hover:text-light-3`}>
                      {title}
                      {item.isDraft && (
                        <span className="ml-2 text-xs text-blue-400 font-semibold">
                          {t("gridPostList.draft")}
                        </span>
                      )}
                    </Link>
                    {item.imageUrl && (
                      <Link
                        to={itemUrl}
                        className="grid-post_link relative mt-2">
                        <div className="image-container rounded-lg overflow-hidden border border-dark-4">
                          <img
                            src={item.imageUrl}
                            alt={
                              isPoll ? "Poll" : item.isDraft ? "Draft" : "Post"
                            }
                            className="image-content w-full h-auto object-cover"
                            loading="lazy"
                            onError={(e) => {
                              console.error(
                                "GridPostList: Failed to load image",
                                {
                                  itemId: item.$id,
                                  imageUrl: item.imageUrl,
                                }
                              );
                              e.currentTarget.src =
                                "/assets/icons/profile-placeholder.svg";
                            }}
                          />
                        </div>
                      </Link>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {isSavedSection && item.groupIdString ? (
                        <Link
                          to={`/groups/${item.groupIdString}`}
                          className="text-xs text-silver transition-colors truncate max-w-full overflow-hidden whitespace-nowrap cursor-pointer hover:text-light-2"
              
                        >
                          <span className="inline-block hover:animate-slide-text hover:underline">
                            {item.groupName || t("gridPostList.unnamedGroup")}
                          </span>
                        </Link>
                      ) : (
                        <p
                          className={`text-xs text-silver transition-colors truncate max-w-full overflow-hidden whitespace-nowrap ${
                            groupId ? "" : "cursor-pointer hover:text-light-2"
                          }`}
                          onClick={
                            groupId
                              ? () =>
                                  console.log(
                                    `GridPostList: Category click disabled in group context for item ${item.$id}`
                                  )
                              : () => {
                                  const categoryId =
                                    item.categoryIdString ||
                                    (typeof item.categoryId === "object" &&
                                    item.categoryId &&
                                    "$id" in item.categoryId
                                      ? (item.categoryId as Models.Document).$id
                                      : item.categoryId);
                                  onCategoryClick?.(
                                    categoryId as string,
                                    item.subCategory
                                  );
                                }
                          }>
                          <span
                            className={`inline-block ${
                              groupId
                                ? ""
                                : "hover:animate-slide-text hover:underline"
                            }`}>
                            {categoryName} / {subCategoryName}
                          </span>
                        </p>
                      )}
                    </div>
                    {showUser && (
                      <div className="flex items-start gap-2 justify-between mt-2 overflow-hidden">
                        <div className="flex items-start gap-2 flex-1 max-w-[60%]">
                          {item.isAnonymous ? (
                            <div className="flex-shrink-0">
                              <ColoredAvatar
                                user={dummyUserForAnonymous as UserDetails}
                                sizeClass="w-8 h-8"
                              />
                            </div>
                          ) : (
                            <Link
                              to={`/profile/${creatorId}`}
                              className="flex-shrink-0">
                              <ColoredAvatar
                                user={creatorMap[creatorId] as UserDetails}
                                sizeClass="w-8 h-8"
                              />
                            </Link>
                          )}
                          <div className="flex flex-col min-w-0 overflow-hidden">
                            {item.isAnonymous ? (
                              <span className="text-xs text-silver inline-block whitespace-nowrap hover:animate-slide-text hover:underline">
                                {t("gridPostList.anonymous")}
                              </span>
                            ) : (
                              <Link
                                to={`/profile/${creatorId}`}
                                className="text-xs text-silver inline-block whitespace-nowrap cursor-pointer hover:text-light-2 hover:animate-slide-text hover:underline">
                                {creatorName}
                              </Link>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-light-3">
                                {t("gridPostList.level")} {creatorLevel}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-xs font-medium px-1 py-1 rounded-md ${styles.textColor} max-w-[37%]`}>
                          <span className="inline-block whitespace-nowrap">
                            {displayType}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {showStats && !item.isDraft && (
                    <div className="px-4 pb-3 pt-1">
                      <PostStats
                        post={item}
                        userId={user.id || ""}
                        isPoll={isPoll}
                        onCommentClick={() => navigate(itemUrl)}
                        shareUrl={shareUrl}
                        shareContent={shareContent}
                        handleCopyLink={handleCopyLink}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredItems.map((item) => {
            const isPoll = item.type === "poll";
            let title: string;
            if (isPoll) {
              title = item.question || t("gridPostList.untitledPoll");
            } else if (item.isDraft) {
              title = item.title || item.question || t("gridPostList.untitledDraft");
            } else if (item.edits && item.edits.length > 0) {
              try {
                const latestEdit = JSON.parse(
                  item.edits[item.edits.length - 1]
                );
                title =
                  latestEdit.title !== undefined && latestEdit.title !== null
                    ? latestEdit.title
                    : item.title || t("gridPostList.untitled");
              } catch (error) {
                console.error(
                  `GridPostList: Failed to parse latest edit for post ${item.$id}`,
                  error
                );
                title = item.title || t("gridPostList.untitled");
              }
            } else {
              title = item.title || t("gridPostList.untitled");
            }

            const categoryName =
              item.categoryName ||
              (typeof item.categoryId === "object" &&
              item.categoryId &&
              "$id" in item.categoryId
                ? (item.categoryId as Models.Document).name
                : null) ||
              t("gridPostList.uncategorized");

            const subCategoryName = item.subCategory || t("gridPostList.none");

            const creatorId =
              (typeof item.creatorId === "string" ? item.creatorId : null) ||
              (typeof item.creator === "object" &&
              item.creator &&
              "$id" in item.creator
                ? (item.creator as unknown as Models.Document).$id
                : null) ||
              "unknown";

            const creatorName = item.isAnonymous
              ? t("gridPostList.anonymous")
              : item.creatorName ||
                (typeof item.creator === "object" &&
                item.creator &&
                "$id" in item.creator
                  ? (item.creator as unknown as Models.Document).name
                  : null) ||
                creatorMap[creatorId]?.name ||
                t("gridPostList.unknownCreator");

            const creatorImage = item.isAnonymous
              ? "/assets/icons/profile-placeholder.svg"
              : item.creatorImageUrl ||
                (typeof item.creator === "object" &&
                item.creator &&
                "$id" in item.creator
                  ? (item.creator as unknown as Models.Document).imageUrl
                  : null) ||
                creatorMap[creatorId]?.imageUrl ||
                "/assets/icons/profile-placeholder.svg";

            const creatorGender =
              (typeof item.creator === "object" &&
              item.creator &&
              "$id" in item.creator
                ? (item.creator as unknown as Models.Document).gender
                : item.gender) ||
              creatorMap[creatorId]?.gender ||
              null;

            const creatorLevel = item.isAnonymous
              ? t("gridPostList.na")
              : creatorMap[creatorId]?.level?.toString() || t("gridPostList.na");

            const basePath =
              item.groupIdString || groupId
                ? `/groups/${item.groupIdString || groupId}/${
                    isPoll ? "polls" : "posts"
                  }`
                : `/${isPoll ? "polls" : "posts"}`;
            const itemUrl = item.isDraft
              ? isPoll
                ? `/polls/${item.$id}`
                : `/posts/${item.$id}`
              : `${basePath}/${item.$id}`;
            const shareUrl = item.isDraft
              ? ""
              : `${window.location.origin}${itemUrl}`;
            const shareContent = item.isDraft
              ? ""
              : formatShareContent(title, isPoll);

            const typeStyles = {
              post: {
                borderColor: "border-post-border",
                bgColor: "bg-post-bg",
                textColor: "text-post-border",
              },
              poll: {
                borderColor: "border-poll-border",
                bgColor: "bg-poll-bg",
                textColor: "text-poll-border",
              },
              group: {
                borderColor: "border-group-border",
                bgColor: "bg-group-bg",
                textColor: "text-group-border",
              },
              draft: {
                borderColor: "border-blue-500",
                bgColor: "bg-blue-500/10",
                textColor: "text-blue-500",
              },
            };

            const styles = item.isDraft
              ? typeStyles.draft
              : item.groupId || item.groupIdString
              ? typeStyles.group
              : isPoll
              ? typeStyles.poll
              : typeStyles.post;

            const isGroupItem = !!item.groupIdString;
            const displayType = item.isDraft
              ? isPoll
                ? t("gridPostList.pollDraft")
                : t("gridPostList.postDraft")
              : item.groupIdString
              ? isPoll
                ? t("gridPostList.groupPoll")
                : t("gridPostList.groupQuestion")
              : isPoll
              ? t("gridPostList.poll")
              : t("gridPostList.question");

            const badge = getBadge(item);

            const dummyUserForAnonymous: Partial<UserDetails> = {
              $id: "anonymous",
              name: t("gridPostList.anonymous"),
              imageUrl: creatorImage,
              gender: creatorGender || undefined,
              level: 1,
            };

            return (
              <div
                key={item.$id}
                className={`post-card relative rounded-xl w-full transition-all duration-200 hover:shadow-lg ${styles.borderColor} border-2 overflow-hidden`}>
                <div
                  className={`${styles.bgColor} bg-opacity-20 h-full flex flex-col rounded-xl`}>
                  <div className="p-4 flex flex-col gap-3">
                    {badge && (
                      <div
                        className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${badge.color} shadow-md`}>
                        {badge.text}
                      </div>
                    )}
                    {!item.isDraft && (
                      <div className="absolute top-1 left-2 z-10">
                        <GreatButton item={item} showCount={false} />
                      </div>
                    )}
                    <Link
                      to={itemUrl}
                      className={`font-medium text-base ${styles.textColor} break-words hover:text-light-3`}>
                      {title}
                      {item.isDraft && (
                        <span className="ml-2 text-xs text-blue-400 font-semibold">
                          {t("gridPostList.draft")}
                        </span>
                      )}
                    </Link>
                    {item.imageUrl && (
                      <Link
                        to={itemUrl}
                        className="grid-post_link relative mt-2">
                        <div className="image-container rounded-lg overflow-hidden border border-dark-4">
                          <img
                            src={item.imageUrl}
                            alt={
                              isPoll ? "Poll" : item.isDraft ? "Draft" : "Post"
                            }
                            className="image-content w-full h-auto object-cover"
                            loading="lazy"
                            onError={(e) => {
                              console.error(
                                "GridPostList: Failed to load image",
                                {
                                  itemId: item.$id,
                                  imageUrl: item.imageUrl,
                                }
                              );
                              e.currentTarget.src =
                                "/assets/icons/profile-placeholder.svg";
                            }}
                          />
                        </div>
                      </Link>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {isSavedSection && item.groupIdString ? (
                        <Link
                          to={`/groups/${item.groupIdString}`}
                          className="text-xs text-silver transition-colors truncate max-w-full overflow-hidden whitespace-nowrap cursor-pointer hover:text-light-2"
          
                        >
                          <span className="inline-block hover:animate-slide-text hover:underline">
                            {item.groupName || t("gridPostList.unnamedGroup")}
                          </span>
                        </Link>
                      ) : (
                        <p
                          className={`text-xs text-silver transition-colors truncate max-w-full overflow-hidden whitespace-nowrap ${
                            groupId ? "" : "cursor-pointer hover:text-light-2"
                          }`}
                          onClick={
                            groupId
                              ? () =>
                                  console.log(
                                    `GridPostList: Category click disabled in group context for item ${item.$id}`
                                  )
                              : () => {
                                  const categoryId =
                                    item.categoryIdString ||
                                    (typeof item.categoryId === "object" &&
                                    item.categoryId &&
                                    "$id" in item.categoryId
                                      ? (item.categoryId as Models.Document).$id
                                      : item.categoryId);
                                  onCategoryClick?.(
                                    categoryId as string,
                                    item.subCategory
                                  );
                                }
                          }>
                          <span
                            className={`inline-block ${
                              groupId
                                ? ""
                                : "hover:animate-slide-text hover:underline"
                            }`}>
                            {categoryName} / {subCategoryName}
                          </span>
                        </p>
                      )}
                    </div>
                    {showUser && (
                      <div className="flex items-start gap-2 justify-between mt-2 overflow-hidden">
                        <div className="flex items-start gap-2 flex-1 max-w-[60%]">
                          {item.isAnonymous ? (
                            <div className="flex-shrink-0">
                              <ColoredAvatar
                                user={dummyUserForAnonymous as UserDetails}
                                sizeClass="w-8 h-8"
                              />
                            </div>
                          ) : (
                            <Link
                              to={`/profile/${creatorId}`}
                              className="flex-shrink-0">
                              <ColoredAvatar
                                user={creatorMap[creatorId] as UserDetails}
                                sizeClass="w-8 h-8"
                              />
                            </Link>
                          )}
                          <div className="flex flex-col min-w-0 overflow-hidden">
                            {item.isAnonymous ? (
                              <span className="text-xs text-silver inline-block whitespace-nowrap hover:animate-slide-text hover:underline">
                                {t("gridPostList.anonymous")}
                              </span>
                            ) : (
                              <Link
                                to={`/profile/${creatorId}`}
                                className="text-xs text-silver inline-block whitespace-nowrap cursor-pointer hover:text-light-2 hover:animate-slide-text hover:underline">
                                {creatorName}
                              </Link>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-light-3">
                                {t("gridPostList.level")} {creatorLevel}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-xs font-medium px-1 py-1 rounded-md ${styles.textColor} max-w-[37%]`}>
                          <span className="inline-block whitespace-nowrap">
                            {displayType}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {showStats && !item.isDraft && (
                    <div className="px-4 pb-3 pt-1">
                      <PostStats
                        post={item}
                        userId={user.id || ""}
                        isPoll={isPoll}
                        onCommentClick={() => navigate(itemUrl)}
                        shareUrl={shareUrl}
                        shareContent={shareContent}
                        handleCopyLink={handleCopyLink}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default React.memo(GridPostList);
