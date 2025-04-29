import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';

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
  Principais?: MenuItem[];
  Sobremesas?: MenuItem[];
  Bebidas?: MenuItem[];
  Outros?: MenuItem[]; // Add an "Outros" category for items that don't fit
}

// Input data structure for each image in the batch
interface ImageInput {
  image: string; // base64 encoded image data
  filename: string;
  mimeType: string;
}

// Response structure for this endpoint
interface ProcessResponse {
  menuData: StructuredMenu;
  warnings?: string[];
  error?: string; // Added for consistency in error handling
  details?: string; // Added for error details
}

// --- Helper function to merge multiple structured menus ---
function mergeMenus(menus: StructuredMenu[]): StructuredMenu {
  const merged: StructuredMenu = {
    Aperitivos: [],
    Entradas: [],
    Principais: [],
    Sobremesas: [],
    Bebidas: [],
    Outros: [],
  };

  for (const menu of menus) {
    for (const category in menu) {
      const key = category as keyof StructuredMenu;
      if (menu[key] && merged[key]) {
        // Ensure arrays exist before concatenating
        merged[key] = (merged[key] || []).concat(menu[key]!);
      } else if (menu[key]) {
        // Handle case where category might not be initialized in merged yet (though unlikely with current init)
        merged[key] = [...menu[key]!];
      }
    }
  }

  // Optional: Remove empty categories from the final merged menu
  for (const category in merged) {
    const key = category as keyof StructuredMenu;
    if (merged[key]?.length === 0) {
      delete merged[key];
    }
  }

  return merged;
}

// Initialize Gemini API (outside the function for efficiency)
let genAI: GoogleGenerativeAI | null = null;
try {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY environment variable");
  }
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  console.log("Gemini AI SDK initialized for /process-menu.");
} catch (error) {
  console.error("CRITICAL: Failed to initialize Gemini AI SDK:", error);
  // genAI will remain null, requests will fail predictably below.
}

export async function POST(request: Request) {

  // Check if Gemini SDK initialized successfully
  if (!genAI) {
    console.error("Gemini AI SDK not available in /process-menu POST handler.");
    return NextResponse.json(
      { error: "Server configuration error: AI service not ready." },
      { status: 500 }
    );
  }

  try {
    // --- Process Batch Request ---
    const { images } = (await request.json()) as { images?: ImageInput[] };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected an object with an "images" array.' },
        { status: 400 }
      );
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']; // Added gif just in case
    const individualMenuResults: StructuredMenu[] = [];
    const processingErrors: string[] = []; // Renamed to warnings later

    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      },
      safetySettings: [ // Added basic safety settings
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ]
    });

    // Prepare the prompt
    const prompt = `Analyze the attached restaurant menu image.
Extract the menu items and organize them into categories: "Aperitivos", "Entradas", "Principais", "Sobremesas", "Bebidas".
If an item doesn't clearly fit into these categories, place it under "Outros".

For each item, include:
- "name" (string): The name of the item.
- "description" (string, optional): The description, if available.
- "price" (string, optional): The price, as written on the menu.

Output the result as a valid JSON object following this structure:
{
  "Aperitivos": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Entradas": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Principais": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Sobremesas": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Bebidas": [{ "name": "...", "description": "...", "price": "..." }, ...],
  "Outros": [{ "name": "...", "description": "...", "price": "..." }, ...]
}

If a category has no items, represent it as an empty array []. Ensure the entire output is *only* the JSON object, without any introductory text or markdown formatting (like \`\`\`json).`;


    // --- Loop through each image in the batch ---
    for (const imageInput of images) {
      try {
        // Validate individual image input
        if (!imageInput.image || !imageInput.filename || !imageInput.mimeType) {
          console.warn(`Skipping invalid image data in batch: ${imageInput.filename || 'unknown'}`);
          processingErrors.push(`Invalid data for file: ${imageInput.filename || 'unknown'}`);
          continue;
        }
        if (!allowedMimeTypes.includes(imageInput.mimeType)) {
          console.warn(`Skipping invalid mime type in batch: ${imageInput.filename} (${imageInput.mimeType})`);
          processingErrors.push(`Invalid file type for ${imageInput.filename}: ${imageInput.mimeType}`);
          continue;
        }

        // --- Gemini Processing ---
        const imagePart = {
          inlineData: {
            data: imageInput.image,
            mimeType: imageInput.mimeType,
          },
        };

        console.log(`Processing image with AI: ${imageInput.filename}`);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const candidate = response?.candidates?.[0];

        // Check for safety blocks or missing content
        if (!candidate?.content) {
          const blockReason = candidate?.finishReason === 'SAFETY'
            ? `AI response blocked due to safety settings (Finish Reason: SAFETY)`
            : `AI response empty or generation failed (Reason: ${candidate?.finishReason || 'Unknown'})`;
          console.error(`${blockReason} for ${imageInput.filename}. Response:`, JSON.stringify(response));
          processingErrors.push(`${blockReason} for ${imageInput.filename}.`);
          continue; // Skip this image's result
        }

        const rawResponseText = candidate.content.parts[0]?.text;

        if (!rawResponseText) {
          console.error(`Gemini API response missing text part for ${imageInput.filename}. Candidate:`, JSON.stringify(candidate));
          processingErrors.push(`AI response format unexpected for ${imageInput.filename}.`);
          continue;
        }

        let structuredMenu: StructuredMenu;
        try {
          // First attempt: assume perfect JSON
          structuredMenu = JSON.parse(rawResponseText);
          individualMenuResults.push(structuredMenu); // Add successful parse to results
        } catch (parseError) {
          console.warn(`Initial JSON parse failed for ${imageInput.filename}, attempting cleanup...`);
          // Try cleaning markdown/common issues
          const cleanedText = rawResponseText
            .replace(/^```json\s*/, '') // Remove starting ```json
            .replace(/\s*```$/, '')     // Remove ending ```
            .trim();                     // Trim whitespace

          if (cleanedText === rawResponseText) {
            console.error(`Failed to parse Gemini JSON for ${imageInput.filename} (no cleanup possible):`, parseError);
            console.error('Raw response:', rawResponseText);
            processingErrors.push(`Invalid AI response format for ${imageInput.filename}.`);
            continue; // Skip adding this result
          }

          try {
            structuredMenu = JSON.parse(cleanedText);
            individualMenuResults.push(structuredMenu); // Add successful parse to results
            console.log(`Successfully parsed ${imageInput.filename} after cleaning markdown.`);
          } catch (cleanedParseError) {
            console.error(`Failed to parse Gemini JSON for ${imageInput.filename} even after cleaning:`, cleanedParseError);
            console.error('Cleaned response attempt:', cleanedText);
            console.error('Original raw response:', rawResponseText);
            processingErrors.push(`Invalid AI response format for ${imageInput.filename}.`);
            continue; // Skip adding this result
          }
        }

      } catch (imageProcessingError: any) {
        console.error(`Error processing image ${imageInput.filename}:`, imageProcessingError);
        processingErrors.push(`Processing failed for ${imageInput.filename}: ${imageProcessingError.message}`);
        // Continue processing other images
      }
    } // End of loop through images

    // --- After Processing All Images ---

    // Check if any results were successfully processed
    if (individualMenuResults.length === 0 && images.length > 0) {
      // All images failed processing or produced no parsable results
      console.error("No menu items could be extracted from any images.", processingErrors);
      return NextResponse.json(
        { error: `Failed to extract menu items from the ${images.length} uploaded image(s). Please check the images or try again.`, details: processingErrors.join('; ') },
        { status: 400 } // Bad request / bad images likely cause
      );
    }

    // Merge the individual structured results
    const mergedMenuData = mergeMenus(individualMenuResults);
    console.log("Merged Menu Data for Preview:", JSON.stringify(mergedMenuData, null, 2));

    // --- Return Combined Result (for Preview) ---
    const responsePayload: ProcessResponse = {
      menuData: mergedMenuData,
    };
    if (processingErrors.length > 0) {
      responsePayload.warnings = processingErrors; // Inform client about partial failures
      console.warn("Batch processing completed with warnings:", processingErrors);
    }

    console.log(`Successfully processed ${individualMenuResults.length} of ${images.length} images for preview.`);
    return NextResponse.json(responsePayload);

  } catch (error: any) {
    // Catch top-level errors (e.g., initial request parsing, unexpected issues)
    console.error('Error processing menu images for preview:', error);

    let clientErrorMessage = 'Failed to process menu images';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('API key not valid') || error.message.includes("GOOGLE_AI_API_KEY")) {
        clientErrorMessage = 'Server configuration error: Invalid API Key.';
      } else if (error.message.startsWith('Invalid request format')) {
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