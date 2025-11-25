// src/firebase.js
import { initializeApp } from "firebase/app";
import {
    getAuth,
    setPersistence,
    browserSessionPersistence,
    signOut,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
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

// 📚 Reading List Service Functions
export const readingListService = {
    // Get reading list for user
    async getReadingList(userId) {
        try {
            const docRef = doc(db, 'readingLists', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data().books || [];
            } else {
                // Create empty reading list if doesn't exist
                await setDoc(docRef, { books: [], userId: userId });
                return [];
            }
        } catch (error) {
            console.error('Error getting reading list:', error);
            return [];
        }
    },

    // Add book to reading list
    async addToReadingList(userId, book) {
        try {
            const docRef = doc(db, 'readingLists', userId);
            const bookWithId = {
                ...book,
                firebaseId: book.id || Date.now(), // Ensure unique ID
                addedAt: new Date().toISOString()
            };

            await updateDoc(docRef, {
                books: arrayUnion(bookWithId)
            });
            return true;
        } catch (error) {
            // If document doesn't exist, create it first
            if (error.code === 'not-found') {
                try {
                    await setDoc(docRef, {
                        books: [{
                            ...book,
                            firebaseId: book.id || Date.now(),
                            addedAt: new Date().toISOString()
                        }],
                        userId: userId
                    });
                    return true;
                } catch (createError) {
                    console.error('Error creating reading list:', createError);
                    return false;
                }
            }
            console.error('Error adding to reading list:', error);
            return false;
        }
    },

    // Remove book from reading list
    async removeFromReadingList(userId, bookId) {
        try {
            const docRef = doc(db, 'readingLists', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const books = docSnap.data().books || [];
                const updatedBooks = books.filter(book => book.firebaseId !== bookId && book.id !== bookId);

                await setDoc(docRef, {
                    books: updatedBooks,
                    userId: userId
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing from reading list:', error);
            return false;
        }
    },

    // Clear entire reading list
    async clearReadingList(userId) {
        try {
            const docRef = doc(db, 'readingLists', userId);
            await setDoc(docRef, {
                books: [],
                userId: userId
            });
            return true;
        } catch (error) {
            console.error('Error clearing reading list:', error);
            return false;
        }
    }
};

export default app;