// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCsJhbBKXQhU-q5yDJ9scb9DcTVphPF2Zg",
  authDomain: "jam-find.firebaseapp.com",
  projectId: "jam-find",
  storageBucket: "jam-find.firebasestorage.app",
  messagingSenderId: "328287084288",
  appId: "1:328287084288:web:f13e53e23f4c0fde5b5de5",
  measurementId: "G-8T2YR31GSN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);