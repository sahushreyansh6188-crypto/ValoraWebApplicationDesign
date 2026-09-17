import { useState, useEffect } from "react";
import ValoraLogo from "../components/ValoraLogo";
import UndiscoveredAvatar from "../components/UndiscoveredAvatar";
import PhotoImporter from "../components/PhotoImporter";
import { profilesApi } from "../services/api";

interface OnboardingProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 8;

const lifestyleOptions = [
  { id: "alcohol-free", label: "Alcohol-free", emoji: "🌿" },
  { id: "sober", label: "Sober lifestyle", emoji: "✨" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "plant-based", label: "Plant-based", emoji: "🥗" },
  { id: "zero-waste", label: "Zero-waste", emoji: "♻️" },
  { id: "sustainability", label: "Sustainability focused", emoji: "🌍" },
  { id: "outdoor", label: "Outdoor lifestyle", emoji: "🏔️" },
  { id: "homebody", label: "Homebody", emoji: "🏡" },
  { id: "travel", label: "Frequent traveller", emoji: "✈️" },
  { id: "pets", label: "Pet-friendly", emoji: "🐾" },
  { id: "child-free", label: "Child-free", emoji: "🌸" },
  { id: "parent", label: "Parent", emoji: "👶" },
  { id: "mindfulness", label: "Mindfulness practice", emoji: "🧘" },
  { id: "fitness", label: "Fitness focused", emoji: "💪" },
  { id: "arts", label: "Arts & creative", emoji: "🎨" },
];

const valueOptions = [
  { id: "authenticity", label: "Authenticity" },
  { id: "growth", label: "Growth" },
  { id: "community", label: "Community" },
  { id: "creativity", label: "Creativity" },
  { id: "independence", label: "Independence" },
  { id: "security", label: "Security" },
  { id: "adventure", label: "Adventure" },
  { id: "spirituality", label: "Spirituality" },
  { id: "curiosity", label: "Intellectual curiosity" },
  { id: "compassion", label: "Compassion" },
  { id: "loyalty", label: "Loyalty" },
  { id: "humor", label: "Humor" },
  { id: "ambition", label: "Ambition" },
  { id: "simplicity", label: "Simplicity" },
  { id: "justice", label: "Justice" },
];

const commOptions = [
  { id: "direct", label: "Direct communicator", desc: "I say what I mean, clearly and openly." },
  { id: "processing", label: "Needs processing time", desc: "I often need space before I respond." },
  { id: "text-first", label: "Text-first", desc: "I prefer written messages over calls." },
  { id: "calls", label: "Prefers calls", desc: "I'd rather talk than type." },
  { id: "low-phone", label: "Low phone time", desc: "I'm not always reachable — and that's intentional." },
  { id: "long-convos", label: "Loves long conversations", desc: "Give me depth and I'll give you hours." },
  { id: "quality-time", label: "Quality time focused", desc: "How we spend time together matters most." },
  { id: "needs-space", label: "Needs space to recharge", desc: "I'm an introvert, and I honour that." },
];

const boundaryOptions = [
  { id: "slow-dating", label: "Slow-paced dating", desc: "I prefer to build connection gradually." },
  { id: "no-hookups", label: "Not looking for hookups", desc: "I'm here for something meaningful." },
  { id: "lgbtq", label: "LGBTQ+ affirming", desc: "Queer-inclusive space is non-negotiable." },
  { id: "poly-open", label: "Open to polyamory", desc: "I'm exploring or practising ethical non-monogamy." },
  { id: "monogamy", label: "Monogamy only", desc: "I'm looking for an exclusive relationship." },
  { id: "long-distance", label: "Open to long distance", desc: "Location is not a dealbreaker for me." },
  { id: "no-long-distance", label: "Local connections only", desc: "I'd prefer someone within a reasonable distance." },
  { id: "privacy", label: "Privacy focused", desc: "I keep my personal life intentionally private." },
  { id: "religious", label: "Faith is important to me", desc: "Shared or respected spirituality matters." },
];

function MultiSelect({
  options,
  selected,
  onChange,
  min,
  max,
}: {
  options: { id: string; label: string; emoji?: string; desc?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  min?: number;
  max?: number;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (!max || selected.length < max) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5" role="group">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            aria-pressed={active}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm transition-all ${
              active
                ? "bg-brand border-brand text-ivory"
                : "bg-white border-mist text-flint hover:border-brand-mid hover:bg-brand-light"
            }`}
          >
            {opt.emoji && <span aria-hidden="true">{opt.emoji}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CommSelect({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string; desc: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  return (
    <div className="space-y-2.5" role="group">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            aria-pressed={active}
            className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
              active
                ? "bg-brand-light border-brand text-charcoal"
                : "bg-white border-mist text-flint hover:border-brand-mid"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{opt.label}</span>
              {active && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" fill="#2A4A1E"/>
                  <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <p className="text-xs text-stone mt-0.5">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [eligible, setEligible] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [bio, setBio] = useState("");
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [commStyle, setCommStyle] = useState<string[]>([]);
  const [boundaries, setBoundaries] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(45);
  const [distance, setDistance] = useState(50);
  const [photo, setPhoto] = useState("");

  const [isNameLocked, setIsNameLocked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    profilesApi.getMe().then((p) => {
      if (active && p) {
        if (p.name) {
          setName(p.name);
          setIsNameLocked(true);
        }
        if (p.age) setAge(String(p.age));
        if (p.pronouns) setPronouns(p.pronouns);
        if (p.location) setLocation(p.location);
        if (p.occupation) setOccupation(p.occupation);
        if (p.bio) setBio(p.bio);
        if (p.photo) setPhoto(p.photo);
        if (p.lifestyle && p.lifestyle.length > 0) setLifestyle(p.lifestyle);
        if (p.values && p.values.length > 0) setValues(p.values);
        if (p.communicationStyle && p.communicationStyle.length > 0) setCommStyle(p.communicationStyle);
        if (p.boundaries && p.boundaries.length > 0) setBoundaries(p.boundaries);
        setEligible(true);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  const canAdvance = () => {
    if (step === 1) return eligible;
    if (step === 2) return name.trim().length > 0 && age !== "";
    if (step === 3) return lifestyle.length >= 1;
    if (step === 4) return values.length >= 3;
    if (step === 5) return commStyle.length >= 1;
    if (step === 6) return boundaries.length >= 1;
    return true;
  };

  const [submitting, setSubmitting] = useState(false);

  const next = async () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      setSubmitting(true);
      setSubmitError(null);
      try {
        await profilesApi.submitOnboarding({
          name,
          age: Number(age) || 28,
          pronouns: pronouns || "they/them",
          location: location || "Portland, OR",
          occupation: occupation || "Creative",
          bio: bio || "Looking for meaningful, values-aligned connections.",
          photo: photo || "",
          photos: photo ? [photo] : [],
          lifestyle,
          values,
          communicationStyle: commStyle,
          boundaries,
          lookingFor: "Meaningful, intentional relationship",
          ageMin,
          ageMax,
          distanceMax: distance,
        });
        setSubmitting(false);
        window.dispatchEvent(
          new CustomEvent("valora:profile-updated", {
            detail: {
              name,
              age: Number(age) || 28,
              pronouns: pronouns || "they/them",
              location: location || "Portland, OR",
              occupation: occupation || "Creative",
              bio: bio || "Looking for meaningful, values-aligned connections.",
              photo: photo || "",
              photos: photo ? [photo] : [],
              lifestyle,
              values,
              communicationStyle: commStyle,
              boundaries,
            },
          })
        );
        onComplete();
      } catch (err) {
        setSubmitting(false);
        setSubmitError((err as Error)?.message || "Failed to publish profile to database. Please check your answers.");
      }
    }
  };

  const back = () => setStep(Math.max(1, step - 1));

  const stepTitles = [
    "Welcome to Valora",
    "About you",
    "Your lifestyle",
    "Your values",
    "How you communicate",
    "Your boundaries",
    "Who you're open to",
    "Your profile is ready",
  ];

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      {/* Header with progress */}
      <header className="bg-white border-b border-mist px-6 py-4">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <ValoraLogo size="sm" />
            <span className="text-xs text-stone font-medium">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="w-full bg-mist rounded-full h-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
            <div
              className="bg-brand h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto py-10 px-6">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-clay mb-2">
              {step < 4 ? "Profile" : step < 7 ? "Your world" : "Complete"}
            </p>
            <h1 className="font-display text-3xl text-charcoal">{stepTitles[step - 1]}</h1>
          </div>

          {/* Step 1: Welcome + eligibility */}
          {step === 1 && (
            <div className="space-y-8">
              <p className="text-stone leading-relaxed">
                Valora is a values-first platform for adults seeking meaningful relationships.
                Before you begin, please confirm you're 18 or older.
              </p>
              <div className="bg-white border border-mist rounded-2xl p-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={eligible}
                    onChange={(e) => setEligible(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-mist accent-brand"
                  />
                  <span className="text-sm text-flint leading-relaxed">
                    I confirm that I am 18 years of age or older.
                  </span>
                </label>
                <div className="pt-1 border-t border-mist">
                  <p className="text-xs text-stone leading-relaxed">
                    Valora is designed for adults. You do not need to disclose a diagnosis, disability,
                    or medical condition at any stage. Your privacy is respected.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["Intentional connections", "Values-first profiles", "Inclusive by design", "No pressure browsing"].map(f => (
                  <div key={f} className="bg-brand-light rounded-xl px-4 py-3 text-sm text-brand font-medium">{f}</div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Basic info */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-flint mb-1.5" htmlFor="ob-name">
                  What should we call you? <span className="text-danger" aria-hidden="true">*</span>
                  {isNameLocked && (
                    <span className="text-xs text-stone font-normal ml-2">(Immutable registered name)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    id="ob-name"
                    type="text"
                    value={name}
                    onChange={(e) => !isNameLocked && setName(e.target.value)}
                    placeholder="Your name or chosen name"
                    readOnly={isNameLocked}
                    className={`w-full px-4 py-3 rounded-xl text-sm border border-mist text-charcoal placeholder-stone focus:outline-none transition-colors ${
                      isNameLocked
                        ? "bg-pebble/30 cursor-not-allowed text-charcoal font-medium pr-24"
                        : "bg-white focus:border-brand"
                    }`}
                  />
                  {isNameLocked && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone text-xs flex items-center gap-1 bg-white/90 px-2.5 py-1 rounded-full border border-mist">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Permanent
                    </div>
                  )}
                </div>
                {isNameLocked && (
                  <p className="text-[11px] text-stone mt-1.5">Registered names cannot be altered to protect trust and authenticity.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-flint mb-1.5" htmlFor="ob-age">
                    Age <span className="text-danger" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ob-age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    min={18}
                    max={120}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-white border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-flint mb-1.5" htmlFor="ob-pronouns">
                    Pronouns
                  </label>
                  <select
                    id="ob-pronouns"
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm bg-white border border-mist text-charcoal focus:outline-none focus:border-brand transition-colors"
                  >
                    <option value="">Select</option>
                    <option>she/her</option>
                    <option>he/him</option>
                    <option>they/them</option>
                    <option>she/they</option>
                    <option>he/they</option>
                    <option>any/all</option>
                    <option>prefer not to say</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-flint mb-1.5" htmlFor="ob-location">
                  Location
                </label>
                <input
                  id="ob-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, state or region"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-flint mb-1.5" htmlFor="ob-occupation">
                  What do you do?
                </label>
                <input
                  id="ob-occupation"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Occupation or what keeps you busy"
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-flint mb-1.5" htmlFor="ob-bio">
                  A few words about you
                </label>
                <textarea
                  id="ob-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What would you want someone to know about you before a first conversation?"
                  rows={4}
                  maxLength={400}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-white border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors resize-none"
                />
                <p className="text-xs text-stone text-right mt-1">{bio.length}/400</p>
              </div>

              {/* Photo Import in Onboarding */}
              <div className="pt-2 border-t border-mist">
                <label className="block text-sm font-medium text-flint mb-2">
                  Profile Photo <span className="text-stone font-normal">(optional — undiscovered until imported)</span>
                </label>
                <PhotoImporter
                  currentPhoto={photo}
                  name={name}
                  onPhotoUploaded={(newPhoto) => setPhoto(newPhoto)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Lifestyle */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-stone text-sm leading-relaxed">
                Select the lifestyle choices that are part of your life. These help match you with people who share your world — or respect it.
                <span className="block mt-1 text-xs">Choose at least one.</span>
              </p>
              <MultiSelect options={lifestyleOptions} selected={lifestyle} onChange={setLifestyle} min={1} />
            </div>
          )}

          {/* Step 4: Values */}
          {step === 4 && (
            <div className="space-y-6">
              <p className="text-stone text-sm leading-relaxed">
                What matters most to you? Choose 3–8 values that genuinely guide how you live.
                <span className="block mt-1 text-xs">Selected: {values.length}/8</span>
              </p>
              <MultiSelect options={valueOptions} selected={values} onChange={setValues} min={3} max={8} />
            </div>
          )}

          {/* Step 5: Communication */}
          {step === 5 && (
            <div className="space-y-5">
              <p className="text-stone text-sm leading-relaxed">
                How do you naturally communicate? Select all that apply — this helps people understand how to connect with you well.
              </p>
              <CommSelect options={commOptions} selected={commStyle} onChange={setCommStyle} />
            </div>
          )}

          {/* Step 6: Boundaries */}
          {step === 6 && (
            <div className="space-y-5">
              <p className="text-stone text-sm leading-relaxed">
                Boundaries are a form of self-knowledge, not a wall. Select the ones that reflect how you'd like to date.
              </p>
              <CommSelect
                options={boundaryOptions}
                selected={boundaries}
                onChange={setBoundaries}
              />
            </div>
          )}

          {/* Step 7: Discovery preferences */}
          {step === 7 && (
            <div className="space-y-8">
              <p className="text-stone text-sm leading-relaxed">
                Help us understand who you'd like to meet. These are preferences, not rigid filters.
              </p>
              <div>
                <label className="block text-sm font-medium text-flint mb-3">
                  Age range
                </label>
                <div className="bg-white border border-mist rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4 text-sm font-medium text-charcoal">
                    <span>{ageMin} years</span>
                    <span className="text-stone text-xs">to</span>
                    <span>{ageMax} years</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-stone mb-1.5 block">Minimum age</label>
                      <input type="range" min={18} max={ageMax - 1} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))}
                        className="w-full accent-brand" aria-label="Minimum age" />
                    </div>
                    <div>
                      <label className="text-xs text-stone mb-1.5 block">Maximum age</label>
                      <input type="range" min={ageMin + 1} max={80} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))}
                        className="w-full accent-brand" aria-label="Maximum age" />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-flint mb-3">
                  Maximum distance
                </label>
                <div className="bg-white border border-mist rounded-xl p-5">
                  <div className="text-sm font-medium text-charcoal mb-4">
                    Within {distance === 200 ? "200+ miles" : `${distance} miles`}
                  </div>
                  <input type="range" min={10} max={200} step={10} value={distance}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    className="w-full accent-brand" aria-label="Maximum distance in miles" />
                  <div className="flex justify-between text-xs text-stone mt-2">
                    <span>10 mi</span><span>100 mi</span><span>200+ mi</span>
                  </div>
                </div>
              </div>
              <div className="bg-brand-light rounded-xl p-4 text-sm text-brand">
                <span className="font-medium">Open to any connection type?</span>
                <p className="text-xs text-stone mt-1">You can refine these preferences any time from your settings.</p>
              </div>
            </div>
          )}

          {/* Step 8: Complete */}
          {step === 8 && (
            <div className="space-y-6">
              {/* Profile preview */}
              <div className="bg-white border border-mist rounded-2xl overflow-hidden">
                <div className="h-40 bg-cream relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-clay/10" />
                  <div className="absolute bottom-0 left-6 translate-y-1/2">
                    <UndiscoveredAvatar
                      photo={photo}
                      name={name}
                      size="xl"
                      className="border-4 border-white rounded-full bg-white shadow-sm"
                      showBadge={!photo}
                    />
                  </div>
                </div>
                <div className="pt-14 px-6 pb-6">
                  <h3 className="text-lg font-semibold text-charcoal">{name || "Your name"}{age ? `, ${age}` : ""}</h3>
                  {pronouns && <p className="text-sm text-stone">{pronouns}</p>}
                  {location && <p className="text-xs text-stone mt-0.5">📍 {location}</p>}
                  {bio && <p className="text-sm text-flint mt-3 leading-relaxed">{bio}</p>}
                  {values.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {values.slice(0, 5).map((v) => (
                        <span key={v} className="bg-brand-light text-brand text-xs px-3 py-1 rounded-full">{v}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {submitError && (
                <div role="alert" className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-xs text-danger flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 3.5h1.5v5h-1.5v-5zm0 6.5h1.5v1.5h-1.5V11z"/>
                  </svg>
                  <span>{submitError}</span>
                </div>
              )}
              <div className="bg-brand-light rounded-xl p-4">
                <p className="text-sm text-brand font-medium mb-1">Your profile is ready to publish</p>
                <p className="text-xs text-stone">You can edit any of this later from your profile settings. Your profile won't be visible until you publish it.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="bg-white border-t border-mist px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={back}
              className="flex items-center gap-1.5 text-sm text-stone hover:text-charcoal transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Back
            </button>
          ) : <div />}
          <button
            onClick={next}
            disabled={!canAdvance() || submitting}
            className="bg-brand text-ivory px-8 py-3 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Publishing…" : step === TOTAL_STEPS ? "Publish my profile" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
