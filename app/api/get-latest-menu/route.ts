import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin'; // Import the initializer function

// --- Ensure Firebase Admin is initialized ---
// Example: import '@/lib/firebaseAdmin';

// Define structures (matching server page)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}
interface StructuredMenu {
  [key: string]: MenuItem[] | undefined; // Maps string keys to arrays of MenuItem or undefined
}
interface ProcessedImage {
  url: string;
  originalFilename: string;
  mimeType: string;
}
// Response type matching server page LatestMenuData
interface LatestMenuResponse {
  id: string;
  createdAt: string; // ISO string
  menuData: StructuredMenu;
  processedImages: ProcessedImage[];
  categoryOrder?: string[]; // Add the order array
}


export async function GET(request: Request) {
  // Ensure Firebase Admin is initialized
  getFirebaseAdmin(); // Call the initialization function

  // Check Firebase Admin Initialization
  if (!admin.apps.length) {
    console.error("CRITICAL: Firebase Admin SDK not initialized before /api/get-latest-menu execution.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const db = getFirestore();
    const menusRef = db.collection('menus');
    const snapshot = await menusRef.orderBy('createdAt', 'desc').limit(1).get();

    if (snapshot.empty) {
      console.log('No documents found in menus collection.');
      // Return a specific status or empty object to indicate not found
      return NextResponse.json({ message: "No saved menu found." }, { status: 404 });
    }

    const latestDoc = snapshot.docs[0];
    const data = latestDoc.data();

    // Ensure required fields exist
    if (!data.menuData || !data.createdAt) {
      console.error(`Document ${latestDoc.id} is missing required fields (menuData or createdAt).`);
      // Treat as not found or internal error? Let's say internal error for missing data in existing doc.
      return NextResponse.json({ error: "Latest menu data is incomplete." }, { status: 500 });
    }

    // Reconstruct menuData based on categoryOrder
    const rawMenuData = data.menuData as StructuredMenu || {};
    // Get the saved order, or fall back to object keys if order is missing (e.g., old data)
    const fetchedCategoryOrder = data.categoryOrder as string[] | undefined || Object.keys(rawMenuData);

    // Build the menuData object in the correct order
    const orderedMenuData: StructuredMenu = {};
    for (const category of fetchedCategoryOrder) {
      if (rawMenuData[category]) { // Check if the category exists in the raw data
        orderedMenuData[category] = rawMenuData[category];
      }
    }

    // Use orderedMenuData and include fetchedCategoryOrder in response
    const responsePayload: LatestMenuResponse = {
      id: latestDoc.id,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      menuData: orderedMenuData, // Use the reconstructed, ordered object
      processedImages: (data.processedImages || []) as ProcessedImage[],
      categoryOrder: fetchedCategoryOrder, // Send the order array to the frontend
    };

    console.log(`[API Get Latest] Sending menu ${responsePayload.id} with category order:`, responsePayload.categoryOrder);
    return NextResponse.json(responsePayload);

  } catch (error: any) {
    console.error("Error fetching latest menu via API:", error);
    return NextResponse.json(
      { error: 'Failed to fetch latest menu.', details: error.message || String(error) },
      { status: 500 }
    );
  }
}