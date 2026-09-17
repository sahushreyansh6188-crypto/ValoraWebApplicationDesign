import { useState, useEffect } from "react";
import type { Screen, AuthMode } from "./types";
import { tokenStorage, profilesApi, authApi } from "./services/api";

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

  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      profilesApi.getMe().then((p) => {
        if (p && p.id) {
          setIsAuthenticated(true);
          setScreen("discover");
        }
      }).catch(() => {
        tokenStorage.clear();
      });
    }
  }, []);

  const navigate = (s: Screen) => setScreen(s);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setScreen("discover");
  };

  const handleOnboardingComplete = () => {
    setIsAuthenticated(true);
    setScreen("discover");
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    tokenStorage.clear();
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
    return <Onboarding onComplete={() => setScreen("my-profile")} />;
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navigation screen={screen} navigate={navigate} />

      {/* Page content — desktop offset for sidebar */}
      {screen === "discover" && <Discover />}
      {screen === "matches" && <Matches navigate={navigate} />}
      {screen === "messages" && <Messages />}
      {screen === "notifications" && <Notifications navigate={navigate} />}
      {screen === "my-profile" && <MyProfile navigate={navigate} />}
      {screen === "settings" && <Settings navigate={navigate} onLogout={handleLogout} />}
      {screen === "admin" && <Admin navigate={navigate} />}
    </div>
  );
}
