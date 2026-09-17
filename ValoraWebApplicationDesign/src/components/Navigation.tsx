import { useState, useEffect } from "react";
import type { Screen, NavigateFn, UserProfile } from "../types";
import { profilesApi } from "../services/api";
import ValoraLogo, { ValoraIcon } from "./ValoraLogo";
import UndiscoveredAvatar from "./UndiscoveredAvatar";

interface NavProps {
  screen: Screen;
  navigate: NavigateFn;
  unreadMessages?: number;
  unreadNotifications?: number;
  userProfile?: UserProfile | null;
}

const IconCompass = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);
const IconHeart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const IconMessage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const navItems = [
  { id: "discover" as Screen, label: "Discover", icon: <IconCompass /> },
  { id: "matches" as Screen, label: "Matches", icon: <IconHeart /> },
  { id: "messages" as Screen, label: "Messages", icon: <IconMessage /> },
  { id: "notifications" as Screen, label: "Alerts", icon: <IconBell /> },
  { id: "my-profile" as Screen, label: "Profile", icon: <IconUser /> },
];

export default function Navigation({
  screen,
  navigate,
  unreadMessages = 2,
  unreadNotifications = 3,
  userProfile,
}: NavProps) {
  const [profile, setProfile] = useState<UserProfile | null>(userProfile || null);

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile]);

  useEffect(() => {
    let active = true;

    // Fetch me if not yet populated
    profilesApi
      .getMe()
      .then((data) => {
        if (active && data && data.name) {
          setProfile(data);
        }
      })
      .catch(() => {});

    // Listen for cross-page profile updates (e.g. from MyProfile or Onboarding)
    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Partial<UserProfile>>;
      if (customEvent.detail) {
        setProfile((prev) => (prev ? { ...prev, ...customEvent.detail } : (customEvent.detail as UserProfile)));
      }
    };

    window.addEventListener("valora:profile-updated", handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener("valora:profile-updated", handleProfileUpdate);
    };
  }, []);

  const getBadge = (id: Screen) => {
    if (id === "messages") return unreadMessages;
    if (id === "notifications") return unreadNotifications;
    return 0;
  };

  const displayName = profile?.name || "Member";
  const displayPronouns = profile?.pronouns || "";
  const displayPhoto = profile?.photo || (profile?.photos && profile.photos[0]) || "";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-mist z-40">
        {/* Logo */}
        <div className="px-6 pt-7 pb-6">
          <ValoraLogo size="md" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
          {navItems.map(({ id, label, icon }) => {
            const isActive = screen === id;
            const badge = getBadge(id);
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                aria-current={isActive ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-light text-brand"
                    : "text-flint hover:bg-cream hover:text-charcoal"
                }`}
              >
                <span className="relative">
                  {icon}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-clay text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </span>
                {label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: settings + avatar */}
        <div className="px-3 pb-5 space-y-0.5 border-t border-mist pt-3">
          <button
            onClick={() => navigate("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              screen === "settings"
                ? "bg-brand-light text-brand"
                : "text-flint hover:bg-cream hover:text-charcoal"
            }`}
          >
            <IconSettings />
            Settings
          </button>
          <button
            onClick={() => navigate("my-profile")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors mt-1 ${
              screen === "my-profile"
                ? "bg-brand-light text-brand"
                : "hover:bg-cream"
            }`}
          >
            <UndiscoveredAvatar
              photo={displayPhoto}
              name={displayName}
              size="sm"
              showBadge={!displayPhoto}
            />
            <div className="text-left overflow-hidden min-w-0 flex-1">
              <div className="text-sm font-medium text-charcoal leading-tight truncate">
                {displayName}
              </div>
              {displayPronouns ? (
                <div className="text-xs text-stone leading-tight truncate">
                  {displayPronouns}
                </div>
              ) : !displayPhoto ? (
                <div className="text-[11px] text-clay leading-tight truncate font-medium">
                  + Add photo
                </div>
              ) : null}
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-mist z-40 px-2"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ id, label, icon }) => {
            const isActive = screen === id;
            const badge = getBadge(id);
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? "text-brand" : "text-stone"
                }`}
              >
                <span className="relative">
                  {icon}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-clay text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
