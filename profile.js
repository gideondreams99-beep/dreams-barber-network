import { db, storage, auth } from "./firebase-config.js"; // Adjust path to your Firebase init file
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-storage.js";

const payoutTypeInput = document.getElementById('payoutTypeInput');
const dynamicPayoutContainer = document.getElementById('dynamicPayoutContainer');
const payoutLabel = document.getElementById('payoutLabel');
const currencyPrefix = document.getElementById('currencyPrefix');
const currencySuffix = document.getElementById('currencySuffix');
const profileForm = document.getElementById('barberProfileForm');

// 1. Handle UI changes dynamically based on payment choice
payoutTypeInput.addEventListener('change', (e) => {
    const selection = e.target.value;
    
    if (!selection) {
        dynamicPayoutContainer.style.display = 'none';
        return;
    }
    
    dynamicPayoutContainer.style.display = 'block';
    
    if (selection === 'Monthly Salary') {
        payoutLabel.textContent = "Expected Monthly Salary";
        currencyPrefix.style.display = 'block'; // Show GH₵
        currencySuffix.style.display = 'none';  // Hide %
    } else if (selection === 'Commission') {
        payoutLabel.textContent = "Desired Commission Percentage";
        currencyPrefix.style.display = 'none'; // Hide GH₵
        currencySuffix.style.display = 'block'; // Show %
    } else if (selection === 'Chair Rental') {
        payoutLabel.textContent = "Fixed Chair Rent Amount (Owner Sales Fee)";
        currencyPrefix.style.display = 'block'; // Show GH₵
        currencySuffix.style.display = 'none';  // Hide %
    }
});

// Helper function to handle individual image uploads to Storage
async function uploadImageAsync(file, path) {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
}

// 2. Handle Form Submission
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        alert("Error: You must be logged in to update your profile.");
        return;
    }

    try {
        // Display loading indicators here if needed
        let profilePictureUrl = "";
        let portfolioUrls = [];

        // Upload Profile Image
        const profileFile = document.getElementById('profilePicInput').files[0];
        if (profileFile) {
            profilePictureUrl = await uploadImageAsync(profileFile, `barbers/${user.uid}/profile_${Date.now()}`);
        }

        // Upload Multiple Portfolio Images
        const portfolioFiles = document.getElementById('portfolioInput').files;
        for (let i = 0; i < portfolioFiles.length; i++) {
            const url = await uploadImageAsync(portfolioFiles[i], `barbers/${user.uid}/portfolio_${Date.now()}_${i}`);
            portfolioUrls.push(url);
        }

        // Collect form data values
        const experienceYears = parseInt(document.getElementById('experienceInput').value, 10);
        const educationLevel = document.getElementById('educationInput').value;
        const payoutType = document.getElementById('payoutTypeInput').value;
        const payoutAmount = parseFloat(document.getElementById('payoutAmountInput').value);

        // Reference to the Barber Document inside Firestore
        const barberDocRef = doc(db, "barbers", user.uid);

        // Update document with new parameters
        await updateDoc(barberDocRef, {
            experienceYears: experienceYears,
            educationLevel: educationLevel,
            portfolioImages: portfolioUrls,
            payoutPreference: {
                type: payoutType,
                amount: payoutAmount,
                currency: payoutType === 'Commission' ? '%' : 'GHS'
            },
            ...(profilePictureUrl && { profilePicture: profilePictureUrl }) // Only update if image was modified
        });

        alert("Profile saved successfully!");
    } catch (error) {
        console.error("Error saving profile details: ", error);
        alert("Failed to update profile. Check console log.");
    }
});
