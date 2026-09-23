import { useState, useEffect, useMemo, type ReactElement } from "react";
import type { ActivityFeedItem, ActivityType, UserProfile } from "../types";
import { discoveryApi } from "../services/api";
import { firebaseService } from "../services/firebase";
import UndiscoveredAvatar from "./UndiscoveredAvatar";

interface ActivityFeedProps {
  onSelectProfile?: (profileId: string) => void;
  currentUser?: UserProfile | null;
  onDirectConnect?: (targetUserId: string, targetName: string) => void;
  className?: string;
  compact?: boolean;
}

export default function ActivityFeed({
  onSelectProfile,
  currentUser,
  onDirectConnect,
  className = "",
  compact = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "match" | "profile" | "values">("all");
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [selectedTag, setSelectedTag] = useState("Mindfulness");
  const [submitting, setSubmitting] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const availableTags = [
    "Mindfulness",
    "Deep Conversations",
    "Environmental Care",
    "Creative Expression",
    "Emotional Growth",
    "Outdoor Living",
    "Slow Living",
  ];

  // Fetch activities from backend and Firestore
  const loadActivities = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [backendItems, firestoreItems] = await Promise.all([
        discoveryApi.getActivityFeed().catch(() => []),
        firebaseService.getActivities(25).catch(() => []),
      ]);

      // Combine and deduplicate
      const map = new Map<string, ActivityFeedItem>();

      // Put firestore items first (freshest live community user shares)
      firestoreItems.forEach((item) => {
        map.set(item.id, item);
      });

      // Overlay backend items (matches, profile updates from database)
      backendItems.forEach((item) => {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      });

      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Seed initial like counts
      const counts: Record<string, number> = {};
      combined.forEach((item) => {
        counts[item.id] = item.likesCount ?? Math.floor(Math.random() * 5) + 1;
      });

      setLikeCounts((prev) => ({ ...counts, ...prev }));
      setActivities(combined);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn("[ActivityFeed] Failed to load activities:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();

    // Subscribe to real-time Firestore activity stream
    const unsubscribe = firebaseService.subscribeActivities((liveItems) => {
      if (liveItems && liveItems.length > 0) {
        setActivities((prev) => {
          const map = new Map<string, ActivityFeedItem>();
          liveItems.forEach((item) => map.set(item.id, item));
          prev.forEach((item) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
      }
    });

    // Refresh every 20 seconds to keep live feed fresh
    const timer = setInterval(() => {
      loadActivities(true);
    }, 20000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  // Filter items
  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return activities;
    if (activeFilter === "match") return activities.filter((a) => a.type === "match" || a.type === "reach_out");
    if (activeFilter === "profile")
      return activities.filter((a) => a.type === "profile_update" || a.type === "photo_update");
    if (activeFilter === "values")
      return activities.filter((a) => a.type === "values_update" || a.type === "prompt_answered");
    return activities;
  }, [activities, activeFilter]);

  const handleToggleLike = (id: string) => {
    const isLiked = likedIds[id];
    setLikedIds((prev) => ({ ...prev, [id]: !isLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + (isLiked ? -1 : 1)),
    }));
  };

  const handleShareReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim()) return;

    setSubmitting(true);
    const authorName = currentUser?.name || "Intentional Member";
    const authorPhoto = currentUser?.photo || "";
    const authorId = currentUser?.id || "usr_current";

    const newActivity: Omit<ActivityFeedItem, "id"> = {
      type: "values_update",
      actorId: authorId,
      actorName: authorName,
      actorPhoto: authorPhoto,
      actorLocation: currentUser?.location || "Valora Community",
      title: `${authorName} shared a values reflection`,
      description: `"${reflectionText.trim()}"`,
      tags: [selectedTag, ...(currentUser?.values?.slice(0, 1) || [])],
      timestamp: new Date().toISOString(),
      likesCount: 1,
    };

    try {
      const createdId = await firebaseService.publishActivity(newActivity);
      const fullItem: ActivityFeedItem = { ...newActivity, id: createdId };

      setActivities((prev) => [fullItem, ...prev]);
      setLikeCounts((prev) => ({ ...prev, [createdId]: 1 }));
      setLikedIds((prev) => ({ ...prev, [createdId]: true }));
      setReflectionText("");
      setShowShareModal(false);
    } catch (err) {
      console.warn("Could not publish reflection:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (iso: string): string => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  const renderActivityBadge = (type: ActivityType): ReactElement => {
    switch (type) {
      case "match":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-clay bg-clay-light/80 px-2 py-0.5 rounded-full border border-clay/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            New Match
          </span>
        );
      case "values_update":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand bg-brand-light/70 px-2 py-0.5 rounded-full border border-brand/20">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Values Refreshed
          </span>
        );
      case "prompt_answered":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-charcoal bg-sand/70 px-2 py-0.5 rounded-full border border-sand">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Boundary Prompt
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone bg-cream px-2 py-0.5 rounded-full border border-mist">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile Update
          </span>
        );
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-mist shadow-xs overflow-hidden ${className}`}>
      {/* Feed Header */}
      <div className="p-5 border-b border-mist bg-gradient-to-r from-ivory via-white to-cream/30">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-light/80 text-brand flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-lg text-charcoal flex items-center gap-2">
                Community Activity
                <span className="flex items-center gap-1 text-[10px] font-medium text-brand bg-brand-light px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
                  Live
                </span>
              </h2>
              <p className="text-xs text-stone">
                Recent matches, values updates, and member reflections across Valora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="text-xs bg-brand text-ivory px-3 py-1.5 rounded-full font-medium hover:bg-brand-hover transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Share Reflection
            </button>

            <button
              onClick={() => loadActivities(true)}
              disabled={refreshing}
              className="text-xs text-stone hover:text-charcoal p-1.5 rounded-full border border-mist bg-white transition-colors"
              title="Refresh activity feed"
              aria-label="Refresh activity feed"
            >
              <svg
                width="14"
                height="14"
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
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist">
          {[
            { id: "all", label: "All Activity" },
            { id: "match", label: "New Matches" },
            { id: "profile", label: "Profile Updates" },
            { id: "values", label: "Values & Reflections" },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeFilter === tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors font-medium ${
                activeFilter === tab.id
                  ? "bg-charcoal text-white shadow-xs"
                  : "bg-cream/60 text-stone hover:text-charcoal hover:bg-cream"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Share Reflection Modal / Inset Drawer */}
      {showShareModal && (
        <div className="p-4 bg-brand-light/30 border-b border-brand/20 transition-all">
          <form onSubmit={handleShareReflection} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Post an Intentional Reflection
              </span>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-xs text-stone hover:text-charcoal"
              >
                Cancel
              </button>
            </div>
            <textarea
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="What core value, relationship intention, or daily mindfulness practice are you cultivating right now?"
              rows={2}
              className="w-full text-xs text-charcoal bg-white border border-mist rounded-xl p-3 focus:outline-none focus:border-brand placeholder:text-stone/60 resize-none"
              maxLength={240}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="text-[11px] text-stone">Tag:</span>
                {availableTags.slice(0, 4).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`text-[11px] px-2 py-0.5 rounded-full transition-colors ${
                      selectedTag === tag
                        ? "bg-brand text-ivory font-medium"
                        : "bg-white text-stone border border-mist hover:bg-cream"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={submitting || !reflectionText.trim()}
                className="text-xs bg-brand text-ivory px-4 py-1.5 rounded-full font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors shadow-xs"
              >
                {submitting ? "Sharing..." : "Post to Community"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activity List */}
      <div className="divide-y divide-mist">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-stone">Loading recent community actions...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-cream mx-auto flex items-center justify-center text-stone mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-charcoal">No activity in this filter yet</h3>
            <p className="text-xs text-stone mt-1 max-w-sm mx-auto">
              New matches and profile updates will show up here in real time as intentional connections occur.
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isMatch = act.type === "match";
            const isLiked = likedIds[act.id];
            const currentLikes = likeCounts[act.id] ?? act.likesCount ?? 0;

            return (
              <article
                key={act.id}
                className="p-4 sm:p-5 hover:bg-ivory/50 transition-colors group relative"
              >
                <div className="flex items-start gap-3.5">
                  {/* Avatar section: dual avatar if match, single avatar otherwise */}
                  {isMatch ? (
                    <div className="relative flex-shrink-0 w-12 h-12 flex items-center justify-center">
                      <div
                        className="absolute left-0 top-0 cursor-pointer transition-transform group-hover:scale-105"
                        onClick={() => act.actorId && onSelectProfile?.(act.actorId)}
                        title={`View ${act.actorName}'s profile`}
                      >
                        <UndiscoveredAvatar photo={act.actorPhoto} name={act.actorName} size="sm" />
                      </div>
                      <div
                        className="absolute right-0 bottom-0 cursor-pointer transition-transform group-hover:scale-105 z-10"
                        onClick={() => act.targetId && onSelectProfile?.(act.targetId)}
                        title={`View ${act.targetName}'s profile`}
                      >
                        <UndiscoveredAvatar photo={act.targetPhoto} name={act.targetName} size="sm" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer transition-transform group-hover:scale-105 flex-shrink-0"
                      onClick={() => act.actorId && onSelectProfile?.(act.actorId)}
                      title={`View ${act.actorName}'s profile`}
                    >
                      <UndiscoveredAvatar photo={act.actorPhoto} name={act.actorName} size="md" />
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderActivityBadge(act.type)}

                        {/* Relative Timestamp */}
                        <span className="text-[11px] text-stone flex items-center gap-1">
                          <span>·</span>
                          {formatTime(act.timestamp)}
                        </span>
                      </div>

                      {/* Compatibility Badge if available */}
                      {act.compatibilityScore && (
                        <span className="text-[11px] font-semibold text-brand bg-brand-light/80 px-2 py-0.5 rounded-full">
                          {act.compatibilityScore}% aligned
                        </span>
                      )}
                    </div>

                    {/* Headline / Title */}
                    <div className="text-sm font-semibold text-charcoal leading-snug">
                      {isMatch ? (
                        <span>
                          <button
                            onClick={() => act.actorId && onSelectProfile?.(act.actorId)}
                            className="hover:underline hover:text-brand font-semibold text-charcoal text-left"
                          >
                            {act.actorName}
                          </button>{" "}
                          &{" "}
                          <button
                            onClick={() => act.targetId && onSelectProfile?.(act.targetId)}
                            className="hover:underline hover:text-brand font-semibold text-charcoal text-left"
                          >
                            {act.targetName}
                          </button>{" "}
                          matched
                        </span>
                      ) : (
                        <button
                          onClick={() => act.actorId && onSelectProfile?.(act.actorId)}
                          className="hover:underline hover:text-brand font-semibold text-charcoal text-left"
                        >
                          {act.title}
                        </button>
                      )}
                    </div>

                    {/* Location or Pronouns Subtitle */}
                    {(act.actorLocation || act.targetLocation) && (
                      <p className="text-[11px] text-stone mt-0.5 flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {act.actorLocation}
                        {isMatch && act.targetLocation && act.targetLocation !== act.actorLocation
                          ? ` · ${act.targetLocation}`
                          : ""}
                      </p>
                    )}

                    {/* Description or Quote Excerpt */}
                    {act.description && (
                      <p className="text-xs text-flint mt-1.5 leading-relaxed bg-ivory/60 p-2.5 rounded-xl border border-mist/60">
                        {act.description}
                      </p>
                    )}

                    {/* Tags / Highlighted Values */}
                    {act.tags && act.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {act.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-medium bg-cream text-charcoal/80 px-2 py-0.5 rounded-md border border-mist/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-mist/40">
                      <div className="flex items-center gap-3">
                        {/* Cheer / Send Warmth Button */}
                        <button
                          onClick={() => handleToggleLike(act.id)}
                          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
                            isLiked
                              ? "bg-clay-light text-clay font-semibold"
                              : "text-stone hover:text-clay hover:bg-clay-light/50"
                          }`}
                          aria-label={`Send warmth to this update (${currentLikes} cheers)`}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill={isLiked ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="2"
                            className={isLiked ? "scale-110" : ""}
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span>{currentLikes}</span>
                          <span className="hidden sm:inline">{isLiked ? "Warmth sent" : "Cheer"}</span>
                        </button>

                        {/* View Profile Action */}
                        <button
                          onClick={() => act.actorId && onSelectProfile?.(act.actorId)}
                          className="text-xs text-stone hover:text-brand font-medium flex items-center gap-1 transition-colors"
                        >
                          <span>View profile</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Direct Connect option if it's a single profile update and not the current user */}
                      {!isMatch && act.actorId && act.actorId !== currentUser?.id && onDirectConnect && (
                        <button
                          onClick={() => onDirectConnect(act.actorId, act.actorName)}
                          className="text-[11px] text-brand hover:text-ivory hover:bg-brand bg-brand-light/70 font-medium px-2.5 py-1 rounded-full border border-brand/20 transition-colors"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Feed Footer */}
      <div className="p-3 bg-cream/40 border-t border-mist text-center">
        <span className="text-[11px] text-stone">
          Live feed automatically updates with intentional connections · Last refreshed at{" "}
          {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
