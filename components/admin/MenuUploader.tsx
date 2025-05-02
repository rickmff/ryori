'use client';

import { useState, useCallback, useEffect } from 'react';
// Remove direct import of useDropzone
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, XCircle, List as ListIcon, UploadCloud, FileScan, Save, Trash2, ScanSearch, GripVertical, PlusCircle, Pencil } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
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
import { type DropzoneOptions, useDropzone } from 'react-dropzone'; // Re-add useDropzone if needed by ImageDropzone or reinstate handleDrop

// Define the structure for a menu item (mirroring the backend)
interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: string;
}

// Define the structure for menu item data SENT to backend (no ID)
interface BackendMenuItem {
  name: string;
  description?: string;
  price?: string;
}

// Define the structure for the categorized menu (using frontend MenuItem)
interface StructuredMenu {
  [categoryKey: string]: MenuItem[] | undefined;
}

// Define the structure for categorized menu SENT to backend (using BackendMenuItem)
interface BackendStructuredMenu {
  [categoryKey: string]: BackendMenuItem[] | undefined;
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
  itemId: string;
  currentCategory: MenuCategory;
  allCategories: MenuCategory[];
  categoryDisplayNames: Record<MenuCategory, string>;
  onCategoryChange: (itemId: string, oldCategory: MenuCategory, newCategory: MenuCategory) => void;
  onDeleteItem: (itemId: string, category: MenuCategory) => void;
  onUpdateItem: (itemId: string, category: MenuCategory, updatedData: Partial<Omit<MenuItem, 'id'>>) => void;
  isOtherItemEditing: boolean;
  onEditStateChange: (isEditing: boolean) => void;
}

function DraggableMenuItem({
  item,
  itemId,
  currentCategory,
  allCategories,
  categoryDisplayNames,
  onCategoryChange,
  onDeleteItem,
  onUpdateItem,
  isOtherItemEditing,
  onEditStateChange,
}: DraggableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedDesc, setEditedDesc] = useState(item.description || '');
  const [editedPrice, setEditedPrice] = useState(item.price || '');
  const [editError, setEditError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setEditedName(item.name);
    setEditedDesc(item.description || '');
    setEditedPrice(item.price || '');
    setEditError(null);
    setIsEditing(true);
    onEditStateChange(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    onEditStateChange(false);
  };

  const handleSaveEdit = () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setEditError("Item name cannot be empty.");
      return;
    }
    onUpdateItem(itemId, currentCategory, {
      name: trimmedName,
      description: editedDesc.trim() || undefined,
      price: editedPrice.trim() || undefined,
    });
    setIsEditing(false);
    setEditError(null);
    onEditStateChange(false);
  };

  const dragListeners = isEditing ? {} : listeners;
  const dragAttributes = isEditing ? {} : attributes;

  // Determine if buttons should be disabled:
  // Disable if this specific item IS NOT being edited, but SOME OTHER item IS.
  const disableActions = !isEditing && isOtherItemEditing;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...dragAttributes}
      className={`p-3 text-sm shadow-sm space-y-2 bg-card relative group ${isEditing ? 'border-primary border-dashed' : ''}`}
    >
      {!isEditing && (
        <div
          {...dragListeners}
          className="absolute top-1/2 -translate-y-1/2 left-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      <div className="ml-6">
        {!isEditing ? (
          <>
            <div className="flex justify-between items-start gap-3">
              <div className="flex-grow min-w-0">
                <p className="font-semibold">{item.name || "Unnamed Item"}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center flex-shrink-0 gap-1 max-w-32 overflow-hidden">
                {item.price && (
                  <p className="font-medium text-xs sm:text-sm">{item.price}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-dashed mt-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Categoria:</span>
              <Select
                value={currentCategory}
                onValueChange={(newCategoryValue) => onCategoryChange(itemId, currentCategory, newCategoryValue as MenuCategory)}
                disabled={disableActions}
              >
                <SelectTrigger className="text-xs h-8 w-[150px]"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{allCategories.map(cat => <SelectItem key={cat} value={cat} className="text-xs">{categoryDisplayNames[cat] || cat}</SelectItem>)}</SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-8 text-xs text-muted-foreground hover:text-primary"
                onClick={handleStartEdit}
                aria-label="Edit item"
                disabled={disableActions}
                size="sm"
              >
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
              <Button
                variant="outline"
                className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
                onClick={(e) => { e.stopPropagation(); onDeleteItem(itemId, currentCategory); }}
                aria-label="Delete item"
                disabled={disableActions}
                size="sm"
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Remover</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor={`edit-name-${itemId}`} className="text-xs font-medium">Name*</Label>
              <Input
                id={`edit-name-${itemId}`}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-8 mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor={`edit-desc-${itemId}`} className="text-xs font-medium">Description</Label>
              <Input
                id={`edit-desc-${itemId}`}
                value={editedDesc}
                onChange={(e) => setEditedDesc(e.target.value)}
                className="h-8 mt-1"
                placeholder="(Optional)"
              />
            </div>
            <div>
              <Label htmlFor={`edit-price-${itemId}`} className="text-xs font-medium">Price</Label>
              <Input
                id={`edit-price-${itemId}`}
                value={editedPrice}
                onChange={(e) => setEditedPrice(e.target.value)}
                className="h-8 mt-1"
                placeholder="(Optional, e.g., €12.50)"
              />
            </div>
            {editError && <p className="text-xs text-destructive font-medium pt-1">{editError}</p>}
            <Separator className="my-2" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveEdit}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Skeleton Components ---

function LeftCardSkeleton() {
  return (
    <Card className="w-full lg:w-1/3">
      <CardContent className="p-4 pt-6 space-y-4 animate-pulse">
        {/* Skeleton for title */}
        <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
        {/* Skeleton for file list items */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 bg-muted rounded flex-shrink-0"></div>
            <div className="h-4 bg-muted rounded flex-grow"></div>
            <div className="h-6 w-6 bg-muted rounded-full flex-shrink-0"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 bg-muted rounded flex-shrink-0"></div>
            <div className="h-4 bg-muted rounded flex-grow"></div>
            <div className="h-6 w-6 bg-muted rounded-full flex-shrink-0"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-16 bg-muted rounded flex-shrink-0"></div>
            <div className="h-4 bg-muted rounded flex-grow"></div>
            <div className="h-6 w-6 bg-muted rounded-full flex-shrink-0"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RightCardSkeleton() {
  return (
    <Card className="w-full lg:w-2/3 min-h-[230px]">
      <CardContent className="p-4 pt-6 space-y-4 animate-pulse">
        {/* Skeleton for Tabs List */}
        <div className="flex items-center gap-2 mb-3 px-4">
          <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-8 bg-muted rounded hidden sm:block"></div>
            <div className="h-8 bg-muted rounded hidden lg:block"></div>
          </div>
          <div className="h-8 w-8 bg-muted rounded flex-shrink-0"></div> {/* Add Category Button Skeleton */}
        </div>
        {/* Skeleton for Tab Content Area */}
        <div className="p-4 space-y-3">
          <div className="h-8 bg-muted rounded w-full mb-4"></div> {/* Add item button skel */}
          <div className="h-20 bg-muted rounded w-full mb-3"></div> {/* Item skel */}
          <div className="h-20 bg-muted rounded w-full mb-3"></div> {/* Item skel */}
          <div className="h-20 bg-muted rounded w-full"></div>   {/* Item skel */}
        </div>
      </CardContent>
    </Card>
  );
}

// --- End Skeleton Components ---

// Add a new SortableTabsTrigger component
function SortableTabsTrigger({
  category,
  categoryDisplayName,
  isDisabled
}: {
  category: string;
  categoryDisplayName: string;
  isDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <TabsTrigger
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      value={category}
      className={`text-sm px-2 py-1.5 hover:bg-black/50 transition-colors duration-300 ${isDragging ? 'border-dashed border-primary' : ''}`}
      disabled={isDisabled}
    >
      {categoryDisplayName}
    </TabsTrigger>
  );
}

export default function MenuUploader() {
  // --- Existing State ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Map<string, string>>(new Map());
  const [combinedMenuData, setCombinedMenuData] = useState<StructuredMenu | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const { toast } = useToast();

  // --- New State ---
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [currentMenuId, setCurrentMenuId] = useState<string | null>(null);
  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialMenuOrder, setInitialMenuOrder] = useState<StructuredMenu | null>(null);
  const [activeTab, setActiveTab] = useState<MenuCategory | undefined>(undefined);
  const [addItemFormCategory, setAddItemFormCategory] = useState<MenuCategory | null>(null);
  const [inlineNewItemName, setInlineNewItemName] = useState('');
  const [inlineNewItemDesc, setInlineNewItemDesc] = useState('');
  const [inlineNewItemPrice, setInlineNewItemPrice] = useState('');
  const [inlineNewItemError, setInlineNewItemError] = useState<string | null>(null);
  const [isNewCategoryPopoverOpen, setIsNewCategoryPopoverOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null);
  const [isAnyItemEditing, setIsAnyItemEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Find Item Helper ---
  const findItemAndCategory = (itemId: string, menuData: StructuredMenu | null): { item: MenuItem | null, category: MenuCategory | null, index: number } => {
    if (!menuData) return { item: null, category: null, index: -1 };
    for (const category of Object.keys(menuData) as MenuCategory[]) {
      const items = menuData[category];
      if (items) {
        const index = items.findIndex(item => item.id === itemId);
        if (index !== -1) {
          return { item: items[index], category, index };
        }
      }
    }
    return { item: null, category: null, index: -1 };
  };

  // --- Updated handleDragEnd ---
  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || !combinedMenuData) return;
    if (active.id === over.id) return;

    const { category: activeCategory } = findItemAndCategory(active.id, combinedMenuData);
    const { category: overCategory } = findItemAndCategory(over.id, combinedMenuData);

    if (!activeCategory || activeCategory !== overCategory) {
      console.warn("Drag and drop between different categories is not supported by this handler.");
      return;
    }

    const category = activeCategory;
    const itemsInCategory = combinedMenuData[category];
    if (!itemsInCategory) return;

    const oldIndex = itemsInCategory.findIndex(item => item.id === active.id);
    const newIndex = itemsInCategory.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      console.error("Could not find dragged items by ID during reorder.");
      return;
    }

    console.log(`[DragEnd] Reordering in category '${category}'. Moving item from index ${oldIndex} to ${newIndex}.`);

    setCombinedMenuData(prev => {
      if (!prev) return null;

      const newItems = [...itemsInCategory];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);

      return {
        ...prev!,
        [category]: newItems
      };
    });
    setHasChanges(true);
  };

  // --- Fetch Latest Menu Data (Assign IDs) ---
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
        console.log("API Response Data (/api/get-latest-menu):", data); // Log the raw data

        const menuDataWithIds: StructuredMenu = {};
        if (data.menuData) {
          for (const category in data.menuData) {
            menuDataWithIds[category] = (data.menuData[category] || []).map((item: Omit<MenuItem, 'id'>) => ({
              ...item,
              id: uuidv4(),
            }));
          }
        }

        console.log("Loaded latest menu:", data.id);

        setCurrentMenuId(data.id);
        setCombinedMenuData(menuDataWithIds);
        setInitialMenuOrder(menuDataWithIds);
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
      const firstCategory = allCategoryKeys.length > 0 ? allCategoryKeys[0] : undefined;
      setActiveTab(firstCategory);
    }
  }, [combinedMenuData, activeTab]);

  // Update the change detection effect (now compares objects with IDs)
  useEffect(() => {
    const menusAreEqual = (menu1: StructuredMenu | null, menu2: StructuredMenu | null): boolean => {
      if (!menu1 && !menu2) return true;
      if (!menu1 || !menu2) return false;

      const menu1Copy = JSON.parse(JSON.stringify(menu1));
      const menu2Copy = JSON.parse(JSON.stringify(menu2));

      const keys1 = Object.keys(menu1Copy).sort();
      const keys2 = Object.keys(menu2Copy).sort();

      if (keys1.length !== keys2.length || !keys1.every((key, index) => key === keys2[index])) {
        return false;
      }

      for (const key of keys1) {
        const items1 = menu1Copy[key] || [];
        const items2 = menu2Copy[key] || [];

        if (items1.length !== items2.length) {
          return false;
        }

        for (let i = 0; i < items1.length; i++) {
          const item1 = items1[i];
          const item2 = items2[i];
          if (item1.id !== item2.id ||
            item1.name !== item2.name ||
            (item1.description || '') !== (item2.description || '') ||
            (item1.price || '') !== (item2.price || '')) {
            return false;
          }
        }
      }
      return true;
    };

    const hasNewFiles = selectedFiles.length > 0;
    let menuHasChanged = false;
    if (combinedMenuData || initialMenuOrder) {
      menuHasChanged = !menusAreEqual(combinedMenuData, initialMenuOrder);
    }

    setHasChanges(hasNewFiles || menuHasChanged);

  }, [selectedFiles.length, combinedMenuData, initialMenuOrder]);

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.includes(',') ? base64String.split(',')[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
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

      const menuDataWithIds: StructuredMenu = {};
      if (data.menuData) {
        for (const category in data.menuData) {
          menuDataWithIds[category] = (data.menuData[category] || []).map((item: Omit<MenuItem, 'id'>) => ({
            ...item,
            id: uuidv4(),
          }));
        }
      }

      if (currentMenuId && initialImages.length > 0) {
        console.warn("Processing new files while editing: Replacing current preview with results from new files only.");
        setCombinedMenuData(menuDataWithIds);
      } else {
        setCombinedMenuData(menuDataWithIds);
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

  const handleRescanSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({ title: "No Files to Rescan", description: "There are no newly added files selected for rescanning.", variant: "default" });
      return;
    }

    toast({ title: "Rescanning Selected Files", description: `Attempting to re-process ${selectedFiles.length} file(s)...` });

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
        throw new Error(data.error || `Failed to rescan menu images (Status: ${response.status})`, {
          cause: data.details,
        });
      }

      const menuDataWithIds: StructuredMenu = {};
      if (data.menuData) {
        for (const category in data.menuData) {
          menuDataWithIds[category] = (data.menuData[category] || []).map((item: Omit<MenuItem, 'id'>) => ({
            ...item,
            id: uuidv4(),
          }));
        }
      }

      setCombinedMenuData(menuDataWithIds);
      setIsPreviewReady(true);

      if (data.warnings && data.warnings.length > 0) {
        toast({ title: "Rescan Completed with Warnings", description: `Found ${Object.values(data.menuData).flat().length} items. Please review.`, variant: "default", duration: 7000 });
      } else {
        toast({ title: "Rescan Complete", description: "Review the updated menu items." });
      }

    } catch (error: any) {
      console.error("Rescanning error:", error);
      const errorMessage = error.message || "Failed to rescan selected images.";
      setProcessingError(errorMessage);
      setCombinedMenuData(null);
      setIsPreviewReady(false);
      toast({ title: "Error During Rescan", description: errorMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

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
      setCombinedMenuData(currentMenuId ? combinedMenuData : null); // Keep loaded if editing
      setProcessingError(null);
      setIsPreviewReady(false);
      toast({
        title: "Files Added",
        description: "New files added. Please process the batch again.",
        variant: "default"
      });
    } else {
      // Otherwise, just clear any previous error/data if files are added initially
      setCombinedMenuData(currentMenuId ? combinedMenuData : null); // Keep loaded data if editing
      setProcessingError(null);
    }
  }, [selectedFiles, filePreviews, isPreviewReady, toast, currentMenuId, initialImages.length, combinedMenuData]); // Added dependencies for handleDrop

  const handleSaveChanges = async () => {
    console.log("--- handleSaveChanges Called ---");
    console.log("Value of currentMenuId at start:", currentMenuId);

    if (!combinedMenuData && selectedFiles.length === 0) {
      toast({ title: "Nothing to Save", description: "Please add files or make changes first.", variant: "destructive" });
      return;
    }
    if (!combinedMenuData || Object.keys(combinedMenuData).every(key => (combinedMenuData[key]?.length ?? 0) === 0)) {
      if (selectedFiles.length === 0 && initialImages.length === 0) {
        toast({ title: "Empty Menu", description: "Cannot save an empty menu with no images.", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);
    setProcessingError(null);

    const menuDataForBackend: BackendStructuredMenu = {};
    if (combinedMenuData) {
      for (const category in combinedMenuData) {
        menuDataForBackend[category] = (combinedMenuData[category] || []).map(({ id, ...rest }) => rest);
      }
    }

    try {
      const newImageDatas = await Promise.all(
        selectedFiles.map(async (file) => ({
          image: await getBase64(file),
          filename: file.name,
          mimeType: file.type,
        }))
      );

      const payload = currentMenuId
        ? {
          menuId: currentMenuId,
          updatedMenuData: menuDataForBackend || {},
        }
        : {
          menuData: menuDataForBackend || {},
          images: newImageDatas
        };

      const endpoint = currentMenuId ? '/api/update-menu' : '/api/save-menu';
      const method = currentMenuId ? 'PUT' : 'POST';

      console.log(`Saving menu (${currentMenuId ? 'Update' : 'Create'}) to ${endpoint}...`);

      const response = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let saveData: SaveResponse;

      if (!response.ok) {
        let errorData: SaveResponse = { menuId: '', imageUrls: [], message: 'Unknown error', error: `Failed to save (Status: ${response.status})` };
        try {
          errorData = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse error response JSON:", jsonError);
          errorData.error = errorData.error || response.statusText || `Failed to save (Status: ${response.status})`;
        }
        throw new Error(errorData.error || `Server error (Status: ${response.status})`, {
          cause: errorData.details
        });
      }

      if (response.status === 204) {
        console.log("Update successful (204 No Content).");
        saveData = {
          menuId: currentMenuId!,
          imageUrls: initialImages.map(img => img.url),
          message: "Menu atualizado com sucesso.",
        };
      } else {
        try {
          saveData = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse success response JSON:", jsonError, "Response status:", response.status);
          saveData = {
            menuId: currentMenuId || (jsonError as any)?.menuId || '',
            imageUrls: initialImages.map(img => img.url),
            message: "Operação concluída, mas a resposta do servidor foi inesperada.",
            error: "Invalid response format"
          };
          toast({
            title: "Aviso",
            description: saveData.message,
            variant: "default",
          });
        }
      }

      toast({
        title: "Sucesso!",
        description: saveData.message || `Menu salvo com sucesso.`,
        duration: saveData.message?.includes('failed to upload') ? 7000 : 5000,
      });

      const newlySavedMenuData = combinedMenuData;

      if (!currentMenuId && saveData.menuId) {
        console.log("[Save Flow - Create] Setting currentMenuId to:", saveData.menuId);
        setCurrentMenuId(saveData.menuId);
      } else if (currentMenuId) {
        console.log("[Save Flow - Update] Preserving existing currentMenuId:", currentMenuId);
      } else {
        console.warn("[Save Flow - Create] No menuId received in save response.");
      }

      if (!currentMenuId && saveData.menuId) {
        const responseImageUrls = saveData.imageUrls ?? [];
        console.log("[Save Flow - Create] Processing responseImageUrls:", responseImageUrls);
        const updatedInitialImages: ExistingImage[] = responseImageUrls.map(url => {
          const originalFile = selectedFiles.find(f => {
            try { return url.includes(encodeURIComponent(f.name)); } catch { return false; }
          });
          const filename = originalFile?.name || url.substring(url.lastIndexOf('/') + 1).split('?')[0];
          const mimeType = originalFile?.type || 'image/jpeg';
          return { url, originalFilename: filename, mimeType };
        });
        console.log("[Save Flow - Create] Setting initialImages:", updatedInitialImages);
        setInitialImages(updatedInitialImages);
        setSelectedFiles([]);
        setFilePreviews(new Map());
      } else if (currentMenuId) {
        console.log("[Save Flow - Update] Keeping existing initialImages. Current value:", initialImages);
        setSelectedFiles([]);
        setFilePreviews(new Map());
      }

      console.log("[Save Flow - Common] Setting initialMenuOrder to current combinedMenuData (with IDs).");
      setInitialMenuOrder(newlySavedMenuData);

      console.log("[Save Flow - Common] Resetting hasChanges, processing flags.");
      setHasChanges(false);
      setIsPreviewReady(true);
      setProcessingError(null);
      setIsProcessing(false);

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
      setIsSaving(false);
    }
  };

  const handleCategoryChange = (itemId: string, oldCategory: MenuCategory, newCategory: MenuCategory) => {
    if (!combinedMenuData || oldCategory === newCategory) return;

    console.log(`[Cat Change] Request to move item ID ${itemId} from '${oldCategory}' to '${newCategory}'`);

    const { item: itemToMove, index: itemIndex } = findItemAndCategory(itemId, combinedMenuData);

    if (!itemToMove || itemIndex === -1 || !combinedMenuData[oldCategory]) {
      console.warn(`[Cat Change - Failed] Item ID ${itemId} not found in category '${oldCategory}'.`);
      return;
    }

    console.log(`[Cat Change - Found] Found item at index ${itemIndex}:`, itemToMove);

    setCombinedMenuData(prev => {
      if (!prev) return null;

      const newState = { ...prev };

      const updatedOldCategoryItems = (prev[oldCategory] || []).filter((_, index) => index !== itemIndex);
      newState[oldCategory] = updatedOldCategoryItems.length > 0 ? updatedOldCategoryItems : undefined;

      const updatedNewCategoryItems = [...(prev[newCategory] ?? []), itemToMove];
      newState[newCategory] = updatedNewCategoryItems;

      console.log(`[Cat Change - Moved] Moved '${itemToMove.name}' from ${oldCategory} (${updatedOldCategoryItems.length} items left) to ${newCategory} (${updatedNewCategoryItems.length} items now)`);
      return newState;
    });
    setHasChanges(true);
  };

  const handleDeleteItem = (itemId: string, category: MenuCategory) => {
    if (!combinedMenuData) return;

    console.log(`[Delete Item] Request to delete item ID ${itemId} from category '${category}'`);

    const { item: itemToDelete, index: itemIndex } = findItemAndCategory(itemId, combinedMenuData);

    if (!itemToDelete || itemIndex === -1 || !combinedMenuData[category]) {
      console.warn(`[Delete Item - Failed] Item ID ${itemId} not found in category '${category}'.`);
      return;
    }

    console.log(`[Delete Item] Deleting '${itemToDelete.name}' (ID: ${itemId}) from category '${category}' at index ${itemIndex}`);

    setCombinedMenuData(prev => {
      if (!prev) return null;

      const newState = { ...prev };
      const categoryItems = prev[category] ?? [];

      const updatedItems = categoryItems.filter((_, index) => index !== itemIndex);
      newState[category] = updatedItems;

      return newState;
    });

    setHasChanges(true);
    toast({ title: "Item Removed", description: `\"${itemToDelete.name}\" removed from the menu preview.` });
  };

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
    if (!targetCategory) return;

    const trimmedName = inlineNewItemName.trim();
    if (!trimmedName) {
      setInlineNewItemError("Item name is required.");
      return;
    }

    if (combinedMenuData?.[targetCategory]?.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) {
      setInlineNewItemError(`An item named "${trimmedName}" already exists in ${targetCategory}.`);
      return;
    }

    const newItem: MenuItem = {
      id: uuidv4(),
      name: trimmedName,
      description: inlineNewItemDesc.trim() || undefined,
      price: inlineNewItemPrice.trim() || undefined,
    };

    console.log(`[Add Item Inline] Adding new item to ${targetCategory}:`, newItem);

    setCombinedMenuData(prev => {
      if (!prev) return { [targetCategory]: [newItem] };

      const newState = { ...prev };
      const categoryItems = newState[targetCategory] ?? [];
      newState[targetCategory] = [...categoryItems, newItem];
      return newState;
    });

    setHasChanges(true);
    handleCancelInlineItem();
    toast({ title: "Item Added", description: `"${newItem.name}" added to category "${targetCategory}".` });
  };

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

    const categoryKey = trimmedName;

    const existingKeys = combinedMenuData ? Object.keys(combinedMenuData) : [];
    if (existingKeys.some(key => key.toLowerCase() === categoryKey.toLowerCase())) {
      setNewCategoryError(`Category \"${categoryKey}\" already exists.`);
      return;
    }

    console.log(`[New Category] Adding category: ${categoryKey}`);

    setCombinedMenuData(prev => ({
      ...prev,
      [categoryKey]: []
    }));

    setActiveTab(categoryKey as MenuCategory);

    setHasChanges(true);
    handleCancelNewCategory();
    toast({
      title: "Category Created",
      description: `Category \"${categoryKey}\" added successfully.`
    });
  };

  const handleUpdateItem = (itemId: string, category: MenuCategory, updatedData: Partial<Omit<MenuItem, 'id'>>) => {
    console.log(`[Update Item] Request to update item ID ${itemId} in category '${category}' with data:`, updatedData);

    if (updatedData.name) {
      const trimmedNewName = updatedData.name.trim();
      if (combinedMenuData?.[category]?.some(item => item.id !== itemId && item.name.toLowerCase() === trimmedNewName.toLowerCase())) {
        toast({ title: "Update Failed", description: `An item named "${trimmedNewName}" already exists in ${category}.`, variant: "destructive" });
        return;
      }
    }

    setCombinedMenuData(prev => {
      if (!prev) return null;

      const newState = { ...prev };
      const categoryItems = prev[category];

      if (!categoryItems) {
        console.warn(`[Update Item - Failed] Category '${category}' not found.`);
        return prev;
      }

      const itemIndex = categoryItems.findIndex(item => item.id === itemId);

      if (itemIndex === -1) {
        console.warn(`[Update Item - Failed] Item ID ${itemId} not found in category '${category}'.`);
        return prev;
      }

      const updatedItem = {
        ...categoryItems[itemIndex],
        ...updatedData
      };

      const updatedCategoryItems = [
        ...categoryItems.slice(0, itemIndex),
        updatedItem,
        ...categoryItems.slice(itemIndex + 1)
      ];
      newState[category] = updatedCategoryItems;

      console.log(`[Update Item - Success] Updated item ID ${itemId} in category '${category}'. New data:`, updatedItem);
      return newState;
    });

    setHasChanges(true);
    toast({ title: "Item Updated", description: `"${updatedData.name || 'Item'}" details updated.` });
  };

  const handleItemEditStateChange = (isEditing: boolean) => {
    console.log(`[Edit State Change] An item ${isEditing ? 'started' : 'finished'} editing.`);
    setIsAnyItemEditing(isEditing);
  };

  // Add a new handler for category reordering
  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !combinedMenuData) return;
    if (active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log(`[Category DragEnd] Reordering categories. Moving ${activeId} to position of ${overId}.`);

    setCombinedMenuData(prev => {
      if (!prev) return null;

      // Get all category keys in their current order
      const categoryKeys = Object.keys(prev);

      // Find the indices of the categories being moved
      const oldIndex = categoryKeys.indexOf(activeId);
      const newIndex = categoryKeys.indexOf(overId);

      if (oldIndex === -1 || newIndex === -1) {
        console.error("Could not find categories by ID during reorder.");
        return prev;
      }

      // Create a new array with the reordered categories
      const newCategoryKeys = [...categoryKeys];
      const [removed] = newCategoryKeys.splice(oldIndex, 1);
      newCategoryKeys.splice(newIndex, 0, removed);

      // Create a new menu object with the reordered categories
      const newMenu: StructuredMenu = {};
      newCategoryKeys.forEach(key => {
        newMenu[key] = prev[key];
      });

      return newMenu;
    });

    setHasChanges(true);
  };

  const renderMenuDetails = (menuData: StructuredMenu | null) => {
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

    const allCategoryKeys = Object.keys(menuData) as MenuCategory[];

    const categoriesWithItems = allCategoryKeys.filter(key => {
      const items = menuData[key];
      return items && items.length > 0;
    });

    if (categoriesWithItems.length === 0 && allCategoryKeys.length === 0) {
      return <p className="text-muted-foreground p-4 text-center">No categories or items found.</p>;
    } else if (categoriesWithItems.length === 0 && allCategoryKeys.length > 0) {
      // If categories exist but are all empty (this case will be handled by rendering empty tabs)
    }

    return (
      <Tabs
        value={activeTab || ''}
        onValueChange={(value) => setActiveTab(value as MenuCategory)}
        className="w-full"
      >
        <div className="flex items-center gap-2 mb-3 px-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleCategoryDragEnd}
          >
            <TabsList className="grid flex-grow grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 h-auto">
              <SortableContext
                items={allCategoryKeys}
                strategy={horizontalListSortingStrategy}
              >
                {allCategoryKeys.map((category) => (
                  <SortableTabsTrigger
                    key={category}
                    category={category}
                    categoryDisplayName={categoryDisplayNames[category] || category}
                    isDisabled={isAnyItemEditing}
                  />
                ))}
              </SortableContext>
            </TabsList>
          </DndContext>
          <Popover open={isNewCategoryPopoverOpen} onOpenChange={setIsNewCategoryPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="px-2 flex-shrink-0" disabled={isAnyItemEditing}>
                <PlusCircle className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Nova Categoria</h4>
                  <p className="text-xs text-muted-foreground">Digite um nome para a nova categoria.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-category-name" className="text-xs">Nome da Categoria</Label>
                  <Input id="new-category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="h-8" />
                  {newCategoryError && <p className="text-xs text-destructive">{newCategoryError}</p>}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelNewCategory}>Cancelar</Button>
                  <Button size="sm" onClick={handleSaveNewCategory}>Criar</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {allCategoryKeys.map((category) => (
          <TabsContent key={category} value={category} className="mt-0 relative">
            <div className="h-full min-h-[300px]">
              <div className="p-4 space-y-3">
                {addItemFormCategory !== category && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center justify-center gap-1 text-muted-foreground"
                    onClick={() => handleShowAddItemForm(category)}
                    disabled={addItemFormCategory !== null || isAnyItemEditing}
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

                {menuData?.[category] && menuData[category]!.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={(menuData[category] || []).map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {(menuData[category] || []).map((item) => (
                          <DraggableMenuItem
                            key={item.id}
                            itemId={item.id}
                            item={item}
                            currentCategory={category}
                            allCategories={allCategoryKeys}
                            categoryDisplayNames={categoryDisplayNames}
                            onCategoryChange={handleCategoryChange}
                            onDeleteItem={handleDeleteItem}
                            onUpdateItem={handleUpdateItem}
                            isOtherItemEditing={isAnyItemEditing}
                            onEditStateChange={handleItemEditStateChange}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  addItemFormCategory !== category && <p className="text-sm text-muted-foreground text-center py-8">This category is empty. Add an item above.</p>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    );
  };

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

  const clearSelection = () => {
    filePreviews.forEach(url => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setSelectedFiles([]);
    setFilePreviews(new Map());

    setInitialImages([]);
    setCurrentMenuId(null);
    setCombinedMenuData(null);
    setInitialMenuOrder(null);

    setProcessingError(null);
    setIsPreviewReady(false);
    setIsProcessing(false);
    setIsSaving(false);
    setIsLoadingInitialData(false);
    setHasChanges(false);
    setActiveTab(undefined);
    handleCancelInlineItem();
    toast({ title: "Cleared", description: "Ready for new menu upload." });
  };

  const removeSelectedFile = (fileName: string) => {
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

    if (wasPreviewReady) {
      setCombinedMenuData(currentMenuId ? combinedMenuData : null);
      setProcessingError(null);
      setIsPreviewReady(false);
      toast({
        title: "File Removed",
        description: "Newly added file removed. Process again if needed.",
        variant: "default"
      });
    }
  };

  const handleDiscardChanges = () => {
    if (currentMenuId) {
      setCombinedMenuData(initialMenuOrder);

      filePreviews.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      setSelectedFiles([]);
      setFilePreviews(new Map());

      setProcessingError(null);
      setIsProcessing(false);
      setIsPreviewReady(true);
      setHasChanges(false);

      handleCancelInlineItem();

      const keys = initialMenuOrder ? Object.keys(initialMenuOrder) : [];
      const firstCategoryWithItems = keys.find(k => initialMenuOrder && initialMenuOrder[k] && initialMenuOrder[k].length > 0);
      const firstCategory = firstCategoryWithItems || (keys.length > 0 ? keys[0] : undefined);
      setActiveTab(firstCategory);

      toast({ title: "Changes Discarded", description: "Reverted to last saved menu state." });

    } else {
      setCombinedMenuData(null);
      setProcessingError(null);
      setIsPreviewReady(false);
      filePreviews.forEach(url => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      setSelectedFiles([]);
      setFilePreviews(new Map());
      setHasChanges(false);
      handleCancelInlineItem();
      toast({ title: "Preview Discarded", description: "Extracted data and added files cleared." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold break-keep">Gerenciar Menu</h2>
        {!isLoadingInitialData && (
          <div className="flex flex-row items-center gap-2">
            {currentMenuId && hasChanges && !isAnyItemEditing && (
              <Alert variant="default" className="border-yellow-500 text-yellow-700 flex items-center justify-between">
                <AlertDescription className="flex items-center">
                  Você possui alterações não salvas.
                  <Button size="sm" onClick={handleDiscardChanges} disabled={isAnyItemEditing} className="ml-2 h-auto text-yellow-700 hover:text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20">
                    Desfazer
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {(currentMenuId || selectedFiles.length > 0 || combinedMenuData) && (
              <Button
                onClick={clearSelection}
                variant="destructive"
                size="sm"
                disabled={isSaving || isLoadingInitialData || isProcessing || isAnyItemEditing}
                title="Clear everything and start a new menu upload"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Novo Menu
              </Button>
            )}
            {selectedFiles.length > 0 && !currentMenuId && (
              <Button
                onClick={handleRescanSelectedFiles}
                variant="secondary"
                size="sm"
                disabled={isProcessing || isSaving || isLoadingInitialData || isAnyItemEditing}
              >
                <ScanSearch className="mr-1.5 h-4 w-4" /> Rescan Selected
              </Button>
            )}
            <Button
              onClick={handleSaveChanges}
              size="sm"
              disabled={isSaving || isLoadingInitialData || isProcessing || isAnyItemEditing || !hasChanges}
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {currentMenuId ? 'Atualizar Menu' : 'Salvar Novo Menu'}
            </Button>
          </div>
        )}
        {isLoadingInitialData && (
          <div className="flex flex-row items-center gap-2 animate-pulse">
            <div className="h-9 w-24 bg-muted rounded"></div>
            <div className="h-9 w-36 bg-muted rounded"></div>
          </div>
        )}
      </div>

      <div className={`flex flex-col lg:flex-row justify-start items-start gap-4 w-full`}>
        {isLoadingInitialData ? (
          <>
            <LeftCardSkeleton />
            <RightCardSkeleton />
          </>
        ) : (
          <>
            <Card className={`w-full lg:w-1/3 relative ${isAnyItemEditing ? 'opacity-70 pointer-events-none' : ''}`}>
              <div className={`p-4 ${(isAnyItemEditing) ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardContent className="space-y-4 p-4 pt-2">
                  {!currentMenuId && (initialImages.length + selectedFiles.length) < MAX_FILES && (
                    <ImageDropzone
                      onDrop={handleDrop}
                      disabled={isAnyItemEditing}
                    />
                  )}
                  {(initialImages.length + selectedFiles.length) >= MAX_FILES && !currentMenuId && (
                    <p className="text-xs text-destructive text-center mt-1">Maximum {MAX_FILES} files reached.</p>
                  )}
                  {renderFileList()}
                </CardContent>
              </div>
            </Card>

            <Card className={`text-center border w-full lg:w-2/3 min-h-[230px] flex flex-col relative ${isAnyItemEditing ? 'opacity-70' : ''}`}>
              {(isProcessing || isSaving) && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-sm text-muted-foreground">
                    {isProcessing ? "Processando imagens..." : "Salvando menu..."}
                  </p>
                </div>
              )}

              <div className={`flex flex-col flex-grow transition-opacity duration-300 ${(isProcessing || isSaving) ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                {!isProcessing && !isSaving && processingError && (
                  <CardContent className="py-12 flex flex-col items-center justify-center flex-grow">
                    <XCircle className="h-16 w-16 text-destructive/70 mb-4" />
                    <p className="text-destructive font-medium">Error Occurred</p>
                    <p className="text-sm text-muted-foreground mt-1 px-4 break-words">{processingError}</p>
                  </CardContent>
                )}

                {!isProcessing && !isSaving && !processingError && !combinedMenuData && initialImages.length === 0 && selectedFiles.length === 0 && (
                  <CardContent className="py-12 flex flex-col items-center justify-center flex-grow">
                    <UploadCloud className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">Add menu images using the panel on the left.</p>
                    <p className="text-sm text-muted-foreground mt-1">Start by uploading images for a new menu.</p>
                  </CardContent>
                )}

                {!isProcessing && !isSaving && !processingError && selectedFiles.length > 0 && !isPreviewReady && (
                  <div className="p-5 flex flex-col flex-grow items-center justify-center">
                    <FileScan className="h-16 w-16 text-muted-foreground/70 mb-4" />
                    <p className="font-medium text-muted-foreground">
                      {selectedFiles.length} new file{selectedFiles.length > 1 ? 's added.' : ' added.'} Process to see preview.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={processFilesForPreview}
                      disabled={isProcessing || isSaving}
                      size="sm"
                    >
                      {isProcessing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileScan className="mr-1.5 h-4 w-4" />}
                      Process New Image{selectedFiles.length > 1 ? 's' : ''}
                    </Button>
                  </div>
                )}

                {!isProcessing && !isSaving && !processingError && combinedMenuData && isPreviewReady && (
                  <div className="p-4 text-left flex flex-col flex-grow">
                    <div className="flex-grow mb-4 overflow-hidden">
                      {renderMenuDetails(combinedMenuData)}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
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