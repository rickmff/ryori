'use client';

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  altText: string;
}

export default function ImagePreviewDialog({
  isOpen,
  onClose,
  imageUrl,
  altText,
}: ImagePreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">{altText}</DialogTitle>
      <DialogContent className="max-w-4xl max-h-[90vh] w-full h-full p-0 backdrop-blur-sm bg-background/30 border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={imageUrl || ''}
            alt={altText}
            fill
            className="object-contain py-10"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}