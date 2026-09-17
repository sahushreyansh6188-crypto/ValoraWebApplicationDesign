import { useState, useEffect } from "react";
import type { Screen, AuthMode, UserProfile } from "./types";
import { tokenStorage, profilesApi, authApi } from "./services/api";
import { auth, firebaseService } from "./services/firebase";
import { onAuthStateChanged } from "firebase/auth";

import Navigation from "./components/Navigation";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Discover from "./pages/Discover";
import Matches from "./pages/Matches";
import Messages from "./pages/Messages";
import MyProfile from "./pages/MyProfile";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Notifications from "./pages/Notifications";

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      profilesApi
        .getMe()
        .then((p) => {
          if (p && p.id) {
            setCurrentUserProfile(p);
            setIsAuthenticated(true);
            setScreen("discover");
          }
        })
        .catch(() => {
          tokenStorage.clear();
        });
    }

    // Also observe Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsAuthenticated(true);
        const fbProfile = await firebaseService.getProfile(fbUser.uid);
        if (fbProfile) {
          setCurrentUserProfile(fbProfile);
          setScreen((s) => (s === "landing" || s === "auth" ? "discover" : s));
        } else {
          fetchProfileAndRefresh();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const navigate = (s: Screen) => setScreen(s);

  const fetchProfileAndRefresh = () => {
    profilesApi
      .getMe()
      .then((p) => {
        if (p && p.id) {
          setCurrentUserProfile(p);
          window.dispatchEvent(new CustomEvent("valora:profile-updated", { detail: p }));
        }
      })
      .catch(async () => {
        if (auth.currentUser) {
          const fbProfile = await firebaseService.getProfile(auth.currentUser.uid);
          if (fbProfile) {
            setCurrentUserProfile(fbProfile);
            window.dispatchEvent(new CustomEvent("valora:profile-updated", { detail: fbProfile }));
          }
        }
      });
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    fetchProfileAndRefresh();
    setScreen("discover");
  };

  const handleOnboardingComplete = () => {
    setIsAuthenticated(true);
    fetchProfileAndRefresh();
    setScreen("discover");
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    try {
      await firebaseService.signOut();
    } catch {}
    tokenStorage.clear();
    setCurrentUserProfile(null);
    setIsAuthenticated(false);
    setScreen("landing");
  };

  // ── Unauthenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (screen === "onboarding") {
      return <Onboarding onComplete={handleOnboardingComplete} />;
    }
    if (screen === "auth") {
      return (
        <Auth
          mode={authMode}
          setMode={(m) => {
            setAuthMode(m);
          }}
          navigate={(s) => {
            if (s === "onboarding") {
              setScreen("onboarding");
            } else {
              navigate(s);
            }
          }}
          onLogin={handleLogin}
        />
      );
    }
    return (
      <Landing
        navigate={(s) => {
          if (s === "auth") {
            navigate("auth");
          } else {
            navigate(s);
          }
        }}
        setAuthMode={setAuthMode}
      />
    );
  }

  // ── Authenticated ────────────────────────────────────────────────────────
  if (screen === "onboarding") {
    return (
      <Onboarding
        onComplete={() => {
          fetchProfileAndRefresh();
          setScreen("my-profile");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navigation screen={screen} navigate={navigate} userProfile={currentUserProfile} />

      {/* Page content — desktop offset for sidebar */}
      {screen === "discover" && <Discover />}
      {screen === "matches" && <Matches navigate={navigate} />}
      {screen === "messages" && <Messages />}
      {screen === "notifications" && <Notifications navigate={navigate} />}
      {screen === "my-profile" && (
        <MyProfile
          navigate={navigate}
          onProfileUpdate={(updated) => {
            setCurrentUserProfile((prev) => (prev ? { ...prev, ...updated } : (updated as UserProfile)));
          }}
        />
      )}
      {screen === "settings" && <Settings navigate={navigate} onLogout={handleLogout} />}
      {screen === "admin" && <Admin navigate={navigate} />}
    </div>
  );
}
