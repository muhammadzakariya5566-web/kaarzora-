import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, googleAuthProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  ADMIN_EMAIL,
  DEFAULT_COMMISSION_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_SERVICES,
} from '../data/defaults';
import type { FreelancerProfile, Language, UserProfile } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  freelancerProfile: FreelancerProfile | null;
  isAdmin: boolean;
  authReady: boolean;
  authError: string | null;
  lang: Language;
  setLang: (lang: Language) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateBusinessProfile: (data: {
    displayName: string;
    businessName: string;
    phone: string;
    city: string;
  }) => Promise<void>;
  seedInitialCatalogIfAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lang, setLangState] = useState<Language>('en');

  const seedInitialCatalogIfAdmin = async () => {
    try {
      const servicesSnap = await getDocs(collection(db, 'services'));
      if (servicesSnap.empty) {
        for (const svc of DEFAULT_SERVICES) {
          await setDoc(doc(db, 'services', svc.id), {
            ...svc,
            updatedAt: serverTimestamp(),
          });
        }
      }
      const paySnap = await getDoc(doc(db, 'settings', 'payment'));
      const existingPay = paySnap.exists() ? paySnap.data() : null;
      if (
        !paySnap.exists() ||
        existingPay?.accountNumber === '0284-0105928412' ||
        existingPay?.iban === 'PK36MEZN0002840105928412' ||
        existingPay?.accountTitle === 'KaamLab Business Services'
      ) {
        await setDoc(doc(db, 'settings', 'payment'), {
          ...DEFAULT_PAYMENT_SETTINGS,
          updatedAt: serverTimestamp(),
        });
      }
      const commSnap = await getDoc(doc(db, 'settings', 'commission'));
      if (!commSnap.exists()) {
        await setDoc(doc(db, 'settings', 'commission'), {
          ...DEFAULT_COMMISSION_SETTINGS,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Initial catalog seed skipped or failed:', err);
    }
  };

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubFreelancer: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }
      if (unsubFreelancer) {
        unsubFreelancer();
        unsubFreelancer = null;
      }

      setFirebaseUser(user);
      setAuthError(null);

      if (!user) {
        setUserProfile(null);
        setFreelancerProfile(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const bootstrappedAdmin = Boolean(user.emailVerified && user.email === ADMIN_EMAIL);
        let adminDocExists = false;
        if (!bootstrappedAdmin) {
          try {
            const adminCheck = await getDoc(doc(db, 'admins', user.uid));
            adminDocExists = adminCheck.exists();
          } catch {
            adminDocExists = false;
          }
        }
        const computedAdmin = bootstrappedAdmin || adminDocExists;
        setIsAdmin(computedAdmin);

        const userRef = doc(db, 'users', user.uid);
        const existingSnap = await getDoc(userRef);
        if (!existingSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Client',
            role: computedAdmin ? 'admin' : 'customer',
            preferredLang: lang,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        if (computedAdmin) {
          await seedInitialCatalogIfAdmin();
        }

        unsubUser = onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setUserProfile(data);
              if (data.preferredLang === 'ur' || data.preferredLang === 'en') {
                setLangState(data.preferredLang);
              }
            }
            setAuthReady(true);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          }
        );

        const freelancerRef = doc(db, 'freelancers', user.uid);
        unsubFreelancer = onSnapshot(
          freelancerRef,
          (snap) => {
            setFreelancerProfile(snap.exists() ? (snap.data() as FreelancerProfile) : null);
          },
          () => {
            setFreelancerProfile(null);
          }
        );
      } catch (err) {
        console.error('Auth initialization error:', err);
        setAuthError(err instanceof Error ? err.message : 'Unable to sync account');
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUser) unsubUser();
      if (unsubFreelancer) unsubFreelancer();
    };
  }, []);

  const setLang = (nextLang: Language) => {
    setLangState(nextLang);
    if (firebaseUser && userProfile) {
      updateDoc(doc(db, 'users', firebaseUser.uid), {
        preferredLang: nextLang,
        updatedAt: serverTimestamp(),
      }).catch(() => {
        // Non-blocking preference sync
      });
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setAuthError(msg);
      throw err;
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const updateBusinessProfile = async (data: {
    displayName: string;
    businessName: string;
    phone: string;
    city: string;
  }) => {
    if (!firebaseUser) throw new Error('Not signed in');
    const path = `users/${firebaseUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        displayName: data.displayName.trim(),
        businessName: data.businessName.trim(),
        phone: data.phone.trim(),
        city: data.city.trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        freelancerProfile,
        isAdmin,
        authReady,
        authError,
        lang,
        setLang,
        signInWithGoogle,
        signOut,
        updateBusinessProfile,
        seedInitialCatalogIfAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
