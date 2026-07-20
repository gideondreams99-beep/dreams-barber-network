import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// UI Elements References
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const listingsFeed = document.getElementById('listingsFeed');

// 1. Trigger Google Authentication REDIRECT Flow (Safe for Mobile Browsers)
googleSignInBtn.addEventListener('click', async () => {
  try {
    googleSignInBtn.innerHTML = "Loading...";
    await signInWithRedirect(auth, provider);
  } catch (error) {
    alert("Firebase Sign-In Error: " + error.message);
    googleSignInBtn.innerHTML = "Sign in with Google";
  }
});

// 2. Handle the incoming redirect result when the page loads back up
getRedirectResult(auth)
  .then((result) => {
    if (result?.user) {
      console.log("Logged in via redirect successfully!");
    }
  })
  .catch((error) => {
    alert("Authentication Redirect Failure: " + error.message);
  });

// 3. Clear Session Logout Trigger
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth);
  });
}

// 4. Strict State Gatekeeper Monitoring
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Hide login screen and show the app content
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/36';
    loadMarketplaceFeed(); // Fetch marketplace snapshot data
  } else {
    // Force user back to login screen if unauthenticated
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  }
});

// 5. Load Active Ads into the Grid Interface
function loadMarketplaceFeed() {
  if (!listingsFeed) return;
  
  const listingsRef = collection(db, "listings");
  const q = query(listingsRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    listingsFeed.innerHTML = "";
    
    if(snapshot.empty) {
      listingsFeed.innerHTML = "<p style='grid-column: span 2; text-align:center; padding:30px; color:#666;'>No listings posted yet.</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const item = doc.data();
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        ${item.isVerified ? `<span class="verified-badge">Verified</span>` : ''}
        <img src="${item.imageUrl || 'https://via.placeholder.com/150'}" class="product-img" alt="Listing image">
        <div class="product-info">
          <div>
            <div class="product-price">GH₵ ${item.price || 'Contact'}</div>
            <div class="product-title">${item.title || 'No Title'}</div>
          </div>
          <div class="product-location">📍 ${item.location || 'Ghana'}</div>
        </div>
      `;
      listingsFeed.appendChild(card);
    });
  });
}
