import { useCallback, useMemo } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";
import { convertFileToUrl } from "@/lib/utils";

type MultiFileUploaderProps = {
  fieldChange: (files: File[]) => void;
  mediaUrls: string[];
  value: File[];
  showPreviews?: boolean;
  showUploadButton?: boolean;
};

const MultiFileUploader = ({
  fieldChange,
  mediaUrls,
  value,
  showPreviews = true,
  showUploadButton = true,
}: MultiFileUploaderProps) => {
  const localUrls = useMemo(() => value.map(convertFileToUrl), [value]);

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      const newFiles = [...value, ...acceptedFiles].slice(0, 5);
      fieldChange(newFiles);
    },
    [value, fieldChange]
  );

  const handleDelete = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index);
    fieldChange(newFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
    multiple: true,
    maxFiles: 5 - value.length,
  });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {showPreviews &&
        localUrls.map((url, index) => (
          <div key={index} className="relative">
            <img
              src={url}
              alt={`preview ${index + 1}`}
              className="w-8 h-8 object-cover rounded"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(index);
              }}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
            >
              x
            </button>
          </div>
        ))}
      {showUploadButton && value.length < 5 && (
        <button
          type="button"
          {...getRootProps()}
          className="flex items-center justify-center w-8 h-8 rounded cursor-pointer transition-colors"
          title="Add up to 5 images"
        >
          <img
            src="/assets/icons/camera.svg"
            alt="Add images"
            className="w-5 h-5 text-light-2"
          />
          <input {...getInputProps()} className="hidden" />
        </button>
      )}
    </div>
  );
};

export default MultiFileUploader;