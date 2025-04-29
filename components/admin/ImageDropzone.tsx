'use client';

import { useCallback } from 'react';
import { useDropzone, FileRejection, DropzoneOptions } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ImageDropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  disabled?: boolean;
  acceptedMimeTypes?: DropzoneOptions['accept']; // Allow passing accept config
  maxFiles?: number;
}

const defaultAccept: DropzoneOptions['accept'] = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

export default function ImageDropzone({
  onDrop: parentOnDrop,
  disabled = false,
  acceptedMimeTypes = defaultAccept,
  maxFiles,
}: ImageDropzoneProps) {
  const { toast } = useToast();

  const onDropAccepted = useCallback((acceptedFiles: File[]) => {
    parentOnDrop(acceptedFiles);
  }, [parentOnDrop]);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    fileRejections.forEach(({ file, errors }) => {
      errors.forEach(error => {
        let message = error.message;
        if (error.code === 'file-invalid-type') {
          message = `${file.name}: Invalid file type. Only PNG, JPG, WebP are accepted.`;
        } else if (error.code === 'file-too-large') {
          message = `${file.name}: File is too large.`; // Add size limit info if applicable
        } else if (error.code === 'too-many-files') {
          message = `Too many files selected. Maximum is ${maxFiles}.`;
        }
        toast({
          title: 'File Rejected',
          description: message,
          variant: 'destructive',
        });
      });
    });
  }, [toast, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted,
    onDropRejected,
    accept: acceptedMimeTypes,
    multiple: maxFiles ? maxFiles > 1 : true,
    maxFiles: maxFiles,
    disabled: disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors
                  ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}
                  ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      {isDragActive ? (
        <p className="text-primary font-semibold">Drop the files here ...</p>
      ) : (
        <p className="text-muted-foreground">
          Drag 'n' drop files here, or click to select
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">Supports: PNG, JPG, WebP</p>
    </div>
  );
}