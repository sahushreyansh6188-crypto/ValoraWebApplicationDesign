import { useState, useEffect } from "react";
import type { NavigateFn, UserProfile } from "../types";
import { matches as mockMatches } from "../data/mock";
import { discoveryApi } from "../services/api";

interface MatchesProps {
  navigate: NavigateFn;
}

export default function Matches({ navigate }: MatchesProps) {
  const [matchList, setMatchList] = useState<UserProfile[]>(mockMatches);

  useEffect(() => {
    let active = true;
    discoveryApi.getMatches().then((data) => {
      if (active && data && data.length > 0) {
        setMatchList(data);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const matches = matchList;
  if (matches.length === 0) {
    return (
      <div className="md:ml-60 min-h-screen bg-ivory flex items-center justify-center p-6 pb-24 md:pb-6">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h2 className="font-display text-2xl text-charcoal mb-3">No matches yet</h2>
          <p className="text-stone text-sm leading-relaxed mb-6">
            When someone connects with you and you connect back, they'll appear here. Try reaching out to a few people in Discover.
          </p>
          <button
            onClick={() => navigate("discover")}
            className="bg-brand text-ivory px-7 py-3 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors"
          >
            Go to Discover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="md:ml-60 min-h-screen bg-ivory">
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-sm border-b border-mist px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-charcoal">Matches</h1>
          <span className="text-xs text-stone">{matches.length} mutual connections</span>
        </div>
      </div>

      <div className="p-6 pb-24 md:pb-6">
        {/* New matches banner */}
        <div className="bg-brand-light border border-brand/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 bg-brand/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2A4A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#2A4A1E"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-brand">You have {matches.length} mutual connections</p>
            <p className="text-xs text-stone mt-0.5">A mutual connection happens when both of you have reached out. Start a conversation.</p>
          </div>
        </div>

        {/* Match grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map((match) => (
            <article
              key={match.id}
              className="bg-white rounded-2xl border border-mist overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Photo */}
              <div className="relative h-56 bg-cream">
                <img
                  src={match.photo}
                  alt={`${match.name}, ${match.age}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-semibold text-base">{match.name}, {match.age}</h3>
                  <p className="text-xs text-white/75">{match.pronouns}</p>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-semibold text-brand">
                  {match.compatibilityScore}%
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {match.values.slice(0, 3).map((v) => (
                    <span key={v} className="bg-cream text-flint text-xs px-2.5 py-0.5 rounded-full">{v}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate("messages")}
                    className="flex-1 bg-brand text-ivory py-2.5 rounded-full text-xs font-medium hover:bg-brand-hover transition-colors"
                  >
                    Send message
                  </button>
                  <button className="border border-mist bg-white rounded-full px-3 py-2.5 hover:bg-cream transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="View profile">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Safety note */}
        <div className="mt-8 bg-white border border-mist rounded-xl p-4 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A82" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div>
            <p className="text-xs font-medium text-flint">Your safety matters</p>
            <p className="text-xs text-stone mt-0.5">You can block or report any connection at any time. Visit Settings → Safety for more options.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
