/**
 * setup-admin.js
 * 
 * One-time utility script to promote a user to Admin in Cloud Firestore.
 * Target UID: llxjAhD2Sifjjz7Ioo9izOFlzPn2
 * Document Path: users/llxjAhD2Sifjjz7Ioo9izOFlzPn2
 * Target Field: { role: "admin" }
 *
 * Usage:
 *  1. Node.js environment: node setup-admin.js
 *  2. Or run via browser developer console / admin console
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4neZWXAsGFsYCbZh4R00xEJ98qNxRJ8I",
  authDomain: "community-7e191.firebaseapp.com",
  projectId: "community-7e191",
  storageBucket: "community-7e191.firebasestorage.app",
  messagingSenderId: "941929290924",
  appId: "1:941929290924:web:df9fcc9926a8dfe7a55309"
};

// Target UID to promote to Admin
const TARGET_ADMIN_UID = "llxjAhD2Sifjjz7Ioo9izOFlzPn2";

async function promoteUserToAdmin(uid = TARGET_ADMIN_UID) {
  console.log(`[setup-admin] Initializing Firebase app for project: ${firebaseConfig.projectId}...`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const userDocRef = doc(db, "users", uid);
  const adminDocRef = doc(db, "admins", uid);

  try {
    console.log(`[setup-admin] Fetching current user document: users/${uid}...`);
    const existingSnap = await getDoc(userDocRef);

    if (existingSnap.exists()) {
      console.log(`[setup-admin] Existing user data:`, existingSnap.data());
    } else {
      console.log(`[setup-admin] Notice: User document does not exist yet; creating initial profile.`);
    }

    // Set or merge role: 'admin'
    await setDoc(userDocRef, {
      role: "admin",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Also populate /admins/{uid} for dual-layer security redundancy
    await setDoc(adminDocRef, {
      uid: uid,
      role: "admin",
      promotedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ [SUCCESS] User ${uid} has been successfully promoted to role: "admin"!`);
    console.log(`Document users/${uid} now has { role: "admin" }.`);
  } catch (error) {
    console.error(`❌ [ERROR] Failed to promote user ${uid} to admin:`, error);
    throw error;
  }
}

// Auto-run if executed directly in Node.js
promoteUserToAdmin()
  .then(() => {
    console.log("[setup-admin] Script finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[setup-admin] Script terminated with error:", err);
    process.exit(1);
  });

export { promoteUserToAdmin, TARGET_ADMIN_UID };
