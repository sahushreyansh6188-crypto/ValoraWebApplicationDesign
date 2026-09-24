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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return tokenStorage.isAuthenticated();
  });

  const [screen, setScreenState] = useState<Screen>(() => {
    try {
      const isAuth = tokenStorage.isAuthenticated();
      const hash = window.location.hash.replace(/^#\/?/, "") as Screen;
      const validScreens: Screen[] = [
        "landing",
        "auth",
        "onboarding",
        "discover",
        "matches",
        "messages",
        "my-profile",
        "settings",
        "admin",
        "notifications",
      ];

      // If user is authenticated, restore their active screen
      if (isAuth) {
        if (hash && validScreens.includes(hash) && hash !== "landing" && hash !== "auth") {
          return hash;
        }
        const saved = tokenStorage.getScreen() as Screen;
        if (saved && validScreens.includes(saved) && saved !== "landing" && saved !== "auth") {
          return saved;
        }
        return "discover";
      }

      // If user is signed out, only allow public screens ('auth' or 'onboarding')
      if (hash === "auth" || hash === "onboarding") {
        return hash;
      }

      // If URL hash points to a protected screen like #settings after logout, strip it cleanly
      if (window.location.hash && window.location.hash !== "#landing") {
        try {
          window.location.hash = "";
          if (window.history.replaceState) {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
          }
        } catch {}
      }

      return "landing";
    } catch {
      return "landing";
    }
  });

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(() => {
    return tokenStorage.getProfile();
  });

  const navigate = (s: Screen) => {
    setScreenState(s);
    tokenStorage.setScreen(s);
    try {
      if (s === "landing") {
        window.location.hash = "";
        if (window.history.replaceState) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      } else {
        window.location.hash = s;
      }
    } catch {}
  };

  useEffect(() => {
    // Keep screen state in sync if browser navigation back/forward is used
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, "") as Screen;
      const validScreens: Screen[] = [
        "landing",
        "auth",
        "onboarding",
        "discover",
        "matches",
        "messages",
        "my-profile",
        "settings",
        "admin",
        "notifications",
      ];
      if (hash && validScreens.includes(hash)) {
        if (tokenStorage.isAuthenticated()) {
          if (hash === "landing" || hash === "auth") {
            setScreenState("discover");
            tokenStorage.setScreen("discover");
            window.location.hash = "discover";
            return;
          }
          setScreenState(hash);
          tokenStorage.setScreen(hash);
        } else {
          // If unauthenticated and hash is a protected app screen, force redirect to landing
          if (hash !== "landing" && hash !== "auth" && hash !== "onboarding") {
            setScreenState("landing");
            tokenStorage.setScreen("landing");
            try {
              window.location.hash = "";
              if (window.history.replaceState) {
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
              }
            } catch {}
            return;
          }
          setScreenState(hash);
          tokenStorage.setScreen(hash);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);

    // If authenticated, refresh profile in background without logging user out on network failure
    if (tokenStorage.isAuthenticated()) {
      profilesApi
        .getMe()
        .then((p) => {
          if (p && p.id) {
            setCurrentUserProfile(p);
            setIsAuthenticated(true);
            tokenStorage.setProfile(p);
          }
        })
        .catch((err) => {
          console.info("[Valora App] Background profile sync bypassed:", (err as Error)?.message);
          // Retain current session and credentials
        });
    }

    // Observe Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsAuthenticated(true);
        tokenStorage.setUser({
          id: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName,
          photoURL: fbUser.photoURL,
        });
        const fbProfile = await firebaseService.getProfile(fbUser.uid);
        if (fbProfile) {
          setCurrentUserProfile(fbProfile);
          tokenStorage.setProfile(fbProfile);
          setScreenState((current) => {
            if (current === "landing" || current === "auth") {
              tokenStorage.setScreen("discover");
              return "discover";
            }
            return current;
          });
        } else {
          fetchProfileAndRefresh();
        }
      }
    });

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      unsubscribe();
    };
  }, []);

  const fetchProfileAndRefresh = () => {
    profilesApi
      .getMe()
      .then((p) => {
        if (p && p.id) {
          setCurrentUserProfile(p);
          tokenStorage.setProfile(p);
          window.dispatchEvent(new CustomEvent("valora:profile-updated", { detail: p }));
        }
      })
      .catch(async () => {
        if (auth.currentUser) {
          const fbProfile = await firebaseService.getProfile(auth.currentUser.uid);
          if (fbProfile) {
            setCurrentUserProfile(fbProfile);
            tokenStorage.setProfile(fbProfile);
            window.dispatchEvent(new CustomEvent("valora:profile-updated", { detail: fbProfile }));
          }
        }
      });
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    fetchProfileAndRefresh();
    const saved = tokenStorage.getScreen() as Screen;
    const target = saved && saved !== "landing" && saved !== "auth" ? saved : "discover";
    navigate(target);
  };

  const handleOnboardingComplete = () => {
    setIsAuthenticated(true);
    fetchProfileAndRefresh();
    navigate("discover");
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
    tokenStorage.setScreen("landing");

    try {
      window.location.hash = "";
      if (window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } catch {}

    setScreenState("landing");
  };

  // ── Screens when user is unauthenticated ──────────────────────────────────
  if (!isAuthenticated) {
    if (screen === "auth") {
      return (
        <Auth
          mode={authMode}
          setMode={(m) => {
            setAuthMode(m);
          }}
          navigate={(s) => {
            navigate(s);
          }}
          onLogin={handleLogin}
        />
      );
    }

    if (screen === "onboarding") {
      return (
        <Onboarding
          onComplete={() => {
            fetchProfileAndRefresh();
            navigate("my-profile");
          }}
        />
      );
    }

    return (
      <Landing
        navigate={(s) => {
          navigate(s);
        }}
        setAuthMode={setAuthMode}
        onLogin={handleLogin}
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
