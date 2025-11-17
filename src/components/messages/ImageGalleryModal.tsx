import { useEffect, useState } from "react";

type Props = {
  images: string[];
  selectedIndex: number;
  onClose: () => void;
};

const ImageGalleryModal = ({ images, selectedIndex, onClose }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Handle keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center px-4">
      <div className="relative max-w-full w-full flex items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`img-${currentIndex}`}
          className="max-h-[80vh] max-w-full w-auto h-auto rounded-xl object-contain"
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-xl font-bold bg-black bg-opacity-40 p-2 rounded-full hover:bg-opacity-70 transition">
          X
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl bg-black bg-opacity-40 p-2 rounded-full hover:bg-opacity-70 transition">
              ‹
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl bg-black bg-opacity-40 p-2 rounded-full hover:bg-opacity-70 transition">
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageGalleryModal;
