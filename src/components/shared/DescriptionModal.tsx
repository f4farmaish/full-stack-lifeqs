import React from "react";
import { multiFormatDateString } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  createdAt: string;
}

const DescriptionModal: React.FC<DescriptionModalProps> = ({
  isOpen,
  onClose,
  description,
  createdAt,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 transition-all duration-300 ease-in-out"
      onClick={onClose}>
      <div
        className="bg-dark-3 text-light-1 rounded-xl p-6 max-w-2xl w-full relative border border-dark-4 shadow-2xl transition-all duration-300 transform"
        onClick={(e) => e.stopPropagation()}>
        {/* Close button with improved styling */}
        <button
          className="absolute top-4 right-4 text-light-3 hover:text-light-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-1"
          onClick={onClose}
          aria-label={t("descriptionModal.closeModal")}>
          <span className="text-2xl font-bold leading-none block transform hover:rotate-90 transition-transform duration-200">
            ×
          </span>
        </button>

        {/* Modal header */}
        <div className="border-b border-dark-4 pb-4 mb-4">
          <h2 className="text-xl font-bold tracking-tight">{t("descriptionModal.title")}</h2>
          <p className="text-xs text-light-3 mt-1">
            {multiFormatDateString(createdAt)}
          </p>
        </div>

        {/* Description content with smooth scrolling */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          <div className="text-light-2 whitespace-pre-line break-words leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DescriptionModal;
