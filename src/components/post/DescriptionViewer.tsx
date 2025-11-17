import { useState } from "react";
import DescriptionModal from "@/components/shared/DescriptionModal";
import { DescriptionViewerProps } from "@/types";
import { useTranslation } from "react-i18next";

const DescriptionViewer = ({
  description,
  maxLength,
  createdAt,
}: DescriptionViewerProps) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="text-xs md:text-sm lg:text-base text-light-3 whitespace-pre-line">
      {description.length > maxLength ? (
        <>
          {description.slice(0, maxLength)}...
          <button
            onClick={() => setShowModal(true)}
            className="text-bleu-1 hover:text-blue-300 text-xs md:text-sm underline mt-1">
            {t("descriptionViewer.viewMore")}
          </button>
        </>
      ) : (
        description
      )}
      <DescriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        description={description}
        createdAt={createdAt}
      />
    </div>
  );
};

export default DescriptionViewer;
