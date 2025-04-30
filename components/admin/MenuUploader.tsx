'use client';

import { useState, useCallback, useEffect } from 'react';
// Remove direct import of useDropzone
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, XCircle, List as ListIcon, UploadCloud, FileScan, Save, Trash2, ScanSearch, GripVertical, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Import the new ImageDropzone component
import ImageDropzone from './ImageDropzone';
import ImagePreviewDialog from './ImagePreviewDialog';
import { Alert, AlertDescription } from '../ui/alert';

// Define the structure for a menu item (mirroring the backend)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}

// Define the structure for the categorized menu (mirroring the backend)
interface StructuredMenu {
  [categoryKey: string]: MenuItem[] | undefined; // Allows any string key to hold MenuItem[] or be undefined
}

// Helper type for category keys
type MenuCategory = string; // Category keys are now dynamic strings

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

// Add new DraggableMenuItem component
interface DraggableMenuItemProps {
  item: MenuItem;
  id: string;
  currentCategory: MenuCategory;
  allCategories: MenuCategory[];
  categoryDisplayNames: Record<MenuCategory, string>;
  onCategoryChange: (itemId: string, newCategory: MenuCategory) => void;
  onDeleteItem: (itemId: string) => void;
}

function DraggableMenuItem({ item, id, currentCategory, allCategories, categoryDisplayNames, onCategoryChange, onDeleteItem }: DraggableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="p-3 text-sm shadow-sm space-y-2 bg-card relative group"
    >
      <div
        {...listeners}
        className="absolute top-1/2 -translate-y-1/2 left-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="ml-6">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-grow min-w-0">
            <p className="font-semibold">{item.name || "Unnamed Item"}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex items-center flex-shrink-0 gap-2">
            {item.price && (
              <p className="font-medium whitespace-nowrap text-sm">{item.price}</p>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDeleteItem(id); }}
              aria-label="Delete item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-dashed mt-2">
          <span className="text-xs text-muted-foreground">Categoria:</span>
          <Select value={currentCategory} onValueChange={(newCategoryValue) => onCategoryChange(id, newCategoryValue as MenuCategory)}>
            <SelectTrigger className="h-7 text-xs w-[150px]"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{allCategories.map(cat => <SelectItem key={cat} value={cat} className="text-xs">{categoryDisplayNames[cat] || cat}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

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
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialMenuOrder, setInitialMenuOrder] = useState<StructuredMenu | null>(null);

  // --- New State for Controlled Tabs ---
  const [activeTab, setActiveTab] = useState<MenuCategory | undefined>(undefined);

  // --- State for Inline Add Item Form ---
  const [addItemFormCategory, setAddItemFormCategory] = useState<MenuCategory | null>(null);
  const [inlineNewItemName, setInlineNewItemName] = useState('');
  const [inlineNewItemDesc, setInlineNewItemDesc] = useState('');
  const [inlineNewItemPrice, setInlineNewItemPrice] = useState('');
  const [inlineNewItemError, setInlineNewItemError] = useState<string | null>(null);

  // --- State for New Category Popover ---
  const [isNewCategoryPopoverOpen, setIsNewCategoryPopoverOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);

  // Add drag and drop sensors at the component level
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Add handleDragEnd at the component level
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id && combinedMenuData) {
      const category = active.id.split('-')[0] as MenuCategory;
      const oldIndex = combinedMenuData[category]!.findIndex(item => `${category}-${item.name}` === active.id);
      const newIndex = combinedMenuData[category]!.findIndex(item => `${category}-${item.name}` === over.id);

      const newItems = [...combinedMenuData[category]!];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);

      setCombinedMenuData(prev => ({
        ...prev!,
        [category]: newItems
      }));
    }
  };

  // --- Fetch Latest Menu Data on Mount ---
  useEffect(() => {
    const fetchLatestMenu = async () => {
      setIsLoadingInitialData(true);
      setProcessingError(null);
      try {
        const response = await fetch('/api/get-latest-menu');

        if (response.status === 404) {
          console.log("No existing menu found. Ready for new upload.");
          setIsLoadingInitialData(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch latest menu (Status: ${response.status})`);
        }

        const data = await response.json();
        console.log("API Response Data (/api/get-latest-menu):", JSON.stringify(data, null, 2)); // Log the raw data

        console.log("Loaded latest menu:", data.id);

        // Log data before setting state
        console.log("Setting currentMenuId:", data.id);
        console.log("Setting combinedMenuData:", data.menuData);
        console.log("Setting initialMenuOrder:", data.menuData);
        console.log("Setting initialImages:", data.processedImages);

        setCurrentMenuId(data.id);
        setCombinedMenuData(data.menuData);
        setInitialMenuOrder(data.menuData); // Store initial order
        setInitialImages(data.processedImages || []);
        setIsPreviewReady(true);

      } catch (error: any) {
        console.error("Error fetching initial menu data:", error);
        setProcessingError(`Failed to load existing menu: ${error.message}`);
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchLatestMenu();
  }, []);

  // --- Effect to Manage Active Tab ---
  useEffect(() => {
    if (!combinedMenuData) {
      if (activeTab !== undefined) setActiveTab(undefined);
      return;
    }

    const allCategoryKeys = Object.keys(combinedMenuData) as MenuCategory[];

    if (!activeTab || !allCategoryKeys.includes(activeTab)) {
      const firstCategoryWithItems = allCategoryKeys.find(
        (key) => combinedMenuData[key] && combinedMenuData[key]!.length > 0
      );

      if (firstCategoryWithItems) {
        setActiveTab(firstCategoryWithItems);
      }
    }
  }, [combinedMenuData]);

  // Update the change detection effect
  useEffect(() => {
    // Function to deeply compare two StructuredMenu objects
    const menusAreEqual = (menu1: StructuredMenu | null, menu2: StructuredMenu | null): boolean => {
      if (!menu1 && !menu2) return true; // Both null
      if (!menu1 || !menu2) return false; // One is null, the other isn't

      // Create copies before sorting to avoid modifying the original state directly
      const menu1Copy = menu1 ? { ...menu1 } : null;
      const menu2Copy = menu2 ? { ...menu2 } : null;

      if (!menu1Copy || !menu2Copy) return false; // Should not happen if previous checks pass, but for type safety

      const keys1 = Object.keys(menu1Copy).sort();
      const keys2 = Object.keys(menu2Copy).sort();


      if (keys1.length !== keys2.length || !keys1.every((key, index) => key === keys2[index])) {
        // console.log("[Compare] Keys differ:", keys1, keys2);
        return false; // Different categories or category order (after sort)
      }

      // Compare items within each category
      for (const key of keys1) {
        const items1 = menu1Copy[key] || [];
        const items2 = menu2Copy[key] || [];

        if (items1.length !== items2.length) {
          // console.log(`[Compare] Length differs in ${key}:`, items1.length, items2.length);
          return false;
        }

        // More robust comparison: check name, description, price individually
        for (let i = 0; i < items1.length; i++) {
          const item1 = items1[i];
          const item2 = items2[i];
          if (item1.name !== item2.name ||
            (item1.description || '') !== (item2.description || '') || // Treat null/undefined/empty string as same
            (item1.price || '') !== (item2.price || '')) {
            // console.log(`[Compare] Item differs in ${key} at index ${i}:`, item1, item2);
            return false;
          }
        }
      }
      // console.log("[Compare] Menus are equal");
      return true; // If all checks pass, menus are considered equal
    };

    const hasNewFiles = selectedFiles.length > 0;
    let menuHasChanged = false;
    // Check if there's any menu data (new or existing) and compare it to initial state
    // Only consider menu changed if there IS a current or initial menu to compare
    if (combinedMenuData || initialMenuOrder) {
      menuHasChanged = !menusAreEqual(combinedMenuData, initialMenuOrder);
    }

    // console.log(`[Changes] Has New Files: ${hasNewFiles}, Menu Changed: ${menuHasChanged}`); // Debug log

    setHasChanges(hasNewFiles || menuHasChanged);

  }, [currentMenuId, selectedFiles.length, combinedMenuData, initialMenuOrder]); // Dependencies: include all compared states

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

  // Clear all selected files / discard changes - used for starting completely fresh
  const clearSelection = () => {
    // Revoke URLs for newly added files
    filePreviews.forEach(url => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setSelectedFiles([]);
    setFilePreviews(new Map());

    // Reset loaded data as well
    setInitialImages([]);
    setCurrentMenuId(null);
    setCombinedMenuData(null); // Clear current preview
    setInitialMenuOrder(null); // Clear initial state reference

    // Reset flags
    setProcessingError(null);
    setIsPreviewReady(false);
    setIsProcessing(false);
    setIsSaving(false);
    setIsLoadingInitialData(false); // Assume we are ready for new upload
    setHasChanges(false); // Reset changes flag
    setActiveTab(undefined); // Reset active tab
    // Reset inline add form state if open
    handleCancelInlineItem(); // Call the cancel function for inline form
    toast({ title: "Cleared", description: "Ready for new menu upload." });
  };

  const processFilesForPreview = async () => {
    const filesToProcess = selectedFiles;

    if (filesToProcess.length === 0 && initialImages.length === 0) {
      toast({ title: "No files", description: "Add or load menu image files." });
      return;
    }

    if (selectedFiles.length === 0 && initialImages.length > 0) {
      toast({ title: "No New Files Added", description: "Add new images to re-process the menu. (Full reprocessing requires backend updates)." });
      return;
    }
    if (selectedFiles.length > 0) {
      toast({ title: "Processing New Files", description: "Processing newly added files..." });
    } else {
      return;
    }

    setIsProcessing(true);
    setCombinedMenuData(null);
    setProcessingError(null);
    setIsPreviewReady(false);

    try {
      const imageDatas = await Promise.all(
        selectedFiles.map(async (file) => ({
          image: await getBase64(file),
          filename: file.name,
          mimeType: file.type,
        }))
      );

      const response = await fetch('/api/process-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imageDatas }),
      });

      const data: ProcessResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to process menu images (Status: ${response.status})`, {
          cause: data.details,
        });
      }

      if (currentMenuId && initialImages.length > 0) {
        console.warn("Processing result might only contain data from new files. Merging logic or full reprocessing via backend needed.");
        setCombinedMenuData(data.menuData);
      } else {
        setCombinedMenuData(data.menuData);
      }

      setIsPreviewReady(true);

      if (data.warnings && data.warnings.length > 0) {
        toast({
          title: "Processing Completed with Warnings",
          description: (
            <ScrollArea className="h-20">
              <ul className="list-disc list-inside text-xs space-y-1">
                {data.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
              </ul>
            </ScrollArea>
          ),
          variant: "default",
          duration: 9000,
        });
      } else {
        toast({
          title: "Processing Complete",
          description: "Review the extracted menu items. Click 'Save Menu' to keep the results.",
        });
      }

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

  // --- Rescan Selected Files ---
  const handleRescanSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "No Files to Rescan", description: "There are no newly added files selected for rescanning.", variant: "default" });
      return;
    }

    toast({ title: "Rescanning Selected Files", description: `Attempting to re-process ${selectedFiles.length} file(s)...` });

    setIsProcessing(true);
    setCombinedMenuData(currentMenuId ? combinedMenuData : null); // Keep existing data if editing, clear otherwise? Or always clear? Let's clear for now.
    setProcessingError(null);
    setIsPreviewReady(false);

    try {
      const imageDatas = await Promise.all(
        selectedFiles.map(async (file) => ({
          image: await getBase64(file),
          filename: file.name,
          mimeType: file.type,
        }))
      );

      const response = await fetch('/api/process-menu', { // Using the same endpoint as initial processing
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imageDatas }),
      });

      const data: ProcessResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to rescan menu images (Status: ${response.status})`, {
          cause: data.details,
        });
      }

      // Replace or merge logic might be needed if editing an existing menu
      // For now, let's assume rescan replaces the preview with new results
      setCombinedMenuData(data.menuData);
      setIsPreviewReady(true);

      // Handle warnings (similar to processFilesForPreview)
      if (data.warnings && data.warnings.length > 0) {
        toast({ title: "Rescan Completed with Warnings", description: /* ... warning display ... */ `Found ${Object.values(data.menuData).flat().length} items. Please review.`, variant: "default", duration: 7000 });
      } else {
        toast({ title: "Rescan Complete", description: "Review the updated menu items." });
      }

    } catch (error: any) {
      console.error("Rescanning error:", error);
      const errorMessage = error.message || "Failed to rescan selected images.";
      setProcessingError(errorMessage);
      setCombinedMenuData(null); // Clear data on error
      setIsPreviewReady(false);
      toast({ title: "Error During Rescan", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveChanges = async () => {
    console.log("--- handleSaveChanges Called ---");
    console.log("Value of currentMenuId at start:", currentMenuId);

    // Guard against saving when there's nothing to save
    if (!combinedMenuData && selectedFiles.length === 0) {
      toast({ title: "Nothing to Save", description: "Please add files or make changes first.", variant: "destructive" });
      return;
    }
    // Guard specifically against saving an empty menu if that's undesirable
    if (!combinedMenuData || Object.keys(combinedMenuData).every(key => (combinedMenuData[key]?.length ?? 0) === 0)) {
      if (selectedFiles.length === 0 && initialImages.length === 0) {
        toast({ title: "Empty Menu", description: "Cannot save an empty menu with no images.", variant: "destructive" });
        return;
      }
      // Allow saving if there are images, even if menu data is empty (maybe user wants to save just images?)
    }


    setIsSaving(true);
    setProcessingError(null);

    try {
      const newImageDatas = await Promise.all(
        selectedFiles.map(async (file) => ({
          image: await getBase64(file),
          filename: file.name,
          mimeType: file.type,
        }))
      );

      let response: Response;
      let saveData: SaveResponse;

      // Determine images to keep (only relevant for updates)
      // For updates, we only send URLs of images that were initially loaded
      const imagesToKeepUrls = currentMenuId ? initialImages.map(img => img.url) : [];

      // Prepare payload - adjust based on whether it's a create or update
      const payload = currentMenuId
        ? {
          menuId: currentMenuId,
          updatedMenuData: combinedMenuData || {},
          // No image data sent on update anymore
          // --- End Simplified Update Payload ---
        }
        : {
          menuData: combinedMenuData || {}, // Send empty object if null
          images: newImageDatas
        };

      // Determine endpoint
      const endpoint = currentMenuId ? '/api/update-menu' : '/api/save-menu';
      const method = 'POST'; // Or PUT for update if API supports it

      console.log(`Saving menu (${currentMenuId ? 'Update' : 'Create'}) to ${endpoint}...Payload:`, payload);

      response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      saveData = await response.json();


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

      // --- Start: Update state after successful save ---
      // We only set currentMenuId if we just CREATED a new menu.
      // If we UPDATED, currentMenuId should already have the correct value.
      if (!currentMenuId) {
        console.log("[Save Flow - Create] Setting currentMenuId to:", saveData.menuId);
        setCurrentMenuId(saveData.menuId);
      } else {
        console.log("[Save Flow - Update] Preserving existing currentMenuId:", currentMenuId);
        // Do NOT set currentMenuId again on update
      }

      // --- State Updates Specific to Save Type ---
      if (!currentMenuId) { // This condition should now correctly reflect if it was a create operation
        // CREATING a new menu: Update initial images based on response
        const responseImageUrls = saveData.imageUrls ?? []; // Expect images on create
        console.log("[Save Flow - Create] Processing responseImageUrls:", responseImageUrls);
        const updatedInitialImages: ExistingImage[] = responseImageUrls.map(url => {
          const existing = [...initialImages, ...selectedFiles.map(f => ({ url: '', originalFilename: f.name, mimeType: f.type }))]
            .find(img => img.originalFilename && url.includes(encodeURIComponent(img.originalFilename).replace(/%2F/g, '/'))); // More robust check
          const filename = existing?.originalFilename || url.substring(url.lastIndexOf('/') + 1).split('?')[0]; // Handle query params
          const mimeType = existing?.mimeType || 'image/jpeg'; // Default mime type
          return { url, originalFilename: filename, mimeType };
        });
        console.log("[Save Flow - Create] Attempting to set initialImages:", updatedInitialImages);
        setInitialImages(updatedInitialImages);
        setSelectedFiles([]); // Clear selected files after successful create
        setFilePreviews(new Map()); // Clear previews
      } else {
        // UPDATING an existing menu: Keep initialImages as they were, clear selectedFiles (if any were somehow added)
        console.log("[Save Flow - Update] Keeping existing initialImages. Current value:", initialImages);
        console.log("[Save Flow - Update] Clearing selectedFiles (if any). Current value:", selectedFiles);
        // Ensure selectedFiles are cleared even on update, although they shouldn't be added
        setSelectedFiles([]);
        setFilePreviews(new Map());
      }

      // Update the baseline for change detection
      console.log("[Save Flow - Common] Setting initialMenuOrder to current combinedMenuData.");
      setInitialMenuOrder(combinedMenuData);

      console.log("[Save Flow - Common] Resetting hasChanges, processing flags.");
      setHasChanges(false); // Reset hasChanges flag
      setIsPreviewReady(true); // Ensure preview stays visible
      setProcessingError(null);
      // isProcessing should already be false, but ensure it is
      setIsProcessing(false);
      // --- End: Update state after successful save ---

    } catch (error: any) {
      console.error("Saving error:", error);
      const errorMessage = error.message || "Failed to save the menu. Please try again.";
      const errorDetails = error.cause ? `Details: ${error.cause}` : '';
      setProcessingError(`${errorMessage}${errorDetails ? ` ${errorDetails}` : ''}`);
      toast({
        title: "Error Saving Menu",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false); // Ensure saving indicator is turned off
    }
  };

  // --- Discard Changes (Revert to last saved state or clear new preview) ---
  const handleDiscardChanges = () => {
    if (currentMenuId) {
      // Revert to last saved state
      setCombinedMenuData(initialMenuOrder);

      // Clear any newly added files
      filePreviews.forEach(url => {
        if (url && url.startsWith('blob:')) { // Only revoke blob URLs we created
          URL.revokeObjectURL(url);
        }
      });
      setSelectedFiles([]); // Discard added files
      setFilePreviews(new Map()); // Clear previews of added files

      // Reset states
      setProcessingError(null);
      setIsProcessing(false); // Ensure processing state is off
      setIsPreviewReady(true); // It should be ready based on initialMenuOrder
      setHasChanges(false); // Crucially, reset the changes flag

      // Reset inline add form state if open
      handleCancelInlineItem(); // Call the cancel function for inline form

      // Re-evaluate active tab based on restored data
      const keys = initialMenuOrder ? Object.keys(initialMenuOrder) : [];
      const firstCategoryWithItems = keys.find(k => initialMenuOrder && initialMenuOrder[k] && initialMenuOrder[k].length > 0);
      // Safely get the first key only if the keys array is not empty
      const firstCategory = firstCategoryWithItems || (keys.length > 0 ? keys[0] : undefined);
      setActiveTab(firstCategory); // setActiveTab already handles undefined

      toast({ title: "Changes Discarded", description: "Reverted to last saved menu state." });

    } else {
      // If it was a new menu (no currentMenuId), discard means clearing the processing result and added files
      setCombinedMenuData(null);
      setProcessingError(null);
      setIsPreviewReady(false);
      // Also clear the files that led to this preview
      filePreviews.forEach(url => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      setSelectedFiles([]);
      setFilePreviews(new Map());
      setHasChanges(false); // Reset changes flag
      // Reset inline add form state if open
      handleCancelInlineItem(); // Call the cancel function for inline form
      toast({ title: "Preview Discarded", description: "Extracted data and added files cleared." });
    }
  };

  // Update renderMenuDetails function
  const renderMenuDetails = (menuData: StructuredMenu | null) => {
    // Handle null case explicitly
    if (!menuData) {
      return <p className="text-muted-foreground p-4 text-center">Loading menu data or no data available...</p>;
    }

    const categoryDisplayNames: Record<string, string> = {
      Menus: "Menus",
      Aperitivos: "Aperitivos",
      Entradas: "Entradas",
      Principais: "Principais",
      Sobremesas: "Sobremesas",
      Bebidas: "Bebidas",
      Outros: "Outros"
    };

    // Derive categories dynamically from the passed menuData
    const allCategoryKeys = Object.keys(menuData) as MenuCategory[];

    // Filter check needs to ensure menuData[key] is not undefined before checking length
    const categoriesWithItems = allCategoryKeys.filter(key => {
      const items = menuData[key]; // Get items for the key
      return items && items.length > 0; // Check if items exist AND have length > 0
    });

    if (categoriesWithItems.length === 0 && allCategoryKeys.length === 0) {
      // If there are NO categories at all
      return <p className="text-muted-foreground p-4 text-center">No categories or items found.</p>;
    } else if (categoriesWithItems.length === 0 && allCategoryKeys.length > 0) {
      // If categories exist but are all empty (this case will be handled by rendering empty tabs)
      // No need for a top-level message here, the tabs will show they are empty.
    }

    return (
      <Tabs
        value={activeTab || ''} // Use state for value, provide fallback
        onValueChange={(value) => setActiveTab(value as MenuCategory)} // Update state on change
        className="w-full px-2"
      >
        {/* Tabs List and Add Category Button */}
        <div className="flex items-center gap-2 mb-3 px-4">
          <TabsList className="grid flex-grow grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 h-auto">
            {/* Render tabs only for categories currently in the data */}
            {allCategoryKeys
              .filter(key => menuData && menuData[key]) // Ensure key exists in data
              .map((category) => (
                <TabsTrigger key={category} value={category} className="text-sm px-2 py-1.5 hover:bg-black/50 transition-colors duration-300">
                  {/* Use display name if available, otherwise fallback to key */}
                  {categoryDisplayNames[category] || category}
                </TabsTrigger>
              ))}
          </TabsList>
          {/* Add Category Popover */}
          <Popover open={isNewCategoryPopoverOpen} onOpenChange={setIsNewCategoryPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2 flex-shrink-0">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">New Category</h4>
                  <p className="text-xs text-muted-foreground">Enter a name for the new category.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-category-name" className="text-xs">Name</Label>
                  <Input id="new-category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-8" />
                  {newCategoryError && <p className="text-xs text-destructive">{newCategoryError}</p>}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelNewCategory}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveNewCategory}>Create</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {/* Render content for ALL categories */}
        {allCategoryKeys.map((category) => (
          <TabsContent key={category} value={category} className="mt-0 relative">
            <ScrollArea className="h-full min-h-[300px]">
              <div className="p-4 space-y-3">
                {addItemFormCategory !== category && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1 text-muted-foreground"
                    onClick={() => handleShowAddItemForm(category)}
                    disabled={addItemFormCategory !== null}
                  >
                    <PlusCircle className="h-4 w-4" /> Add Item to {categoryDisplayNames[category] || category}
                  </Button>
                )}

                {addItemFormCategory === category && (
                  <Card className="p-4 border border-dashed border-primary/50 bg-muted/20">
                    <p className="text-sm font-medium mb-4">Add New Item to {categoryDisplayNames[category] || category}</p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="inline-new-name" className="text-xs font-medium">Name*</Label>
                        <Input
                          id="inline-new-name"
                          value={inlineNewItemName}
                          onChange={(e) => setInlineNewItemName(e.target.value)}
                          className="h-8 mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="inline-new-desc" className="text-xs font-medium">Description</Label>
                        <Input
                          id="inline-new-desc"
                          value={inlineNewItemDesc}
                          onChange={(e) => setInlineNewItemDesc(e.target.value)}
                          className="h-8 mt-1"
                          placeholder="(Optional)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="inline-new-price" className="text-xs font-medium">Price</Label>
                        <Input
                          id="inline-new-price"
                          value={inlineNewItemPrice}
                          onChange={(e) => setInlineNewItemPrice(e.target.value)}
                          className="h-8 mt-1"
                          placeholder="(Optional, e.g., €12.50)"
                        />
                      </div>
                      {inlineNewItemError && <p className="text-sm text-destructive text-center font-medium pt-1">{inlineNewItemError}</p>}
                      <Separator className="my-4" />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelInlineItem}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveInlineItem}>Save Item</Button>
                      </div>
                    </div>
                  </Card>
                )}

                {menuData[category] && menuData[category]!.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                  >
                    <SortableContext
                      // Ensure items exist before mapping - use empty array as fallback
                      items={(menuData[category] || []).map(item => `${category}-${item.name}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {(menuData[category] || []).map((item) => (
                          <DraggableMenuItem
                            key={`${category}-${item.name}`}
                            id={`${category}-${item.name}`}
                            item={item}
                            currentCategory={category}
                            allCategories={allCategoryKeys}
                            categoryDisplayNames={categoryDisplayNames}
                            onCategoryChange={handleCategoryChange}
                            onDeleteItem={handleDeleteItem}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  // Render message for empty category (only if form is not open)
                  addItemFormCategory !== category && <p className="text-sm text-muted-foreground text-center py-8">This category is empty. Add an item above.</p>
                )}
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

    if (allImageCount === 0 && !isLoadingInitialData) {
      return null;
    }
    if (isLoadingInitialData) return null;

    return (
      <div className="space-y-2">
        <p className="font-medium text-sm mb-2 truncate max-w-xs overflow-hidden">
          Referências ( {allImageCount} / {MAX_FILES} ):
        </p>
        <ScrollArea className="min-h-[150px]">
          <div className="space-y-2">
            {initialImages.map((img) => (
              <div key={img.url} className="flex items-center gap-3 p-2 border rounded-md bg-muted/30 relative">
                <img
                  src={img.url}
                  alt={`Preview of ${img.originalFilename}`}
                  className="object-contain h-12 w-16 rounded border bg-white flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage({ url: img.url, alt: img.originalFilename })}
                />
                <p className="text-xs font-medium truncate flex-grow" title={img.originalFilename}>{img.originalFilename}</p>
                <span className="text-[10px] uppercase font-semibold mr-2 absolute top-1/3 right-10 bg-background/70 px-2 p-1 rounded-sm backdrop-blur-sm text-green-700">Saved</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast({ title: "Not Implemented", description: "Removing saved images requires backend changes.", variant: "destructive" })
                  }}
                  disabled={isProcessing || isSaving || isLoadingInitialData}
                >
                  <XCircle className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {selectedFiles.map((file) => (
              <div key={`${file.name}-preview`} className="flex items-center gap-3 p-2 border rounded-md border-primary/30 bg-primary/5 relative">
                <img
                  src={filePreviews.get(file.name)}
                  alt={`Preview of ${file.name}`}
                  className="object-contain h-12 w-16 rounded border bg-white flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage({ url: filePreviews.get(file.name)!, alt: file.name })}
                />
                <p className="text-xs font-medium truncate flex-grow" title={file.name}>{file.name}</p>
                <span className="text-[10px] uppercase font-semibold text-primary/80 mr-1 absolute top-0 right-10 bg-background/70 px-1 rounded-sm backdrop-blur-sm">New</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeSelectedFile(file.name); }}
                  disabled={isProcessing || isSaving || isLoadingInitialData}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // --- Handle Category Change (Refined with Logging) ---
  const handleCategoryChange = (itemId: string, newCategory: MenuCategory) => {
    if (!combinedMenuData) return;

    // --- More Robust Parsing ---
    // Find the index of the first hyphen
    const firstHyphenIndex = itemId.indexOf('-');
    if (firstHyphenIndex === -1) {
      console.error(`[Cat Change] Invalid itemId format: ${itemId}`);
      return;
    }
    // Extract category and the rest as the name
    const oldCategory = itemId.substring(0, firstHyphenIndex) as MenuCategory;
    const itemName = itemId.substring(firstHyphenIndex + 1); // Get everything after the first hyphen
    // --- End Parsing Refinement ---

    // Log the parsed values
    console.log(`[Cat Change - Parsed] itemId: ${itemId}, oldCategory: ${oldCategory}, itemName: ${itemName}`);

    // Find the item and its index in the old category
    const oldCategoryItems = combinedMenuData[oldCategory] ?? [];
    console.log(`[Cat Change - Searching] Searching in category ${oldCategory}:`, oldCategoryItems); // Log the array being searched

    // Find index comparing the parsed name
    const itemIndex = oldCategoryItems.findIndex(item => item.name === itemName);


    if (itemIndex === -1) {
      // Log comparison details if not found
      console.warn(`[Cat Change - Not Found] Item name '${itemName}' not found in category '${oldCategory}'. Comparing against names:`, oldCategoryItems.map(i => i.name));
      return;
    }

    // Get the item to move
    const itemToMove = oldCategoryItems[itemIndex];
    console.log(`[Cat Change - Found] Found item at index ${itemIndex}:`, itemToMove);


    setCombinedMenuData(prev => {
      if (!prev) return null;

      const newState = { ...prev };

      // Create a new array for the old category without the moved item
      const updatedOldCategoryItems = oldCategoryItems.filter((_, index) => index !== itemIndex);
      newState[oldCategory] = updatedOldCategoryItems;

      // Create a new array for the new category with the added item
      const updatedNewCategoryItems = [...(prev[newCategory] ?? []), itemToMove];
      newState[newCategory] = updatedNewCategoryItems;

      console.log(`[Cat Change - Moved] Moved '${itemName}' from ${oldCategory} (${updatedOldCategoryItems.length} items left) to ${newCategory} (${updatedNewCategoryItems.length} items now)`);
      return newState;
    });
    setHasChanges(true); // Ensure change flag is set
  };

  // --- Handle Delete Item ---
  const handleDeleteItem = (itemId: string) => {
    if (!combinedMenuData) return;

    // Use the same robust parsing as category change
    const firstHyphenIndex = itemId.indexOf('-');
    if (firstHyphenIndex === -1) {
      console.error(`[Delete Item] Invalid itemId format: ${itemId}`);
      return;
    }
    const category = itemId.substring(0, firstHyphenIndex) as MenuCategory;
    const itemName = itemId.substring(firstHyphenIndex + 1);

    setCombinedMenuData(prev => {
      if (!prev) return null;

      const categoryItems = prev[category] ?? [];
      const itemIndex = categoryItems.findIndex(item => item.name === itemName);

      if (itemIndex === -1) {
        console.warn(`[Delete Item] Item '${itemName}' not found in category '${category}'`);
        return prev; // Return previous state if not found
      }

      console.log(`[Delete Item] Deleting '${itemName}' from category '${category}'`);
      const newState = { ...prev };
      // Create new array excluding the item to delete
      newState[category] = categoryItems.filter((_, index) => index !== itemIndex);
      return newState;
    });

    setHasChanges(true); // Ensure change flag is set
    toast({ title: "Item Removed", description: `\"${itemName}\" removed from the menu preview.` });
  };

  // --- Handle Inline Add Item ---
  const handleShowAddItemForm = (category: MenuCategory) => {
    setAddItemFormCategory(category);
    setInlineNewItemName('');
    setInlineNewItemDesc('');
    setInlineNewItemPrice('');
    setInlineNewItemError(null);
  };

  const handleCancelInlineItem = () => {
    setAddItemFormCategory(null);
    setInlineNewItemName('');
    setInlineNewItemDesc('');
    setInlineNewItemPrice('');
    setInlineNewItemError(null);
  };

  const handleSaveInlineItem = () => {
    const targetCategory = addItemFormCategory;
    if (!targetCategory) return; // Should not happen if button is clicked correctly

    // Basic Validation
    const trimmedName = inlineNewItemName.trim();
    if (!trimmedName) {
      setInlineNewItemError("Item name is required.");
      return;
    }

    const newItem: MenuItem = {
      name: trimmedName,
      description: inlineNewItemDesc.trim() || undefined,
      price: inlineNewItemPrice.trim() || undefined,
    };

    // Check for duplicate name within the target category
    if (combinedMenuData?.[targetCategory]?.some(item => item.name === newItem.name)) {
      setInlineNewItemError(`An item named "${newItem.name}" already exists in ${targetCategory}.`);
      return;
    }


    console.log(`[Add Item Inline] Adding new item to ${targetCategory}:`, newItem);

    setCombinedMenuData(prev => {
      if (!prev) return { [targetCategory]: [newItem] };

      const newState = { ...prev };
      const categoryItems = newState[targetCategory] ?? [];
      newState[targetCategory] = [...categoryItems, newItem];
      return newState;
    });

    setHasChanges(true);
    handleCancelInlineItem(); // Reset form state
    toast({ title: "Item Added", description: `"${newItem.name}" added to category "${targetCategory}".` });
  };

  // --- Handle New Category ---
  const handleCancelNewCategory = () => {
    setIsNewCategoryPopoverOpen(false);
    setNewCategoryName('');
    setNewCategoryError(null);
  };

  const handleSaveNewCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setNewCategoryError("Category name cannot be empty.");
      return;
    }

    // Basic normalization (e.g., capitalize first letter, handle spaces if desired)
    // For now, just use the trimmed name. Consider more robust key generation if needed.
    const categoryKey = trimmedName; // Example: Use trimmed name directly as key

    // Check for conflicts (case-insensitive comparison with existing keys)
    const existingKeys = combinedMenuData ? Object.keys(combinedMenuData) : [];
    if (existingKeys.some(key => key.toLowerCase() === categoryKey.toLowerCase())) {
      setNewCategoryError(`Category \"${categoryKey}\" already exists.`);
      return;
    }

    console.log(`[New Category] Adding category: ${categoryKey}`);

    setCombinedMenuData(prev => ({
      ...prev,
      [categoryKey]: [] // Add new category with empty array
    }));

    // Activate the new tab
    setActiveTab(categoryKey as MenuCategory); // Cast needed as key is string initially

    setHasChanges(true);
    handleCancelNewCategory(); // Close popover and clear state
    toast({
      title: "Category Created",
      description: `Category \"${categoryKey}\" added successfully.`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold break-keep">Gerenciar Menu</h2>
        <div className="flex flex-row gap-2"> {/* Use flex-wrap for smaller screens */}
          {/* Discard Changes Button (only when editing existing and has changes) */}
          {currentMenuId && hasChanges && (
            <Alert variant="default" className="border-yellow-500 text-yellow-700 flex items-center justify-between">
              <AlertDescription className="flex items-center">
                Você possui alterações não salvas.
                <Button size="sm" onClick={handleDiscardChanges}
                  className="ml-2 h-auto text-yellow-700 hover:text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20">
                  Desfazer
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {/* Clear/New Menu Button (show if existing menu OR any files/data) */}
          {(currentMenuId || selectedFiles.length > 0 || combinedMenuData) && (
            <Button
              onClick={clearSelection} // Use clearSelection to start fresh
              variant="destructive"
              size="sm"
              disabled={isSaving || isLoadingInitialData || isProcessing}
              title="Clear everything and start a new menu upload"
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Novo Menu
            </Button>
          )}
          {/* Rescan Button - Disable if processing/saving/loading OR if editing existing menu */}
          {selectedFiles.length > 0 && ( // Only show if there are NEW files selected
            <Button
              onClick={handleRescanSelectedFiles}
              variant="secondary"
              size="sm"
              disabled={isProcessing || isSaving || isLoadingInitialData || !!currentMenuId} // Disable if editing
            >
              <ScanSearch className="mr-1.5 h-4 w-4" /> Rescan Selected
            </Button>
          )}
          {/* Save/Update Button */}
          <Button
            onClick={handleSaveChanges}
            size="sm"
          >
            {/* Add spinner when saving */}
            {isSaving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {currentMenuId ? 'Atualizar Menu' : 'Salvar Novo Menu'} {/* Dynamic Text */}
          </Button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row justify-start items-start gap-4 w-full">
        <Card className={`w-full lg:w-1/3 relative`}>
          <div className={`transition-opacity duration-300 p-4 ${isLoadingInitialData ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <CardContent className="space-y-4 p-4 pt-2">
              {/* --- Conditionally Render Dropzone --- */}
              {!currentMenuId && !isLoadingInitialData && !isProcessing && !isSaving && (initialImages.length + selectedFiles.length) < MAX_FILES && (
                <ImageDropzone
                  onDrop={handleDrop}
                  disabled={!!currentMenuId} // Already disabling, but hiding is clearer
                />
              )}
              {(initialImages.length + selectedFiles.length) >= MAX_FILES && !currentMenuId && ( // Only show if creating new menu
                <p className="text-xs text-destructive text-center mt-1">Maximum {MAX_FILES} files reached.</p>
              )}
              {renderFileList()}
            </CardContent>
          </div>
        </Card>

        <Card className="text-center border w-full lg:w-2/3 min-h-[230px] flex flex-col relative">
          {/* --- Loading Overlay --- */}
          {(isLoadingInitialData || isProcessing || isSaving) && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-sm text-muted-foreground">
                {isLoadingInitialData ? "Carregando menu..." : isProcessing ? "Processando imagens..." : "Salvando menu..."}
              </p>
            </div>
          )}

          {/* Content Area (conditionally rendered based on state) */}
          <div className={`flex flex-col flex-grow transition-opacity duration-300 ${(isLoadingInitialData || isProcessing || isSaving) ? 'opacity-30' : 'opacity-100'}`}>

            {/* --- Error State --- */}
            {!isLoadingInitialData && !isProcessing && !isSaving && processingError && (
              <CardContent className="py-12 flex flex-col items-center justify-center flex-grow">
                <XCircle className="h-16 w-16 text-destructive/70 mb-4" />
                <p className="text-destructive font-medium">Error Occurred</p>
                <p className="text-sm text-muted-foreground mt-1 px-4 break-words">{processingError}</p>
                {/* Optionally add a retry button if applicable */}
              </CardContent>
            )}

            {/* --- Empty State (No Files/Data & No Error) --- */}
            {!isLoadingInitialData && !isProcessing && !isSaving && !processingError && !combinedMenuData && initialImages.length === 0 && selectedFiles.length === 0 && (
              <CardContent className="py-12 flex flex-col items-center justify-center flex-grow">
                <UploadCloud className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground font-medium">Add menu images using the panel on the left.</p>
                <p className="text-sm text-muted-foreground mt-1">Start by uploading images for a new menu.</p>
              </CardContent>
            )}

            {/* --- "Process Files" State (No Error) --- */}
            {!isLoadingInitialData && !isProcessing && !isSaving && !processingError && selectedFiles.length > 0 && !isPreviewReady && (
              <div className="p-5 flex flex-col flex-grow items-center justify-center">
                <FileScan className="h-16 w-16 text-muted-foreground/70 mb-4" />
                <p className="font-medium text-muted-foreground">
                  {selectedFiles.length} new file{selectedFiles.length > 1 ? 's added.' : ' added.'} Process to see preview.
                </p>
                <Button
                  className="mt-4"
                  onClick={processFilesForPreview}
                  // Disable button only if actually processing/saving/loading
                  disabled={isProcessing || isSaving || isLoadingInitialData}
                  size="sm"
                >
                  {isProcessing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileScan className="mr-1.5 h-4 w-4" />}
                  Process New Image{selectedFiles.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}

            {/* --- Render Menu Details State (Preview Ready & No Error) --- */}
            {!isLoadingInitialData && !isProcessing && !isSaving && !processingError && combinedMenuData && isPreviewReady && (
              <div className="p-5 text-left flex flex-col flex-grow">
                <div className="flex-grow mb-4 overflow-hidden">
                  {renderMenuDetails(combinedMenuData)}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <ImagePreviewDialog
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        altText={previewImage?.alt || ''}
      />
    </div>
  );
}