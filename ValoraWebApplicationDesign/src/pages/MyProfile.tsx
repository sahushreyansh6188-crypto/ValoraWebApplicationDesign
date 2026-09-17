import { useState, useEffect } from "react";
import type { NavigateFn, UserProfile } from "../types";
import { profilesApi } from "../services/api";
import { firebaseService, auth } from "../services/firebase";
import UndiscoveredAvatar from "../components/UndiscoveredAvatar";
import PhotoImporter from "../components/PhotoImporter";

interface MyProfileProps {
  navigate?: NavigateFn;
  onProfileUpdate?: (profile: Partial<UserProfile>) => void;
}

const defaultProfile: UserProfile = {
  id: "",
  name: "",
  age: 28,
  pronouns: "",
  location: "",
  occupation: "",
  bio: "",
  photo: "",
  photos: [],
  lifestyle: [],
  values: [],
  communicationStyle: [],
  boundaries: [],
  lookingFor: "A meaningful, long-term relationship",
  compatibilityScore: 100,
  lastActive: "Today",
};

export default function MyProfile({ navigate, onProfileUpdate }: MyProfileProps) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const currentUser = profile;
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [location, setLocation] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [savedBio, setSavedBio] = useState("");
  const [savedOccupation, setSavedOccupation] = useState("");
  const [savedLocation, setSavedLocation] = useState("");
  const [savedPronouns, setSavedPronouns] = useState("");
  const [saved, setSaved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  useEffect(() => {
    let active = true;
    profilesApi.getMe().then((data) => {
      if (active && data) {
        setProfile(data);
        setBio(data.bio || "");
        setOccupation(data.occupation || "");
        setLocation(data.location || "");
        setPronouns(data.pronouns || "");
        setSavedBio(data.bio || "");
        setSavedOccupation(data.occupation || "");
        setSavedLocation(data.location || "");
        setSavedPronouns(data.pronouns || "");
        onProfileUpdate?.(data);
        window.dispatchEvent(new CustomEvent("valora:profile-updated", { detail: data }));
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [onProfileUpdate]);

  const save = async () => {
    setSavedBio(bio);
    setSavedOccupation(occupation);
    setSavedLocation(location);
    setSavedPronouns(pronouns);
    const updated = { ...profile, bio, occupation, location, pronouns };
    setProfile(updated);
    onProfileUpdate?.(updated);
    window.dispatchEvent(new CustomEvent("valora:profile-updated", { detail: updated }));
    setEditing(false);
    setSaved(true);
    try {
      await profilesApi.updateMe({ bio, occupation, location, pronouns });
      const currentUid = auth.currentUser?.uid || profile.id;
      if (currentUid) {
        await firebaseService.updateProfile(currentUid, { bio, occupation, location, pronouns });
      }
    } catch (err) {
      console.warn("Failed updating profile via API:", err);
    }
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePhotoUploaded = async (photoUrl: string) => {
    setPhotoSaving(true);
    setPhotoError(null);
    const updated = {
      ...profile,
      photo: photoUrl,
      photos: photoUrl ? [photoUrl] : [],
    };
    setProfile(updated);
    onProfileUpdate?.(updated);
    window.dispatchEvent(new CustomEvent("valora:profile-updated", { detail: updated }));

    try {
      const persisted = await profilesApi.uploadPhoto(photoUrl);
      if (persisted) {
        setProfile(persisted);
        onProfileUpdate?.(persisted);
      }
      const currentUid = auth.currentUser?.uid || profile.id;
      if (currentUid) {
        await firebaseService.updateProfile(currentUid, {
          photo: photoUrl,
          photos: photoUrl ? [photoUrl] : [],
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed persisting photo to database:", err);
      setPhotoError("Could not save photo to database. Please try again.");
    } finally {
      setPhotoSaving(false);
    }
  };

  const cancel = () => {
    setBio(savedBio);
    setOccupation(savedOccupation);
    setLocation(savedLocation);
    setPronouns(savedPronouns);
    setEditing(false);
  };

  const completeness = [
    { label: "Photos", done: Boolean(currentUser.photo || currentUser.photos.length > 0) },
    { label: "Bio", done: bio.length > 20 },
    { label: "Values", done: currentUser.values.length >= 3 },
    { label: "Lifestyle", done: currentUser.lifestyle.length >= 1 },
    { label: "Communication", done: currentUser.communicationStyle.length >= 1 },
    { label: "Boundaries", done: currentUser.boundaries.length >= 1 },
  ];
  const doneCount = completeness.filter((c) => c.done).length;
  const completePct = Math.round((doneCount / completeness.length) * 100);

  const openOnboarding = () => {
    if (navigate) {
      navigate("onboarding");
    }
  };

  return (
    <div className="md:ml-60 min-h-screen bg-ivory pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-white border-b border-mist px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-charcoal">My Profile</h1>
        <div className="flex items-center gap-3">
          {navigate && (
            <button
              onClick={openOnboarding}
              className="text-xs text-brand font-medium hover:underline flex items-center gap-1"
            >
              Re-edit questionnaire
            </button>
          )}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-brand-light text-brand text-sm font-medium px-5 py-2 rounded-full hover:bg-brand hover:text-ivory transition-colors"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Profile completeness */}
        <div className="bg-white border border-mist rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-charcoal">Profile completeness</span>
            <span className="text-sm font-semibold text-brand">{completePct}%</span>
          </div>
          <div className="w-full bg-mist rounded-full h-2 mb-4">
            <div className="bg-brand h-2 rounded-full transition-all" style={{ width: `${completePct}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {completeness.map((c) => (
              <div key={c.label} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${c.done ? "text-brand bg-brand-light" : "text-stone bg-cream"}`}>
                {c.done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="6" cy="6" r="5" fill="#2A4A1E"/>
                    <path d="M3.5 6l2 2 3-3" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-pebble" aria-hidden="true" />
                )}
                {c.label}
              </div>
            ))}
          </div>
        </div>

        {/* Profile card */}
        <div className="bg-white border border-mist rounded-2xl overflow-hidden">
          {/* Cover + avatar */}
          <div className="h-36 bg-gradient-to-br from-brand-light to-cream relative">
            <div className="absolute -bottom-9 left-6">
              <div className="relative">
                <UndiscoveredAvatar
                  photo={currentUser.photo}
                  name={currentUser.name}
                  size="xl"
                  className="border-4 border-white rounded-full bg-white shadow-sm"
                  showBadge={!currentUser.photo}
                />
              </div>
            </div>
          </div>

          <div className="pt-12 px-6 pb-6">
            {/* Import photo prompt block */}
            <div className="mb-6">
              <PhotoImporter
                currentPhoto={currentUser.photo}
                name={currentUser.name}
                onPhotoUploaded={handlePhotoUploaded}
              />
              {photoSaving && (
                <p className="text-xs text-brand mt-2 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  Saving photo to database...
                </p>
              )}
              {photoError && (
                <p className="text-xs text-danger mt-2 bg-danger/10 border border-danger/20 px-3 py-2 rounded-lg">
                  {photoError}
                </p>
              )}
            </div>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-charcoal">{currentUser.name || "Member"}, {currentUser.age}</h2>
                  <span className="text-[11px] text-stone bg-sand/40 px-2.5 py-0.5 rounded-full border border-mist flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Permanent registered name
                  </span>
                </div>
                {editing ? (
                  <input
                    type="text"
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="e.g. they/them, she/her"
                    className="mt-1 px-3 py-1 text-xs rounded-lg bg-ivory border border-mist text-charcoal focus:outline-none focus:border-brand"
                  />
                ) : (
                  <p className="text-sm text-stone">{savedPronouns || "they/them"}</p>
                )}
                
                {editing ? (
                  <div className="mt-1">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Portland, OR"
                      className="px-3 py-1 text-xs rounded-lg bg-ivory border border-mist text-charcoal focus:outline-none focus:border-brand"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-stone flex items-center gap-1 mt-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {savedLocation || "Portland, OR"}
                  </p>
                )}
              </div>
            </div>

            {/* Occupation */}
            <div className="mt-4">
              <label className="text-xs font-medium text-stone mb-1 block">Occupation</label>
              {editing ? (
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-ivory border border-mist text-charcoal focus:outline-none focus:border-brand transition-colors"
                />
              ) : (
                <p className="text-sm text-flint">{savedOccupation || "Not specified"}</p>
              )}
            </div>

            {/* Bio */}
            <div className="mt-4">
              <label className="text-xs font-medium text-stone mb-1 block" htmlFor="profile-bio">Bio</label>
              {editing ? (
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={400}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-ivory border border-mist text-charcoal focus:outline-none focus:border-brand transition-colors resize-none"
                />
              ) : (
                <p className="text-sm text-flint leading-relaxed">{savedBio || "No bio added yet."}</p>
              )}
            </div>

            {editing && (
              <div className="flex gap-3 mt-5">
                <button onClick={cancel} className="flex-1 border border-mist bg-white text-flint py-2.5 rounded-full text-sm font-medium hover:bg-cream transition-colors">
                  Cancel
                </button>
                <button onClick={save} className="flex-1 bg-brand text-ivory py-2.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors">
                  Save changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Values */}
        <div className="bg-white border border-mist rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">Values</h3>
            {navigate && (
              <button onClick={openOnboarding} className="text-xs text-clay hover:underline">Edit</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUser.values.map((v) => (
              <span key={v} className="bg-brand-light text-brand text-sm px-3.5 py-1.5 rounded-full">{v}</span>
            ))}
          </div>
        </div>

        {/* Lifestyle */}
        <div className="bg-white border border-mist rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">Lifestyle</h3>
            {navigate && (
              <button onClick={openOnboarding} className="text-xs text-clay hover:underline">Edit</button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUser.lifestyle.map((l) => (
              <span key={l} className="bg-cream text-flint text-sm px-3.5 py-1.5 rounded-full">{l}</span>
            ))}
          </div>
        </div>

        {/* Communication */}
        <div className="bg-white border border-mist rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">Communication style</h3>
            {navigate && (
              <button onClick={openOnboarding} className="text-xs text-clay hover:underline">Edit</button>
            )}
          </div>
          <div className="space-y-2">
            {currentUser.communicationStyle.map((c) => (
              <div key={c} className="flex items-center gap-2 text-sm text-flint">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-mid" aria-hidden="true" />
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Boundaries */}
        <div className="bg-white border border-mist rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-charcoal">Boundaries I've shared</h3>
            {navigate && (
              <button onClick={openOnboarding} className="text-xs text-clay hover:underline">Edit</button>
            )}
          </div>
          <div className="space-y-2">
            {currentUser.boundaries.map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-flint">
                <div className="w-1.5 h-1.5 rounded-full bg-clay-mid" aria-hidden="true" />
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save toast */}
      {saved && (
        <div role="status" aria-live="polite" className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 bg-charcoal text-ivory text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 z-50">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill="#8FA882"/>
            <path d="M3.5 6l2 2 3-3" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Profile saved
        </div>
      )}
    </div>
  );
}
