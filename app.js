import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your verified Firebase web configuration settings
const firebaseConfig = {
  apiKey: "AIzaSyDDmtTQJsuSSfJf3FgVlDFaoTBCxIGRXYo",
  authDomain: "dreamssmartapp.firebaseapp.com",
  projectId: "dreamssmartapp",
  storageBucket: "dreamssmartapp.firebasestorage.app",
  messagingSenderId: "679648849916",
  appId: "1:679648849916:web:9ad24dbfd209dd266a8c79"
};

// Initialize Firebase App and Modules
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: 'select_account'
});

// 1. Unified Authentication State Monitor
onAuthStateChanged(auth, (user) => {
  const loginScreen = document.getElementById('loginScreen');

  if (user) {
    console.log("Logged in successfully:", user.uid);
    
    // Hide the login screen
    if (loginScreen) {
      loginScreen.style.setProperty('display', 'none', 'important');
    }
    
    // REDIRECT: Instantly send the user to the registration page
    window.location.href = "register.html"; 
    
  } else {
    console.log("No active user session found.");
    if (loginScreen) {
      loginScreen.style.setProperty('display', 'flex', 'important');
    }
  }
});

// 2. Sign-In & Logout Event Handlers
document.addEventListener('DOMContentLoaded', () => {
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      try {
        googleSignInBtn.innerHTML = "Authenticating...";
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Popup error context: ", error);
        alert("Sign-In Failed: " + error.message);
        googleSignInBtn.innerHTML = "Sign in with Google";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth);
    });
  }
});
