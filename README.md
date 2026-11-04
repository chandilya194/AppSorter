# App Sort Challenge 🧩 &bull; Full Firebase Upgrade

A delightful drag-and-drop web game where players categorize popular apps into **Productivity**, **Entertainment**, **Learning**, and **Wellness**, upgraded with **Firebase Authentication**, **Player Profiles**, **Game Statistics & History**, and **Global Leaderboards**.

---

## 🌟 What's New in this Upgrade

1. **Authentication Suite (`login.html`)**:
   - **Email & Password**: Sign In and Registration with instant validation.
   - **Avatar Picker**: Select from fun emblems (🚀, 💡, 🎮, 🌿, 📚, 🎧, 🎨, ⚡) during registration or profile edit.
   - **Google Sign-In**: One-click authentication with Google OAuth popup.
   - **Play as Guest**: Instant anonymous gameplay without requiring an account.
   - **Password Reset**: Modal dialog to send Firebase password recovery emails.

2. **Player Profile & Stats Dashboard (`profile.html`)**:
   - **Career Statistics**: Games Played, Completed (Won), Fastest Win (Best Time), and Perfect Runs (zero mistakes).
   - **Achievements & Badges**: Dynamic unlocking of badges like *First Sort*, *Speed Demon*, *Perfectionist*, and *Master Sorter*.
   - **Match History**: Timeline showing previous game sessions, dates, completion times, and mistake counts.
   - **Top Sorters Leaderboard**: Displays top community scores and best completion records.
   - **Profile Customization**: Edit display name and switch player avatar emblems.

3. **In-Game Enhancements (`Sort_Game.html`)**:
   - **Live Stopwatch**: Automatically starts when you make your first move.
   - **Mistakes Counter**: Tracks accuracy and wrong category attempts.
   - **Navigation & Auth Bar**: Shows player avatar, name, and profile shortcuts.
   - **Celebration & Auto-Save**: Confetti shower on victory + automatic save to Firestore/Local profile.

4. **Resilient Firebase Integration (`firebase-config.js`)**:
   - Built using standard browser-compatible Firebase v10/v11 SDK scripts.
   - **Smart Offline / Demo Mode**: Works **100% out-of-the-box** using browser `localStorage` even before you enter your Firebase credentials. Once you add your Firebase credentials, it automatically syncs with Cloud Firestore and Firebase Auth!

---

## 📁 File Structure

```text
AppSorter/
├── Sort_Game.html       # The upgraded interactive game with timer, counter, and save integration
├── index.html           # Main entry point (redirects to Sort_Game.html)
├── login.html           # Sign In, Create Account, Google Login & Password Reset
├── profile.html         # Player profile, career stats, badges, history & leaderboard
├── firebase-config.js   # Firebase configuration, Auth service & Firestore data layer
└── README.md            # Documentation and Firebase setup guide
```

---

## 🚀 Quick Start (Running Locally)

You can run the app immediately in two ways:

### Option A: Open directly in your browser
Simply double-click `Sort_Game.html` or `login.html` in Windows Explorer. It runs smoothly with the built-in local offline engine.

### Option B: Using a local web server (Recommended for Google Popup Auth)
Run any local server in PowerShell from the project folder:
```powershell
# Using Python
python -m http.server 8000

# OR using Node.js npx serve
npx serve .
```
Then visit: `http://localhost:8000`

---

## 🔥 Connecting Your Live Firebase Project

To sync profiles, match histories, and leaderboards across multiple devices:

### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and give it a name (e.g., `app-sorter-challenge`).

### Step 2: Enable Authentication Providers
1. In the left sidebar, navigate to **Build** &rarr; **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, enable:
   - **Email/Password** (Enable Email/Password; Email link is optional).
   - **Google** (Enable and provide your support email).
   - **Anonymous** (Enable to allow guest players).

### Step 3: Create Firestore Database
1. In the sidebar, navigate to **Build** &rarr; **Firestore Database**.
2. Click **Create database**, choose your nearest location, and select **Start in test mode** (or configure security rules below).
3. Click **Create**.

#### Recommended Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile documents and personal game history
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      match /games/{gameId} {
        allow read: if true;
        allow create: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Public leaderboard
    match /leaderboard/{docId} {
      allow read: if true;
      allow create: if true;
    }
  }
}
```

### Step 4: Add Your Firebase Credentials
1. In Firebase Console, go to **Project Settings** (gear icon) &rarr; **General**.
2. Scroll down to **Your apps**, click the **Web** icon (`</>`), and register your web app.
3. Copy the `firebaseConfig` object and paste the credentials into `firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789...",
  appId: "1:123456789:web:abcdef..."
};
```

---

## 🎨 Design System

All new pages match the original aesthetic of the App Sort Challenge:
- **Typography**: `Fraunces` for titles & `DM Sans` for UI text.
- **Color Palette**:
  - Ink & Text: `#253047`
  - Productivity: `#dcebf5` / `#174967`
  - Entertainment: `#f9dce1` / `#8d3451`
  - Learning: `#f9e9b9` / `#785019`
  - Wellness: `#dcefe0` / `#28614b`
- **UI Elements**: Tactile 3D button press animations, soft drop shadows, and responsive layouts on mobile & desktop.
