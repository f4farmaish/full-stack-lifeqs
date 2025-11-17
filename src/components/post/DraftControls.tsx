import { Button } from "@/components/ui";
import { Loader } from "@/components/shared";
import { DraftControlsProps } from "@/types";
import { useTranslation } from "react-i18next";

const DraftControls = ({
  isDeleting,
  handleDelete,
  isPublishing,
  handlePublish,
  handleEdit,
}: DraftControlsProps) => {
  const { t } = useTranslation();

  return (
    <div className="p-6 border-t border-dark-4 flex justify-end gap-4">
      <Button
        onClick={handleDelete}
        disabled={isDeleting}
        className="shad-button_destructive">
        {isDeleting ? <Loader /> : t("draftControls.delete")}
      </Button>
      <Button
        onClick={handleEdit}
        disabled={isPublishing || isDeleting}
        className="shad-button_secondary">
        {t("draftControls.edit")}
      </Button>
      <Button
        onClick={handlePublish}
        disabled={isPublishing}
        className="shad-button_primary">
        {isPublishing ? <Loader /> : t("draftControls.post")}
      </Button>
    </div>
  );
};

export default DraftControls;
