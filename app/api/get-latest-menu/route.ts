import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// --- Ensure Firebase Admin is initialized ---
// Example: import '@/lib/firebaseAdmin';

// Define structures (matching server page)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}
interface StructuredMenu {
  Aperitivos?: MenuItem[];
  Entradas?: MenuItem[];
  PratoPrincipais?: MenuItem[];
  Sobremesas?: MenuItem[];
  Bebidas?: MenuItem[];
  Outros?: MenuItem[];
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
}


export async function GET(request: Request) {
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

    const responsePayload: LatestMenuResponse = {
      id: latestDoc.id,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      menuData: data.menuData as StructuredMenu,
      processedImages: (data.processedImages || []) as ProcessedImage[],
    };

    return NextResponse.json(responsePayload);

  } catch (error: any) {
    console.error("Error fetching latest menu via API:", error);
    return NextResponse.json(
      { error: 'Failed to fetch latest menu.', details: error.message || String(error) },
      { status: 500 }
    );
  }
}