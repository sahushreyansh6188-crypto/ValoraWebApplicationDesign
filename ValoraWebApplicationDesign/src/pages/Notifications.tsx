import { useState, useEffect, type ReactElement } from "react";
import type { NavigateFn, Notification } from "../types";
import { notifications as mockNotifications } from "../data/mock";
import { notificationsApi } from "../services/api";

interface NotificationsProps {
  navigate: NavigateFn;
}

const icons: Record<string, ReactElement> = {
  match: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  message: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  system: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

const iconBg: Record<string, string> = {
  match: "bg-clay-light text-clay",
  message: "bg-brand-light text-brand",
  system: "bg-cream text-stone",
};

export default function Notifications({ navigate }: NotificationsProps) {
  const [notifs, setNotifs] = useState<Notification[]>(mockNotifications);

  useEffect(() => {
    let active = true;
    notificationsApi.getAll().then((data) => {
      if (active && data && data.length > 0) {
        setNotifs(data);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const notifications = notifs;
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const handleMarkAll = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationsApi.markRead().catch(() => {});
  };

  return (
    <div className="md:ml-60 min-h-screen bg-ivory pb-24 md:pb-6">
      <div className="bg-white border-b border-mist px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-charcoal">Notifications</h1>
        {unread.length > 0 && (
          <button onClick={handleMarkAll} className="text-xs text-clay font-medium hover:underline">Mark all read</button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-charcoal mb-2">You're all caught up</h2>
            <p className="text-stone text-sm">Notifications about matches and messages will appear here.</p>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-stone mb-3 px-1">New</h2>
                <div className="space-y-2">
                  {unread.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => n.type === "message" ? navigate("messages") : n.type === "match" ? navigate("matches") : undefined}
                      className="w-full flex items-start gap-4 bg-white border border-mist rounded-2xl p-4 text-left hover:shadow-sm transition-shadow"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg[n.type]}`}>
                        {icons[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal">{n.text}</p>
                        <p className="text-xs text-stone mt-0.5">{n.time}</p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-clay mt-1.5 shrink-0" aria-label="Unread" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {read.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-stone mb-3 px-1">Earlier</h2>
                <div className="space-y-2">
                  {read.map((n) => (
                    <div key={n.id} className="flex items-start gap-4 bg-white border border-mist rounded-2xl p-4 opacity-70">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg[n.type]}`}>
                        {icons[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-flint">{n.text}</p>
                        <p className="text-xs text-stone mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
