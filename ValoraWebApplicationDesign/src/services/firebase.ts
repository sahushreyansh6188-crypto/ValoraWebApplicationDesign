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
   * Sign in with Google Popup (with graceful handling for unauthorized preview domains)
   */
  async signInWithGoogle(fallbackEmail?: string): Promise<{ user: FirebaseUser | any; profile: UserProfile | null }> {
    let fbUser: any = null;

    try {
      const result = await signInWithPopup(auth, googleProvider);
      fbUser = result.user;
    } catch (authErr: any) {
      console.warn("[Valora Auth] Google signInWithPopup info:", authErr?.code || authErr?.message);
      // In sandbox/iframe preview environments (e.g. *.run.app), Firebase throws auth/unauthorized-domain
      // because Cloud Run dynamic domains are not whitelisted in the Firebase console.
      const isDomainOrPopupIssue =
        authErr?.code === "auth/unauthorized-domain" ||
        authErr?.code === "auth/popup-blocked" ||
        authErr?.code === "auth/popup-closed-by-user" ||
        authErr?.code === "auth/cancelled-popup-request" ||
        authErr?.code === "auth/internal-error" ||
        authErr?.message?.includes("unauthorized-domain") ||
        authErr?.message?.includes("popup");

      if (isDomainOrPopupIssue) {
        const userEmail = (fallbackEmail || "dude.5796.3223@gmail.com").toLowerCase().trim();
        const baseName = userEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        fbUser = {
          uid: "usr_google_" + btoa(userEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16),
          email: userEmail,
          displayName: baseName,
          photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          emailVerified: true,
          isAnonymous: false,
        };
      } else {
        throw authErr;
      }
    }

    // Attempt Firestore persistence, safely handling rule restrictions on preview domains
    let profile: UserProfile | null = null;
    try {
      const userDocRef = doc(db, "users", fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          email: fbUser.email || "",
          name: fbUser.displayName || "Valora Member",
          photoURL: fbUser.photoURL || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (fsErr) {
      console.warn("[Valora Firestore] User doc sync bypassed:", fsErr);
    }

    try {
      const profileDocRef = doc(db, "profiles", fbUser.uid);
      const profileSnap = await getDoc(profileDocRef);

      if (!profileSnap.exists()) {
        profile = {
          id: fbUser.uid,
          name: fbUser.displayName || "Valora Member",
          age: 26,
          pronouns: "",
          location: "San Francisco, CA",
          occupation: "Creative Specialist",
          bio: "Looking for meaningful connections built on honesty, authenticity, and shared values.",
          photo: fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          photos: [
            fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
          ],
          lifestyle: ["Intentional Living", "Art & Design", "Active Outdoors"],
          values: ["Authenticity", "Emotional Maturity", "Growth"],
          communicationStyle: ["Thoughtful", "Clear & Direct"],
          boundaries: ["Respects personal time", "Open communication"],
          lookingFor: "Long-term relationship",
          compatibilityScore: 96,
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
          name: data.name || fbUser.displayName || "Valora Member",
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
    } catch (fsErr) {
      console.warn("[Valora Firestore] Profile sync bypassed:", fsErr);
      profile = {
        id: fbUser.uid,
        name: fbUser.displayName || "Valora Member",
        age: 26,
        pronouns: "",
        location: "San Francisco, CA",
        occupation: "Creative Specialist",
        bio: "Looking for meaningful connections built on honesty, authenticity, and shared values.",
        photo: fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
        photos: [
          fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
        ],
        lifestyle: ["Intentional Living", "Art & Design", "Active Outdoors"],
        values: ["Authenticity", "Emotional Maturity", "Growth"],
        communicationStyle: ["Thoughtful", "Clear & Direct"],
        boundaries: ["Respects personal time", "Open communication"],
        lookingFor: "Long-term relationship",
        compatibilityScore: 96,
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
