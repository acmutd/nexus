import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let firebaseApp = null;
let auth = null;
let db = null;

export const initFirebase = async () => {
  if (!firebaseApp) {
    try {
      const response = await fetch('/api/firebase-config');
      const firebaseConfig = await response.json();
      
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      db = getFirestore(firebaseApp);
      
      console.log('Firebase initialized successfully');
      return { app: firebaseApp, auth, db };
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      throw error;
    }
  }
  return { app: firebaseApp, auth, db };
};

export const getFirebaseAuth = () => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Call initFirebase() first.');
  }
  return auth;
};

export const getFirebaseFirestore = () => {
  if (!db) {
    throw new Error('Firestore is not initialized. Call initFirebase() first.');
  }
  return db;
};