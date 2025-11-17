import { useParams, useNavigate } from "react-router-dom";
import PostFormGroup from "../../components/forms/PostFormGroup";
import { Button } from "@/components/ui"; // Import the Button component

const CreatePostFormGroup = () => {
  const { groupId } = useParams(); // Correctly get groupId from params
  const navigate = useNavigate(); // Use navigate for the back button

  return (
    <div className="flex flex-1">
      <div className="common-container -mt-10">
        {/* Back Button */}
        <div className="max-w-5xl w-full -mb-8 -ml-40">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="shad-button_ghost back-button"
          >
            <img
              src={"/assets/icons/back.svg"}
              alt="back"
              width={24}
              height={24}
            />
            <p className="small-medium lg:base-medium">Back</p>
          </Button>
        </div>

        {/* Header Section */}
        <div className="max-w-5xl flex items-center gap-3 justify-start w-full">
          <img
            src="/assets/icons/add-post.svg"
            width={36}
            height={36}
            alt="add"
          />
          <h2 className="h3-bold md:h2-bold text-left w-full">Create Post in Group</h2>
        </div>

        {/* Form Section */}
        <PostFormGroup groupId={groupId!} action="Create" />
      </div>
    </div>
  );
};

export default CreatePostFormGroup;
