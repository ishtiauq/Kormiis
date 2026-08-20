import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, deleteUser, RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, serverTimestamp, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs, writeBatch, onSnapshot } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const FCM_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

let app, auth, db, storage, secondaryApp, secondaryAuth;
let messaging, functions;

try {
  // Only initialize if the API key is present
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    storage = getStorage(app);
    db = initializeFirestore(app, { 
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      experimentalForceLongPolling: true
    });
    functions = getFunctions(app, 'asia-south1');
    if (isMessagingSupported()) {
      messaging = getMessaging(app);
    }
    
    // Initialize secondary app for provisioning teammate accounts without signing out the admin
    secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
    secondaryAuth = getAuth(secondaryApp);
  } else {
    console.warn('Firebase configuration missing. Please add VITE_FIREBASE_* environment variables to your .env file.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { auth, secondaryAuth, db, storage, messaging, functions, httpsCallable, isMessagingSupported, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, deleteUser, RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, reauthenticateWithCredential, doc, setDoc, getDoc, getDocFromServer, serverTimestamp, collection, getDocs, writeBatch, onSnapshot };
