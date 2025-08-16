// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "dutyflow-7dj4x",
  "appId": "1:939251686736:web:034af62f09a0cd365d6055",
  "storageBucket": "dutyflow-7dj4x.firebasestorage.app",
  "apiKey": "AIzaSyAot6SnrlKWKV77b8PBP1PpMy-l8oWqXDI",
  "authDomain": "dutyflow-7dj4x.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "939251686736"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export { app };
