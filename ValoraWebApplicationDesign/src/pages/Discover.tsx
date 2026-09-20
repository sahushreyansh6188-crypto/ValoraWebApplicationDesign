import { useState, useEffect } from "react";
import type { UserProfile } from "../types";
import { discoveryApi, profilesApi } from "../services/api";
import { firebaseService } from "../services/firebase";
import UndiscoveredAvatar, { DEFAULT_DP_URL } from "../components/UndiscoveredAvatar";

const lifestyleFilters = ["All", "alcohol-free", "vegan", "zero-waste", "mindfulness practice", "outdoor lifestyle", "plant-based"];

function CompatibilityBar({ score }: { score: number }) {
  const color = score >= 85 ? "bg-brand" : score >= 70 ? "bg-brand-mid" : "bg-clay-mid";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-brand shrink-0">{score}%</span>
    </div>
  );
}

function ProfileCard({ profile, onClick }: { profile: UserProfile; onClick: () => void }) {
  const [passed, setPassed] = useState(false);

  if (passed) return null;

  return (
    <article
      className="group relative bg-white rounded-2xl overflow-hidden border border-mist hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${profile.name}'s profile — ${profile.compatibilityScore}% aligned`}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Photo */}
      <div className="relative h-60 bg-cream overflow-hidden">
        {profile.photo ? (
          <img
            src={profile.photo}
            alt={`${profile.name}, ${profile.age}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              if (e.currentTarget.src !== DEFAULT_DP_URL) {
                e.currentTarget.src = DEFAULT_DP_URL;
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-sand/80 via-cream to-ivory">
            <UndiscoveredAvatar photo="" name={profile.name} size="xl" />
            <span className="text-[11px] font-medium text-stone mt-2 tracking-wide uppercase">Photo Undiscovered</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-semibold text-brand">
          {profile.compatibilityScore}% aligned
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-semibold text-base leading-tight">
            {profile.name}, {profile.age}
          </h3>
          <span className="text-xs text-white/80">{profile.pronouns}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        <p className="text-xs text-stone flex items-center gap-1 mb-2.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {profile.location}
        </p>
        <CompatibilityBar score={profile.compatibilityScore} />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {profile.lifestyle.slice(0, 3).map((tag) => (
            <span key={tag} className="bg-brand-light text-brand text-xs px-2.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {profile.lifestyle.length > 3 && (
            <span className="text-xs text-stone px-1 py-0.5">+{profile.lifestyle.length - 3}</span>
          )}
        </div>
      </div>

      {/* Pass button — unobtrusive */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setPassed(true);
          discoveryApi.pass(profile.id).catch(() => {});
        }}
        aria-label={`Not right now for ${profile.name}`}
        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-stone hover:text-danger bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-mist"
      >
        Not now
      </button>
    </article>
  );
}

function SharedTag({ label, shared }: { label: string; shared: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
      shared ? "bg-brand-light text-brand" : "bg-cream text-stone"
    }`}>
      {shared ? (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 6l3 3 5-5" stroke="#2A4A1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <div className="w-2 h-2 rounded-full bg-pebble" aria-hidden="true" />
      )}
      {label}
    </div>
  );
}

function ProfileDetail({ profile, onClose, onConnect, currentUser }: { profile: UserProfile; onClose: () => void; onConnect: () => void; currentUser?: UserProfile | null }) {
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<"about" | "values" | "lifestyle" | "communication">("about");

  const myValues = currentUser?.values || [];
  const myLifestyle = currentUser?.lifestyle || [];
  const sharedValues = profile.values.filter((v) => myValues.includes(v));
  const sharedLifestyle = profile.lifestyle.filter((l) => myLifestyle.includes(l));

  const handleConnect = () => {
    setConnected(true);
    setTimeout(() => { onConnect(); onClose(); }, 1500);
  };

  const tabs = [
    { id: "about" as const, label: "About" },
    { id: "values" as const, label: "Values" },
    { id: "lifestyle" as const, label: "Lifestyle" },
    { id: "communication" as const, label: "Communication" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-charcoal/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.name}'s profile`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
        {/* Photo header */}
        <div className="relative h-72 bg-cream overflow-hidden">
          {profile.photos && profile.photos[0] ? (
            <img
              src={profile.photos[0]}
              alt={`${profile.name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                if (e.currentTarget.src !== DEFAULT_DP_URL) {
                  e.currentTarget.src = DEFAULT_DP_URL;
                }
              }}
            />
          ) : profile.photo ? (
            <img
              src={profile.photo}
              alt={`${profile.name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                if (e.currentTarget.src !== DEFAULT_DP_URL) {
                  e.currentTarget.src = DEFAULT_DP_URL;
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-sand/80 via-cream to-ivory">
              <UndiscoveredAvatar photo="" name={profile.name} size="xl" />
              <span className="text-xs font-medium text-stone mt-2 uppercase tracking-wide">Photo Undiscovered</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-4 left-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-brand z-10">
            {profile.compatibilityScore}% aligned
          </div>
          <div className="absolute bottom-5 left-5 text-white">
            <h2 className="font-display text-2xl">{profile.name}, {profile.age}</h2>
            <p className="text-white/80 text-sm">{profile.pronouns} · {profile.location}</p>
          </div>
        </div>

        {/* Compatibility summary */}
        <div className="px-6 py-4 border-b border-mist">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-charcoal">Compatibility</span>
            <span className="text-sm text-stone">{sharedValues.length + sharedLifestyle.length} things in common</span>
          </div>
          <div className="w-full bg-mist rounded-full h-2 mb-3">
            <div className="bg-brand h-2 rounded-full" style={{ width: `${profile.compatibilityScore}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sharedValues.slice(0, 3).map(v => <SharedTag key={v} label={v} shared />)}
            {sharedLifestyle.slice(0, 2).map(l => <SharedTag key={l} label={l} shared />)}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-mist px-6" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-stone hover:text-flint"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="px-6 py-5">
          {tab === "about" && (
            <div role="tabpanel">
              <p className="text-sm text-flint leading-relaxed mb-4">{profile.bio}</p>
              <div className="text-xs text-stone mb-1">Looking for</div>
              <p className="text-sm text-flint">{profile.lookingFor}</p>
              {profile.occupation && (
                <div className="mt-4 flex items-center gap-2 text-sm text-stone">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  {profile.occupation}
                </div>
              )}
              {profile.lastActive && (
                <p className="text-xs text-stone mt-3">Active {profile.lastActive}</p>
              )}
            </div>
          )}
          {tab === "values" && (
            <div role="tabpanel">
              <p className="text-xs text-stone mb-4">Green tags = shared values</p>
              <div className="flex flex-wrap gap-2">
                {profile.values.map((v) => (
                  <SharedTag key={v} label={v} shared={currentUser?.values ? currentUser.values.includes(v) : false} />
                ))}
              </div>
            </div>
          )}
          {tab === "lifestyle" && (
            <div role="tabpanel">
              <p className="text-xs text-stone mb-4">Green tags = shared lifestyle choices</p>
              <div className="flex flex-wrap gap-2">
                {profile.lifestyle.map((l) => (
                  <SharedTag key={l} label={l} shared={currentUser?.lifestyle ? currentUser.lifestyle.includes(l) : false} />
                ))}
              </div>
            </div>
          )}
          {tab === "communication" && (
            <div role="tabpanel">
              <div className="space-y-2.5">
                {profile.communicationStyle.map((c) => (
                  <div key={c} className="bg-cream rounded-xl px-4 py-3 text-sm text-flint">{c}</div>
                ))}
                <div className="mt-4 pt-4 border-t border-mist">
                  <p className="text-xs font-medium text-stone mb-2.5">Boundaries they've shared</p>
                  {profile.boundaries.map((b) => (
                    <div key={b} className="bg-cream rounded-xl px-4 py-3 text-sm text-flint mb-2">{b}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-mist bg-white text-flint py-3.5 rounded-full text-sm font-medium hover:bg-cream transition-colors"
          >
            Not right now
          </button>
          <button
            onClick={handleConnect}
            disabled={connected}
            className="flex-1 bg-brand text-ivory py-3.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-70"
          >
            {connected ? "Reached out ✓" : `Connect with ${profile.name}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Discover() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [profileList, setProfileList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    return Promise.all([
      discoveryApi.getFeed({ lifestyle: activeFilter }).catch(() => []),
      firebaseService.getDiscoveryProfiles(currentUser?.id).catch(() => []),
    ])
      .then(([apiData, fbData]) => {
        // Merge profiles by ID, deduplicating
        const map = new Map<string, UserProfile>();
        (apiData || []).forEach((p) => map.set(p.id, p));
        (fbData || []).forEach((p) => {
          if (!map.has(p.id)) map.set(p.id, p);
        });
        setProfileList(Array.from(map.values()));
      })
      .catch((err) => {
        if (!silent) setError((err as Error)?.message || "Unable to load profiles.");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    let active = true;
    profilesApi
      .getMe()
      .then((u) => {
        if (active && u) setCurrentUser(u);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchFeed(false);

    // Real-time polling: Refresh feed every 10 seconds to discover newly signed-up users instantly
    const interval = setInterval(() => {
      fetchFeed(true);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [activeFilter]);

  const filtered = activeFilter === "All"
    ? profileList
    : profileList.filter((p) => p.lifestyle.some(l => l.toLowerCase().includes(activeFilter.toLowerCase())));

  const handleConnect = async () => {
    if (selectedProfile) {
      setShowSuccess(selectedProfile.name);
      try {
        await discoveryApi.reachOut(selectedProfile.id);
      } catch (err) {
        console.warn("Reach out error:", err);
      }
    }
    setTimeout(() => setShowSuccess(null), 3000);
  };

  return (
    <div className="md:ml-60 min-h-screen bg-ivory">
      {/* Page header */}
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-sm border-b border-mist px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl text-charcoal">Discover</h1>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand bg-brand-light/60 px-2.5 py-0.5 rounded-full border border-brand/20">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchFeed(true)}
              disabled={refreshing}
              className="text-xs text-stone hover:text-charcoal px-2.5 py-1 rounded-full border border-mist bg-white flex items-center gap-1.5 transition-colors"
              title="Refresh live profile feed"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? "animate-spin text-brand" : ""}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{refreshing ? "Updating..." : "Refresh"}</span>
            </button>
            <span className="text-xs text-stone">{filtered.length} {filtered.length === 1 ? "profile" : "profiles"} available</span>
          </div>
        </div>
        {/* Filter bar */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none" role="toolbar" aria-label="Filter by lifestyle">
          {lifestyleFilters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              aria-pressed={activeFilter === f}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-brand text-ivory"
                  : "bg-white border border-mist text-flint hover:bg-cream"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 pb-24 md:pb-6">
        {loading ? (
          /* Loading state */
          <div className="text-center py-20">
            <div className="w-9 h-9 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-stone text-sm">Loading compatible profiles...</p>
          </div>
        ) : error ? (
          /* Error state */
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D0614A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">Unable to load profiles.</h3>
            <p className="text-stone text-sm">Please check your connection or try again.</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                discoveryApi.getFeed({ lifestyle: activeFilter }).then((data) => {
                  setProfileList(data || []);
                  setLoading(false);
                }).catch((err) => {
                  setError((err as Error)?.message || "Unable to load profiles.");
                  setLoading(false);
                });
              }}
              className="mt-5 inline-block bg-white border border-mist text-brand px-5 py-2 rounded-full text-sm font-medium hover:bg-cream transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8A8A82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              {activeFilter === "All" ? "No eligible profiles currently available." : "No matches for this filter"}
            </h3>
            <p className="text-stone text-sm max-w-md mx-auto">
              {activeFilter === "All"
                ? "New members appear here as they complete onboarding and publish their profiles. Broaden your discovery preferences in settings or check back soon."
                : "Try a different lifestyle filter, or broaden your discovery preferences in settings."}
            </p>
            {activeFilter !== "All" && (
              <button onClick={() => setActiveFilter("All")} className="mt-5 text-brand text-sm font-medium hover:underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <ProfileCard key={p.id} profile={p} onClick={() => setSelectedProfile(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Profile detail overlay */}
      {selectedProfile && (
        <ProfileDetail
          profile={selectedProfile}
          currentUser={currentUser}
          onClose={() => setSelectedProfile(null)}
          onConnect={handleConnect}
        />
      )}

      {/* Success toast */}
      {showSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-charcoal text-ivory text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 z-50"
        >
          <div className="w-2 h-2 rounded-full bg-brand-mid" aria-hidden="true" />
          Connection request sent to {showSuccess}
        </div>
      )}
    </div>
  );
}
