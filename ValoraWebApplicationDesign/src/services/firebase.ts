import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";
import type { UserProfile } from "../types";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth & Firestore
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export interface FirebaseAuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
}

export const firebaseService = {
  /**
   * Sign in with Google Popup
   */
  async signInWithGoogle(): Promise<{ user: FirebaseUser; profile: UserProfile | null }> {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    // Check or create Firestore user record
    const userDocRef = doc(db, "users", fbUser.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      await setDoc(userDocRef, {
        email: fbUser.email || "",
        name: fbUser.displayName || "Anonymous",
        photoURL: fbUser.photoURL || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Check or initialize Firestore profile
    const profileDocRef = doc(db, "profiles", fbUser.uid);
    const profileSnap = await getDoc(profileDocRef);

    let profile: UserProfile;
    if (!profileSnap.exists()) {
      profile = {
        id: fbUser.uid,
        name: fbUser.displayName || "",
        age: 26,
        pronouns: "",
        location: "San Francisco, CA",
        occupation: "",
        bio: "",
        photo: fbUser.photoURL || "",
        photos: fbUser.photoURL ? [fbUser.photoURL] : [],
        lifestyle: ["Creative", "Active"],
        values: ["Authenticity", "Kindness", "Growth"],
        communicationStyle: ["Thoughtful", "Direct"],
        boundaries: ["Open communication", "Respects personal space"],
        lookingFor: "Long-term relationship",
        compatibilityScore: 95,
      };
      await setDoc(profileDocRef, {
        ...profile,
        userId: fbUser.uid,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const data = profileSnap.data();
      profile = {
        id: fbUser.uid,
        name: data.name || fbUser.displayName || "",
        age: data.age || 26,
        pronouns: data.pronouns || "",
        location: data.location || "San Francisco, CA",
        occupation: data.occupation || "",
        bio: data.bio || "",
        photo: data.photo || fbUser.photoURL || "",
        photos: data.photos || (data.photo ? [data.photo] : []),
        lifestyle: data.lifestyle || [],
        values: data.values || [],
        communicationStyle: data.communicationStyle || [],
        boundaries: data.boundaries || [],
        lookingFor: data.lookingFor || "Long-term relationship",
        compatibilityScore: data.compatibilityScore || 95,
      };
    }

    return { user: fbUser, profile };
  },

  /**
   * Sign in with Email and Password
   */
  async signInWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser; profile: UserProfile | null }> {
    const result = await createUserWithEmailAndPassword(auth, email, pass).catch(async (err) => {
      if (err.code === "auth/email-already-in-use") {
        return await signInWithEmailAndPassword(auth, email, pass);
      }
      throw err;
    });

    const fbUser = result.user;
    const profileDocRef = doc(db, "profiles", fbUser.uid);
    const profileSnap = await getDoc(profileDocRef);

    let profile: UserProfile | null = null;
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      profile = {
        id: fbUser.uid,
        name: data.name || fbUser.displayName || "",
        age: data.age || 26,
        pronouns: data.pronouns || "",
        location: data.location || "San Francisco, CA",
        occupation: data.occupation || "",
        bio: data.bio || "",
        photo: data.photo || "",
        photos: data.photos || [],
        lifestyle: data.lifestyle || [],
        values: data.values || [],
        communicationStyle: data.communicationStyle || [],
        boundaries: data.boundaries || [],
        lookingFor: data.lookingFor || "",
        compatibilityScore: data.compatibilityScore || 95,
      };
    }

    return { user: fbUser, profile };
  },

  /**
   * Sign Up with Email and Password
   */
  async signUpWithEmail(name: string, email: string, pass: string): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const fbUser = result.user;

    await fbUpdateProfile(fbUser, { displayName: name });

    const userDocRef = doc(db, "users", fbUser.uid);
    await setDoc(userDocRef, {
      email,
      name,
      photoURL: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const initialProfile: UserProfile = {
      id: fbUser.uid,
      name,
      age: 26,
      pronouns: "",
      location: "San Francisco, CA",
      occupation: "",
      bio: "",
      photo: "",
      photos: [],
      lifestyle: ["Intentional living"],
      values: ["Honesty", "Growth"],
      communicationStyle: ["Thoughtful"],
      boundaries: ["Clear communication"],
      lookingFor: "Long-term relationship",
      compatibilityScore: 95,
    };

    const profileDocRef = doc(db, "profiles", fbUser.uid);
    await setDoc(profileDocRef, {
      ...initialProfile,
      userId: fbUser.uid,
      updatedAt: new Date().toISOString(),
    });

    return { user: fbUser, profile: initialProfile };
  },

  /**
   * Reset Password
   */
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    await fbSignOut(auth);
  },

  /**
   * Get User Profile from Firestore
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileDocRef = doc(db, "profiles", userId);
      const profileSnap = await getDoc(profileDocRef);
      if (!profileSnap.exists()) return null;
      const data = profileSnap.data();
      return {
        id: userId,
        name: data.name || "",
        age: data.age || 26,
        pronouns: data.pronouns || "",
        location: data.location || "",
        occupation: data.occupation || "",
        bio: data.bio || "",
        photo: data.photo || "",
        photos: data.photos || [],
        lifestyle: data.lifestyle || [],
        values: data.values || [],
        communicationStyle: data.communicationStyle || [],
        boundaries: data.boundaries || [],
        lookingFor: data.lookingFor || "",
        compatibilityScore: data.compatibilityScore || 95,
      };
    } catch {
      return null;
    }
  },

  /**
   * Update Profile in Firestore
   */
  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    const profileDocRef = doc(db, "profiles", userId);
    await setDoc(profileDocRef, {
      ...data,
      userId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  },

  /**
   * Get all live discovery profiles from Firestore
   */
  async getDiscoveryProfiles(currentUserId?: string): Promise<UserProfile[]> {
    try {
      const profilesRef = collection(db, "profiles");
      const qSnap = await getDocs(profilesRef);
      const list: UserProfile[] = [];
      qSnap.forEach((docSnap) => {
        if (docSnap.id !== currentUserId) {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || "Anonymous",
            age: d.age || 25,
            pronouns: d.pronouns || "",
            location: d.location || "Nearby",
            occupation: d.occupation || "",
            bio: d.bio || "",
            photo: d.photo || "",
            photos: d.photos || (d.photo ? [d.photo] : []),
            lifestyle: d.lifestyle || [],
            values: d.values || [],
            communicationStyle: d.communicationStyle || [],
            boundaries: d.boundaries || [],
            lookingFor: d.lookingFor || "Intentional connection",
            compatibilityScore: d.compatibilityScore || 92,
          });
        }
      });
      return list;
    } catch {
      return [];
    }
  },
};
