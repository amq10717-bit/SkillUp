// src/firebase.js
import { initializeApp } from "firebase/app";
import {
    getAuth,
    setPersistence,
    browserSessionPersistence,
    signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";


// 🔥 Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB9gmrRQBOPez6tliZQcW7yWksblEaM9cw",
    authDomain: "skillup-fb662.firebaseapp.com",
    projectId: "skillup-fb662",
    storageBucket: "skillup-fb662.appspot.com",
    messagingSenderId: "150427763415",
    appId: "1:150427763415:web:b8e93f9523dcd38c7a6692",
    measurementId: "G-GV0BVMWK1L",
};

// 🚀 Initialize Firebase app
const app = initializeApp(firebaseConfig);

// 🔐 Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Do NOT initialize storage at module load to avoid SSR/test env issues
// Provide a safe, synchronous getter that only runs in browser
export const getAppStorage = () => {
    if (typeof window === "undefined") {
        throw new Error("Firebase Storage is only available in the browser environment");
    }
    const storage = getStorage(app);
    return storage;
};

// 💾 Session persistence (do not sign out users)
setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error("Error setting persistence:", error);
});

export default app;
