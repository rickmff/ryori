import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';

export function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  // Revert to initializing using environment variables
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Ensure the private key replacement handles escaped newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}