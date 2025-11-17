import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetGroupById } from "@/lib/react-query/queries";
import PostForm from "@/components/forms/PostForm";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";

const CreatePost = () => {
  const { t } = useTranslation();
  const { groupId } = useParams();
  // Fetch group details using React Query
  const { data: group, isLoading } = useGetGroupById(groupId);

  return (
    <div className="flex flex-1">
      <div className="common-container">
        {/* Create Post Heading and My Drafts Button */}
        <div className="max-w-5xl flex items-center justify-between w-full mb-4  ">
          <div className="flex items-center gap-3">
            <img
              src="/assets/icons/add-post.svg"
              width={36}
              height={36}
              alt="add"
            />
            <h2 className="h3-bold md:h2-bold text-left">
              {groupId && group?.name
                ? `${t("createPost.createPostIn")} ${group.name}`
                : t("posts.createPost")}
            </h2>
          </div>
          <Link to="/my-drafts" state={{ groupId, filterFrom: "post" }}>
            <Button className="shad-button_dark_4">{t("createPost.myDraftPosts")}</Button>
          </Link>
          {groupId && isLoading && (
            <p className="text-base text-gray-600">{t("createPost.loadingGroupName")}</p>
          )}
          {groupId && !isLoading && !group && (
            <p className="text-base text-red-500">{t("createPost.errorLoadingGroupName")}</p>
          )}
        </div>

        {/* Post Form - Pass groupId */}
        <PostForm action="Create" groupId={groupId} />
      </div>
    </div>
  );
};

export default CreatePost;
