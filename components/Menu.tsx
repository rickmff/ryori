"use client"

import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface StructuredMenu {
  [key: string]: {
    map(arg0: (item: any) => import("react").JSX.Element): import("react").ReactNode
    name: string;
    description?: string;
    price?: string;
  }
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
        <div className="container mx-auto max-w-4xl p-6">
          {menu && (
            <Tabs defaultValue={Object.keys(menu)[0]} className="w-full border rounded-lg p-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 bg-transparent">
                {Object.keys(menu).map((category) => (
                  category !== "Outros" && (
                    <TabsTrigger key={category} value={category} className="bg-white/30 text-black data-[state=active]:text-black data-[state=active]:bg-white/80 data-[state=active]:border">
                      {category}
                    </TabsTrigger>
                  )
                ))}
              </TabsList>
              {Object.entries(menu).map(([category, items]) => (
                <TabsContent key={category} value={category} className="mt-6">
                  <ul>
                    {items.map((item: any) => (
                      <li
                        key={item.name}
                        className="p-2 flex"
                      >
                        <div className="flex-1 text-left">
                          <h3 className="font-semibold text-sm">{item.name}</h3>
                          {item.description && (
                            <p className="text-gray-600 text-xs mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex-1 text-right">
                          {item.price && (
                            <p className="text-muted-foreground font-light text-xs">{item.price}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      )}
    </div>
  )
}
