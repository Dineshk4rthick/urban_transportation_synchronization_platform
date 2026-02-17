import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase config extracted from google-services.json
const firebaseConfig = {
  apiKey: 'you_key',
  authDomain: 'your_domainn',
  databaseURL: 'your_url',
  projectId: 'utsp-627a9',
  storageBucket: 'utsp-627a9.firebasestorage.app',
  messagingSenderId: '367071405998',
  appId: '1:367071405998:android:db7f48b638097b96650a3f',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
