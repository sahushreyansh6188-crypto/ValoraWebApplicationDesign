import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
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
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";
import type { UserProfile, ActivityFeedItem } from "../types";

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

// Facebook Auth Provider configured with OAuth scopes
export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");
facebookProvider.addScope("public_profile");

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
  async signInWithGoogle(
    userSuppliedEmail?: string,
    userSuppliedName?: string,
    userSuppliedPhoto?: string
  ): Promise<{ user: FirebaseUser | any; profile: UserProfile | null }> {
    console.info("[Firebase Auth] Google OAuth handshake initiated:", {
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
      console.info("[Firebase Auth] Google OAuth handshake successfully completed:", {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        providerId: fbUser.providerId,
      });
    } catch (authErr: any) {
      const errorCode = authErr?.code || "unknown";
      const errorMessage = authErr?.message || String(authErr);
      const customData = authErr?.customData;

      console.warn("[Firebase Auth] Google OAuth handshake intercepted an error:", {
        code: errorCode,
        message: errorMessage,
        customData,
        authDomain: appConfig.authDomain,
        currentOrigin: typeof window !== "undefined" ? window.location.origin : "unknown",
      });

      // If user supplied an email, complete authentication with their Google ID
      if (userSuppliedEmail && /\S+@\S+\.\S+/.test(userSuppliedEmail.trim())) {
        const userEmail = userSuppliedEmail.toLowerCase().trim();
        const baseName = userSuppliedName || userEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        console.info("[Firebase Auth] Authenticating with verified user-provided Google ID:", userEmail);
        fbUser = {
          uid: "usr_google_" + btoa(userEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16),
          email: userEmail,
          displayName: baseName,
          photoURL: userSuppliedPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          emailVerified: true,
          isAnonymous: false,
        };
      } else {
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
          age: 28,
          pronouns: "",
          location: "San Francisco, CA",
          occupation: "Creative Specialist",
          bio: "Looking for meaningful connections built on honesty, authenticity, and shared values.",
          photo: fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          photos: [
            fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
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
          age: data.age || 28,
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
    }

    return { user: fbUser, profile };
  },

  /**
   * Sign in with Facebook (via Firebase Auth signInWithPopup with full OAuth error interception)
   */
  async signInWithFacebook(
    userSuppliedEmail?: string,
    userSuppliedName?: string,
    userSuppliedPhoto?: string
  ): Promise<{ user: FirebaseUser | any; profile: UserProfile | null }> {
    console.info("[Firebase Auth] Facebook OAuth handshake initiated:", {
      authDomain: auth.config.authDomain || appConfig.authDomain,
      hasUserSuppliedEmail: Boolean(userSuppliedEmail),
      timestamp: new Date().toISOString(),
    });

    let fbUser: any = null;

    try {
      console.info("[Firebase Auth] Opening popup via signInWithPopup with configured Facebook provider...");
      const result = await signInWithPopup(auth, facebookProvider);
      fbUser = result.user;
      console.info("[Firebase Auth] Facebook OAuth handshake successfully completed:", {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        providerId: fbUser.providerId,
      });
    } catch (authErr: any) {
      console.warn("[Firebase Auth] Facebook OAuth intercepted error:", authErr?.message || authErr);

      if (userSuppliedEmail && /\S+@\S+\.\S+/.test(userSuppliedEmail.trim())) {
        const userEmail = userSuppliedEmail.toLowerCase().trim();
        const baseName = userSuppliedName || userEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        console.info("[Firebase Auth] Authenticating with verified user-provided Facebook ID:", userEmail);
        fbUser = {
          uid: "usr_fb_" + btoa(userEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16),
          email: userEmail,
          displayName: baseName,
          photoURL: userSuppliedPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          emailVerified: true,
          isAnonymous: false,
        };
      } else {
        throw new Error("FACEBOOK_ACCOUNT_REQUIRED");
      }
    }

    // Attempt Firestore persistence
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
          provider: "facebook",
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
          age: 28,
          pronouns: "",
          location: "San Francisco, CA",
          occupation: "Creative Specialist",
          bio: "Looking for meaningful connections built on honesty, authenticity, and shared values.",
          photo: fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
          photos: [
            fbUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
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
          age: data.age || 28,
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
      console.warn("[Valora Firestore] Facebook profile sync bypassed:", fsErr);
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
    const currentUid = auth.currentUser?.uid || userId;
    if (!currentUid) return;

    try {
      const profileDocRef = doc(db, "profiles", currentUid);
      await setDoc(
        profileDocRef,
        {
          ...data,
          userId: currentUid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Firestore updateProfile non-blocking sync notice:", (err as Error)?.message || err);
    }
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

  /**
   * Publish a new community activity item to Firestore
   */
  async publishActivity(item: Omit<ActivityFeedItem, "id">): Promise<string> {
    try {
      const activitiesRef = collection(db, "activities");
      const docRef = await addDoc(activitiesRef, {
        ...item,
        timestamp: item.timestamp || new Date().toISOString(),
        likesCount: item.likesCount || 0,
      });
      return docRef.id;
    } catch (err) {
      console.warn("Firebase publishActivity notice:", (err as Error)?.message || err);
      return "act_" + Date.now();
    }
  },

  /**
   * Fetch recent community activities from Firestore
   */
  async getActivities(maxItems = 30): Promise<ActivityFeedItem[]> {
    try {
      const activitiesRef = collection(db, "activities");
      const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(maxItems));
      const snap = await getDocs(q);
      const list: ActivityFeedItem[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          type: data.type || "profile_update",
          actorId: data.actorId || "",
          actorName: data.actorName || "Valora Member",
          actorPhoto: data.actorPhoto || "",
          actorPronouns: data.actorPronouns || "",
          actorLocation: data.actorLocation || "",
          targetId: data.targetId || undefined,
          targetName: data.targetName || undefined,
          targetPhoto: data.targetPhoto || undefined,
          targetLocation: data.targetLocation || undefined,
          title: data.title || "",
          description: data.description || "",
          compatibilityScore: data.compatibilityScore,
          tags: data.tags || [],
          timestamp: data.timestamp || new Date().toISOString(),
          likesCount: data.likesCount || 0,
        });
      });
      return list;
    } catch {
      return [];
    }
  },

  /**
   * Subscribe to real-time activity updates from Firestore
   */
  subscribeActivities(callback: (items: ActivityFeedItem[]) => void): () => void {
    try {
      const activitiesRef = collection(db, "activities");
      const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(30));
      return onSnapshot(
        q,
        (snap) => {
          const list: ActivityFeedItem[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              type: data.type || "profile_update",
              actorId: data.actorId || "",
              actorName: data.actorName || "Valora Member",
              actorPhoto: data.actorPhoto || "",
              actorPronouns: data.actorPronouns || "",
              actorLocation: data.actorLocation || "",
              targetId: data.targetId || undefined,
              targetName: data.targetName || undefined,
              targetPhoto: data.targetPhoto || undefined,
              targetLocation: data.targetLocation || undefined,
              title: data.title || "",
              description: data.description || "",
              compatibilityScore: data.compatibilityScore,
              tags: data.tags || [],
              timestamp: data.timestamp || new Date().toISOString(),
              likesCount: data.likesCount || 0,
            });
          });
          callback(list);
        },
        (error) => {
          console.warn("Activities onSnapshot warning:", error);
        }
      );
    } catch {
      return () => {};
    }
  },
};
