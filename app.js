import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Keep your existing Firebase config code block right here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

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
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Sign-in trigger issue: ", error);
    alert("Could not open sign-in page. Please try again.");
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
    console.error("Redirect auth error details: ", error);
  });

// 3. Clear Session Logout Trigger
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

// 4. Strict State Gatekeeper Monitoring
onAuthStateChanged(auth, (user) => {
  if (user) {
    // If logged in, block access panel drops and show the app
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    userAvatar.src = user.photoURL || 'https://via.placeholder.com/36';
    loadMarketplaceFeed(); // Fetch marketplace snapshot data
  } else {
    // Force user back to login screen if unauthenticated
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
  }
});

// 5. Load Active Ads into the Grid Interface
function loadMarketplaceFeed() {
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
