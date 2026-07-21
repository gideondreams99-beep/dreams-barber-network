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

// Profile, Modal & Admin Nav Elements
const editScreen = document.getElementById('profile-edit-screen');
const btnEdit = document.getElementById('btn-edit-profile');
const btnSave = document.getElementById('save-profile');
const btnCancel = document.getElementById('cancel-edit');
const btnOpenAdmin = document.getElementById('btn-open-admin');
const btnBackToApp = document.getElementById('btn-back-to-app');

const profileModal = document.getElementById('profile-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalBookBtn = document.getElementById('modal-book-btn');
const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');

// Portfolio Editing Elements
const editPortfolioInput = document.getElementById('edit-portfolio-input');
const btnAddPortfolio = document.getElementById('btn-add-portfolio');
const editPortfolioPreview = document.getElementById('edit-portfolio-preview');

let currentUser = null;
let currentUserRole = null;
let allProfilesCache = [];
let tempPortfolioList = [];
let activeModalTarget = null; // Stores target provider info for modal booking

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

// Global booking function for Barber Me Home Services
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
    alert("Barber Me home service request sent successfully to " + targetName + "!");
    profileModal.classList.add('hidden');
  } catch (error) {
    console.error("Error sending request:", error);
    alert("Failed to send request.");
  }
};

modalBookBtn.addEventListener('click', () => {
  if (activeModalTarget) {
    window.requestBooking(activeModalTarget.id, activeModalTarget.name, activeModalTarget.role);
  }
});

// Global Profile View function with Portfolio Rendering
window.viewProfileDetails = (profileId, name, role, pic, portfolio = []) => {
  activeModalTarget = { id: profileId, name, role };
  document.getElementById('modal-name').textContent = name;
  document.getElementById('modal-role').textContent = role === 'owner' ? 'Barber Me Business Owner' : 'Barber Me Professional Barber';
  document.getElementById('modal-pic').src = pic;
  
  const portfolioContainer = document.getElementById('modal-portfolio');
  portfolioContainer.innerHTML = "";

  if (!portfolio || portfolio.length === 0) {
    portfolioContainer.innerHTML = "<span class='text-xs text-gray-400 italic'>No extra photos uploaded yet</span>";
  } else {
    portfolio.forEach(photoUrl => {
      const img = document.createElement('img');
      img.src = photoUrl;
      img.className = "w-20 h-20 rounded-xl object-cover border border-amber-300 shadow-sm flex-shrink-0 bg-gray-100";
      portfolioContainer.appendChild(img);
    });
  }

  profileModal.classList.remove('hidden');
};

closeModalBtn.addEventListener('click', () => profileModal.classList.add('hidden'));

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
        <p class="text-xs text-gray-600">Requested Provider: <span class="font-semibold">${booking.targetName}</span> (${booking.targetRole})</p>
        <p class="text-xs text-gray-400">Status: <span class="text-amber-600 font-bold uppercase">${booking.status}</span></p>
      `;
      adminContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading bookings:", error);
    adminContainer.innerHTML = "<p class='text-red-500 text-sm'>Failed to load bookings.</p>";
  }
}

// Render feed cards based on filter and search inputs
function renderFeed(profiles) {
  const feedContainer = document.getElementById('feed-container');
  if (!feedContainer) return;
  feedContainer.innerHTML = "";

  if (profiles.length === 0) {
    feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>No providers match your search criteria.</p>";
    return;
  }

  profiles.forEach(({ profileId, profile }) => {
    const displayName = profile.name || "Anonymous User";
    const profilePic = profile.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=f59e0b&color=fff';
    const roleText = profile.role === 'owner' ? 'Business Owner (Barber Me)' : 'Home Service Barber';
    const portfolio = profile.portfolio || [];
    
    const card = document.createElement('div');
    card.className = "p-4 bg-white rounded-xl border border-amber-500 shadow-sm flex flex-col gap-3 text-left cursor-pointer hover:bg-amber-50/50 transition";
    card.onclick = () => viewProfileDetails(profileId, displayName, profile.role, profilePic, portfolio);

    card.innerHTML = `
      <div class="flex items-center gap-4">
        <img src="${profilePic}" class="w-12 h-12 rounded-full object-cover border-2 border-amber-500 bg-gray-100" />
        <div>
          <h3 class="font-bold text-amber-700">${displayName}</h3>
          <p class="text-xs text-gray-500">${roleText}</p>
          <span class="text-xs text-amber-600 underline font-semibold mt-1 inline-block">Tap to view photos & profile</span>
        </div>
      </div>
      <button onclick="event.stopPropagation(); requestBooking('${profileId}', '${displayName}', '${profile.role}')" class="w-full bg-amber-500 hover:bg-amber-600 py-2 rounded-lg text-sm font-bold text-white shadow-md transition">
        Book Home Service
      </button>
    `;
    feedContainer.appendChild(card);
  });
}

// Filter and search logic helper
function filterAndSearchProfiles() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedRole = filterSelect.value;

  const filtered = allProfilesCache.filter(({ profile }) => {
    const name = (profile.name || "").toLowerCase();
    const matchesSearch = name.includes(searchTerm);
    const matchesRole = selectedRole === 'all' || profile.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  renderFeed(filtered);
}

// Fetch network profiles from Firestore and cache them
async function loadMarketplace() {
  const feedContainer = document.getElementById('feed-container');
  if (!feedContainer) return; 
  feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>Loading Barber Me network...</p>";

  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    allProfilesCache = [];

    querySnapshot.forEach((docSnap) => {
      allProfilesCache.push({
        profileId: docSnap.id,
        profile: docSnap.data()
      });
    });

    filterAndSearchProfiles();
  } catch (error) {
    console.error("Error loading marketplace:", error);
    feedContainer.innerHTML = "<p class='text-red-500 text-sm'>Failed to load network feed.</p>";
  }
}

// Event listeners for search and filter inputs
searchInput.addEventListener('input', filterAndSearchProfiles);
filterSelect.addEventListener('change', filterAndSearchProfiles);

// Admin Navigation Listeners
btnOpenAdmin.addEventListener('click', () => {
  showScreen('admin');
  loadAdminBookings();
});

btnBackToApp.addEventListener('click', () => {
  showScreen('app');
  loadMarketplace();
});

// Render temporary portfolio preview inside edit modal
function renderEditPortfolioPreview() {
  editPortfolioPreview.innerHTML = "";
  tempPortfolioList.forEach((url, index) => {
    const wrap = document.createElement('div');
    wrap.className = "relative flex-shrink-0";
    wrap.innerHTML = `
      <img src="${url}" class="w-16 h-16 rounded-lg object-cover border border-amber-300 bg-gray-100" />
      <button type="button" onclick="window.removePortfolioItem(${index})" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center shadow">×</button>
    `;
    editPortfolioPreview.appendChild(wrap);
  });
}

window.removePortfolioItem = (index) => {
  tempPortfolioList.splice(index, 1);
  renderEditPortfolioPreview();
};

btnAddPortfolio.addEventListener('click', () => {
  const url = editPortfolioInput.value.trim();
  if (url !== "") {
    tempPortfolioList.push(url);
    editPortfolioInput.value = "";
    renderEditPortfolioPreview();
  }
});

// Profile Editor Listeners
btnEdit.addEventListener('click', async () => {
  if (!currentUser) return;
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    document.getElementById('edit-name').value = data.name || currentUser.displayName || "";
    document.getElementById('edit-pic').value = data.profilePic || currentUser.photoURL || "";
    tempPortfolioList = data.portfolio ? [...data.portfolio] : [];
  } else {
    document.getElementById('edit-name').value = currentUser.displayName || "";
    document.getElementById('edit-pic').value = currentUser.photoURL || "";
    tempPortfolioList = [];
  }
  renderEditPortfolioPreview();
  editScreen.classList.remove('hidden');
});

btnCancel.addEventListener('click', () => editScreen.classList.add('hidden'));

btnSave.addEventListener('click', async () => {
  const newName = document.getElementById('edit-name').value;
  const newPic = document.getElementById('edit-pic').value;
  if (!currentUser) return;
  
  const updateData = {
    name: newName || currentUser.displayName,
    portfolio: tempPortfolioList
  };
  
  if (newPic.trim() !== "") {
    updateData.profilePic = newPic.trim();
  }

  await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
  
  editScreen.classList.add('hidden');
  alert("Profile & Portfolio Updated Successfully!");
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
    portfolio: [],
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
    currentUseruser;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().role) {
      const data = userDoc.data();
      currentUserRole = data.role;
      document.getElementById('user-display-name').textContent = data.name || "User";
      document.getElementById('user-role-text').textContent = "Role: " + data.role;
      
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
