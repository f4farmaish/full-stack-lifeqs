import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { FaHeart } from "react-icons/fa";
import { ReactionButtonsProps } from "@/types";
import { useTranslation } from "react-i18next";

const ReactionButtons = ({
  canSuperLike,
  isSuperLiked,
  handleSuperLike,
  superLikeCount,
  canSimpleLike,
  isSimpleLiked,
  handleSimpleLike,
  simpleLikeCount,
  isPoll = false,
}: ReactionButtonsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {/* Always render Golden Heart */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSuperLike}
          disabled={!canSuperLike}
          title={
            !canSuperLike
              ? isSuperLiked
                ? t("reactionButtons.alreadyGoldenHearted")
                : t("reactionButtons.goldenHeartUnavailable")
              : t("reactionButtons.goldenHeart")
          }>
          <FaHeart
            className={
              isSuperLiked
                ? "text-yellow-400"
                : "text-gray-400 hover:text-yellow-400 disabled:hover:text-gray-400"
            }
            size={20}
          />
        </button>
        <span className="text-sm text-light-3">{superLikeCount || 0}</span>
      </div>
      {/* Always render Simple Heart */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSimpleLike}
          disabled={!canSimpleLike}
          title={
            !canSimpleLike
              ? isSimpleLiked
                ? t("reactionButtons.alreadySimpleHearted")
                : t("reactionButtons.simpleHeartUnavailable")
              : t("reactionButtons.simpleHeart")
          }>
          {isSimpleLiked ? (
            <AiFillHeart className="text-red-500" size={20} />
          ) : (
            <AiOutlineHeart
              className="text-gray-400 hover:text-red-500 disabled:hover:text-gray-400"
              size={20}
            />
          )}
        </button>
        <span className="text-sm text-light-3">{simpleLikeCount || 0}</span>
      </div>

    </div>
  );
};

export default ReactionButtons;