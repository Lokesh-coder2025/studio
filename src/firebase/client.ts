
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAot6SnrlKWKV77b8PBP1PpMy-l8oWqXDI",
  authDomain: "dutyflow-7dj4x.firebaseapp.com",
  projectId: "dutyflow-7dj4x",
  storageBucket: "dutyflow-7dj4x.firebasestorage.app",
  messagingSenderId: "939251686736",
  appId: "1:939251686736:web:29554902073589005d6055"
};


// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let storage: FirebaseStorage;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

auth = getAuth(app);
storage = getStorage(app);

export { auth, storage };
