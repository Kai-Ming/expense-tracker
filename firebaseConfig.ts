import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getReactNativePersistence,
  initializeAuth,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

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

if (__DEV__) {
  console.log(
    "🛠️ Firebase Storage targeting bucket:",
    firebaseConfig.storageBucket,
  );
}

export const db = getFirestore(app);
export const storage = getStorage(app);

export const createNewUser = async (email: string, password: string) => {
  const secondaryAppName = "SecondaryAuthApp";
  let secondaryApp;

  // Check if the secondary app already exists to prevent duplicate initialization errors
  if (
    !getApps()
      .map((a) => a.name)
      .includes(secondaryAppName)
  ) {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  } else {
    secondaryApp = getApp(secondaryAppName);
  }

  // Initialize an isolated auth instance that won't overwrite your primary 'auth' export session
  const secondaryAuth = initializeAuth(secondaryApp, {
    persistence:
      Platform.OS === "web"
        ? browserLocalPersistence
        : getReactNativePersistence(AsyncStorage),
  });

  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );
    const newUid = userCredential.user.uid;

    // Instantly sign out of the secondary instance so it does not linger in memory
    await signOut(secondaryAuth);

    return newUid;
  } catch (error) {
    throw error;
  }
};
