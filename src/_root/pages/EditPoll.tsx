import { useParams } from "react-router-dom";
import { Loader } from "@/components/shared";
import { useGetPollById } from "@/lib/react-query/queries";
import CreatePollPage from "./CreatePollPage";

const EditPoll = () => {
  const { id } = useParams();
  const { data: poll, isLoading } = useGetPollById(id);

  if (isLoading || !id) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex-center w-full h-full">
        <p className="text-light-1">Poll not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="common-container">
        <div className="flex-start gap-3 justify-start w-full max-w-5xl">
          <img
            src="/assets/icons/edit.svg"
            width={36}
            height={36}
            alt="edit"
            className="invert-white"
          />
          <h2 className="h3-bold md:h2-bold text-left w-full">Edit Poll</h2>
        </div>
        <CreatePollPage action="Update" poll={poll} groupId={poll.groupIdString} />
      </div>
    </div>
  );
};

export default EditPoll;