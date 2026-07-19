// 1. Import the core Firebase SDK functions using Web URLs for mobile compatibility
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 2. Your exact web app's Firebase configuration keys
const firebaseConfig = {
  apiKey: "AIzaSyDDmtTQJsuSSfJf3FgVlDFaoTBCxIGRXYo",
  authDomain: "dreamssmartapp.firebaseapp.com",
  projectId: "dreamssmartapp",
  storageBucket: "dreamssmartapp.firebasestorage.app",
  messagingSenderId: "679648849916",
  appId: "1:679648849916:web:9ad24dbfd209dd266a8c79"
};

// 3. Initialize the backend connection
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. Function to create a user profile (Barber or Shop Owner) in your database
export async function createUserProfile(userId, fullName, phone, role, city, bio) {
  try {
    const userDocRef = doc(db, "users", userId);
    const profileData = {
      full_name: fullName,
      phone: phone,
      role: role, // Must be 'barber' or 'shop_owner'
      location: { 
        city: city, 
        country: "Ghana" 
      },
      bio: bio,
      portfolio_images: [],
      is_premium: false,
      created_at: new Date().toISOString()
    };

    await setDoc(userDocRef, profileData);
    alert("Profile saved to the cloud successfully!");
  } catch (error) {
    console.error("Error saving profile: ", error);
    alert("Error saving profile: " + error.message);
  }
}
