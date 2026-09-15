import { useState } from "react";
import type { NavigateFn } from "../types";
import { settingsApi } from "../services/api";

interface SettingsProps {
  navigate: NavigateFn;
  onLogout: () => void;
}

type Dialog = "block" | "report" | "unmatch" | "delete" | null;

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-stone mb-2 px-1">{title}</h2>
  );
}

function SettingRow({
  label,
  description,
  children,
  onClick,
  danger,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-4 ${
        onClick ? "hover:bg-cream transition-colors cursor-pointer" : ""
      }`}
    >
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium ${danger ? "text-danger" : "text-charcoal"}`}>{label}</p>
        {description && <p className="text-xs text-stone mt-0.5">{description}</p>}
      </div>
      {children && <div className="ml-4">{children}</div>}
      {onClick && !children && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </Tag>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? "bg-brand" : "bg-pebble"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SafetyDialog({ type, onClose }: { type: Exclude<Dialog, null>; onClose: () => void }) {
  const configs = {
    block: {
      title: "Block a member",
      body: "Enter the name or profile ID of the member you want to block. They will not be able to see your profile or contact you.",
      action: "Block member",
      actionClass: "bg-danger text-ivory hover:bg-red-700",
      placeholder: "Name or profile ID",
    },
    report: {
      title: "Report a concern",
      body: "We take every report seriously. Describe what happened and we will review it within 24 hours. Your report is confidential.",
      action: "Submit report",
      actionClass: "bg-danger text-ivory hover:bg-red-700",
      placeholder: "Describe what happened…",
    },
    unmatch: {
      title: "Unmatch someone",
      body: "Unmatching removes your connection and conversation permanently. They will not be notified, but you will no longer appear to each other.",
      action: "Unmatch",
      actionClass: "bg-charcoal text-ivory hover:bg-flint",
      placeholder: "Name or profile ID",
    },
    delete: {
      title: "Delete my account",
      body: "This will permanently delete your profile, matches, and conversation history. This cannot be undone. Consider pausing your account instead.",
      action: "Delete my account permanently",
      actionClass: "bg-danger text-ivory hover:bg-red-700",
      placeholder: 'Type "delete" to confirm',
    },
  };

  const config = configs[type];
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Action confirmed"
      >
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A4A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-charcoal mb-2">Done</h3>
          <p className="text-stone text-sm mb-6">Your request has been processed.</p>
          <button onClick={onClose} className="bg-brand text-ivory px-7 py-3 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl rounded-b-none md:rounded-3xl p-6 max-w-md w-full">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-charcoal">{config.title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-stone hover:text-charcoal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p className="text-sm text-stone leading-relaxed mb-5">{config.body}</p>
        {type === "report" ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            rows={4}
            aria-label="Report description"
            className="w-full px-4 py-3 rounded-xl text-sm bg-ivory border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors resize-none mb-4"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={config.placeholder}
            aria-label={config.placeholder}
            className="w-full px-4 py-3 rounded-xl text-sm bg-ivory border border-mist text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors mb-4"
          />
        )}
        {type === "delete" && (
          <div className="bg-danger-light border border-danger/20 rounded-xl p-3 mb-4">
            <p className="text-xs text-danger font-medium">⚠ This action is permanent and cannot be reversed.</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-mist bg-white text-flint py-3 rounded-full text-sm font-medium hover:bg-cream transition-colors">
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!value.trim()) return;
              if (type === "block") {
                await settingsApi.block(value.trim()).catch(() => {});
              } else if (type === "report") {
                await settingsApi.report("user_report", value.trim()).catch(() => {});
              } else if (type === "unmatch") {
                await settingsApi.unmatch(value.trim()).catch(() => {});
              } else if (type === "delete" && value === "delete") {
                await settingsApi.deleteAccount().catch(() => {});
              }
              setSubmitted(true);
            }}
            disabled={!value.trim() || (type === "delete" && value !== "delete")}
            className={`flex-1 py-3 rounded-full text-sm font-medium transition-colors disabled:opacity-40 ${config.actionClass}`}
          >
            {config.action}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings({ navigate, onLogout }: SettingsProps) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notifications, setNotifications] = useState({ matches: true, messages: true, system: false });
  const [privacy, setPrivacy] = useState({ showLastActive: true, showLocation: true });
  const [visibility, setVisibility] = useState(true);
  const [email, setEmail] = useState("alex@example.com");
  const [editingEmail, setEditingEmail] = useState(false);

  return (
    <div className="md:ml-60 min-h-screen bg-ivory pb-24 md:pb-6">
      <div className="bg-white border-b border-mist px-6 py-4">
        <h1 className="font-display text-2xl text-charcoal">Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Account */}
        <section>
          <SectionHeader title="Account" />
          <div className="bg-white border border-mist rounded-2xl overflow-hidden divide-y divide-mist">
            <SettingRow label="Email address" description={editingEmail ? undefined : email}>
              <button onClick={() => setEditingEmail(!editingEmail)} className="text-xs text-clay font-medium">
                {editingEmail ? "Cancel" : "Change"}
              </button>
            </SettingRow>
            {editingEmail && (
              <div className="px-4 py-3 bg-ivory">
                <input type="email" defaultValue={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm bg-white border border-mist text-charcoal focus:outline-none focus:border-brand transition-colors" aria-label="New email address" />
                <button
                  onClick={async () => {
                    await settingsApi.updateAccount({ email }).catch(() => {});
                    setEditingEmail(false);
                  }}
                  className="mt-2 text-xs text-brand font-medium"
                >
                  Save email
                </button>
              </div>
            )}
            <SettingRow label="Change password" description="Last changed 3 months ago" onClick={() => {}} />
            <SettingRow label="Subscription" description="Free plan · Upgrade to Connect" onClick={() => {}} />
            <SettingRow label="Connected accounts">
              <span className="text-xs text-stone">Google</span>
            </SettingRow>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <SectionHeader title="Notifications" />
          <div className="bg-white border border-mist rounded-2xl overflow-hidden divide-y divide-mist">
            <SettingRow label="New matches" description="When someone connects with you back">
              <Toggle
                checked={notifications.matches}
                onChange={(v) => {
                  setNotifications((n) => ({ ...n, matches: v }));
                  settingsApi.updateNotifications({ emailMatches: v }).catch(() => {});
                }}
                label="New match notifications"
              />
            </SettingRow>
            <SettingRow label="New messages" description="When a match sends you a message">
              <Toggle
                checked={notifications.messages}
                onChange={(v) => {
                  setNotifications((n) => ({ ...n, messages: v }));
                  settingsApi.updateNotifications({ emailMessages: v }).catch(() => {});
                }}
                label="New message notifications"
              />
            </SettingRow>
            <SettingRow label="System updates" description="Tips, product news, and announcements">
              <Toggle
                checked={notifications.system}
                onChange={(v) => {
                  setNotifications((n) => ({ ...n, system: v }));
                  settingsApi.updateNotifications({ emailSystem: v }).catch(() => {});
                }}
                label="System notification updates"
              />
            </SettingRow>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <SectionHeader title="Privacy" />
          <div className="bg-white border border-mist rounded-2xl overflow-hidden divide-y divide-mist">
            <SettingRow label="Show last active" description="Others can see when you were last active">
              <Toggle
                checked={privacy.showLastActive}
                onChange={(v) => {
                  setPrivacy((p) => ({ ...p, showLastActive: v }));
                  settingsApi.updatePrivacy({ showLastActive: v }).catch(() => {});
                }}
                label="Show last active status"
              />
            </SettingRow>
            <SettingRow label="Show approximate location" description="City-level location shown on your profile">
              <Toggle
                checked={privacy.showLocation}
                onChange={(v) => {
                  setPrivacy((p) => ({ ...p, showLocation: v }));
                  settingsApi.updatePrivacy({ showApproxLocation: v }).catch(() => {});
                }}
                label="Show approximate location"
              />
            </SettingRow>
            <SettingRow label="Profile visibility" description={visibility ? "Your profile is visible in Discover" : "Your profile is paused — hidden from Discover"}>
              <Toggle
                checked={visibility}
                onChange={(v) => {
                  setVisibility(v);
                  settingsApi.updatePrivacy({ isPaused: !v }).catch(() => {});
                }}
                label="Profile visibility"
              />
            </SettingRow>
            <SettingRow label="Data & privacy" description="Download or manage your data" onClick={() => {}} />
          </div>
        </section>

        {/* Discovery */}
        <section>
          <SectionHeader title="Discovery preferences" />
          <div className="bg-white border border-mist rounded-2xl overflow-hidden divide-y divide-mist">
            <SettingRow label="Age range" description="25 – 45 years" onClick={() => {}} />
            <SettingRow label="Distance" description="Within 50 miles" onClick={() => {}} />
            <SettingRow label="Lifestyle filters" description="alcohol-free, vegan, zero-waste" onClick={() => {}} />
          </div>
        </section>

        {/* Safety */}
        <section>
          <SectionHeader title="Safety" />
          <div className="bg-white border border-mist rounded-2xl overflow-hidden divide-y divide-mist">
            <SettingRow label="Block a member" description="Prevent someone from seeing your profile" onClick={() => setDialog("block")} />
            <SettingRow label="Report a concern" description="Report a member or inappropriate behaviour" onClick={() => setDialog("report")} />
            <SettingRow label="Unmatch someone" description="Remove a mutual connection" onClick={() => setDialog("unmatch")} />
            <SettingRow label="Blocked members" description="3 blocked · Tap to manage" onClick={() => {}} />
            <SettingRow label="View safety guidelines" onClick={() => {}} />
          </div>
        </section>

        {/* Admin */}
        <section>
          <SectionHeader title="Administration" />
          <div className="bg-white border border-mist rounded-2xl overflow-hidden">
            <SettingRow label="Admin dashboard" description="Access platform administration" onClick={() => navigate("admin")} />
          </div>
        </section>

        {/* Danger zone */}
        <section>
          <SectionHeader title="Account actions" />
          <div className="bg-white border border-mist rounded-2xl overflow-hidden divide-y divide-mist">
            <SettingRow label="Pause my account" description="Temporarily hide your profile without losing data" onClick={() => {}} />
            <SettingRow label="Sign out" onClick={onLogout} />
            <SettingRow label="Delete my account" description="Permanently remove your profile and all data" onClick={() => setDialog("delete")} danger />
          </div>
        </section>
      </div>

      {dialog && <SafetyDialog type={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
