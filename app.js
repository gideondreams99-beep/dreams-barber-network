import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

provider.setCustomParameters({
  prompt: 'select_account'
});

// 1. Unified Authentication State Monitor (Forces login screen to hide)
onAuthStateChanged(auth, (user) => {
  const loginScreen = document.getElementById('loginScreen');
  const mainApp = document.getElementById('mainApp');
  const userAvatar = document.getElementById('userAvatar');

  if (user) {
    console.log("Logged in successfully:", user.uid);
    
    // Safety check: Hide the login panel completely
    if (loginScreen) {
      loginScreen.style.setProperty('display', 'none', 'important');
    }
    
    // Safety check: Display the main application layout feed container
    if (mainApp) {
      mainApp.style.setProperty('display', 'block', 'important');
      mainApp.removeAttribute('hidden');
    }
    
    if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/36';
    
    // Kick off loading everything directly onto the landing feed
    loadMarketplaceFeed(); 
  } else {
    console.log("No active user session found.");
    if (loginScreen) loginScreen.style.setProperty('display', 'flex', 'important');
    if (mainApp) mainApp.style.setProperty('display', 'none', 'important');
  }
});

// 2. Optimized Sign-In Action Button Click Event
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

// 3. Load ALL Listings to the Main Landing Feed (Barbers & Owners Marketplace)
function loadMarketplaceFeed() {
  const listingsFeed = document.getElementById('listingsFeed');
  if (!listingsFeed) {
    console.error("Could not find the element with ID 'listingsFeed' on the current landing page.");
    return;
  }
  
  const listingsRef = collection(db, "listings");
  // Pulls absolutely all posts (Barbers looking, Owners looking, Home services) mixed together by newest first
  const q = query(listingsRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    listingsFeed.innerHTML = "";
    
    if (snapshot.empty) {
      listingsFeed.innerHTML = "<p style='grid-column: span 2; text-align:center; padding:30px; color:#999;'>No listings available on the feed yet.</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const item = doc.data();
      const card = document.createElement('div');
      card.className = 'product-card';
      card.style.position = 'relative';
      card.style.cursor = 'pointer'; // Makes it physically clear the entire item card is clickable

      // Generate distinct color visual tags for categories
      let roleBadge = '';
      if (item.category === 'barber_looking') {
        roleBadge = `<span class="role-badge barber-type" style="position:absolute; top:10px; left:10px; background:#d4af37; color:#000; font-size:11px; font-weight:bold; padding:4px 8px; border-radius:4px; z-index:2; text-transform:uppercase;">Barber Looking</span>`;
      } else if (item.category === 'owner_looking') {
        roleBadge = `<span class="role-badge owner-type" style="position:absolute; top:10px; left:10px; background:#ffffff; color:#000; font-size:11px; font-weight:bold; padding:4px 8px; border-radius:4px; z-index:2; text-transform:uppercase;">Owner Looking</span>`;
      } else {
        roleBadge = `<span class="role-badge service-type" style="position:absolute; top:10px; left:10px; background:#333; color:#fff; font-size:11px; font-weight:bold; padding:4px 8px; border-radius:4px; z-index:2; text-transform:uppercase;">Home Barbering</span>`;
      }

      card.innerHTML = `
        ${roleBadge}
        ${item.isVerified ? `<span class="verified-badge" style="position:absolute; top:10px; right:10px; background:#00ffcc; color:#000; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; z-index:2;">✓ Verified</span>` : ''}
        <img src="${item.imageUrl || 'https://via.placeholder.com/150'}" class="product-img" alt="Profile Media" style="width:100%; height:180px; object-fit:cover; border-radius:8px 8px 0 0;">
        <div class="product-info" style="padding:12px;">
          <div class="product-price" style="font-weight:bold; font-size:16px; color:#d4af37;">GH₵ ${item.price || 'Contact'}</div>
          <div class="product-title" style="font-weight:bold; margin-top:4px; color:#fff;">${item.title || 'No Name Provided'}</div>
          <div class="product-description" style="font-size: 12px; color: #bbb; margin-top: 4px; line-height:1.4;">
            ${item.description ? item.description.substring(0, 75) + '...' : 'Click to view full portfolio details.'}
          </div>
          <div class="product-location" style="margin-top: 8px; font-size:11px; color:#999;">📍 ${item.location || 'Ghana'}</div>
        </div>
      `;
      
      // Make the entire card clickable to view full photos and video media inside detail profile view
      card.addEventListener('click', () => {
        window.location.href = `view-listing.html?id=${doc.id}`;
      });

      listingsFeed.appendChild(card);
    });
  });
}
