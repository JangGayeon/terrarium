// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8QAwiQc8b0PzvutVNsU0fGaSSwiAqkhk",
  authDomain: "raspberry-sensor-b2856.firebaseapp.com",
  databaseURL: "https://raspberry-sensor-b2856-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "raspberry-sensor-b2856",
  storageBucket: "raspberry-sensor-b2856.firebasestorage.app",
  messagingSenderId: "564658727322",
  appId: "1:564658727322:web:f83460b72faf868581f223",
  measurementId: "G-TB0TGXM5CJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore 참조
export const db = getFirestore(app);

export default app;
