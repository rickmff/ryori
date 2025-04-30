export type TimeSlotType = {
  id: string
  time: string
  available: boolean
}

export type TimeRange = {
  id: string;
  open: string;
  close: string;
};

export type DayAvailabilityType = {
  id: string;
  name: string;
  enabled: boolean;
  timeRanges: TimeRange[];
};

// Funções para gerenciar a disponibilidade
export function getAvailability(): DayAvailabilityType[] {
  if (typeof window === "undefined") return [];

  const savedAvailability = localStorage.getItem("restaurantAvailability");
  if (savedAvailability) {
    // Ensure timeRanges is always present for each day
    return JSON.parse(savedAvailability).map((day: any) => ({
      ...day,
      timeRanges: Array.isArray(day.timeRanges) ? day.timeRanges : [],
    }));
  }
  return [];
}

export function saveAvailability(availability: DayAvailabilityType[]): void {
  if (typeof window === "undefined") return

  localStorage.setItem("restaurantAvailability", JSON.stringify(availability))
}

// Função para verificar autenticação
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false

  return localStorage.getItem("adminAuthenticated") === "true"
}

export function setAdminAuthenticated(authenticated: boolean): void {
  if (typeof window === "undefined") return

  if (authenticated) {
    localStorage.setItem("adminAuthenticated", "true")
  } else {
    localStorage.removeItem("adminAuthenticated")
  }
}

import "./firebaseAdmin"; // Ensure Firebase Admin is initialized
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Assuming types are defined elsewhere or define them here if not
// Re-defining locally for clarity if not shared
interface MenuItemStructure {
  name: string;
  description?: string;
  price?: string;
}
interface StructuredMenu {
  Menus?: MenuItemStructure[];
  Aperitivos?: MenuItemStructure[];
  Entradas?: MenuItemStructure[];
  Principais?: MenuItemStructure[];
  Sobremesas?: MenuItemStructure[];
  Bebidas?: MenuItemStructure[];
  Outros?: MenuItemStructure[];
}
interface ExistingImage {
  url: string;
  originalFilename: string;
  mimeType: string;
}
interface LatestMenuResponse {
  id: string;
  createdAt: string; // ISO string date
  menuData: StructuredMenu;
  processedImages: ExistingImage[];
}

/**
 * Fetches the most recent menu document from Firestore.
 * Returns the menu data or null if not found.
 * Throws an error if Firestore query fails or data is incomplete.
 */
export async function getLatestMenu(): Promise<LatestMenuResponse | null> {
  try {
    console.log("Attempting to fetch latest menu via getLatestMenu function...");
    const db = getFirestore();
    const menusRef = db.collection('menus');
    const snapshot = await menusRef.orderBy('createdAt', 'desc').limit(1).get();

    if (snapshot.empty) {
      console.log('No menu documents found in Firestore.');
      return null; // Return null specifically for not found
    }

    const latestDoc = snapshot.docs[0];
    const data = latestDoc.data();

    // Validate required fields
    if (!data.menuData || !data.createdAt) {
      console.error(`Firestore document ${latestDoc.id} is missing required fields.`);
      // Throw an error for incomplete data in an existing doc
      throw new Error("Latest menu data from database is incomplete.");
    }

    console.log(`Successfully fetched menu ${latestDoc.id} via getLatestMenu.`);
    // Construct and return the response object
    return {
      id: latestDoc.id,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      menuData: data.menuData as StructuredMenu,
      processedImages: (data.processedImages || []) as ExistingImage[],
    };

  } catch (error: any) {
    console.error("Error in getLatestMenu function:", error);
    // Re-throw the error to be handled by the caller
    // Or return a specific error object/null depending on desired handling
    throw new Error(`Failed to get latest menu from database: ${error.message}`);
  }
}
