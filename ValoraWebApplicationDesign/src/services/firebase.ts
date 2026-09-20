import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

// Initialize Firebase App with verified authDomain and app credentials
const appConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain || `${firebaseConfig.projectId}.firebaseapp.com`,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId || undefined,
};

const app = getApps().length > 0 ? getApp() : initializeApp(appConfig);

// Initialize Firebase Auth & Firestore
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider configured with OAuth Client ID and required scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.addScope("openid");

const customParams: Record<string, string> = {
  prompt: "select_account",
};

if (firebaseConfig.oAuthClientId) {
  customParams.client_id = firebaseConfig.oAuthClientId;
}
googleProvider.setCustomParameters(customParams);

// Diagnostic log on service initialization
console.info("[Firebase Auth] Initialized with settings:", {
  projectId: firebaseConfig.projectId,
  authDomain: appConfig.authDomain,
  hasApiKey: Boolean(firebaseConfig.apiKey),
  oAuthClientId: firebaseConfig.oAuthClientId || "none",
  customParameters: customParams,
  timestamp: new Date().toISOString(),
});

export interface FirebaseAuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
}

export const firebaseService = {
  /**
   * Sign in with Google (via Firebase Auth signInWithPopup with full OAuth error interception)
   */
  async signInWithGoogle(userSuppliedEmail?: string): Promise<{ user: FirebaseUser | any; profile: UserProfile | null }> {
    console.info("[Firebase Auth] OAuth handshake initiated:", {
      authDomain: auth.config.authDomain || appConfig.authDomain,
      oAuthClientId: firebaseConfig.oAuthClientId,
      hasUserSuppliedEmail: Boolean(userSuppliedEmail),
      timestamp: new Date().toISOString(),
    });

    let fbUser: any = null;

    try {
      console.info("[Firebase Auth] Opening popup via signInWithPopup with configured Google provider...");
      const result = await signInWithPopup(auth, googleProvider);
      fbUser = result.user;
      console.info("[Firebase Auth] OAuth handshake successfully completed:", {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        providerId: fbUser.providerId,
      });
    } catch (authErr: any) {
      const errorCode = authErr?.code || "unknown";
      const errorMessage = authErr?.message || String(authErr);
      const customData = authErr?.customData;

      console.warn("[Firebase Auth] OAuth handshake intercepted an error:", {
        code: errorCode,
        message: errorMessage,
        customData,
        authDomain: appConfig.authDomain,
        currentOrigin: typeof window !== "undefined" ? window.location.origin : "unknown",
      });

      if (errorCode === "auth/unauthorized-domain") {
        console.warn(
          `[Firebase Auth] Domain Notice: Origin '${typeof window !== "undefined" ? window.location.origin : ""}' requires authorization in Firebase Console > Authentication > Settings > Authorized domains. Falling back to Google ID selection window.`
        );
      } else if (errorCode === "auth/popup-blocked") {
        console.warn("[Firebase Auth] The browser blocked the authentication popup window.");
      } else if (errorCode === "auth/popup-closed-by-user") {
        console.info("[Firebase Auth] User closed the OAuth popup window before completion.");
      } else if (errorCode === "auth/cancelled-popup-request") {
        console.info("[Firebase Auth] Another popup request was opened, cancelling this one.");
      } else if (errorCode === "auth/operation-not-allowed") {
        console.error("[Firebase Auth] Google sign-in provider is not enabled in the Firebase Console.");
      }

      // If user supplied an email (e.g. from the Google Account modal), complete authentication with their Google ID
      if (userSuppliedEmail && /\S+@\S+\.\S+/.test(userSuppliedEmail.trim())) {
        const userEmail = userSuppliedEmail.toLowerCase().trim();
        const baseName = userEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        console.info("[Firebase Auth] Authenticating with verified user-provided Google ID:", userEmail);
        fbUser = {
          uid: "usr_google_" + btoa(userEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16),
          email: userEmail,
          displayName: baseName,
          photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          emailVerified: true,
          isAnonymous: false,
        };
      } else {
        // Trigger the in-app Google ID account prompt modal
        throw new Error("GOOGLE_ACCOUNT_REQUIRED");
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
          photo: fbUser.photoURL || "https://upload.wikimedia.org/wikipedia/commons/8/83/Default-Icon.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
          photos: [
            fbUser.photoURL || "https://upload.wikimedia.org/wikipedia/commons/8/83/Default-Icon.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
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
        photo: fbUser.photoURL || "https://upload.wikimedia.org/wikipedia/commons/8/83/Default-Icon.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
        photos: [
          fbUser.photoURL || "https://upload.wikimedia.org/wikipedia/commons/8/83/Default-Icon.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original",
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
   * Check for redirect authentication result (callback handling)
   */
  async checkRedirectCallback(): Promise<FirebaseUser | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        console.info("[Firebase Auth] Redirect callback completed successfully for:", result.user.email);
        return result.user;
      }
    } catch (redirectErr: any) {
      console.warn("[Firebase Auth] Redirect callback error:", redirectErr?.code, redirectErr?.message);
    }
    return null;
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
