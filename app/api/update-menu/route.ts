import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// --- Ensure Firebase Admin is initialized ---
// Example: import '@/lib/firebaseAdmin';

// Define structures (can also import if shared)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}
interface StructuredMenu {
  Aperitivos?: MenuItem[];
  Entradas?: MenuItem[];
  Principais?: MenuItem[];
  Sobremesas?: MenuItem[];
  Bebidas?: MenuItem[];
  Outros?: MenuItem[];
}

interface UpdateRequestBody {
  menuId: string;
  updatedMenuData: StructuredMenu;
}

export async function POST(request: Request) {
  // Check Firebase Admin Initialization
  if (!admin.apps.length) {
    console.error("CRITICAL: Firebase Admin SDK not initialized before /api/update-menu execution.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  try {
    const { menuId, updatedMenuData } = (await request.json()) as UpdateRequestBody;

    // Validate input
    if (!menuId || !updatedMenuData || typeof updatedMenuData !== 'object') {
      return NextResponse.json({ error: "Invalid request: 'menuId' and 'updatedMenuData' are required." }, { status: 400 });
    }

    const db = getFirestore();
    const menuRef = db.collection('menus').doc(menuId);

    console.log(`Attempting to update Firestore document: ${menuId}`);

    // Update only the menuData field
    // Consider adding an 'updatedAt' timestamp as well
    await menuRef.update({
      menuData: updatedMenuData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() // Add/update timestamp
    });

    console.log(`Successfully updated menu data for document: ${menuId}`);

    return NextResponse.json({ message: 'Menu updated successfully' });

  } catch (error: any) {
    console.error(`Error updating menu (ID: ${(request as any)?.body?.menuId || 'unknown'}):`, error);

    // Check for specific Firestore errors (e.g., document not found)
    if (error.code === 'NOT_FOUND' || error.message?.includes('NOT_FOUND')) {
      return NextResponse.json({ error: 'Menu not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update menu.', details: error.message || String(error) },
      { status: 500 }
    );
  }
}