"use client";
import { SetStateAction, useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Gallery() {
  // State to track all available images
  const [allImages, setAllImages] = useState<number[]>([]);
  const [displayedImages, setDisplayedImages] = useState<number[]>([]);
  // State to track the current set of images
  const [imageIndices, setImageIndices] = useState<number[]>([]);
  // State to track the next image that will appear
  const [nextImage, setNextImage] = useState<number | null>(null);
  // Track which image is currently fading
  const [fadingIndex, setFadingIndex] = useState<number | null>(null);
  // Add state for gallery dialog
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Add state to track last changed position
  const [lastChangedPosition, setLastChangedPosition] = useState<number | null>(null);

  // Total number of available images (10-31 based on your folder)
  const totalImages = 22;
  const startIndex = 10; // Your images start at index 10

  // Initialize all available images and displayed images on first render
  useEffect(() => {
    // Create array of all possible image numbers
    const allPossibleImages = Array.from(
      { length: totalImages },
      (_, i) => i + startIndex
    );
    setAllImages(allPossibleImages);

    // Select initial random images for display
    const initialIndices: number[] = [];
    while (initialIndices.length < 8) {
      const randomNum = Math.floor(Math.random() * totalImages) + startIndex;
      if (!initialIndices.includes(randomNum)) {
        initialIndices.push(randomNum);
      }
    }
    setDisplayedImages(initialIndices);
    setImageIndices(initialIndices);
  }, []);

  // Modified effect to prevent duplicates and consecutive changes
  useEffect(() => {
    if (imageIndices.length < 8 || galleryOpen) return;

    const intervalId = setInterval(() => {
      // Get a random position that wasn't the last one changed
      let positionToChange;
      do {
        positionToChange = Math.floor(Math.random() * 8);
      } while (positionToChange === lastChangedPosition);

      // Get a new image that isn't currently displayed
      const newImageNum = getNewRandomImage();

      if (newImageNum) {
        setFadingIndex(positionToChange);
        setNextImage(newImageNum);
        setLastChangedPosition(positionToChange);

        setTimeout(() => {
          setDisplayedImages(prev => {
            const newIndices = [...prev];
            newIndices[positionToChange] = newImageNum;
            return newIndices;
          });
          setImageIndices(prev => {
            const newIndices = [...prev];
            newIndices[positionToChange] = newImageNum;
            return newIndices;
          });

          setTimeout(() => {
            setFadingIndex(null);
            setNextImage(null);
          }, 100);
        }, 500);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [imageIndices, galleryOpen, lastChangedPosition]);

  // Modified function to get a new random image
  const getNewRandomImage = () => {
    const currentImages = new Set(imageIndices);
    const availableImages = [];

    // Create array of available images that aren't currently displayed
    for (let i = startIndex; i < startIndex + totalImages; i++) {
      if (!currentImages.has(i)) {
        availableImages.push(i);
      }
    }

    // If no available images, return null
    if (availableImages.length === 0) return null;

    // Get random image from available ones
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    return availableImages[randomIndex];
  };

  // Modified navigation function to use all images
  const navigateGallery = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % totalImages);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
    }
  };

  // Modified gallery opening function
  const openGallery = (index: number) => {
    const selectedImage = displayedImages[index];
    // Convert the image number back to an index (0-based)
    const actualIndex = selectedImage - startIndex;
    setCurrentImageIndex(actualIndex);
    setGalleryOpen(true);
  };

  // Helper function to get the current image number
  const getCurrentImageNumber = () => {
    return startIndex + currentImageIndex;
  };

  return (
    <>
      {/* Gallery Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="sm:max-w-4xl w-full m-4 p-6 h-[90vh] max-h-[90vh] bg-black/95 border-none" closeButton={false}>
          <DialogTitle className="sr-only">Galeria de Imagens</DialogTitle>
          <div className="relative h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute top-2 right-2 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Navigation buttons */}
            <button
              onClick={() => navigateGallery('prev')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={36} />
            </button>

            <button
              onClick={() => navigateGallery('next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={36} />
            </button>

            {/* Modified current image display */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                className="absolute inset-0 transition-opacity duration-300"
              >
                <Image
                  src={`/gallery/IMG-20250514-WA${getCurrentImageNumber().toString().padStart(4, '0')}.jpg`}
                  alt={`Imagem da galeria ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                  priority
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-image.jpg";
                  }}
                />
              </div>
            </div>

            {/* Modified image counter */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="px-4 py-2 rounded-full bg-black/50 text-white text-sm">
                {currentImageIndex + 1} / {totalImages}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedImages.map((imageNum, i) => (
          <div
            key={`grid-${imageNum}-${i}`}
            className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
            onClick={() => openGallery(i)}
          >
            {/* The new image that will be revealed (only for the changing item) */}
            {fadingIndex === i && nextImage && (
              <div className="absolute inset-0 z-10">
                <Image
                  src={`/gallery/IMG-20250514-WA${nextImage.toString().padStart(4, '0')}.jpg`}
                  alt={`Nova imagem da galeria ${i + 1}`}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-image.jpg";
                  }}
                />
              </div>
            )}

            {/* Current image that fades out */}
            <div
              className={`absolute inset-0 z-20 ${fadingIndex === i ? "transition-opacity duration-500 ease-in-out opacity-0" : ""}`}
            >
              <Image
                src={`/gallery/IMG-20250514-WA${imageNum.toString().padStart(4, '0')}.jpg`}
                alt={`Imagem da galeria ${i + 1}`}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-image.jpg";
                }}
              />
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 flex items-center justify-center z-30">
              <span className="text-white text-lg font-medium">Ver mais</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}