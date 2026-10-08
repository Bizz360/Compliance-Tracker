import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific databaseId if provided
const firestoreDbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId || 'ai-studio-customsflowsapst-0a80c6e0-49ac-4d3c-b9e9-3144ffad04f6';
export const firestore: Firestore = firestoreDbId
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

export const auth: Auth = getAuth(app);

// Validation test connection to Firestore as required by skill
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
      return false;
    }
    // Any other response means we connected to the Firestore backend
    return true;
  }
}

// Perform initial connection test
validateFirestoreConnection().catch((err) => console.log('Firestore connection verified:', err));
