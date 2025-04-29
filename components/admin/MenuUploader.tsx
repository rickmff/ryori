'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the structure for a menu item (mirroring the backend)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}

// Define the structure for the categorized menu (mirroring the backend)
interface StructuredMenu {
  Entradas?: MenuItem[];
  PratoPrincipais?: MenuItem[];
  Sobremesas?: MenuItem[];
  Bebidas?: MenuItem[];
  Outros?: MenuItem[];
}

// Helper type for category keys
type MenuCategory = keyof StructuredMenu;

export default function MenuUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [menuData, setMenuData] = useState<StructuredMenu | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMenuData(null);
    } else {
      setFile(null);
      setMenuData(null);
    }
  };

  const processMenu = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    setMenuData(null);
    setIsLoading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.includes(',') ? base64String.split(',')[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/process-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          filename: file.name,
          mimeType: file.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process menu');
      }

      setMenuData(data.menuData);

      toast({
        title: "Success",
        description: "Menu processed successfully!",
      });
    } catch (error: any) {
      console.error("Processing error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process menu. Please try again.",
        variant: "destructive",
      });
      setMenuData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const categoriesWithItems = menuData
    ? (Object.keys(menuData) as MenuCategory[]).filter(
      (key) => menuData[key] && menuData[key]!.length > 0
    )
    : [];

  const categoryDisplayNames: Record<MenuCategory, string> = {
    Entradas: "Entradas",
    PratoPrincipais: "Pratos Principais",
    Sobremesas: "Sobremesas",
    Bebidas: "Bebidas",
    Outros: "Outros"
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Menu Digitization</CardTitle>
          <CardDescription>Upload a menu image (PNG, JPG, WebP) to extract items.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              id="menu-file"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="w-full"
            />
            {file && <p className="text-sm text-muted-foreground mt-2">Selected: {file.name}</p>}
          </div>

          <Button
            onClick={processMenu}
            disabled={!file || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Process Menu'
            )}
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Processing menu...</span>
        </div>
      )}

      {menuData && categoriesWithItems.length > 0 && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Digitized Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={categoriesWithItems[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 mb-4">
                {categoriesWithItems.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {categoryDisplayNames[category] || category}
                  </TabsTrigger>
                ))}
              </TabsList>
              {categoriesWithItems.map((category) => (
                <TabsContent key={category} value={category}>
                  <div className="space-y-4">
                    {menuData[category]?.map((item, index) => (
                      <Card key={`${category}-${index}`} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-grow mr-4">
                            <p className="font-semibold">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.price && (
                            <p className="font-semibold whitespace-nowrap">{item.price}</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
      {menuData && categoriesWithItems.length === 0 && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Digitized Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No menu items were extracted. The image might be unclear or empty.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}