import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { Bucket } from '@google-cloud/storage';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// --- Ensure Firebase Admin is initialized (Likely in a separate lib/firebaseAdmin.ts) ---
// It's crucial this initialization happens *before* this route handler is called.
// Example (would be in lib/firebaseAdmin.ts):
/*
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Use `new Buffer.from(privateKey).toString('base64')` if using base64 in env
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Make sure this is set
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization error:', error);
    // Handle initialization error appropriately - maybe throw?
  }
}

export default admin;
*/

// Define the structure for a menu item (consistent with frontend and processing)
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}

// Define the structure for the categorized menu (consistent)
interface StructuredMenu {
  Aperitivos?: MenuItem[];
  Entradas?: MenuItem[];
  PratoPrincipais?: MenuItem[];
  Sobremesas?: MenuItem[];
  Bebidas?: MenuItem[];
  Outros?: MenuItem[];
}

// Input data structure for each image to be saved
interface ImageInput {
  image: string; // base64 encoded image data
  filename: string;
  mimeType: string;
}

// Expected request body structure
interface SaveRequestBody {
  menuData: StructuredMenu;
  images: ImageInput[];
}

// Response structure for this endpoint
interface SaveResponse {
  menuId: string;
  imageUrls: string[];
  message: string;
  error?: string; // For error responses
  details?: string;
}

export async function POST(request: Request) {
  // --- Check Firebase Admin Initialization ---
  if (!admin.apps.length) {
    console.error("CRITICAL: Firebase Admin SDK not initialized before /api/save-menu execution.");
    return NextResponse.json(
      { error: "Server configuration error: Firebase services not ready." },
      { status: 500 }
    );
  }
  // ----------------------------------------

  let db: Firestore;
  let bucket: Bucket;

  try {
    // --- Get Firebase Services ---
    try {
      db = getFirestore();
      // Ensure storageBucket name is configured correctly during admin.initializeApp
      if (!process.env.FIREBASE_STORAGE_BUCKET) {
        throw new Error("FIREBASE_STORAGE_BUCKET environment variable is not set.");
      }
      bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
      console.log("Firestore and Storage services obtained successfully for /save-menu.");
    } catch (serviceError: any) {
      console.error('Failed to get Firebase services for /save-menu:', serviceError);
      throw new Error(`Server configuration error: Cannot connect to Firebase services. ${serviceError.message}`);
    }
    // ---------------------------

    // --- Process Save Request ---
    const { menuData, images } = (await request.json()) as SaveRequestBody;

    // Validate input
    if (!menuData || typeof menuData !== 'object' || Object.keys(menuData).length === 0) {
      return NextResponse.json({ error: "Invalid request: 'menuData' is missing or invalid." }, { status: 400 });
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      // Allow saving menu without images? Maybe. For now, require images.
      return NextResponse.json(
        { error: "Invalid request: 'images' array is missing or empty." },
        { status: 400 }
      );
    }

    // --- *** Delete Existing Files in Storage *** ---
    const storagePrefix = 'menus/';
    console.log(`Attempting to delete existing files under prefix: ${storagePrefix}`);
    try {
      const [existingFiles] = await bucket.getFiles({ prefix: storagePrefix });
      if (existingFiles.length > 0) {
        console.log(`Found ${existingFiles.length} existing files to delete.`);
        await Promise.all(existingFiles.map(file => {
          console.log(`Deleting: ${file.name}`);
          return file.delete().catch(delErr => {
            // Log deletion errors but don't necessarily stop the process
            console.error(`Failed to delete file ${file.name}:`, delErr);
          });
        }));
        console.log(`Finished attempting to delete ${existingFiles.length} files.`);
      } else {
        console.log("No existing files found under prefix to delete.");
      }
    } catch (listDeleteError: any) {
      // Log error during listing/deletion but proceed with upload if possible
      console.error(`Error during deletion of existing files under ${storagePrefix}:`, listDeleteError);
      // Optionally, you could decide to return an error here if cleanup is critical
      // return NextResponse.json({ error: "Failed to clean up previous menu files.", details: listDeleteError.message }, { status: 500 });
    }
    // --- *** End Deletion Logic *** ---

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const uploadedImageInfo: { url: string; originalFilename: string; mimeType: string }[] = [];
    const uploadErrors: string[] = [];

    // --- Upload Images to Firebase Storage ---
    for (const imageInput of images) {
      // Validate individual image input
      if (!imageInput.image || !imageInput.filename || !imageInput.mimeType) {
        console.warn(`Skipping invalid image data in save request: ${imageInput.filename || 'unknown'}`);
        uploadErrors.push(`Invalid data provided for file: ${imageInput.filename || 'unknown'}`);
        continue;
      }
      if (!allowedMimeTypes.includes(imageInput.mimeType)) {
        console.warn(`Skipping invalid mime type in save request: ${imageInput.filename} (${imageInput.mimeType})`);
        uploadErrors.push(`Invalid file type for ${imageInput.filename}: ${imageInput.mimeType}. Allowed: ${allowedMimeTypes.join(', ')}`);
        continue;
      }

      try {
        const imageBuffer = Buffer.from(imageInput.image, 'base64');
        const uniqueFilename = `menu-${Date.now()}-${uuidv4()}-${imageInput.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`; // Sanitize filename
        const storagePath = `menus/${uniqueFilename}`;
        const fileRef = bucket.file(storagePath);

        console.log(`Uploading NEW image to Storage: ${storagePath}`); // Added NEW for clarity
        await fileRef.save(imageBuffer, {
          metadata: { contentType: imageInput.mimeType },
          // You might want to make this configurable or use signed URLs depending on security needs
          predefinedAcl: 'publicRead', // Make file publicly readable
        });
        // The public URL format
        const imageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

        console.log(`Image uploaded successfully: ${imageUrl}`);
        uploadedImageInfo.push({
          url: imageUrl,
          originalFilename: imageInput.filename,
          mimeType: imageInput.mimeType
        });

      } catch (storageError: any) {
        console.error(`Firebase Storage upload error for ${imageInput.filename}:`, storageError);
        uploadErrors.push(`Failed to upload image ${imageInput.filename}: ${storageError.message}`);
        // Decide if one failed upload should stop the whole save? For now, let's continue.
      }
    } // End of image upload loop

    // --- Handle Upload Failures ---
    if (uploadedImageInfo.length === 0 && images.length > 0) {
      // All image uploads failed
      console.error("All image uploads failed during save operation.", uploadErrors);
      return NextResponse.json(
        { error: `Failed to upload any of the ${images.length} provided image(s).`, details: uploadErrors.join('; ') },
        { status: 500 }
      );
    }

    // --- Save Menu Data and Image Info to Firestore ---
    const menuDocId = uuidv4();
    try {
      const menuDocument = {
        processedImages: uploadedImageInfo, // Array of { url, originalFilename, mimeType }
        menuData: menuData, // The structured menu data received from the client
        createdAt: admin.firestore.Timestamp.now(),
        // Add any other relevant metadata if needed (e.g., user ID if authenticated)
      };

      await db.collection('menus').doc(menuDocId).set(menuDocument);
      console.log(`Menu data saved to Firestore with ID: ${menuDocId}`);

    } catch (firestoreError: any) {
      console.error('Firestore error during menu save:', firestoreError);
      // Attempt to clean up uploaded images if Firestore save fails? Complex, maybe not necessary.
      return NextResponse.json(
        { error: 'Failed to save the menu data to the database after uploading images.', details: firestoreError.message, partialUploadErrors: uploadErrors },
        { status: 500 }
      );
    }

    // --- Return Success Response ---
    const responsePayload: SaveResponse = {
      menuId: menuDocId,
      imageUrls: uploadedImageInfo.map(info => info.url),
      message: `Menu saved successfully with ${uploadedImageInfo.length} image(s).`,
    };

    // Include warnings about partial upload failures if any occurred
    if (uploadErrors.length > 0) {
      responsePayload.message += ` ${uploadErrors.length} image(s) failed to upload.`;
      console.warn(`Save operation completed for menu ${menuDocId} with image upload warnings:`, uploadErrors);
      // Optionally add warnings array to responsePayload if frontend needs detailed info
    }

    return NextResponse.json(responsePayload);

  } catch (error: any) {
    // Catch top-level errors (e.g., service connection, initial request parsing)
    console.error('Error saving menu:', error);

    let clientErrorMessage = 'Failed to save menu';
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes('Cannot connect to Firebase services')) {
        clientErrorMessage = 'Server configuration error: Could not connect to storage/database.';
      } else if (error.message.startsWith('Invalid request:')) {
        clientErrorMessage = error.message;
        statusCode = 400;
      }
      // Add other specific checks if needed
    }

    return NextResponse.json(
      { error: clientErrorMessage, details: error instanceof Error ? error.message : String(error) },
      { status: statusCode }
    );
  }
}