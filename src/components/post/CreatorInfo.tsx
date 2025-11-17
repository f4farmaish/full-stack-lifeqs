import { Link } from "react-router-dom";
import { CreatorInfoProps, UserDetails } from "@/types";
import ColoredAvatar from "@/components/shared/ColoredAvatar";
import { useTranslation } from "react-i18next";

const CreatorInfo = ({
  creator,
  isAnonymous,
  gender,
  level,
  formattedDate,
  location,
}: CreatorInfoProps) => {
  const { t } = useTranslation();
  const name = isAnonymous ? t("creatorInfo.anonymous") : creator?.name || t("creatorInfo.unknownUser");
  const imageUrl = isAnonymous ? "/assets/icons/profile-placeholder.svg" : creator?.imageUrl || "/assets/icons/profile-placeholder.svg";
const profileLink = isAnonymous ? "#" : `/profile/${creator?.id}`;
  const avatarUser = isAnonymous
    ? {
        name,
        imageUrl,
        gender,
        level: level === "N/A" ? 0 : parseInt(level, 10),
      } as UserDetails
    : creator as unknown as UserDetails;


  return (
    <Link to={profileLink} className="flex items-center gap-2">
      <ColoredAvatar
        user={avatarUser}
        sizeClass="w-10 h-10"
      />
      <div className="flex flex-col">
        <p className="text-base font-medium text-light-1">
          {name} <span className="text-xs text-light-3">{t("creatorInfo.level")} {level}</span>
        </p>
        <p className="text-sm text-light-3">
          {formattedDate}
          {!isAnonymous && location && <span className="ml-1">• {location}</span>}
        </p>
      </div>
    </Link>
  );
};

export default CreatorInfo;