// src/components/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyA6djkO2dklbGN4cY1qRz4RpDo6T49F8gM",
  authDomain: "amar-rokto-live.firebaseapp.com",
  projectId: "amar-rokto-live",
  storageBucket: "amar-rokto-live.firebasestorage.app",
  messagingSenderId: "2357271022",
  appId: "1:2357271022:web:af51cb19038573bd3356ff",
  measurementId: "G-J294J7E1KX"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;