import { useNavigate } from "react-router-dom";
import { TagFilterHeaderProps } from "@/types";
import { useTranslation } from "react-i18next";

const TagFilterHeader = ({ tag, resetPath }: TagFilterHeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!tag) return null;

  return (
    <div className="max-w-screen-lg mx-auto mb-4 -my-4 text-center">
      <p className="text-2xl text-light-3">
        {t("tagFilter.resultsFor")}{" "}
        <span className="text-primary-500 font-semibold">#{tag}</span>
      </p>
      <button
        onClick={() => navigate(resetPath)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-white hover:underline transition duration-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="underline underline-offset-4">{t("tagFilter.resetFilter")}</span>
      </button>
    </div>
  );
};

export default TagFilterHeader;
