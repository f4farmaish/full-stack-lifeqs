
import { Models } from "appwrite";
import { Link, useNavigate } from "react-router-dom";
import { PostStats } from "@/components/shared";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import { memo, useMemo } from "react";
import { useGetUserById } from "@/lib/react-query/queries";
import CreatorInfo from "../post/CreatorInfo";
import { useTranslation } from "react-i18next";

type PostCardProps = {
  post: Models.Document;
  onCategoryClick?: (categoryId: string, subCategory?: string) => void;
};

const PostCard = ({ post, onCategoryClick }: PostCardProps) => {
  const { t } = useTranslation();
  const { user } = useUserContext();
  const navigate = useNavigate();

  const { data: creatorData, isLoading: isUserLoading, error: userError } = useGetUserById(post.creatorId || "");

  if (!post.creatorId || !post.creatorName) {
    console.warn("PostCard: Missing creator data for post:", post.$id, {
      creatorId: post.creatorId,
      creatorName: post.creatorName,
    });
    return null;
  }

  const handleCommentClick = () => {
    navigate(`/posts/${post.$id}`);
  };

  const getLatestTitle = () => {
    if (post.edits && post.edits.length > 0) {
      const latestEdit = JSON.parse(post.edits[post.edits.length - 1]);
      return latestEdit.content;
    }
    return post.title || t("postCard.noTitle");
  };

  const categoryName = post.categoryName || post.categoryIdString || t("postCard.uncategorized");
  const subCategoryName = post.subCategory || t("postCard.none");

  const isAnonymous = post.isAnonymous || false;
  const isPoll = post.isPoll || false;

  const creatorLevel = useMemo(() => {
    return isAnonymous ? t("postCard.na") : creatorData?.level ? String(creatorData.level) : t("postCard.na");
  }, [isAnonymous, creatorData, isUserLoading, userError, post.creatorId, t]);

  const formattedDate = useMemo(() => {
    const isValidDate = (dateStr: string) => {
      return typeof dateStr === "string" && !isNaN(new Date(dateStr).getTime());
    };

    const dateStr = isValidDate(post.createdAt)
      ? post.createdAt
      : new Date().toISOString();

    try {
      const formatted = multiFormatDateString(dateStr);
      if (formatted === "Just now") {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        if (diffMs > 60000) {
          return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(date);
        }
      }
      return formatted;
    } catch (error) {
      console.error("PostCard: Error formatting date for post:", post.$id, error);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    }
  }, [post.createdAt]);

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
  };

  const styles = post.groupIdString
    ? typeStyles.group
    : isPoll
    ? typeStyles.poll
    : typeStyles.post;

  if (isUserLoading) {
    return (
      <div className="post-card relative">
        <p className="text-light-3">{t("postCard.loadingUserData")}</p>
      </div>
    );
  }

  if (userError) {
    console.warn("PostCard: User data fetch error for post:", post.$id, {});
    return (
      <div className="post-card relative">
        <p className="text-light-3">{t("postCard.errorLoadingUserData")}</p>
      </div>
    );
  }

  return (
    <div
      className={`post-card relative break-inside-avoid rounded-xl mb-4 transition-all duration-200 hover:shadow-lg ${styles.borderColor} border-2 overflow-hidden`}
    >
      <div className={`${styles.bgColor} bg-opacity-20 h-full flex flex-col rounded-xl`}>
        <div className="absolute top-2 right-2">
          <p className="subtle-semibold base:small-regular text-light-3">
            {formattedDate}
          </p>
        </div>

        <div className="flex-between p-2">
          <CreatorInfo
            creator={creatorData}
            isAnonymous={isAnonymous}
            gender={isAnonymous ? post.gender : creatorData?.gender || null}
            level={creatorLevel}
            formattedDate={formattedDate}
            location={post.location || null}
          />
        </div>

        <Link to={`/posts/${post.$id}`}>
          <div className="small-medium lg:base-medium px-4">
            <p className={`text-lg ${styles.textColor}`}>{getLatestTitle()}</p>
            <ul className="flex gap-6 mt-2">
              {post.tags?.map((tag: string, index: number) => (
                <li
                  key={`${tag}-${index}`}
                  className="text-xs text-light-3 bg-dark-3 px-2 py-1 rounded-lg"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          </div>

          {post.imageUrl && (
            <div className="post-card_img-container relative px-4">
              <img
                src={post.imageUrl}
                alt="post image"
                className="post-card_img"
              />
            </div>
          )}
        </Link>

        <div className="flex items-center gap-2 mt-3 px-4 -mb-2">
          <p
            className="text-xs text-silver cursor-pointer hover:text-light-2 transition-colors truncate max-w-full overflow-hidden whitespace-nowrap"
            onClick={() => {
              // If onCategoryClick is provided, use it (for Home page)
              if (onCategoryClick) {
                onCategoryClick(post.categoryIdString, post.subCategory);
              } else {
                // Otherwise navigate to home with category filter
                navigate('/', {
                  state: {
                    categoryId: post.categoryIdString,
                    subCategory: post.subCategory || null,
                  },
                });
              }
            }}
          >
            <span className="inline-block hover:underline">
              {categoryName} / {subCategoryName}
            </span>
          </p>
        </div>

        <div className="post-stats-container p-3">
          <PostStats
            post={post}
            userId={user?.id || ""}
            isPoll={isPoll}
            onCommentClick={handleCommentClick}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(PostCard);