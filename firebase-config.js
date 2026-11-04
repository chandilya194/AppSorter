/**
 * AppSorter - Firebase Configuration & Authentication/Database Services
 * 
 * Supports:
 * - Firebase v10/v11 Compat SDK (runs in any browser, file://, localhost, or hosted)
 * - Firebase Authentication (Email/Password, Google Sign-In, Guest/Anonymous)
 * - Cloud Firestore (User Profiles, Aggregate Stats, Game History, Leaderboard)
 * - Automatic Mock/Offline Fallback if Firebase keys are not yet configured!
 */

// ============================================================================
// 1. YOUR FIREBASE CONFIGURATION
// Replace the values below with your Firebase project credentials from the Firebase Console:
// Project Settings -> General -> Your apps -> Web app -> SDK setup and configuration
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCeZoWJtifAbtZ2DP7NDfeGBVgjC4LpA-0",
  authDomain: "firstfirebaseapp-f7236.firebaseapp.com",
  databaseURL: "https://firstfirebaseapp-f7236-default-rtdb.firebaseio.com",
  projectId: "firstfirebaseapp-f7236",
  storageBucket: "firstfirebaseapp-f7236.firebasestorage.app",
  messagingSenderId: "719174177232",
  appId: "1:719174177232:web:f5e4ab47d055071c48e9d5"
};
// Check if actual configuration keys have been provided
const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
);

// Initialize Firebase if configured and SDK is loaded
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;

if (isConfigured && typeof firebase !== "undefined") {
  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
      firebaseApp = firebase.app();
    }
    firebaseAuth = firebase.auth();
    firestoreDb = firebase.firestore();
    console.log("🔥 Firebase initialized successfully with project:", firebaseConfig.projectId);
  } catch (err) {
    console.warn("⚠️ Firebase initialization error. Falling back to Mock/Local mode:", err);
  }
} else {
  console.info(
    "%c AppSorter Info %c Running in Local/Demo Mode. Add your Firebase keys to firebase-config.js for live cloud sync.",
    "background:#253047; color:#fff; padding:2px 6px; border-radius:4px; font-weight:bold;",
    "color:#174967; font-weight:bold;"
  );
}

// ============================================================================
// 2. MOCK / LOCALSTORAGE PERSISTENCE HELPERS
// Ensures the entire app works seamlessly immediately out of the box even before
// Firebase project keys are configured!
// ============================================================================
const MOCK_USER_KEY = "appsorter_mock_user";
const MOCK_GAMES_KEY = "appsorter_mock_games";
const MOCK_LEADERBOARD_KEY = "appsorter_mock_leaderboard";

function getLocalMockUser() {
  try {
    const raw = localStorage.getItem(MOCK_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setLocalMockUser(user) {
  try {
    if (user) {
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(MOCK_USER_KEY);
    }
  } catch (e) {
    console.error(e);
  }
}

function getLocalMockGames(uid) {
  try {
    const raw = localStorage.getItem(MOCK_GAMES_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return uid ? all.filter(g => g.uid === uid) : all;
  } catch (e) {
    return [];
  }
}

function saveLocalMockGame(gameRecord) {
  try {
    const raw = localStorage.getItem(MOCK_GAMES_KEY);
    const all = raw ? JSON.parse(raw) : [];
    all.unshift(gameRecord);
    localStorage.setItem(MOCK_GAMES_KEY, JSON.stringify(all));

    // Update leaderboard
    const lbRaw = localStorage.getItem(MOCK_LEADERBOARD_KEY);
    const lb = lbRaw ? JSON.parse(lbRaw) : [];
    lb.push({
      uid: gameRecord.uid,
      displayName: gameRecord.displayName || "Anonymous Sorter",
      avatar: gameRecord.avatar || "🧩",
      score: gameRecord.score,
      timeSeconds: gameRecord.timeSeconds,
      timestamp: gameRecord.timestamp
    });
    // Sort by score desc, then timeSeconds asc
    lb.sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);
    localStorage.setItem(MOCK_LEADERBOARD_KEY, JSON.stringify(lb.slice(0, 50)));
  } catch (e) {
    console.error(e);
  }
}

// Default avatars available for players
const DEFAULT_AVATARS = [
  "🚀", "💡", "🎮", "🌿", "📚", "🎧", "🎨", "⚡", "🧩", "🦊", "🐯", "🐼"
];

function getRandomAvatar() {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}

// ============================================================================
// 3. AUTHENTICATION SERVICES
// ============================================================================
const AppSorterAuth = {
  isLiveFirebase() {
    return Boolean(isConfigured && firebaseAuth);
  },

  /**
   * Listen to auth state changes
   * @param {Function} callback (user) => void
   */
  onAuthStateChanged(callback) {
    if (this.isLiveFirebase()) {
      return firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          // Fetch extended profile from Firestore
          const profile = await AppSorterDB.getUserProfile(firebaseUser.uid);
          const merged = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: profile?.displayName || firebaseUser.displayName || "App Sorter",
            photoURL: profile?.photoURL || firebaseUser.photoURL || "🚀",
            isAnonymous: firebaseUser.isAnonymous,
            createdAt: profile?.createdAt || new Date().toISOString()
          };
          callback(merged);
        } else {
          callback(null);
        }
      });
    } else {
      // Mock mode
      const user = getLocalMockUser();
      callback(user);
      // Custom event for mock state changes
      const handler = (e) => callback(e.detail);
      window.addEventListener("appsorter_mock_auth_change", handler);
      return () => window.removeEventListener("appsorter_mock_auth_change", handler);
    }
  },

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    if (this.isLiveFirebase()) {
      const u = firebaseAuth.currentUser;
      if (!u) return null;
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || "App Sorter",
        photoURL: u.photoURL || "🚀",
        isAnonymous: u.isAnonymous
      };
    } else {
      return getLocalMockUser();
    }
  },

  /**
   * Sign In with Email and Password
   */
  async signInWithEmail(email, password) {
    if (this.isLiveFirebase()) {
      const cred = await firebaseAuth.signInWithEmailAndPassword(email, password);
      return cred.user;
    } else {
      // Mock validation
      if (!email || !password) throw new Error("Please enter both email and password.");
      let user = getLocalMockUser();
      if (!user || user.email !== email) {
        user = {
          uid: "mock_" + btoa(email).replace(/=/g, "").slice(0, 12),
          email: email,
          displayName: email.split("@")[0],
          photoURL: getRandomAvatar(),
          isAnonymous: false,
          createdAt: new Date().toISOString()
        };
      }
      setLocalMockUser(user);
      window.dispatchEvent(new CustomEvent("appsorter_mock_auth_change", { detail: user }));
      return user;
    }
  },

  /**
   * Create account with Email, Password and Display Name
   */
  async signUpWithEmail(email, password, displayName, avatar) {
    const selectedAvatar = avatar || getRandomAvatar();
    const finalName = displayName && displayName.trim() ? displayName.trim() : email.split("@")[0];

    if (this.isLiveFirebase()) {
      const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      const user = cred.user;
      
      // Update Firebase Auth profile
      await user.updateProfile({
        displayName: finalName,
        photoURL: selectedAvatar
      });

      // Create initial user document in Firestore
      await AppSorterDB.createUserProfile(user.uid, {
        displayName: finalName,
        email: email,
        photoURL: selectedAvatar,
        createdAt: new Date().toISOString()
      });

      return user;
    } else {
      if (!email || !password) throw new Error("Email and password are required.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

      const user = {
        uid: "mock_" + Date.now().toString(36),
        email: email,
        displayName: finalName,
        photoURL: selectedAvatar,
        isAnonymous: false,
        createdAt: new Date().toISOString()
      };
      setLocalMockUser(user);
      await AppSorterDB.createUserProfile(user.uid, user);
      window.dispatchEvent(new CustomEvent("appsorter_mock_auth_change", { detail: user }));
      return user;
    }
  },

  /**
   * Sign in with Google Popup
   */
  async signInWithGoogle() {
    if (this.isLiveFirebase()) {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await firebaseAuth.signInWithPopup(provider);
      const user = cred.user;

      // Ensure user profile exists in Firestore
      const existing = await AppSorterDB.getUserProfile(user.uid);
      if (!existing) {
        await AppSorterDB.createUserProfile(user.uid, {
          displayName: user.displayName || "Google Player",
          email: user.email,
          photoURL: user.photoURL || "🌟",
          createdAt: new Date().toISOString()
        });
      }
      return user;
    } else {
      const mockName = "Google Explorer";
      const user = {
        uid: "mock_google_" + Date.now().toString(36),
        email: "google.user@example.com",
        displayName: mockName,
        photoURL: "🌟",
        isAnonymous: false,
        provider: "google",
        createdAt: new Date().toISOString()
      };
      setLocalMockUser(user);
      await AppSorterDB.createUserProfile(user.uid, user);
      window.dispatchEvent(new CustomEvent("appsorter_mock_auth_change", { detail: user }));
      return user;
    }
  },

  /**
   * Play instantly as a Guest / Anonymous
   */
  async signInAsGuest(customName) {
    const guestName = customName && customName.trim() ? customName.trim() : "Guest Sorter " + Math.floor(100 + Math.random() * 900);
    const guestAvatar = getRandomAvatar();

    if (this.isLiveFirebase()) {
      const cred = await firebaseAuth.signInAnonymously();
      const user = cred.user;
      await user.updateProfile({
        displayName: guestName,
        photoURL: guestAvatar
      });
      await AppSorterDB.createUserProfile(user.uid, {
        displayName: guestName,
        email: null,
        photoURL: guestAvatar,
        isAnonymous: true,
        createdAt: new Date().toISOString()
      });
      return user;
    } else {
      const user = {
        uid: "guest_" + Math.random().toString(36).substring(2, 9),
        email: null,
        displayName: guestName,
        photoURL: guestAvatar,
        isAnonymous: true,
        createdAt: new Date().toISOString()
      };
      setLocalMockUser(user);
      await AppSorterDB.createUserProfile(user.uid, user);
      window.dispatchEvent(new CustomEvent("appsorter_mock_auth_change", { detail: user }));
      return user;
    }
  },

  /**
   * Sign Out
   */
  async signOut() {
    if (this.isLiveFirebase()) {
      await firebaseAuth.signOut();
    } else {
      setLocalMockUser(null);
      window.dispatchEvent(new CustomEvent("appsorter_mock_auth_change", { detail: null }));
    }
  },

  /**
   * Send Password Reset Email
   */
  async sendPasswordReset(email) {
    if (this.isLiveFirebase()) {
      await firebaseAuth.sendPasswordResetEmail(email);
    } else {
      if (!email) throw new Error("Please enter your registered email address.");
      console.log("Mock: Password reset sent for", email);
      return true;
    }
  },

  /**
   * Update Profile (Display Name & Avatar)
   */
  async updateProfile(displayName, photoURL) {
    if (this.isLiveFirebase()) {
      const u = firebaseAuth.currentUser;
      if (!u) throw new Error("No active user session.");
      await u.updateProfile({ displayName, photoURL });
      await AppSorterDB.updateUserProfile(u.uid, { displayName, photoURL });
      return true;
    } else {
      const user = getLocalMockUser();
      if (!user) throw new Error("No active user session.");
      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      setLocalMockUser(user);
      await AppSorterDB.updateUserProfile(user.uid, { displayName, photoURL });
      window.dispatchEvent(new CustomEvent("appsorter_mock_auth_change", { detail: user }));
      return true;
    }
  }
};

// ============================================================================
// 4. DATABASE & GAME STATS SERVICES
// ============================================================================
const AppSorterDB = {
  isLiveFirestore() {
    return Boolean(isConfigured && firestoreDb);
  },

  /**
   * Create or Initialize User Profile Document
   */
  async createUserProfile(uid, profileData) {
    const initialStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      bestTimeSeconds: null,
      totalMistakes: 0,
      perfectGames: 0,
      lastPlayed: null
    };

    const docData = {
      ...profileData,
      stats: initialStats,
      updatedAt: new Date().toISOString()
    };

    if (this.isLiveFirestore()) {
      try {
        await firestoreDb.collection("users").doc(uid).set(docData, { merge: true });
      } catch (err) {
        console.error("Firestore createUserProfile error:", err);
      }
    } else {
      try {
        const key = "appsorter_profile_" + uid;
        const existing = localStorage.getItem(key);
        if (!existing) {
          localStorage.setItem(key, JSON.stringify(docData));
        }
      } catch (e) {
        console.error(e);
      }
    }
  },

  /**
   * Fetch User Profile and Aggregate Stats
   */
  async getUserProfile(uid) {
    if (!uid) return null;
    if (this.isLiveFirestore()) {
      try {
        const snap = await firestoreDb.collection("users").doc(uid).get();
        return snap.exists ? snap.data() : null;
      } catch (err) {
        console.error("Firestore getUserProfile error:", err);
        return null;
      }
    } else {
      try {
        const key = "appsorter_profile_" + uid;
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
        const currentUser = getLocalMockUser();
        if (currentUser && currentUser.uid === uid) {
          return {
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            createdAt: currentUser.createdAt || new Date().toISOString(),
            stats: {
              gamesPlayed: 0,
              gamesWon: 0,
              bestTimeSeconds: null,
              totalMistakes: 0,
              perfectGames: 0
            }
          };
        }
        return null;
      } catch (e) {
        return null;
      }
    }
  },

  /**
   * Update Profile Details
   */
  async updateUserProfile(uid, updates) {
    if (!uid) return;
    if (this.isLiveFirestore()) {
      try {
        await firestoreDb.collection("users").doc(uid).set(
          { ...updates, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (err) {
        console.error("Firestore updateUserProfile error:", err);
      }
    } else {
      try {
        const key = "appsorter_profile_" + uid;
        const current = await this.getUserProfile(uid) || {};
        const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  },

  /**
   * Record a completed or abandoned game session and update stats
   */
  async saveGameSession(sessionData) {
    const user = AppSorterAuth.getCurrentUser();
    const uid = user ? user.uid : "anonymous";
    const displayName = user ? user.displayName : "Anonymous Sorter";
    const avatar = user ? user.photoURL : "🧩";

    const record = {
      uid,
      displayName,
      avatar,
      score: sessionData.score || 0,
      total: sessionData.total || 8,
      timeSeconds: sessionData.timeSeconds || 0,
      mistakes: sessionData.mistakes || 0,
      completed: Boolean(sessionData.completed),
      timestamp: new Date().toISOString()
    };

    if (this.isLiveFirestore()) {
      try {
        // 1. Add session record to sub-collection
        if (uid !== "anonymous") {
          await firestoreDb.collection("users").doc(uid).collection("games").add(record);
        }

        // 2. Add to public game history / leaderboard collection
        if (record.completed) {
          await firestoreDb.collection("leaderboard").add({
            uid,
            displayName,
            avatar,
            score: record.score,
            timeSeconds: record.timeSeconds,
            mistakes: record.mistakes,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        // 3. Update user profile aggregate statistics
        if (uid !== "anonymous") {
          const userRef = firestoreDb.collection("users").doc(uid);
          await firestoreDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return;
            const data = userDoc.data();
            const stats = data.stats || {
              gamesPlayed: 0,
              gamesWon: 0,
              bestTimeSeconds: null,
              totalMistakes: 0,
              perfectGames: 0
            };

            const newGamesPlayed = (stats.gamesPlayed || 0) + 1;
            const newGamesWon = record.completed ? (stats.gamesWon || 0) + 1 : (stats.gamesWon || 0);
            const isPerfect = record.completed && record.mistakes === 0;
            const newPerfect = isPerfect ? (stats.perfectGames || 0) + 1 : (stats.perfectGames || 0);
            const currentBest = stats.bestTimeSeconds;
            const newBest = record.completed
              ? (currentBest === null ? record.timeSeconds : Math.min(currentBest, record.timeSeconds))
              : currentBest;

            transaction.update(userRef, {
              "stats.gamesPlayed": newGamesPlayed,
              "stats.gamesWon": newGamesWon,
              "stats.perfectGames": newPerfect,
              "stats.bestTimeSeconds": newBest,
              "stats.totalMistakes": (stats.totalMistakes || 0) + record.mistakes,
              "stats.lastPlayed": record.timestamp
            });
          });
        }
      } catch (err) {
        console.error("Firestore saveGameSession error:", err);
      }
    } else {
      // Local/Mock persistence
      saveLocalMockGame(record);

      if (uid && uid !== "anonymous") {
        const key = "appsorter_profile_" + uid;
        const profile = await this.getUserProfile(uid) || { stats: {} };
        const stats = profile.stats || {};

        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        if (record.completed) {
          stats.gamesWon = (stats.gamesWon || 0) + 1;
          if (record.mistakes === 0) stats.perfectGames = (stats.perfectGames || 0) + 1;
          stats.bestTimeSeconds = stats.bestTimeSeconds
            ? Math.min(stats.bestTimeSeconds, record.timeSeconds)
            : record.timeSeconds;
        }
        stats.totalMistakes = (stats.totalMistakes || 0) + record.mistakes;
        stats.lastPlayed = record.timestamp;
        profile.stats = stats;
        localStorage.setItem(key, JSON.stringify(profile));
      }
    }

    return record;
  },

  /**
   * Get recent game records for a specific user
   */
  async getUserGames(uid, maxItems = 10) {
    if (!uid) return [];
    if (this.isLiveFirestore()) {
      try {
        const snapshot = await firestoreDb
          .collection("users")
          .doc(uid)
          .collection("games")
          .orderBy("timestamp", "desc")
          .limit(maxItems)
          .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error("Firestore getUserGames error:", err);
        return [];
      }
    } else {
      const games = getLocalMockGames(uid);
      return games.slice(0, maxItems);
    }
  },

  /**
   * Get global top leaderboard scores
   */
  async getLeaderboard(maxItems = 10) {
    if (this.isLiveFirestore()) {
      try {
        const snapshot = await firestoreDb
          .collection("leaderboard")
          .orderBy("score", "desc")
          .orderBy("timeSeconds", "asc")
          .limit(maxItems)
          .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.error("Firestore getLeaderboard error:", err);
        return [];
      }
    } else {
      try {
        const raw = localStorage.getItem(MOCK_LEADERBOARD_KEY);
        const lb = raw ? JSON.parse(raw) : [];
        if (lb.length === 0) {
          // Add a few friendly starter mock entries
          return [
            { displayName: "AppWhiz", avatar: "⚡", score: 8, timeSeconds: 19, mistakes: 0 },
            { displayName: "SortMaster", avatar: "🚀", score: 8, timeSeconds: 26, mistakes: 0 },
            { displayName: "PixelPanda", avatar: "🐼", score: 8, timeSeconds: 34, mistakes: 1 },
            { displayName: "StudyBee", avatar: "📚", score: 8, timeSeconds: 42, mistakes: 0 }
          ];
        }
        return lb.slice(0, maxItems);
      } catch (e) {
        return [];
      }
    }
  }
};

// Expose globally to window for straightforward browser access across pages
window.AppSorterFirebaseConfig = firebaseConfig;
window.AppSorterAuth = AppSorterAuth;
window.AppSorterDB = AppSorterDB;
window.DEFAULT_AVATARS = DEFAULT_AVATARS;
