"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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


export default function Menu() {
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [currentMenuId, setCurrentMenuId] = useState<string | null>(null);
  const [menu, setMenu] = useState<StructuredMenu | null>(null);
  const [initialImages, setInitialImages] = useState<ExistingImage[]>([]);
  const [isPreviewReady, setIsPreviewReady] = useState(false);


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

        setCurrentMenuId(data.id);
        setMenu(data.menuData);
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

  return (
    <div>
      {isLoadingInitialData ? (
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      ) : (
        <div className="container mx-auto p-6">
          {menu && (
            <Tabs defaultValue={Object.keys(menu)[0]} className="w-full p-6">
              <TabsList className="flex flex-row justify-evenly gap-2 bg-transparent">
                {Object.keys(menu).map((category) => (
                  category !== "Outros" && (
                    <TabsTrigger key={category} value={category} className="text-lg font-medium data-[state=active]:border-b-2 data-[state=active]:border-white tracking-wider">
                      {category}
                    </TabsTrigger>
                  )
                ))}
              </TabsList>
              {/* Ensure menu is not null before mapping */}
              {menu && Object.entries(menu).map(([category, items]) => (
                // Check if items is actually an array before mapping
                items && (
                  <TabsContent key={category} value={category} className="mt-6 border p-6">
                    <ul>
                      {items.map((item: MenuItem) => ( // Use MenuItem type
                        <li
                          key={item.name}
                          className="p-2 flex tracking-wide"
                        >
                          <div className="w-2/3 text-left">
                            <h3 className="font-medium text-md ">{item.name}</h3>
                            {item.description && (
                              <p className="text-muted-foreground text-xs mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="w-1/3 text-right">
                            {item.price && (
                              <p className="text-muted-foreground font-light text-sm">{item.price}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </TabsContent>
                )
              ))}
            </Tabs>
          )}
        </div>
      )}
    </div>
  )
}
