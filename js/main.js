import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDmtTQJsuSSfJf3FgVlDFaoTBCxIGRXYo",
  authDomain: "dreamssmartapp.firebaseapp.com",
  projectId: "dreamssmartapp",
  storageBucket: "dreamssmartapp.firebasestorage.app",
  messagingSenderId: "679648849916",
  appId: "1:679648849916:web:9ad24dbfd209dd266a8c79"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const roleScreen = document.getElementById('role-screen');
const mainApp = document.getElementById('main-app');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnBarber = document.getElementById('btn-barber');
const btnOwner = document.getElementById('btn-owner');

let currentUser = null;

// Helper function to switch screens
function showScreen(screenId) {
  authScreen.classList.add('hidden');
  roleScreen.classList.add('hidden');
  mainApp.classList.add('hidden');
  
  if (screenId === 'auth') authScreen.classList.remove('hidden');
  if (screenId === 'role') roleScreen.classList.remove('hidden');
  if (screenId === 'app') mainApp.classList.remove('hidden');
}

// Fetch and display the Marketplace Feed
async function loadMarketplace() {
  const feedContainer = document.getElementById('feed-container');
  
  // If the container doesn't exist yet, stop the function to prevent errors
  if (!feedContainer) return; 

  feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>Loading barbers...</p>";

  try {
    // Get all users where role is 'barber'
    const q = query(collection(db, "users"), where("role", "==", "barber"));
    const querySnapshot = await getDocs(q);

    feedContainer.innerHTML = ""; // Clear loading text
    
    if (querySnapshot.empty) {
      feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>No barbers found yet.</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const barber = doc.data();
      const card = document.createElement('div');
      card.className = "p-4 bg-zinc-800 rounded-xl border border-zinc-700 flex items-center gap-4";
      
      // We use a placeholder image if they don't have a profile picture yet
      const profilePic = barber.profilePic || 'https://via.placeholder.com/150';

      card.innerHTML = `
        <img src="${profilePic}" class="w-12 h-12 rounded-full object-cover border border-zinc-700" />
        <div>
          <h3 class="font-bold text-amber-500">${barber.name}</h3>
          <p class="text-xs text-gray-400">Professional Barber</p>
        </div>
      `;
      feedContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading marketplace:", error);
    feedContainer.innerHTML = "<p class='text-red-500 text-sm'>Failed to load feed.</p>";
  }
}

// 1. Handle Login
btnLogin.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Login failed", error);
  }
});

// 2. Handle Logout
btnLogout.addEventListener('click', () => {
  signOut(auth);
});

// 3. Handle Role Selection
async function assignRole(roleName) {
  if (!currentUser) return;
  
  const userProfile = {
    uid: currentUser.uid,
    name: currentUser.displayName,
    email: currentUser.email,
    profilePic: currentUser.photoURL || "",
    role: roleName,
    createdAt: new Date().toISOString()
  };

  // Save to Firestore
  await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });
  showScreen('app'); 
  loadMarketplace(); // Load the feed after assigning a new role
}

btnBarber.addEventListener('click', () => assignRole('barber'));
btnOwner.addEventListener('click', () => assignRole('owner'));

// 4. Listen for Authentication Changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    
    // Fetch the user document
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists() && userDoc.data().role) {
      // User has a profile and a role - go to app
      const data = userDoc.data();
      document.getElementById('user-display-name').textContent = data.name;
      document.getElementById('user-role-text').textContent = "Role: " + data.role;
      
      showScreen('app');
      loadMarketplace(); // Load the feed when user logs in successfully

    } else {
      // New user or missing role - go to role selection
      showScreen('role');
    }
  } else {
    // User is logged out
    currentUser = null;
    showScreen('auth');
  }
});
