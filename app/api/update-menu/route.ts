import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// --- Ensure Firebase Admin is initialized ---
// Example: import '@/lib/firebaseAdmin';

// Define structures (can also import if shared)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}
interface StructuredMenu {
  [categoryKey: string]: MenuItem[] | undefined;
}

interface UpdateRequestBody {
  menuId: string;
  updatedMenuData: StructuredMenu;
  categoryOrder?: string[];
}

// Define the structure for Firestore update data
interface MenuUpdateData {
  menuData: StructuredMenu;
  updatedAt: admin.firestore.FieldValue;
  categoryOrder?: string[]; // Field to store the order
}

export async function PUT(request: Request) {
  // Check Firebase Admin Initialization
  if (!admin.apps.length) {
    console.error("CRITICAL: Firebase Admin SDK not initialized before /api/update-menu execution.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const { menuId, updatedMenuData, categoryOrder } = (await request.json()) as UpdateRequestBody;
    console.log(`[API Update] Received request for menuId: ${menuId}`);
    console.log(`[API Update] Received categoryOrder:`, categoryOrder); // Log received order

    // Validate input
    if (!menuId || !updatedMenuData || typeof updatedMenuData !== 'object') {
      return NextResponse.json({ error: "Invalid request: 'menuId' and 'updatedMenuData' are required." }, { status: 400 });
    }
    if (categoryOrder && !Array.isArray(categoryOrder)) {
      return NextResponse.json({ error: "Invalid request: 'categoryOrder' must be an array if provided." }, { status: 400 });
    }
    if (!categoryOrder) {
      console.warn(`[API Update] Warning: Updating menu ${menuId} without receiving an explicit 'categoryOrder' array.`);
    }

    const db = getFirestore();
    const menuRef = db.collection('menus').doc(menuId);

    console.log(`Attempting to update Firestore document: ${menuId}`);
    console.log(`Received categoryOrder for update:`, categoryOrder);

    // Prepare data for Firestore update using a generic object type
    const updatePayload: { [key: string]: any } = {
      menuData: updatedMenuData, // The menu items themselves
      updatedAt: FieldValue.serverTimestamp() // Use imported FieldValue
    };

    // Only add categoryOrder to the update if it was provided
    if (categoryOrder) {
      updatePayload.categoryOrder = categoryOrder; // Add the explicit order array
    }

    console.log(`[API Update] Updating Firestore document ${menuId} with data:`, updatePayload);
    // Perform the update
    await menuRef.update(updatePayload);

    console.log(`[API Update] Successfully updated menu data and order for document: ${menuId}`);

    return NextResponse.json({ message: 'Menu updated successfully' }, { status: 200 });

  } catch (error: any) {
    let receivedBody;
    try {
      receivedBody = await request.clone().json();
    } catch {
      receivedBody = 'Could not parse body';
    }
    const requestedMenuId = receivedBody?.menuId || 'unknown';
    console.error(`[API Update] Error during PUT for menu (ID: ${requestedMenuId}):`, error);
    console.error("[API Update] Request Body received on error:", receivedBody);

    if (error.code === 'NOT_FOUND' || error.message?.includes('NOT_FOUND')) {
      return NextResponse.json({ error: 'Menu not found.' }, { status: 404 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update menu.', details: error.message || String(error) },
      { status: 500 }
    );
  }
}