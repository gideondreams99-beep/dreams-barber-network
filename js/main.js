import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const adminScreen = document.getElementById('admin-screen');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnBarber = document.getElementById('btn-barber');
const btnOwner = document.getElementById('btn-owner');

// Profile & Admin Nav Elements
const editScreen = document.getElementById('profile-edit-screen');
const btnEdit = document.getElementById('btn-edit-profile');
const btnSave = document.getElementById('save-profile');
const btnCancel = document.getElementById('cancel-edit');
const btnOpenAdmin = document.getElementById('btn-open-admin');
const btnBackToApp = document.getElementById('btn-back-to-app');

let currentUser = null;
let currentUserRole = null;

function showScreen(screenId) {
  authScreen.classList.add('hidden');
  roleScreen.classList.add('hidden');
  mainApp.classList.add('hidden');
  adminScreen.classList.add('hidden');
  
  if (screenId === 'auth') authScreen.classList.remove('hidden');
  if (screenId === 'role') roleScreen.classList.remove('hidden');
  if (screenId === 'app') mainApp.classList.remove('hidden');
  if (screenId === 'admin') adminScreen.classList.remove('hidden');
}

// Global booking/interaction function
window.requestBooking = async (targetId, targetName, targetRole) => {
  if (!currentUser) return alert("Please sign in first.");
  try {
    await addDoc(collection(db, "bookings"), {
      targetId: targetId,
      targetName: targetName,
      targetRole: targetRole,
      customerId: currentUser.uid,
      customerName: currentUser.displayName,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    alert("Request sent successfully to " + targetName + "!");
  } catch (error) {
    console.error("Error sending request:", error);
    alert("Failed to send request.");
  }
};

// Fetch and display Admin Bookings
async function loadAdminBookings() {
  const adminContainer = document.getElementById('admin-bookings-container');
  if (!adminContainer) return;
  adminContainer.innerHTML = "<p class='text-gray-400 text-sm'>Loading requests...</p>";

  try {
    const querySnapshot = await getDocs(collection(db, "bookings"));
    adminContainer.innerHTML = "";

    if (querySnapshot.empty) {
      adminContainer.innerHTML = "<p class='text-gray-400 text-sm'>No incoming requests yet.</p>";
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const booking = docSnap.data();
      const card = document.createElement('div');
      card.className = "p-4 bg-white rounded-xl border border-amber-300 shadow-sm flex flex-col gap-2 text-left";
      card.innerHTML = `
        <p class="text-sm font-bold text-amber-700">Client: ${booking.customerName || "Anonymous"}</p>
        <p class="text-xs text-gray-600">Requested Target: <span class="font-semibold">${booking.targetName}</span> (${booking.targetRole})</p>
        <p class="text-xs text-gray-400">Status: <span class="text-amber-600 font-bold uppercase">${booking.status}</span></p>
      `;
      adminContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading bookings:", error);
    adminContainer.innerHTML = "<p class='text-red-500 text-sm'>Failed to load bookings.</p>";
  }
}

// Fetch and display Marketplace Feed (Both Barbers and Owners)
async function loadMarketplace() {
  const feedContainer = document.getElementById('feed-container');
  if (!feedContainer) return; 
  feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>Loading network...</p>";

  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    feedContainer.innerHTML = ""; 
    
    if (querySnapshot.empty) {
      feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>No profiles found yet.</p>";
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const profile = docSnap.data();
      const profileId = docSnap.id;
      
      const displayName = profile.name || "Anonymous User";
      const profilePic = profile.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=f59e0b&color=fff';
      const roleText = profile.role === 'owner' ? 'Business Owner (DREAMS HANDS)' : 'Professional Barber';
      
      const card = document.createElement('div');
      card.className = "p-4 bg-white rounded-xl border border-amber-500 shadow-sm flex flex-col gap-3 text-left";
      card.innerHTML = `
        <div class="flex items-center gap-4">
          <img src="${profilePic}" class="w-12 h-12 rounded-full object-cover border-2 border-amber-500 bg-gray-100" />
          <div>
            <h3 class="font-bold text-amber-700">${displayName}</h3>
            <p class="text-xs text-gray-500">${roleText}</p>
          </div>
        </div>
        <button onclick="requestBooking('${profileId}', '${displayName}', '${profile.role}')" class="w-full bg-amber-500 hover:bg-amber-600 py-2 rounded-lg text-sm font-bold text-white shadow-md transition">
          Connect / Book
        </button>
      `;
      feedContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading marketplace:", error);
    feedContainer.innerHTML = "<p class='text-red-500 text-sm'>Failed to load network feed.</p>";
  }
}

// Admin Navigation Listeners
btnOpenAdmin.addEventListener('click', () => {
  showScreen('admin');
  loadAdminBookings();
});

btnBackToApp.addEventListener('click', () => {
  showScreen('app');
  loadMarketplace();
});

// Profile Editor Listeners
btnEdit.addEventListener('click', () => {
  if (currentUser) {
    document.getElementById('edit-name').value = currentUser.displayName || "";
  }
  editScreen.classList.remove('hidden');
});

btnCancel.addEventListener('click', () => editScreen.classList.add('hidden'));

btnSave.addEventListener('click', async () => {
  const newName = document.getElementById('edit-name').value;
  const newPic = document.getElementById('edit-pic').value;
  if (!currentUser) return;
  
  const updateData = {
    name: newName || currentUser.displayName
  };
  
  if (newPic.trim() !== "") {
    updateData.profilePic = newPic.trim();
  }

  await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
  
  editScreen.classList.add('hidden');
  alert("Profile Updated Successfully!");
  location.reload(); 
});

// Authentication Event Handlers
btnLogin.addEventListener('click', () => signInWithPopup(auth, googleProvider));
btnLogout.addEventListener('click', () => signOut(auth));

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
  await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });
  showScreen('app'); 
  loadMarketplace();
}

btnBarber.addEventListener('click', () => assignRole('barber'));
btnOwner.addEventListener('click', () => assignRole('owner'));

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().role) {
      const data = userDoc.data();
      currentUserRole = data.role;
      document.getElementById('user-display-name').textContent = data.name || "User";
      document.getElementById('user-role-text').textContent = "Role: " + data.role;
      
      // Show admin button only if the logged-in user is an owner
      if (currentUserRole === 'owner') {
        btnOpenAdmin.classList.remove('hidden');
      } else {
        btnOpenAdmin.classList.add('hidden');
      }

      showScreen('app');
      loadMarketplace();
    } else {
      showScreen('role');
    }
  } else {
    currentUser = null;
    currentUserRole = null;
    showScreen('auth');
  }
});
