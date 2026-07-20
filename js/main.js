import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const editScreen = document.getElementById('profile-edit-screen');
const btnEdit = document.getElementById('btn-edit-profile');
const btnSave = document.getElementById('save-profile');
const btnCancel = document.getElementById('cancel-edit');

let currentUser = null;

function showScreen(screenId) {
  authScreen.classList.add('hidden');
  roleScreen.classList.add('hidden');
  mainApp.classList.add('hidden');
  if (screenId === 'auth') authScreen.classList.remove('hidden');
  if (screenId === 'role') roleScreen.classList.remove('hidden');
  if (screenId === 'app') mainApp.classList.remove('hidden');
}

// Global booking function
window.requestBooking = async (barberId, barberName) => {
  if (!currentUser) return alert("Please sign in to book.");
  try {
    await addDoc(collection(db, "bookings"), {
      barberId: barberId,
      barberName: barberName,
      customerId: currentUser.uid,
      customerName: currentUser.displayName,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    alert("Booking request sent to " + barberName + "!");
  } catch (error) {
    console.error("Error booking:", error);
    alert("Failed to send booking.");
  }
};

async function loadMarketplace() {
  const feedContainer = document.getElementById('feed-container');
  if (!feedContainer) return; 
  feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>Loading barbers...</p>";

  try {
    const q = query(collection(db, "users"), where("role", "==", "barber"));
    const querySnapshot = await getDocs(q);
    feedContainer.innerHTML = ""; 
    
    if (querySnapshot.empty) {
      feedContainer.innerHTML = "<p class='text-gray-400 text-sm'>No barbers found yet.</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const barber = doc.data();
      const barberId = doc.id;
      const displayName = barber.name || "Anonymous Barber";
      const profilePic = barber.profilePic || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=random';
      
      const card = document.createElement('div');
      card.className = "p-4 bg-zinc-800 rounded-xl border border-zinc-700 flex flex-col gap-3";
      card.innerHTML = `
        <div class="flex items-center gap-4">
          <img src="${profilePic}" class="w-12 h-12 rounded-full object-cover border border-zinc-700 bg-zinc-700" />
          <div>
            <h3 class="font-bold text-amber-500">${displayName}</h3>
            <p class="text-xs text-gray-400">Professional Barber</p>
          </div>
        </div>
        <button onclick="requestBooking('${barberId}', '${displayName}')" class="w-full bg-amber-600 py-2 rounded-lg text-sm font-bold text-white">Book Now</button>
      `;
      feedContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading marketplace:", error);
  }
}

// Profile Editor Listeners
btnEdit.addEventListener('click', () => editScreen.classList.remove('hidden'));
btnCancel.addEventListener('click', () => editScreen.classList.add('hidden'));
btnSave.addEventListener('click', async () => {
  const newName = document.getElementById('edit-name').value;
  const newPic = document.getElementById('edit-pic').value;
  if (!currentUser) return;
  await setDoc(doc(db, "users", currentUser.uid), {
    name: newName || currentUser.displayName,
    profilePic: newPic
  }, { merge: true });
  editScreen.classList.add('hidden');
  alert("Profile Updated!");
  location.reload(); 
});

btnLogin.addEventListener('click', () => signInWithPopup(auth, googleProvider));
btnLogout.addEventListener('click', () => signOut(auth));

async function assignRole(roleName) {
  if (!currentUser) return;
  const userProfile = { uid: currentUser.uid, name: currentUser.displayName, email: currentUser.email, profilePic: currentUser.photoURL || "", role: roleName, createdAt: new Date().toISOString() };
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
      document.getElementById('user-display-name').textContent = data.name || "User";
      document.getElementById('user-role-text').textContent = "Role: " + data.role;
      showScreen('app');
      loadMarketplace();
    } else {
      showScreen('role');
    }
  } else {
    currentUser = null;
    showScreen('auth');
  }
});
