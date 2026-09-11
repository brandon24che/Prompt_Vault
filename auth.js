/**
 * auth.js
 * 
 * Modular Vanilla JS Authentication & Role Verification System for PromptVault.
 * Handles user login/logout, fetches user roles from Firestore (users/{uid}),
 * and notifies subscribers of auth state and role transitions.
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

// Web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyC4neZWXAsGFsYCbZh4R00xEJ98qNxRJ8I",
  authDomain: "community-7e191.firebaseapp.com",
  projectId: "community-7e191",
  storageBucket: "community-7e191.firebasestorage.app",
  messagingSenderId: "941929290924",
  appId: "1:941929290924:web:df9fcc9926a8dfe7a55309"
};

// Initialize Firebase services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// In-Memory Auth & Role State
export const authState = {
  currentUser: null,
  userProfile: null,
  role: 'user', // Default fallback role
  isAdmin: false,
  isInitialized: false,
};

// Known Bootstrap Admin UIDs / Emails
const BOOTSTRAP_ADMIN_UIDS = ["llxjAhD2Sifjjz7Ioo9izOFlzPn2"];
const BOOTSTRAP_ADMIN_EMAILS = ["cheec702@gmail.com"];

/**
 * Fetches the user's document from the `users` collection in Firestore
 * and returns their role string ("admin" or "user").
 * 
 * @param {string} uid - Firebase Auth User ID
 * @returns {Promise<string>} Role string: "admin" or "user"
 */
export async function getUserRole(uid) {
  if (!uid) {
    return 'user';
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnapshot = await getDoc(userDocRef);

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      const role = data.role === 'admin' ? 'admin' : 'user';
      return role;
    }

    // Check if user is in bootstrap list
    if (BOOTSTRAP_ADMIN_UIDS.includes(uid)) {
      return 'admin';
    }

    return 'user';
  } catch (error) {
    console.error(`[auth] Error fetching role for user ${uid}:`, error);
    // If permission or network issue, fallback safely to 'user'
    return 'user';
  }
}

/**
 * Synchronizes user document in Firestore on login.
 * Creates default user profile if it doesn't exist yet.
 * 
 * @param {object} user - Firebase User object
 * @returns {Promise<{profile: object, role: string}>}
 */
export async function syncUserProfile(user) {
  if (!user) return { profile: null, role: 'user' };

  const userDocRef = doc(db, 'users', user.uid);
  try {
    const userSnapshot = await getDoc(userDocRef);

    const isBootstrapAdmin =
      BOOTSTRAP_ADMIN_UIDS.includes(user.uid) ||
      (user.email && BOOTSTRAP_ADMIN_EMAILS.includes(user.email.toLowerCase()));

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      let role = data.role === 'admin' ? 'admin' : 'user';

      // Ensure bootstrap admin has role: "admin" in document
      if (isBootstrapAdmin && role !== 'admin') {
        role = 'admin';
        await setDoc(userDocRef, { role: 'admin' }, { merge: true });
        data.role = 'admin';
      }

      return { profile: data, role };
    } else {
      // Create new profile record
      const initialRole = isBootstrapAdmin ? 'admin' : 'user';
      const newProfile = {
        uid: user.uid,
        email: user.email || '',
        username: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
        role: initialRole,
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, newProfile);
      return { profile: newProfile, role: initialRole };
    }
  } catch (err) {
    console.error('[auth] Error syncing profile in Firestore:', err);
    return { profile: null, role: 'user' };
  }
}

/**
 * Listens to Firebase Authentication changes.
 * Upon successful login:
 *  1. Fetches user profile data and role from Firestore via getUserRole() & syncUserProfile().
 *  2. Stores the role in memory (authState).
 *  3. Invokes the provided callback with the updated auth state.
 * 
 * @param {Function} onAuthCallback - Callback function(authState)
 * @returns {Function} Unsubscribe function
 */
export function listenToAuthChanges(onAuthCallback) {
  return onAuthStateChanged(auth, async (user) => {
    authState.currentUser = user;

    if (user) {
      console.log(`[auth] User logged in: ${user.uid} (${user.email || 'no-email'})`);

      // 1. Fetch user role and profile from Firestore
      const { profile, role } = await syncUserProfile(user);

      // Verify or re-query role explicitly via getUserRole
      const confirmedRole = await getUserRole(user.uid);
      const finalRole = role === 'admin' || confirmedRole === 'admin' ? 'admin' : 'user';

      // 2. Store in memory
      authState.userProfile = profile;
      authState.role = finalRole;
      authState.isAdmin = finalRole === 'admin';
      authState.isInitialized = true;

      console.log(`[auth] User verified: role="${authState.role}", isAdmin=${authState.isAdmin}`);
    } else {
      console.log('[auth] No user currently signed in.');
      authState.currentUser = null;
      authState.userProfile = null;
      authState.role = 'user';
      authState.isAdmin = false;
      authState.isInitialized = true;
    }

    // 3. Notify callback of updated state
    if (typeof onAuthCallback === 'function') {
      onAuthCallback({ ...authState });
    }
  });
}

/**
 * Log in with Email & Password
 */
export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/**
 * Log in with Google Popup
 */
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

/**
 * Log out
 */
export async function logoutUser() {
  await signOut(auth);
  authState.currentUser = null;
  authState.userProfile = null;
  authState.role = 'user';
  authState.isAdmin = false;
}
