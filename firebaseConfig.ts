import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace these placeholders with your actual Firebase project configuration 
// which you can find in the Firebase Console (Project Settings > General > Your apps) or from environment variables.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check for critical missing variables to prevent silent failures
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(`Firebase configuration is missing: ${missingKeys.join(", ")}. Check your .env file.`);
}

const app = initializeApp(firebaseConfig);

// Log the storage bucket name to the console during development to verify it matches CLI configuration
if (__DEV__) {
  console.log("🛠️ Firebase Storage targeting bucket:", firebaseConfig.storageBucket);
}

export const db = getFirestore(app);
export const storage = getStorage(app);
