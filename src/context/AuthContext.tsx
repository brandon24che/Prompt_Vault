import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { Prompt, UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  bookmarks: Set<string>;
  likes: Set<string>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalMode: 'login' | 'signup';
  setAuthModalMode: (mode: 'login' | 'signup') => void;
  signInWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleBookmark: (promptId: string) => Promise<boolean>;
  toggleLike: (prompt: Prompt) => Promise<boolean>;
  recordCopy: (promptId: string) => Promise<void>;
  updateUserRole: (targetUid: string, newRole: 'user' | 'admin') => Promise<void>;
  suspendUser: (targetUid: string, reason?: string) => Promise<void>;
  unsuspendUser: (targetUid: string) => Promise<void>;
  deleteUserAccount: (targetUid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'cheec702@gmail.com';
export const TARGET_ADMIN_UID = 'llxjAhD2Sifjjz7Ioo9izOFlzPn2';

/**
 * Fetch a user's role from Firestore directly
 */
export async function getUserRole(uid: string): Promise<'admin' | 'user'> {
  if (!uid) return 'user';
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      return data.role === 'admin' ? 'admin' : 'user';
    }
    if (uid === TARGET_ADMIN_UID) return 'admin';
    return 'user';
  } catch (err) {
    console.error('Error fetching user role:', err);
    return 'user';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const isAdmin = Boolean(
    currentUser?.uid === TARGET_ADMIN_UID ||
    currentUser?.email === ADMIN_EMAIL ||
    userProfile?.role === 'admin'
  );

  // Sync User profile in Firestore
  const syncUserProfile = async (user: User, customUsername?: string) => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userRef);
      const isSystemAdmin = user.email === ADMIN_EMAIL || user.uid === TARGET_ADMIN_UID;
      
      if (!snap.exists()) {
        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          username: customUsername || user.displayName || user.email?.split('@')[0] || 'PromptEngineer',
          role: isSystemAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          photoURL: user.photoURL || undefined,
        };
        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);

        // Also register in /admins/{uid} if system admin
        if (isSystemAdmin) {
          try {
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              email: user.email || '',
              role: 'admin',
              createdAt: new Date().toISOString(),
            });
          } catch {
            // Ignore non-fatal admin flag error
          }
        }
      } else {
        const data = snap.data() as UserProfile;
        // If email or UID matches bootstrap admin, ensure role is admin
        if (isSystemAdmin && data.role !== 'admin') {
          const updated = { ...data, role: 'admin' as const };
          await setDoc(userRef, updated, { merge: true });
          setUserProfile(updated);
        } else {
          setUserProfile(data);
        }
      }
    } catch (err) {
      console.error('Error fetching/setting user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserProfile(user);
      } else {
        setUserProfile(null);
        setBookmarks(new Set());
        setLikes(new Set());
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to current user profile in real-time to immediately reflect role/suspension changes
  useEffect(() => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          setUserProfile(profileData);
        }
      },
      (err) => {
        console.warn('Profile listen error:', err);
      }
    );

    return () => unsubscribeProfile();
  }, [currentUser]);

  // Listen to bookmarks for current user
  useEffect(() => {
    if (!currentUser) return;
    const bookmarksCol = collection(db, 'users', currentUser.uid, 'bookmarks');
    const unsubscribeBookmarks = onSnapshot(
      bookmarksCol,
      (snapshot) => {
        const set = new Set<string>();
        snapshot.forEach((docSnap) => set.add(docSnap.id));
        setBookmarks(set);
      },
      (err) => {
        console.warn('Bookmarks listen error:', err);
      }
    );

    return () => unsubscribeBookmarks();
  }, [currentUser]);

  const signInWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(res.user);
      setShowAuthModal(false);
    } catch (err: unknown) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      await syncUserProfile(res.user);
      setShowAuthModal(false);
    } catch (err: unknown) {
      console.error('Email login error:', err);
      throw err;
    }
  };

  const signupWithEmail = async (email: string, pass: string, username: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (username) {
        await updateProfile(res.user, { displayName: username });
      }
      await syncUserProfile(res.user, username);
      setShowAuthModal(false);
    } catch (err: unknown) {
      console.error('Email signup error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setBookmarks(new Set());
      setLikes(new Set());
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const toggleBookmark = async (promptId: string): Promise<boolean> => {
    if (!currentUser) {
      setShowAuthModal(true);
      return false;
    }
    const bookmarkRef = doc(db, 'users', currentUser.uid, 'bookmarks', promptId);
    const isBookmarked = bookmarks.has(promptId);

    try {
      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(promptId);
          return next;
        });
        return false;
      } else {
        await setDoc(bookmarkRef, {
          userId: currentUser.uid,
          promptId,
          createdAt: new Date().toISOString(),
        });
        setBookmarks((prev) => new Set(prev).add(promptId));
        return true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/bookmarks/${promptId}`);
      return isBookmarked;
    }
  };

  const toggleLike = async (prompt: Prompt): Promise<boolean> => {
    if (!currentUser) {
      setShowAuthModal(true);
      return false;
    }
    const likeRef = doc(db, 'prompts', prompt.id, 'likes', currentUser.uid);
    const promptRef = doc(db, 'prompts', prompt.id);
    const isLiked = likes.has(prompt.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(promptRef, {
          likesCount: increment(-1),
        });
        setLikes((prev) => {
          const next = new Set(prev);
          next.delete(prompt.id);
          return next;
        });
        return false;
      } else {
        await setDoc(likeRef, {
          userId: currentUser.uid,
          promptId: prompt.id,
          createdAt: new Date().toISOString(),
        });
        await updateDoc(promptRef, {
          likesCount: increment(1),
        });
        setLikes((prev) => new Set(prev).add(prompt.id));
        return true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `prompts/${prompt.id}/likes/${currentUser.uid}`);
      return isLiked;
    }
  };

  const recordCopy = async (promptId: string) => {
    try {
      const promptRef = doc(db, 'prompts', promptId);
      await updateDoc(promptRef, {
        copiesCount: increment(1),
      });
    } catch (err) {
      console.warn('Copy counter update error:', err);
    }
  };

  const updateUserRole = async (targetUid: string, newRole: 'user' | 'admin') => {
    if (!isAdmin) throw new Error('Unauthorized');
    const targetRef = doc(db, 'users', targetUid);
    const adminRef = doc(db, 'admins', targetUid);
    try {
      await updateDoc(targetRef, { role: newRole });
      if (newRole === 'admin') {
        await setDoc(adminRef, { uid: targetUid, updatedAt: new Date().toISOString() }, { merge: true });
      } else {
        await deleteDoc(adminRef).catch(() => {});
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const suspendUser = async (targetUid: string, reason?: string) => {
    if (!isAdmin) throw new Error('Unauthorized: Admin access required');
    const targetRef = doc(db, 'users', targetUid);
    try {
      await updateDoc(targetRef, {
        isSuspended: true,
        suspendedReason: reason?.trim() || 'Suspended by system administrator',
        suspendedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const unsuspendUser = async (targetUid: string) => {
    if (!isAdmin) throw new Error('Unauthorized: Admin access required');
    const targetRef = doc(db, 'users', targetUid);
    try {
      await updateDoc(targetRef, {
        isSuspended: false,
        suspendedReason: '',
        unsuspendedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const deleteUserAccount = async (targetUid: string) => {
    if (!isAdmin) throw new Error('Unauthorized');
    try {
      await deleteDoc(doc(db, 'users', targetUid));
      await deleteDoc(doc(db, 'admins', targetUid)).catch(() => {});
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        loading,
        bookmarks,
        likes,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
        signInWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        toggleBookmark,
        toggleLike,
        recordCopy,
        updateUserRole,
        suspendUser,
        unsuspendUser,
        deleteUserAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
