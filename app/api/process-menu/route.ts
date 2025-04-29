import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage'; // Import storage service
import { Bucket } from '@google-cloud/storage'; // Import Bucket type from google cloud storage
import { getFirestore, Firestore } from 'firebase-admin/firestore'; // Import specific services AND Firestore type
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// --- Firebase Admin should be initialized elsewhere (e.g., lib/firebaseAdmin.ts) ---

// Define the structure for a menu item
interface MenuItem {
  name: string;
  description?: string;
  price?: string;
}

// Define the structure for the categorized menu
interface StructuredMenu {
  Aperitivos?: MenuItem[];
  Entradas?: MenuItem[];
  PratoPrincipais?: MenuItem[];
  Sobremesas?: MenuItem[];
  Bebidas?: MenuItem[];
  Outros?: MenuItem[]; // Add an "Outros" category for items that don't fit
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(request: Request) {

  // --- Check Firebase Admin Initialization ---
  if (!admin.apps.length) {
    console.error("CRITICAL: Firebase Admin SDK not initialized before API route execution.");
    // Return an error immediately if Firebase Admin is not initialized
    return NextResponse.json(
      { error: "Server configuration error: Firebase services not ready." },
      { status: 500 }
    );
  }
  // ----------------------------------------

  // Declare db and bucket here, will be assigned in the try block
  let db: Firestore;
  let bucket: Bucket;

  try {
    // --- Get Firebase Services ---
    // Moved service retrieval inside the main try block
    try {
      db = getFirestore();
      bucket = getStorage().bucket(); // If this fails, the outer catch will handle it
      console.log("Firestore and Storage services obtained successfully.");
    } catch (serviceError) {
      console.error('Failed to get Firebase services:', serviceError);
      // Throw a specific error to be caught by the main handler
      throw new Error('Server configuration error: Cannot connect to Firebase services.');
    }
    // ---------------------------

    // Destructure mimeType from the request body
    const { image, filename, mimeType } = await request.json();

    // Validate input, including mimeType
    if (!image || !filename || !mimeType) {
      return NextResponse.json(
        { error: 'Image, filename, and mimeType are required' },
        { status: 400 }
      );
    }

    // Define allowed MIME types
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

    // Check if the provided mimeType is in the allowed list
    if (!allowedMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Invalid file type. Please upload a PNG, JPEG, or WebP image. Received: ${mimeType}` },
        { status: 400 }
      );
    }

    // Convert base64 to Buffer
    // Use Buffer.from directly, no need for Uint8Array for Gemini Node.js SDK
    const imageBuffer = Buffer.from(image, 'base64');

    // Initialize the Gemini model - Use gemini-1.5-flash-latest
    // Configure for JSON output
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: "application/json",
      },
      // Optional: Adjust safety settings if needed, e.g., for menus with alcohol
      // safetySettings: [
      //   { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      // ],
    });

    // Prepare the prompt for structured JSON output
    const prompt = `Analyze the attached restaurant menu image.
Extract the menu items and organize them into categories: "Entradas" (Appetizers), "PratoPrincipais" (Main Courses), "Sobremesas" (Desserts), and "Bebidas" (Drinks).
If an item doesn't clearly fit into these categories, place it under "Outros" (Others).

For each item, include:
- "name" (string): The name of the item.
- "description" (string, optional): The description, if available.
- "price" (string, optional): The price, as written on the menu.

Output the result as a valid JSON object following this structure:
{
  "Aperitivos": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Entradas": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "PratoPrincipais": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Sobremesas": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Bebidas": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Outros": [{ "name": "...", "description": "...", "price": "..." }, ...]
}

If a category has no items, represent it as an empty array []. Ensure the entire output is only the JSON object, without any introductory text or markdown formatting.`;

    // Create image part for the model, using the dynamic mimeType
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'), // Already base64, but converting Buffer ensures correct format
        mimeType: mimeType, // Use the provided mimeType
      },
    };

    // Generate content
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;

    // Add error handling in case the response doesn't contain text
    // (e.g., safety settings blocked the response)
    if (!response || !response.text) {
      console.error('Gemini API response missing text. Response:', response);
      throw new Error('Gemini API response was blocked or empty.');
    }

    // Get the raw text response (which should be JSON)
    const rawResponseText = response.text();
    console.log("Raw Gemini Response:", rawResponseText); // Log the raw response for debugging

    let structuredMenu: StructuredMenu;
    try {
      // Attempt to parse the JSON string
      structuredMenu = JSON.parse(rawResponseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response that failed parsing:', rawResponseText);
      // Attempt to clean the response if it's wrapped in markdown
      const cleanedText = rawResponseText.replace(/```json\n?|```/g, '').trim();
      try {
        structuredMenu = JSON.parse(cleanedText);
        console.log("Successfully parsed after cleaning markdown.");
      } catch (cleanedParseError) {
        console.error('Failed to parse even after cleaning markdown:', cleanedParseError);
        throw new Error('Failed to process menu: Invalid JSON format received from AI.');
      }
    }

    // --- Firebase Storage and Firestore ---
    let imageUrl = '';
    let menuDocId = uuidv4(); // Generate a unique ID for the Firestore document
    try {
      // No need to check !db || !bucket here, as the service retrieval above would have thrown if failed

      const uniqueFilename = `menu-${Date.now()}-${uuidv4()}-${filename}`;
      const storagePath = `menus/${uniqueFilename}`;
      const fileRef = bucket.file(storagePath);

      // Upload the image buffer
      await fileRef.save(imageBuffer, {
        metadata: {
          contentType: mimeType,
        },
        // Optional: Make the file publicly readable (requires appropriate Storage rules)
        // public: true, // Or manage access via signed URLs if needed
      });

      // Make the file public if not set above (alternative way)
      await fileRef.makePublic();

      // Construct the public URL (adjust if using a custom domain or different structure)
      imageUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${storagePath}`;
      console.log(`Image uploaded to: ${imageUrl}`);

      // Prepare data for Firestore
      const menuDocument = {
        originalFilename: filename,
        imageUrl: imageUrl,
        mimeType: mimeType,
        menuData: structuredMenu, // The JSON data from Gemini
        // Use Firestore Timestamp type for consistency
        createdAt: admin.firestore.Timestamp.now(),
      };

      // Save to Firestore
      await db.collection('menus').doc(menuDocId).set(menuDocument);
      console.log(`Menu data saved to Firestore with ID: ${menuDocId}`);

    } catch (firebaseError) {
      console.error('Firebase error during upload/save:', firebaseError);
      // Decide how to handle Firebase errors - maybe just log them and continue?
      // Or throw an error to inform the user? For now, we'll log and proceed.
      // Consider adding specific client message if Firebase fails.
    }
    // ----------------------------------------

    // Return the structured JSON object along with the ID and image URL
    return NextResponse.json({ menuData: structuredMenu, imageUrl, menuId: menuDocId });

  } catch (error) {
    // Log the detailed error to the server console
    console.error('Error processing menu:', error);

    // Determine a safe error message for the client
    let clientErrorMessage = 'Failed to process menu';
    if (error instanceof Error) {
      // Handle specific known error types
      if (error.message.includes('API key not valid')) {
        clientErrorMessage = 'Server configuration error: Invalid API Key.';
      } else if (error.message.includes('blocked or empty')) {
        clientErrorMessage = 'Could not extract text from the image. It might be unsuitable or blocked by safety settings.';
      } else if (error.message.includes('Invalid JSON format')) {
        clientErrorMessage = 'Failed to process menu: The AI returned an invalid format.';
      } else if (error.message.includes('Firebase services not available') || error.message.includes('Cannot connect to Firebase services')) {
        clientErrorMessage = 'Server configuration error: Could not connect to storage/database.';
      } else if (error.message.includes('Firebase error during upload/save')) { // Catch specific Firebase op error
        clientErrorMessage = 'Failed to save menu data after processing.';
      }
      // Add other specific error checks if needed
    }

    return NextResponse.json(
      { error: clientErrorMessage },
      { status: 500 }
    );
  }
}