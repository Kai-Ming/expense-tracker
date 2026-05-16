import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

console.log("API KEY:", process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
console.log("EXTRA:", JSON.stringify(Constants.expoConfig?.extra));

const extra = Constants.expoConfig?.extra ?? {};
console.log("EXTRA:", JSON.stringify(extra));

const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
};

// Check for critical missing variables to prevent silent failures
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(
    `Firebase configuration is missing: ${missingKeys.join(", ")}. Check your .env file.`,
  );
}

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence:
    Platform.OS === "web"
      ? browserLocalPersistence
      : getReactNativePersistence(AsyncStorage),
});

// Log the storage bucket name to the console during development to verify it matches CLI configuration
if (__DEV__) {
  console.log(
    "🛠️ Firebase Storage targeting bucket:",
    firebaseConfig.storageBucket,
  );
}

export const db = getFirestore(app);
export const storage = getStorage(app);
