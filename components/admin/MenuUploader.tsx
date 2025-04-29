'use client';

import { useState, useCallback, useEffect } from 'react';
// Remove direct import of useDropzone
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, XCircle, List as ListIcon, UploadCloud, FileScan, Save, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from 'uuid';

// Import the new ImageDropzone component
import ImageDropzone from './ImageDropzone';

// Define the structure for a menu item (mirroring the backend)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}

// Define the structure for the categorized menu (mirroring the backend)
interface StructuredMenu {
  Aperitivos?: MenuItem[];
  Entradas?: MenuItem[];
  PratoPrincipais?: MenuItem[];
  Sobremesas?: MenuItem[];
  Bebidas?: MenuItem[];
  Outros?: MenuItem[];
}

// Helper type for category keys
type MenuCategory = keyof StructuredMenu;

// Backend response structure from initial processing
interface ProcessResponse {
  menuData: StructuredMenu;
  warnings?: string[];
  error?: string; // Added for consistency
  details?: string; // Added for details
}

// Backend response structure from saving
interface SaveResponse {
  menuId: string;
  imageUrls: string[];
  message: string;
  error?: string; // Added for consistency
  details?: string; // Added for details
}

// --- New structure for existing images from API ---
interface ExistingImage {
  url: string;
  originalFilename: string;
  mimeType: string;
}

// Add limit constant
const MAX_FILES = 10;

export default function MenuUploader() {
  // --- Existing State ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
  const [combinedMenuData, setCombinedMenuData] = useState<StructuredMenu | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // New state for saving operation
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false); // New state for preview
  const { toast } = useToast();

  // --- New State ---
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true); // Loading state for initial fetch
  const [currentMenuId, setCurrentMenuId] = useState<string | null>(null); // ID of the loaded menu
  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]); // Images loaded from DB

  // --- Fetch Latest Menu Data on Mount ---
  useEffect(() => {
    const fetchLatestMenu = async () => {
      setIsLoadingInitialData(true);
      setProcessingError(null); // Clear previous errors
      try {
        const response = await fetch('/api/get-latest-menu');

        if (response.status === 404) {
          console.log("No existing menu found. Ready for new upload.");
          // No data to load, component is ready for new upload
          setIsLoadingInitialData(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try to parse error
          throw new Error(errorData.error || `Failed to fetch latest menu (Status: ${response.status})`);
        }

        // Type definition matching /api/get-latest-menu response
        interface LatestMenuData {
          id: string;
          createdAt: string;
          menuData: StructuredMenu;
          processedImages: ExistingImage[];
        }

        const data: LatestMenuData = await response.json();

        console.log("Loaded latest menu:", data.id);
        setCurrentMenuId(data.id);
        setCombinedMenuData(data.menuData);
        setInitialImages(data.processedImages || []); // Store existing images
        setIsPreviewReady(true); // Show the preview section immediately

      } catch (error: any) {
        console.error("Error fetching initial menu data:", error);
        setProcessingError(`Failed to load existing menu: ${error.message}`);
        // Keep loading false, show error state
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchLatestMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Return only the base64 part
        resolve(base64String.includes(',') ? base64String.split(',')[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // --- Handle Files from Dropzone ---
  const handleDrop = useCallback((acceptedFiles: File[]) => {
    const wasPreviewReady = isPreviewReady; // Check state *before* updates

    // --- Limit Check (consider initial images) ---
    const currentFileCount = initialImages.length + selectedFiles.length;
    const availableSlots = MAX_FILES - currentFileCount;

    if (availableSlots <= 0) {
      toast({
        title: `File Limit Reached (${MAX_FILES})`,
        description: "You cannot add more files. Please remove some first.",
        variant: "destructive",
      });
      return; // Reject all new files
    }

    // Filter out files already selected to avoid duplicates
    const uniqueNewFiles = acceptedFiles.filter(nf =>
      !selectedFiles.some(sf => sf.name === nf.name)
    );

    // Take only as many new files as there are available slots
    const filesToAdd = uniqueNewFiles.slice(0, availableSlots);
    const rejectedCount = acceptedFiles.length - filesToAdd.length; // Includes duplicates and excess files

    if (rejectedCount > 0) {
      toast({
        title: "Some Files Not Added",
        description: `${rejectedCount} file(s) were not added due to duplicates or exceeding the ${MAX_FILES}-file limit.`,
        variant: "default", // Use default or warning color
      });
    }
    // --- End Limit Check ---

    if (filesToAdd.length === 0) return; // No valid new files to add

    const newPreviews = new Map(filePreviews); // Copy existing previews
    filesToAdd.forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      newPreviews.set(file.name, previewUrl);
    });

    setSelectedFiles(prev => [...prev, ...filesToAdd]); // Add only allowed files
    setFilePreviews(newPreviews);

    // If preview was ready, adding files requires reprocessing
    if (wasPreviewReady) {
      setCombinedMenuData(null);
      setProcessingError(null);
      setIsPreviewReady(false);
      toast({
        title: "Files Added",
        description: "New files added. Please process the batch again.", // Simplified message
        variant: "default"
      });
    } else {
      // Otherwise, just clear any previous error/data if files are added initially
      setCombinedMenuData(currentMenuId ? combinedMenuData : null); // Keep loaded data if editing
      setProcessingError(null);
    }

  }, [selectedFiles, filePreviews, isPreviewReady, toast, currentMenuId, initialImages.length, combinedMenuData]); // Added dependencies

  // Remove a selected file before processing OR before saving
  const removeSelectedFile = (fileName: string) => {
    // This currently only handles NEWLY ADDED files (selectedFiles state)
    // We will need to enhance this to handle removing initialImages as well
    const wasPreviewReady = isPreviewReady;
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setFilePreviews(prev => {
      const newPreviews = new Map(prev);
      const url = newPreviews.get(fileName);
      if (url) {
        URL.revokeObjectURL(url);
      }
      newPreviews.delete(fileName);
      return newPreviews;
    });

    // If preview was ready, removing a file means reprocessing is needed
    if (wasPreviewReady) {
      // Keep existing loaded data if editing, otherwise clear
      setCombinedMenuData(currentMenuId ? combinedMenuData : null);
      setProcessingError(null);
      setIsPreviewReady(false); // Needs reprocessing
      toast({
        title: "File Removed",
        description: "Newly added file removed. Process again if needed.",
        variant: "default"
      });
    }
  };

  // Clear all selected files / discard changes
  const clearSelection = () => {
    // Revoke URLs for newly added files
    filePreviews.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    setSelectedFiles([]);
    setFilePreviews(new Map());

    // Reset loaded data as well
    setCombinedMenuData(null);
    setInitialImages([]);
    setCurrentMenuId(null);

    // Reset flags
    setProcessingError(null);
    setIsPreviewReady(false);
    setIsProcessing(false);
    setIsSaving(false);
    setIsLoadingInitialData(false); // Ensure loading is off

    toast({ title: "Cleared", description: "All selections and loaded data cleared. Ready for new menu upload." });
  };

  // --- STEP 1: Process Selected Files (Get Preview Data) ---
  // Needs modification later to handle sending both existing image URLs and new files
  // to a potentially updated /api/process-menu endpoint.
  const processFilesForPreview = async () => {
    // Combine initial images (maybe just URLs) and new files for processing request
    const filesToProcess = selectedFiles; // For now, only process NEW files

    if (filesToProcess.length === 0 && initialImages.length === 0) {
      toast({ title: "No files", description: "Add or load menu image files." });
      return;
    }

    // *** Placeholder for enhanced logic ***
    if (selectedFiles.length === 0 && initialImages.length > 0) {
      toast({ title: "No New Files Added", description: "Add new images to re-process the menu. (Full reprocessing requires backend updates)." });
      // Maybe allow reprocessing existing images? Needs backend support.
      return;
    }
    if (selectedFiles.length > 0) {
      // Proceed with current logic, only sending new files
      toast({ title: "Processing New Files", description: "Processing newly added files..." }); // Inform user
    } else {
      return; // Nothing new to process
    }
    // *** End Placeholder ***

    setIsProcessing(true);
    // Keep existing data in background if editing, replace after processing? Or clear?
    // Let's clear the preview, but maybe keep menuId/initialImages intact
    setCombinedMenuData(null);
    setProcessingError(null);
    setIsPreviewReady(false); // Ensure preview isn't shown during processing

    try {
      // Prepare image data array (only NEW files for now)
      const imageDatas = await Promise.all(
        selectedFiles.map(async (file) => ({
          image: await getBase64(file),
          filename: file.name,
          mimeType: file.type,
        }))
      );

      // Call the processing API (expects { images: [...] })
      const response = await fetch('/api/process-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // TODO: Later, send combination of existing URLs and new imageDatas
        body: JSON.stringify({ images: imageDatas }),
      });

      // Use ProcessResponse type here
      const data: ProcessResponse = await response.json();

      if (!response.ok) {
        // Use error and details from response if available
        throw new Error(data.error || `Failed to process menu images (Status: ${response.status})`, {
          cause: data.details,
        });
      }

      // --- Merge Logic (Placeholder) ---
      // If initial data existed, we might need to merge data.menuData
      // with the previously loaded data if the backend doesn't handle merging.
      // For now, assume backend returns the full, merged menu based on images sent.
      // If we only sent new files, data.menuData might only contain items from new files.
      if (currentMenuId && initialImages.length > 0) {
        console.warn("Processing result might only contain data from new files. Merging logic or full reprocessing via backend needed.");
        // Simple overwrite for now:
        setCombinedMenuData(data.menuData);
        // A better approach would be a backend that processes ALL images (old URLs + new files)
        // or a frontend merge function.
      } else {
        // If it was a new menu upload, just set the data
        setCombinedMenuData(data.menuData);
      }
      // --- End Merge Logic Placeholder ---

      setIsPreviewReady(true); // Indicate that preview is ready

      // Show warnings if any occurred during processing
      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "Processing Completed with Warnings",
          description: (
            <ScrollArea className="h-20"> {/* Add scroll for long warnings */}
              <ul className="list-disc list-inside text-xs space-y-1">
                {data.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
              </ul>
            </ScrollArea>
          ),
          variant: "default", // Keep default or use a warning variant if defined
          duration: 9000, // Longer duration for warnings
        });
      } else {
        toast({
          title: "Processing Complete",
          description: "Review the extracted menu items. Click 'Save Menu' to keep the results.", // Updated description
        });
      }

      // *** DO NOT clear selection here ***

    } catch (error: any) {
      console.error("Processing error:", error);
      const errorMessage = error.message || "Failed to process menu images. Please try again.";
      const errorDetails = error.cause ? `Details: ${error.cause}` : '';
      setProcessingError(`${errorMessage}${errorDetails ? ` ${errorDetails}` : ''}`);
      setCombinedMenuData(null);
      setIsPreviewReady(false);
      toast({
        title: "Error During Processing",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // --- STEP 2: Save Changes (Send Preview Data and Files to Backend) ---
  // Needs modification to call /api/update-menu if currentMenuId exists.
  const handleSaveChanges = async () => {
    // Check if there's data AND (either new files OR initial images exist)
    if (!combinedMenuData || (selectedFiles.length === 0 && initialImages.length === 0)) {
      toast({ title: "Missing Data", description: "Cannot save, menu data or files are missing.", variant: "destructive" });
      return;
    }

    setIsSaving(true); // Set saving state
    setProcessingError(null); // Clear previous errors just in case

    try {
      // Prepare newly added image data (if any)
      const newImageDatas = await Promise.all(
        selectedFiles.map(async (file) => ({
          image: await getBase64(file),
          filename: file.name,
          mimeType: file.type,
        }))
      );

      let response: Response;
      // Allow for different response types from save/update
      let saveData: SaveResponse | { message: string, error?: string, details?: string };

      if (currentMenuId) {
        // --- UPDATE Existing Menu ---
        console.log(`Updating menu ID: ${currentMenuId}`);
        // TODO: Need a way to track which initialImages were *kept*. This requires UI changes.
        // For now, assume all initialImages currently in state are kept.
        const imagesToKeepUrls = initialImages.map(img => img.url); // Placeholder: assumes all loaded images are kept

        // Call the UPDATE API endpoint (needs creation/enhancement)
        response = await fetch('/api/update-menu', { // *** UPDATE ENDPOINT ***
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menuId: currentMenuId,
            updatedMenuData: combinedMenuData,
            imagesToKeepUrls: imagesToKeepUrls, // Send URLs of images intended to be kept
            newImages: newImageDatas // Send newly added images' data
          }),
        });
        saveData = await response.json();

      } else {
        // --- CREATE New Menu ---
        console.log("Saving new menu");
        // Call the original SAVE API endpoint
        response = await fetch('/api/save-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menuData: combinedMenuData,
            // Only send *new* images when creating a *new* menu
            images: newImageDatas
          }),
        });
        saveData = await response.json();
      }

      if (!response.ok) {
        throw new Error(saveData.error || `Failed to save (Status: ${response.status})`, {
          cause: saveData.details
        });
      }

      toast({
        title: "Success!",
        description: saveData.message || `Menu saved successfully.`,
        duration: saveData.message?.includes('failed to upload') ? 7000 : 5000,
      });

      // Clear everything after successful save/update
      clearSelection(); // This now clears files, previews, data, and preview state

    } catch (error: any) {
      console.error("Saving error:", error);
      const errorMessage = error.message || "Failed to save the menu. Please try again.";
      const errorDetails = error.cause ? `Details: ${error.cause}` : '';
      // Keep the data in preview mode on save error so user can retry
      setProcessingError(`${errorMessage}${errorDetails ? ` ${errorDetails}` : ''}`); // Show save error
      toast({
        title: "Error Saving Menu",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false); // Clear saving state
    }
  };

  // --- Discard Changes ---
  // This should probably reload the original data if editing, or clear if was new.
  const handleDiscardChanges = () => {
    if (currentMenuId) {
      // Option 1: Re-fetch (safest?) - Or just reset to initial state
      // Let's reset to the initially loaded state for now
      // This requires storing the originally fetched data separately if we want true reset
      // Simpler: Just clear the preview state IF it resulted from processing new files,
      // and remove newly added files. Keep the originally loaded menuData visible.
      const originallyLoadedData = combinedMenuData; // This isn't quite right, needs better state snapshoting
      // For now: Clear preview status, clear new files.
      setCombinedMenuData(combinedMenuData); // Try to keep the loaded data
      setIsPreviewReady(true); // Re-enable preview based on loaded data (might be stale if processed)
      setSelectedFiles([]); // Discard added files
      setFilePreviews(new Map()); // Clear previews of added files
      setProcessingError(null);
      setIsProcessing(false); // Ensure processing state is off
      toast({ title: "Changes Discarded", description: "Removed newly added files. Showing last saved menu state." });

    } else {
      // If it was a new menu, discard means clearing the processing result
      setCombinedMenuData(null);
      setProcessingError(null);
      setIsPreviewReady(false);
      // Keep selected files for potential reprocessing
      toast({ title: "Preview Discarded", description: "Extracted data cleared. You can process the selected files again." });
    }
  };

  // Render Menu Details (unchanged logic, but check height adjustment)
  const renderMenuDetails = (menuData: StructuredMenu) => {
    const categoriesWithItems = (Object.keys(menuData) as MenuCategory[]).filter(
      (key) => menuData[key] && menuData[key]!.length > 0
    );

    const categoryDisplayNames: Record<MenuCategory, string> = {
      Aperitivos: "Aperitivos",
      Entradas: "Entradas",
      PratoPrincipais: "Pratos Principais",
      Sobremesas: "Sobremesas",
      Bebidas: "Bebidas",
      Outros: "Outros"
    };

    if (categoriesWithItems.length === 0) {
      return <p className="text-muted-foreground p-4 text-center">No menu items were extracted from the selected images.</p>;
    }

    return (
      <Tabs defaultValue={categoriesWithItems[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1 mb-3 h-auto">
          {categoriesWithItems.map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs px-2 py-1.5">
              {categoryDisplayNames[category] || category}
            </TabsTrigger>
          ))}
        </TabsList>
        {categoriesWithItems.map((category) => (
          <TabsContent key={category} value={category} className="mt-0">
            {/* Adjust height based on container - make it slightly shorter to accommodate buttons */}
            <ScrollArea className="h-[calc(100vh-350px)] min-h-[300px] pr-3 border-t pt-3"> {/* Adjusted height */}
              <div className="space-y-2">
                {menuData[category]?.map((item, index) => (
                  <Card key={`${category}-${index}-${uuidv4()}`} className="p-3 text-sm shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-grow mr-2">
                        <p className="font-semibold">{item.name || "Unnamed Item"}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.price && (
                        <p className="font-medium whitespace-nowrap text-sm">{item.price}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  // --- Render function for combined file list ---
  const renderFileList = () => {
    const allImageCount = initialImages.length + selectedFiles.length;

    if (allImageCount === 0 && !isLoadingInitialData) { // Check loading state
      return <p className="text-sm text-muted-foreground text-center pt-4">No files selected or loaded.</p>;
    }
    // Show nothing if loading initially
    if (isLoadingInitialData) return null;


    return (
      <div className="mt-4 space-y-2 border-t pt-3">
        <p className="font-medium text-sm mb-2">
          Current Images ({allImageCount} / {MAX_FILES}): {/* Show combined count */}
        </p>
        {/* Scroll area needs adjustment if loading indicator is inside */}
        <ScrollArea className="min-h-[150px]"> {/* Adjusted height slightly */}
          <div className="space-y-2 pr-3">
            {/* Render initially loaded images */}
            {initialImages.map((img) => (
              <div key={img.url} className="flex items-center gap-3 p-2 border rounded-md bg-muted/30 relative">
                <img
                  src={img.url} // Use the direct URL
                  alt={`Preview of ${img.originalFilename}`}
                  className="object-contain h-12 w-16 rounded border bg-white flex-shrink-0"
                />
                <p className="text-xs font-medium truncate flex-grow" title={img.originalFilename}>{img.originalFilename}</p>
                {/* Add a tag to indicate it's saved */}
                <span className="text-[10px] uppercase font-semibold text-muted-foreground/80 mr-1 absolute top-0 right-10 bg-background/70 px-1 rounded-sm backdrop-blur-sm">Saved</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement removeInitialImage(img.url) which marks for deletion
                    toast({ title: "Not Implemented", description: "Removing saved images requires backend changes.", variant: "destructive" })
                  }}
                  // Disable remove if loading/processing/saving
                  disabled={isProcessing || isSaving || isLoadingInitialData}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {/* Render newly selected files */}
            {selectedFiles.map((file) => (
              <div key={`${file.name}-preview`} className="flex items-center gap-3 p-2 border rounded-md border-primary/30 bg-primary/5 relative">
                <img
                  src={filePreviews.get(file.name)} // Use stored previews
                  alt={`Preview of ${file.name}`}
                  className="object-contain h-12 w-16 rounded border bg-white flex-shrink-0"
                />
                <p className="text-xs font-medium truncate flex-grow" title={file.name}>{file.name}</p>
                {/* Add a tag to indicate it's new */}
                <span className="text-[10px] uppercase font-semibold text-primary/80 mr-1 absolute top-0 right-10 bg-background/70 px-1 rounded-sm backdrop-blur-sm">New</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeSelectedFile(file.name); }}
                  // Disable remove if loading/processing/saving
                  disabled={isProcessing || isSaving || isLoadingInitialData}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        {/* Button to clear all */}
        <div className="pt-3 border-t mt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={clearSelection}
            // Disable clear if any operation is in progress
            disabled={isProcessing || isSaving || isLoadingInitialData}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear All / Start New Menu
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row justify-start items-start gap-4 w-full">
      {/* --- Left Side: File Management Card --- */}
      <Card className={`w-full lg:w-1/3 relative`}> {/* Added relative positioning */}
        {/* Loading overlay for initial load */}
        {isLoadingInitialData && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading latest menu...</p>
          </div>
        )}
        <div className={`transition-opacity duration-300 ${isLoadingInitialData ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-semibold">
              {currentMenuId ? 'Edit Existing Menu' : 'Upload New Menu'} Images
            </CardTitle>
            <p className="text-sm text-muted-foreground">Add or remove images (max {MAX_FILES}).</p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-2">
            <ImageDropzone
              onDrop={handleDrop}
              // Disable dropzone if loading, processing, saving, or max files reached (considering BOTH initial and new)
              disabled={isLoadingInitialData || isProcessing || isSaving || (initialImages.length + selectedFiles.length) >= MAX_FILES}
            />
            {(initialImages.length + selectedFiles.length) >= MAX_FILES && (
              <p className="text-xs text-destructive text-center mt-1">Maximum {MAX_FILES} files reached.</p>
            )}

            {/* Render the combined file list */}
            {renderFileList()}

          </CardContent>
        </div> {/* End opacity wrapper */}
      </Card>

      {/* --- Right Side: Status / Results / Actions Card --- */}
      <Card className="text-center border w-full lg:w-2/3 min-h-[300px] flex flex-col relative">
        {/* Loading overlay for initial load */}
        {isLoadingInitialData && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading latest menu...</p>
          </div>
        )}
        {/* Opacity wrapper for content - Ensure it wraps everything inside the card */}
        <div className={`flex flex-col flex-grow transition-opacity duration-300 ${isLoadingInitialData ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {/* Fallback: Shown only if not loading AND no files (initial or new) AND no error */}
          {!isLoadingInitialData && !isProcessing && !isSaving && !processingError && initialImages.length === 0 && selectedFiles.length === 0 && (
            <CardContent className="py-12 flex flex-col items-center justify-center flex-grow">
              <UploadCloud className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">Add menu images using the panel on the left.</p>
              <p className="text-sm text-muted-foreground mt-1">Start by uploading images for a new menu.</p>
            </CardContent>
          )}

          {/* Prompt to Process: Shown if there are NEW files and preview isn't ready */}
          {selectedFiles.length > 0 && !isPreviewReady && !isProcessing && !isSaving && !processingError && !isLoadingInitialData && (
            <div className="p-5 flex flex-col flex-grow items-center justify-center">
              <FileScan className="h-16 w-16 text-muted-foreground/70 mb-4" />
              <p className="font-medium text-muted-foreground">
                {selectedFiles.length} new file{selectedFiles.length > 1 ? 's added.' : ' added.'} Process to update preview.
              </p>
              <Button
                className="mt-4"
                onClick={processFilesForPreview}
                // Disable if processing, saving, or no new files to process
                disabled={isProcessing || isSaving || selectedFiles.length === 0 || isLoadingInitialData}
                size="sm"
              >
                <FileScan className="mr-1.5 h-4 w-4" />
                Process New Image{selectedFiles.length > 1 ? 's' : ''}
              </Button>
            </div>
          )}

          {/* Message when loaded data exists but no new files added and preview is ready */}
          {currentMenuId && selectedFiles.length === 0 && isPreviewReady && !isProcessing && !isSaving && !processingError && !isLoadingInitialData && (
            <div className="p-5 text-left flex flex-col flex-grow">
              {/* Content similar to Preview State, but indicate it's loaded */}
              <CardHeader className="p-0 pb-3 mb-3 border-b">
                <CardTitle className="text-lg font-semibold">Current Saved Menu</CardTitle>
                <p className="text-sm text-muted-foreground">This is the latest menu stored. Add new images or Save.</p>
              </CardHeader>
              <div className="flex-grow mb-4 overflow-hidden">
                {/* Ensure combinedMenuData is not null before rendering */}
                {combinedMenuData ? renderMenuDetails(combinedMenuData) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Preview...
                  </div>
                )}
              </div>
              <div className="flex justify-end items-center gap-2 pt-4 border-t">
                {/* Save button might be disabled if no changes? Or always allow resave? */}
                {/* For now, allow saving even if no changes (might update timestamp etc) */}
                {/* Disable if no data or no images at all */}
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving || isLoadingInitialData || !combinedMenuData || (initialImages.length === 0 && selectedFiles.length === 0)}
                  size="sm"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Update Menu {/* Text is now explicitly "Update Menu" here */}
                </Button>
              </div>
            </div>
          )}

          {/* Loading State: Initial Processing */}
          {isProcessing && (
            <CardContent className="p-10 flex flex-col items-center justify-center flex-grow">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-primary font-medium">Processing Images...</p>
              <p className="text-sm text-muted-foreground mt-1">Using AI to extract menu items. Please wait.</p>
            </CardContent>
          )}

          {/* Loading State: Saving */}
          {isSaving && (
            <CardContent className="p-10 flex flex-col items-center justify-center flex-grow">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
              <p className="text-green-700 font-medium">Saving Menu...</p>
              <p className="text-sm text-muted-foreground mt-1">Uploading images and saving data.</p>
            </CardContent>
          )}

          {/* Error State */}
          {processingError && !isProcessing && !isSaving && !isLoadingInitialData && (
            <CardContent className="p-6 flex flex-col items-center justify-center flex-grow text-destructive-foreground bg-destructive rounded-b-lg">
              <XCircle className="h-10 w-10 mb-3" />
              <p className="font-semibold text-lg">Operation Failed</p>
              <p className="text-sm mt-1 max-w-md text-center">{processingError}</p>
              <div className="mt-6 flex gap-3 flex-wrap justify-center">
                <Button variant="outline" size="sm" className="bg-destructive hover:bg-destructive/90 border-destructive-foreground/50 text-destructive-foreground" onClick={clearSelection}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Clear All & Start New
                </Button>
                {/* Retry Save if data exists (either loaded or processed) */}
                {(combinedMenuData) && ( // Allow retry if there was data to save
                  <Button variant="secondary" size="sm" className="text-destructive hover:bg-secondary/80" onClick={handleSaveChanges}>
                    Retry Save {currentMenuId ? '(Update)' : '(New)'}
                  </Button>
                )}
                {/* Retry Processing if new files exist */}
                {selectedFiles.length > 0 && (
                  <Button variant="secondary" size="sm" className="text-destructive hover:bg-secondary/80" onClick={processFilesForPreview}>
                    Retry Processing New Files
                  </Button>
                )}
                {/* Option to reload initial data if error occurred and menuId exists */}
                {currentMenuId && (
                  <Button variant="secondary" size="sm" className="text-destructive hover:bg-secondary/80" onClick={() => window.location.reload()}> {/* Simple reload for now */}
                    Reload Latest Menu
                  </Button>
                )}
              </div>
            </CardContent>
          )}

          {/* Preview State: After Processing new files (potentially combined results) */}
          {/* Show this if preview is ready AND it resulted from processing (selectedFiles > 0 OR !currentMenuId means it was a new upload process) */}
          {isPreviewReady && (selectedFiles.length > 0 || !currentMenuId) && combinedMenuData && !isProcessing && !isSaving && !processingError && !isLoadingInitialData && (
            <div className="p-5 text-left flex flex-col flex-grow">
              <CardHeader className="p-0 pb-3 mb-3 border-b">
                <CardTitle className="text-lg font-semibold">
                  {currentMenuId ? 'Updated Menu Preview' : 'Digitized Menu Preview'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">Review the items. Add more files or Save/Discard.</p>
              </CardHeader>
              <div className="flex-grow mb-4 overflow-hidden">
                {renderMenuDetails(combinedMenuData)}
              </div>
              <div className="flex justify-end items-center gap-2 pt-4 border-t">
                {/* Discard only affects the preview / newly added files */}
                <Button variant="outline" size="sm" onClick={handleDiscardChanges} disabled={isSaving}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Discard Changes {/* Changed text */}
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  // Disable save if saving, or no files/images exist at all
                  disabled={isSaving || (selectedFiles.length === 0 && initialImages.length === 0)}
                  size="sm"
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  {currentMenuId ? 'Update Menu' : 'Save New Menu'}
                </Button>
              </div>
            </div>
          )}
        </div> {/* End opacity wrapper */}
      </Card>
    </div>
  );
}