'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

const REQUIRED_FIREBASE_AUTH_VALUES = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let persistencePromise: Promise<void> | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;
let cachedStorage: FirebaseStorage | null = null;

export function isFirebaseAuthConfigured() {
  return REQUIRED_FIREBASE_AUTH_VALUES.every((value) => Boolean(String(value).trim()));
}

export function getFirebaseApp() {
  if (!isFirebaseAuthConfigured()) {
    return null;
  }

  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getFirebaseAuth() {
  if (typeof window === "undefined") {
    return null;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (cachedAuth) {
    return cachedAuth;
  }

  cachedAuth = getAuth(app);
  return cachedAuth;
}

export function ensureFirebaseAuthPersistence() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return Promise.resolve();
  }

  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).then(() => undefined);
  }

  return persistencePromise;
}

export function getGoogleAuthProvider() {
  if (cachedGoogleProvider) {
    return cachedGoogleProvider;
  }

  cachedGoogleProvider = new GoogleAuthProvider();
  cachedGoogleProvider.setCustomParameters({
    prompt: "select_account",
  });

  return cachedGoogleProvider;
}

export function getFirebaseStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (cachedStorage) {
    return cachedStorage;
  }

  cachedStorage = getStorage(app);
  return cachedStorage;
}

export async function uploadFirebaseStorageBlob(
  storagePath: string,
  blob: Blob,
  contentType: string
) {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error("Firebase storage is not configured.");
  }

  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, blob, {
    contentType: contentType || blob.type || "audio/webm",
  });
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return {
    storagePath,
    downloadUrl,
    contentType: snapshot.metadata.contentType || contentType || blob.type || "audio/webm",
    sizeBytes: snapshot.metadata.size ?? blob.size,
  };
}
