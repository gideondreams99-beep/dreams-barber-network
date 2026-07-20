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

// Custom parameters to force account choice seamlessly on mobile screens
provider.setCustomParameters({
  prompt: 'select_account'
});

// UI Elements References
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const listingsFeed = document.getElementById('listingsFeed');

// 1. Optimized Popup Authenticater (Forces session to hook immediately)
googleSignInBtn.addEventListener('click', async () => {
  try {
    googleSignInBtn.innerHTML = "Authenticating...";
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
      console.log("Logged in successfully via popup!");
    }
  } catch (error) {
    console.error("Popup Error: ", error);
    alert("Sign-In Issue: " + error.message);
    googleSignInBtn.innerHTML = "Sign in with Google";
  }
});

// 2. Clear Session Logout Trigger
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth);
  });
}

// 3. Strict State Gatekeeper Monitoring (This breaks the loop)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Gatekeeper: User verified!", user.uid);
    // Explicitly toggle views to display the application layout
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainApp) {
      mainApp.style.display = 'block';
      mainApp.removeAttribute('hidden'); 
    }
    if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/36';
    loadMarketplaceFeed(); 
  } else {
    console.log("Gatekeeper: No active user session.");
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
  }
});

// 4. Load Active Ads into the Grid Interface (Barbers & Owners Feed)
function loadMarketplaceFeed() {
  if (!listingsFeed) return;
  
  const listingsRef = collection(db, "listings");
  // Pulls all premium listings sorted by newest first
  const q = query(listingsRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    listingsFeed.innerHTML = "";
    
    if(snapshot.empty) {
      listingsFeed.innerHTML = "<p style='grid-column: span 2; text-align:center; padding:30px; color:#999;'>No listings posted yet.</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const item = doc.data();
      const card = document.createElement('div');
      card.className = 'product-card';
      card.style.position = 'relative'; // Keeps badges anchored properly
      
      // Determine the network status category label badge dynamically
      let roleBadge = '';
      if (item.category === 'barber_looking') {
        roleBadge = `<span class="role-badge barber-type">Barber Looking</span>`;
      } else if (item.category === 'owner_looking') {
        roleBadge = `<span class="role-badge owner-type">Owner Looking</span>`;
      } else {
        roleBadge = `<span class="role-badge service-type">Home Barbering Service</span>`;
      }

      card.innerHTML = `
        ${roleBadge}
        ${item.isVerified ? `<span class="verified-badge">Verified</span>` : ''}
        <img src="${item.imageUrl || 'https://via.placeholder.com/150'}" class="product-img" alt="Listing image">
        <div class="product-info">
          <div>
            <div class="product-price">GH₵ ${item.price || 'Contact'}</div>
            <div class="product-title">${item.title || 'No Title'}</div>
            <div class="product-description" style="font-size: 12px; color: #bbb; margin-top: 4px;">
              ${item.description ? item.description.substring(0, 60) + '...' : ''}
            </div>
          </div>
          <div class="product-location" style="margin-top: 8px;">📍 ${item.location || 'Ghana'}</div>
        </div>
      `;
      
      // Makes both barber and owner profile cards interactive and clickable
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        window.location.href = `view-listing.html?id=${doc.id}`;
      });

      listingsFeed.appendChild(card);
    });
  });
}
