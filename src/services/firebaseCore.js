import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, deleteUser, RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, reauthenticateWithCredential, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app, auth, secondaryApp, secondaryAuth;

try {
  // Only initialize if the API key is present
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Initialize secondary app for provisioning teammate accounts without signing out the admin
    secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
    secondaryAuth = getAuth(secondaryApp);
  } else {
    console.warn('Firebase configuration missing. Please add VITE_FIREBASE_* environment variables to your .env file.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { app, auth, secondaryApp, secondaryAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, deleteUser, RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, reauthenticateWithCredential, setPersistence, browserLocalPersistence, browserSessionPersistence };