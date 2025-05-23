"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

// Define MenuItem (consistent with MenuUploader)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}

// Define StructuredMenu with correct index signature
interface StructuredMenu {
  [key: string]: MenuItem[] | undefined; // Maps string keys to arrays of MenuItem or undefined
}

interface ExistingImage {
  url: string;
  originalFilename: string;
  mimeType: string;
}

interface LatestMenuData {
  id: string;
  createdAt: string;
  menuData: StructuredMenu;
  processedImages: ExistingImage[];
  categoryOrder?: string[]; // <-- Add categoryOrder (optional for backward compatibility)
}

export default function Menu() {
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [currentMenuId, setCurrentMenuId] = useState<string | null>(null);
  const [menu, setMenu] = useState<StructuredMenu | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<string[] | null>(null); // <-- Add state for order
  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState({ left: false, right: true });
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Add new function to handle scroll buttons
  const handleScroll = (direction: 'left' | 'right') => {
    const tabsContainer = document.querySelector('.tabs-scroll-container');
    if (tabsContainer) {
      const scrollAmount = 200; // Adjust this value as needed
      const newScrollPosition = direction === 'left'
        ? tabsContainer.scrollLeft - scrollAmount
        : tabsContainer.scrollLeft + scrollAmount;

      tabsContainer.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
    }
  };

  // Update the handleTabsScroll function
  const handleTabsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrollable = element.scrollWidth > element.clientWidth;
    const isScrolledToEnd = Math.abs(element.scrollWidth - element.clientWidth - element.scrollLeft) < 10;
    const isScrolledToStart = element.scrollLeft === 0;

    setShowScrollIndicator({
      right: isScrollable && !isScrolledToEnd,
      left: isScrollable && !isScrolledToStart
    });
  };

  useEffect(() => {
    const fetchLatestMenu = async () => {
      setIsLoadingInitialData(true);
      setProcessingError(null); // Clear previous errors
      try {
        const response = await fetch('/api/get-latest-menu');

        if (response.status === 404) {
          console.log("No existing menu found. Ready for new upload.");
          setIsLoadingInitialData(false);
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Try to parse error
          throw new Error(errorData.error || `Failed to fetch latest menu (Status: ${response.status})`);
        }

        const data: LatestMenuData = await response.json();

        const fetchedMenuData = data.menuData || {};
        const fetchedCategoryOrder = data.categoryOrder || Object.keys(fetchedMenuData); // Fallback if order is missing

        setCurrentMenuId(data.id);
        setMenu(fetchedMenuData);
        setCategoryOrder(fetchedCategoryOrder); // Store the order
        if (fetchedCategoryOrder.length > 0) {
          setActiveCategory(fetchedCategoryOrder[0]);
        } else {
          setActiveCategory(""); // Handle empty menu case
        }
        setInitialImages(data.processedImages || []); // Store existing images
        setIsPreviewReady(true); // Show the preview section immediately

      } catch (error: any) {
        console.error("Error fetching initial menu data:", error);
        setProcessingError(`Failed to load existing menu: ${error.message}`);
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchLatestMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const handleTabChange = (value: string) => {
    setActiveCategory(value);
  };

  const renderSkeletonLoader = () => (
    <div className="container mx-auto sm:p-6 sm:max-w-4xl w-full px-0">
      <div className="w-full pt-6 sm:p-6">
        <div className="relative">
          <div className="flex flex-row justify-start sm:justify-evenly gap-2 overflow-x-auto pb-2 mb-4">
            <div className="bg-transparent flex gap-2 p-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-md" />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 border p-4 sm:p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-2 flex flex-row gap-2 sm:gap-0 border-b last:border-b-0">
                <div className="w-full sm:w-2/3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="w-full sm:w-1/3 flex justify-end items-center">
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // --- EDIT: Determine ordered keys for rendering ---
  // Use the state variable, fallback to Object.keys if state is null/empty or menu is null
  const orderedCategories = categoryOrder && categoryOrder.length > 0
    ? categoryOrder
    : (menu ? Object.keys(menu) : []);
  // --- END EDIT ---

  return (
    <div>
      {isLoadingInitialData ? (
        renderSkeletonLoader()
      ) : processingError ? (
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p>{processingError}</p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto sm:p-6 sm:max-w-4xl w-full px-0">
          {menu && orderedCategories.length > 0 && (
            <Tabs
              value={activeCategory}
              defaultValue={orderedCategories[0]}
              className="w-full pt-6 sm:p-6"
              onValueChange={handleTabChange}
            >
              <div className="relative">
                <div
                  className="tabs-scroll-container flex flex-row justify-start sm:justify-evenly gap-2 overflow-x-auto overflow-y-hidden pb-2 mb-4 scrollbar-hide"
                  onScroll={handleTabsScroll}
                >
                  <TabsList className="bg-transparent">
                    {orderedCategories.map((category) => (
                      <div key={category}>
                        <TabsTrigger
                          value={category}
                          className="text-sm sm:text-lg font-medium data-[state=active]:border-b-2 data-[state=active]:border-white tracking-wider hover:bg-black/50 transition-all duration-300 hover:text-white whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2"
                        >
                          {category}
                        </TabsTrigger>
                      </div>
                    ))}
                  </TabsList>
                </div>
                {showScrollIndicator.left && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => handleScroll('left')}>
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                {showScrollIndicator.right && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => handleScroll('right')}>
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {menu && orderedCategories.map((category) => {
                const items = menu[category]; // Get items for the current category
                return items && (
                  <TabsContent key={category} value={category} className="mt-6 border p-4 sm:p-6">
                    <ul>
                      {items.map((item: MenuItem) => (
                        <li
                          key={item.name}
                          className="p-2 flex flex-row tracking-wide gap-2 sm:gap-0 border-b last:border-b-0 hover:bg-black/5 transition-colors duration-200"
                        >
                          <div className="w-full sm:w-2/3 text-left flex-0">
                            <h3 className="font-medium sm:text-lg text-sm mb-2">{item.name}</h3>
                            {item.description && (
                              <p className="text-muted-foreground sm:text-xs text-xs text-mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="w-full sm:w-1/3 text-left sm:text-right font-mono flex-1">
                            {item.price && (
                              <p className="text-muted-foreground font-light text-xs sm:text-sm">{item.price}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
          {menu && orderedCategories.length === 0 && !isLoadingInitialData && !processingError && (
            <div className="text-center text-muted-foreground py-10">O menu está vazio.</div>
          )}
          {!menu && !isLoadingInitialData && !processingError && (
            <div className="text-center text-muted-foreground py-10">Nenhum menu encontrado.</div>
          )}
        </div>
      )}
    </div>
  )
}
