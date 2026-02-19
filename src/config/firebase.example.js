/**
 * Firebase Configuration Template
 * ---------------------------------
 * Copy this file to firebase.js and fill in your own project values.
 * Get these from: https://console.firebase.google.com
 *   → Your Project → Project Settings → General → Your apps
 *
 * NEVER commit firebase.js with real keys to version control.
 */

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'YOUR_FIREBASE_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL:       'https://YOUR_PROJECT_ID-default-rtdb.YOUR_REGION.firebasedatabase.app',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
