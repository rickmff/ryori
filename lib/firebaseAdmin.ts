import { getApps, getApp } from 'firebase-admin/app';
import admin from 'firebase-admin';


export function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        // ---> MAKE SURE THIS LINE IS PRESENT AND CORRECT <---
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase Admin Initialized Globally');
    } catch (error: any) {
      console.error('Global Firebase admin initialization error', error.stack);
    }
  }
}