import { useCallback, useEffect, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { useCheckFileExists } from "@/lib/react-query/queries";
import { Button } from "@/components/ui";
import { convertFileToUrl } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type FileUploaderProps = {
  fieldChange: (files: File[]) => void;
  mediaUrl: string;
  onImageDelete?: () => void;
};

const FileUploader = ({
  fieldChange,
  mediaUrl,
  onImageDelete,
}: FileUploaderProps) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File[]>([]);
  const [fileUrl, setFileUrl] = useState<string>(mediaUrl);

  // Extract file ID from mediaUrl if present
  const fileId = mediaUrl ? mediaUrl.split("/").pop()?.split("?")[0] ?? "" : "";

  // Only check file existence if mediaUrl is provided and contains a valid fileId
  const shouldCheckFileExists = !!(
    mediaUrl &&
    fileId &&
    mediaUrl.includes("/files/")
  );

  const { data: fileExists, isLoading: isFileLoading } = shouldCheckFileExists
    ? useCheckFileExists(fileId)
    : { data: true, isLoading: false }; // Default to true if not checking

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      setFile(acceptedFiles);
      fieldChange(acceptedFiles);
      setFileUrl(convertFileToUrl(acceptedFiles[0]));
    },
    [fieldChange]
  );

  const handleDeleteImage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();


      // Clear local state
      setFile([]);
      setFileUrl("");

      // Notify parent component to clear form field
      fieldChange([]);

      // Call optional delete callback
      if (onImageDelete) {
        onImageDelete();
      }
    },
    [fieldChange, onImageDelete]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
  });

  // Update fileUrl when mediaUrl changes
  useEffect(() => {
    setFileUrl(mediaUrl);
  }, [mediaUrl]);

  // Debug log for fileUrl and mediaUrl changes
  useEffect(() => {

  }, [
    fileUrl,
    mediaUrl,
    fileExists,
    isFileLoading,
    shouldCheckFileExists,
    fileId,
  ]);

  // Determine if we should show the image
  const shouldShowImage =
    fileUrl &&
    // Show if it's a newly uploaded file (blob URL)
    (fileUrl.startsWith("blob:") ||
      // Show if it's an existing image URL and file exists (or we're not checking existence)
      (!isFileLoading && (fileExists || !shouldCheckFileExists)));

  return (
    <div
      {...getRootProps()}
      className="flex flex-col bg-dark-3 rounded-xl cursor-pointer h-48 w-full overflow-hidden relative">
      <input {...getInputProps()} className="cursor-pointer" />

      {shouldShowImage ? (
        <>
          <div className="flex-1 flex justify-center items-center w-full overflow-hidden relative">
            <img
              src={fileUrl}
              alt={t("fileUploader.selectedImage")}
              className="uploaded-image h-full w-full object-cover"
              onError={(e) => {
                console.error("Image failed to load:", fileUrl);
                // If image fails to load, show the upload box
                setFileUrl("");
              }}
            />

            {/* Delete button overlay */}
            <div className="absolute top-2 right-2">
              <Button
                type="button"
                onClick={handleDeleteImage}
                className="delete-image-btn bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 p-0 flex items-center justify-center shadow-lg transition-colors"
                title={t("fileUploader.deleteImage")}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2M10 11v6M14 11v6" />
                </svg>
              </Button>
            </div>
          </div>

          <div className="replace-text-container">
            <p className="replace-text">{t("fileUploader.clickOrDrag")}</p>
          </div>
        </>
      ) : (
        <div className="file_uploader-box flex flex-col items-center justify-center gap-4">
          {isFileLoading && shouldCheckFileExists ? (
            <p className="text-light-4 small-regular">{t("fileUploader.loadingImage")}</p>
          ) : fileUrl && !shouldShowImage ? (
            <>
              <p className="text-light-4 small-regular">{t("fileUploader.noImageAvailable")}</p>
              <img
                src="/assets/icons/file-upload.svg"
                width={60}
                height={50}
                alt="file upload"
              />
              <h3 className="base-medium text-light-2">{t("fileUploader.dragPhoto")}</h3>
              <p className="text-light-4 small-regular">{t("fileUploader.fileTypes")}</p>
              <Button type="button" className="shad-button_dark_4">
                {t("fileUploader.selectFromComputer")}
              </Button>
            </>
          ) : (
            <>
              <img
                src="/assets/icons/file-upload.svg"
                width={60}
                height={50}
                alt="file upload"
              />
              <h3 className="base-medium text-light-2">{t("fileUploader.dragPhoto")}</h3>
              <p className="text-light-4 small-regular">{t("fileUploader.fileTypes")}</p>
              <Button type="button" className="shad-button_dark_4">
                {t("fileUploader.selectFromComputer")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
