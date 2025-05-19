"use client";
import { SetStateAction, useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Gallery() {
  // State to track the current set of images
  const [imageIndices, setImageIndices] = useState<number[]>([]);
  // State to track the next image that will appear
  const [nextImage, setNextImage] = useState<number | null>(null);
  // Track which image is currently fading
  const [fadingIndex, setFadingIndex] = useState<number | null>(null);
  // Add state for gallery dialog
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Total number of available images (10-31 based on your folder)
  const totalImages = 22;
  const startIndex = 10; // Your images start at index 10

  // Initialize random images on first render
  useEffect(() => {
    const initialIndices: SetStateAction<number[]> = [];
    while (initialIndices.length < 8) {
      const randomNum = Math.floor(Math.random() * totalImages) + startIndex;
      if (!initialIndices.includes(randomNum)) {
        initialIndices.push(randomNum);
      }
    }
    setImageIndices(initialIndices);
  }, []);

  // Function to get a new random image that's not currently displayed
  const getNewRandomImage = () => {
    const currentImages = new Set(imageIndices);
    const availableImages = [];

    for (let i = startIndex; i < startIndex + totalImages; i++) {
      if (!currentImages.has(i)) {
        availableImages.push(i);
      }
    }

    if (availableImages.length === 0) return startIndex; // Fallback

    const randomIndex = Math.floor(Math.random() * availableImages.length);
    return availableImages[randomIndex];
  };

  // Effect to change one image periodically
  useEffect(() => {
    if (imageIndices.length < 8) return; // Wait until we have a full set

    const intervalId = setInterval(() => {
      // Select a random position to change (0-7)
      const positionToChange = Math.floor(Math.random() * 8);
      // Prepare the next image that will appear
      const newImageNum = getNewRandomImage();

      // Set up the transition
      setFadingIndex(positionToChange);
      setNextImage(newImageNum);

      // After fade out completes, update the image array
      setTimeout(() => {
        setImageIndices(prev => {
          const newIndices = [...prev];
          newIndices[positionToChange] = newImageNum;
          return newIndices;
        });

        // Reset states after transition completes
        setTimeout(() => {
          setFadingIndex(null);
          setNextImage(null);
        }, 100);
      }, 500); // Match this with the CSS transition duration

    }, 1000); // Change one image every second

    return () => clearInterval(intervalId);
  }, [imageIndices]);

  // Function to handle gallery navigation
  const navigateGallery = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev + 1) % imageIndices.length);
    } else {
      setCurrentImageIndex((prev) => (prev - 1 + imageIndices.length) % imageIndices.length);
    }
  };

  // Function to open gallery with specific image
  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setGalleryOpen(true);
  };

  return (
    <>
      {/* Gallery Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-screen-lg w-full p-0 h-[90vh] max-h-[90vh] bg-black/95 border-none">
          <DialogHeader>
            <DialogTitle className="sr-only">Galeria de Imagens</DialogTitle>
          </DialogHeader>
          <div className="relative h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Navigation buttons */}
            <button
              onClick={() => navigateGallery('prev')}
              className="absolute left-4 z-40 text-white hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={36} />
            </button>

            <button
              onClick={() => navigateGallery('next')}
              className="absolute right-4 z-40 text-white hover:text-gray-300 transition-colors"
            >
              <ChevronRight size={36} />
            </button>

            {/* Current image */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
                <Image
                  src={`/gallery/IMG-20250514-WA00${imageIndices[currentImageIndex]}.jpg`}
                  alt={`Imagem da galeria ${currentImageIndex + 1}`}
                  fill
                  className="object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-image.jpg";
                  }}
                />
              </div>
            </div>

            {/* Image counter */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {currentImageIndex + 1} / {imageIndices.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {imageIndices.map((imageNum, i) => (
          <div
            key={i}
            className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
            onClick={() => openGallery(i)}
          >
            {/* The new image that will be revealed (only for the changing item) */}
            {fadingIndex === i && nextImage && (
              <div className="absolute inset-0 z-10">
                <Image
                  src={`/gallery/IMG-20250514-WA00${nextImage}.jpg`}
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
              className={`absolute inset-0 z-20 ${fadingIndex === i ? "transition-opacity duration-500 ease-in-out opacity-0" : ""
                }`}
            >
              <Image
                src={`/gallery/IMG-20250514-WA00${imageNum}.jpg`}
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