export * from './firebaseCore.js';
import { app } from './firebaseCore.js';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, serverTimestamp, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs, writeBatch, onSnapshot, deleteDoc, query, where } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let db, storage;

try {
  // Only initialize Firestore/Storage if the app is configured. This module is
  // imported dynamically after sign-in, so Firestore is kept out of the login
  // screen's initial load.
  if (app) {
    storage = getStorage(app);
    db = initializeFirestore(app, { 
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } else {
    console.warn('Firebase configuration missing. Please add VITE_FIREBASE_* environment variables to your .env file.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { db, storage, doc, setDoc, getDoc, getDocFromServer, serverTimestamp, collection, getDocs, writeBatch, onSnapshot, deleteDoc, query, where };