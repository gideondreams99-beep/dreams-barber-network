import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const chatScreen = document.getElementById('chat-screen');

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
const modalChatBtn = document.getElementById('modal-chat-btn');

const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');

// Phone Upload Elements
const editPicFile = document.getElementById('edit-pic-file');
const editPortfolioFile = document.getElementById('edit-portfolio-file');
const editPortfolioPreview = document.getElementById('edit-portfolio-preview');

// Chat Elements
const chatHeaderName = document.getElementById('chat-header-name');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const chatInput = document.getElementById('chat-input');
const btnSendMessage = document.getElementById('btn-send-message');
const btnBackFromChat = document.getElementById('btn-back-from-chat');
const chatImgFile = document.getElementById('chat-img-file');
const btnAttachImg = document.getElementById('btn-attach-img');

let currentUser = null;
let currentUserRole = null;
let allProfilesCache = [];
let tempPortfolioList = [];
let tempProfilePicData = "";
let activeModalTarget = null;
let activeChatPartner = null; 
let unsubscribeChatMessages = null;

function showScreen(screenId) {
  authScreen.classList.add('hidden');
  roleScreen.classList.add('hidden');
  mainApp.classList.add('hidden');
  adminScreen.classList.add('hidden');
  chatScreen.classList.add('hidden');
  profileModal.classList.add('hidden');
  editScreen.classList.add('hidden');
  
  if (screenId === 'auth') authScreen.classList.remove('hidden');
  if (screenId === 'role') roleScreen.classList.remove('hidden');
  if (screenId === 'app') mainApp.classList.remove('hidden');
  if (screenId === 'admin') adminScreen.classList.remove('hidden');
  if (screenId === 'chat') chatScreen.classList.remove('hidden');
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

modalChatBtn.addEventListener('click', () => {
  if (activeModalTarget) {
    profileModal.classList.add('hidden');
    openChatRoom(activeModalTarget.id, activeModalTarget.name);
  }
});

// Open Real-Time Chat Room
function openChatRoom(partnerId, partnerName) {
  if (!currentUser) return alert("Please sign in first.");
  activeChatPartner = { id: partnerId, name: partnerName };
  chatHeaderName.textContent = "Chat with " + partnerName;
  showScreen('chat');

  if (unsubscribeChatMessages) unsubscribeChatMessages();

  const chatId = currentUser.uid < partnerId ? `${currentUser.uid}_${partnerId}` : `${partnerId}_${currentUser.uid}`;
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  unsubscribeChatMessages = onSnapshot(q, (snapshot) => {
    chatMessagesContainer.innerHTML = "";
    if (snapshot.empty) {
      chatMessagesContainer.innerHTML = "<p class='text-xs text-gray-400 text-center py-4'>No messages yet. Say hello!</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const isMe = msg.senderId === currentUser.uid;
      const bubble = document.createElement('div');
      bubble.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2`;
      
      let contentHtml = "";
      if (msg.text) {
        contentHtml += `<span>${msg.text}</span>`;
      }
      if (msg.imageUrl) {
        contentHtml += `<img src="${msg.imageUrl}" class="w-40 h-40 object-cover rounded-xl mt-1 border border-amber-300 bg-white shadow-sm" />`;
      }

      bubble.innerHTML = `
        <div class="max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-amber-500 text-white rounded-br-none' : 'bg-white border border-amber-200 text-zinc-900 rounded-bl-none'}">
          ${contentHtml}
        </div>
        <span class="text-[10px] text-gray-400 mt-0.5 px-1">${isMe ? 'Sent' : partnerName}</span>
      `;
      chatMessagesContainer.appendChild(bubble);
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  });
}

// Chat Image Upload Handlers
btnAttachImg.addEventListener('click', () => {
  chatImgFile.click();
});

chatImgFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const base64Image = event.target.result;
    chatImgFile.value = "";
    
    if (!activeChatPartner || !currentUser) return;
    const chatId = currentUser.uid < activeChatPartner.id ? `${currentUser.uid}_${activeChatPartner.id}` : `${activeChatPartner.id}_${currentUser.uid}`;
    
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: "",
        imageUrl: base64Image,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending image message:", error);
      alert("Failed to send image.");
    }
  };
  reader.readAsDataURL(file);
});

btnSendMessage.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text || !activeChatPartner || !currentUser) return;

  const chatId = currentUser.uid < activeChatPartner.id ? `${currentUser.uid}_${activeChatPartner.id}` : `${activeChatPartner.id}_${currentUser.uid}`;
  
  try {
    chatInput.value = "";
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text: text,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Failed to send message.");
  }
});

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    btnSendMessage.click();
  }
});

btnBackFromChat.addEventListener('click', () => {
  if (unsubscribeChatMessages) unsubscribeChatMessages();
  showScreen('app');
  loadMarketplace();
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
    if (currentUser && profileId === currentUser.uid) return;

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
      <div class="flex gap-2">
        <button onclick="event.stopPropagation(); requestBooking('${profileId}', '${displayName}', '${profile.role}')" class="w-1/2 bg-amber-500 hover:bg-amber-600 py-2 rounded-lg text-xs font-bold text-white shadow-md transition">
          Book Service
        </button>
        <button onclick="event.stopPropagation(); window.openChatRoomDirect('${profileId}', '${displayName}')" class="w-1/2 bg-white border border-amber-500 text-amber-700 hover:bg-amber-50 py-2 rounded-lg text-xs font-bold shadow-sm transition">
          Live Chat
        </button>
      </div>
    `;
    feedContainer.appendChild(card);
  });
}

window.openChatRoomDirect = (id, name) => {
  openChatRoom(id, name);
};

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

searchInput.addEventListener('input', filterAndSearchProfiles);
filterSelect.addEventListener('change', filterAndSearchProfiles);

btnOpenAdmin.addEventListener('click', () => {
  showScreen('admin');
  loadAdminBookings();
});

document.getElementById('btn-open-chats').addEventListener('click', () => {
  alert("Tap 'Live Chat' on any provider card in the marketplace feed to instantly open a direct chat room with them!");
});

btnBackToApp.addEventListener('click', () => {
  showScreen('app');
  loadMarketplace();
});

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

editPortfolioFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    tempPortfolioList.push(event.target.result);
    editPortfolioFile.value = "";
    renderEditPortfolioPreview();
  };
  reader.readAsDataURL(file);
});

editPicFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    tempProfilePicData = event.target.result;
    alert("Profile picture selected from phone successfully!");
  };
  reader.readAsDataURL(file);
});

btnEdit.addEventListener('click', async () => {
  if (!currentUser) return;
  tempProfilePicData = "";
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    document.getElementById('edit-name').value = data.name || currentUser.displayName || "";
    tempPortfolioList = data.portfolio ? [...data.portfolio] : [];
  } else {
    document.getElementById('edit-name').value = currentUser.displayName || "";
    tempPortfolioList = [];
  }
  renderEditPortfolioPreview();
  editScreen.classList.remove('hidden');
});

btnCancel.addEventListener('click', () => editScreen.classList.add('hidden'));

btnSave.addEventListener('click', async () => {
  const newName = document.getElementById('edit-name').value;
  if (!currentUser) return;
  
  const updateData = {
    name: newName || currentUser.displayName,
    portfolio: tempPortfolioList
  };
  
  if (tempProfilePicData !== "") {
    updateData.profilePic = tempProfilePicData;
  }

  await setDoc(doc(db, "users", currentUser.uid), updateData, { merge: true });
  
  editScreen.classList.add('hidden');
  alert("Profile & Portfolio Updated Successfully!");
  location.reload(); 
});

btnLogin.addEventListener('click', () => {
  signInWithRedirect(auth, googleProvider);
});

btnLogout.addEventListener('click', () => signOut(auth));

async function assignRole(roleName) {
  if (!currentUser) return;
  const userProfile = { 
    uid: currentUser.uid, 
    name: currentUser.displayName || "User", 
    email: currentUser.email || "", 
    profilePic: currentUser.photoURL || "", 
    role: roleName, 
    portfolio: [],
    createdAt: new Date().toISOString() 
  };
  await setDoc(doc(db, "users", currentUser.uid), userProfile, { merge: true });
  currentUserRole = roleName;
  document.getElementById('user-display-name').textContent = userProfile.name;
  document.getElementById('user-role-text').textContent = "Role: " + roleName;
  
  if (roleName === 'owner') {
    btnOpenAdmin.classList.remove('hidden');
  } else {
    btnOpenAdmin.classList.add('hidden');
  }

  showScreen('app'); 
  loadMarketplace();
}

btnBarber.addEventListener('click', () => assignRole('barber'));
btnOwner.addEventListener('click', () => assignRole('owner'));

getRedirectResult(auth)
  .then(async (result) => {
    if (result && result.user) {
      currentUser = result.user;
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists() || !userDoc.data().role) {
        showScreen('role');
      }
    }
  })
  .catch((error) => {
    console.error("Redirect sign-in error:", error);
  });

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists() && userDoc.data().role) {
      const data = userDoc.data();
      currentUserRole = data.role;
      document.getElementById('user-display-name').textContent = data.name || user.displayName || "User";
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
