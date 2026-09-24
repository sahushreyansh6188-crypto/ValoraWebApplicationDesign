import { useState, useRef, useEffect } from "react";
import type { NavigateFn, AuthMode, UserProfile } from "../types";
import ValoraLogo from "../components/ValoraLogo";
import { authApi, tokenStorage } from "../services/api";
import { firebaseService } from "../services/firebase";

interface AuthProps {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  navigate: NavigateFn;
  onLogin: () => void;
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p role="alert" className="text-danger text-xs mt-1.5 flex items-center gap-1">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 3.5h1.5v5h-1.5v-5zm0 6.5h1.5v1.5h-1.5V11z"/>
      </svg>
      {msg}
    </p>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-flint mb-1.5">
      {children}
      {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}

function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  id,
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  id?: string;
}) {
  return (
    <div>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-4 py-3 rounded-xl text-sm bg-white border ${
          error ? "border-danger" : "border-mist"
        } text-charcoal placeholder-stone focus:outline-none focus:border-brand transition-colors`}
      />
      {error && <FieldError msg={error} />}
    </div>
  );
}

/* ─── Google Account Selection Dialog (Matching Chrome OAuth Chooser Window) ─── */
function GoogleAccountChooserModal({
  isOpen,
  onConfirm,
  onClose,
  loading,
}: {
  isOpen: boolean;
  onConfirm: (email: string, name?: string, photo?: string) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [customError, setCustomError] = useState("");

  if (!isOpen) return null;

  const accounts = [
    {
      name: "USER",
      email: "user@valora.internal",
      avatarUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&auto=format&fit=crop&q=80",
    },
    {
      name: "Dude Member",
      email: "dude.5796.3223@gmail.com",
      avatarUrl: "",
      initial: "D",
    },
  ];

  const handleSelectAccount = async (acc: { email: string; name: string; avatarUrl?: string }) => {
    await onConfirm(acc.email, acc.name, acc.avatarUrl);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !/\S+@\S+\.\S+/.test(customEmail.trim())) {
      setCustomError("Enter a valid Google Account email");
      return;
    }
    setCustomError("");
    await onConfirm(customEmail.trim(), customName.trim() || undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-chooser-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[440px] bg-[#202124] text-[#e8eaed] rounded-2xl border border-[#3c4043] shadow-2xl overflow-hidden font-sans select-none animate-in zoom-in-95 duration-200">
        {/* Chrome OS / Windows Chrome Title Bar */}
        <div className="h-10 bg-[#202124] border-b border-[#35363a] flex items-center justify-between px-3.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Chrome Icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#34A853" />
              <path d="M12 2C6.48 2 2 6.48 2 12h10l5-8.66A9.956 9.956 0 0 0 12 2z" fill="#EA4335" />
              <path d="M22 12c0 5.52-4.48 10-10 10l5-8.66h5c0-0.45-.03-.89-.08-1.34H22z" fill="#FBBC05" />
              <circle cx="12" cy="12" r="4" fill="#ffffff" />
              <circle cx="12" cy="12" r="3.2" fill="#4285F4" />
            </svg>
            <span className="text-[11px] text-[#9aa0a6] font-medium truncate max-w-[280px]">
              Sign in – Google accounts - Google Chrome
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              className="text-[#9aa0a6] hover:bg-[#35363a] px-2 py-0.5 text-xs rounded transition-colors"
              title="Minimize"
            >
              —
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="text-[#9aa0a6] hover:bg-[#35363a] px-2 py-0.5 text-xs rounded transition-colors"
              title="Maximize"
            >
              □
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-[#9aa0a6] hover:bg-[#e81123] hover:text-white px-2.5 py-0.5 text-xs rounded transition-colors"
              title="Close window"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Chrome Address Bar */}
        <div className="px-3.5 py-2 bg-[#202124] border-b border-[#35363a]">
          <div className="bg-[#292a2d] text-[#9aa0a6] rounded-full px-3.5 py-1.5 flex items-center gap-2 text-[11px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden="true">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span className="truncate font-mono">
              accounts.google.com/v3/signin/accountchooser?as=Adzgn1lKVNdzqJ7HXxSSOtFd-In...
            </span>
          </div>
        </div>

        {/* Google OAuth Page Content */}
        <div className="px-7 sm:px-8 py-6 space-y-5 bg-[#202124]">
          {/* Brand header */}
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-medium text-[#e8eaed]">Sign in with Google</span>
          </div>

          {/* Valora Target App Icon & Title */}
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1b382b] to-[#12261d] border border-[#2e5944] flex items-center justify-center text-ivory font-serif font-bold text-base shadow-sm mb-3">
              V
            </div>
            <h2 id="google-chooser-title" className="text-2xl text-[#e8eaed] font-normal tracking-tight">
              Choose an account
            </h2>
            <p className="text-xs text-[#9aa0a6]">
              to continue to <span className="text-[#8ab4f8] font-medium">Valora</span>
            </p>
          </div>

          {/* Accounts List */}
          {!customMode ? (
            <div className="space-y-1">
              {accounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc)}
                  disabled={loading}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#28292c] transition-colors text-left group cursor-pointer border border-transparent hover:border-[#3c4043] disabled:opacity-60"
                >
                  {acc.avatarUrl ? (
                    <img
                      src={acc.avatarUrl}
                      alt={acc.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-800 text-ivory flex items-center justify-center font-medium text-sm shrink-0 ring-1 ring-white/10">
                      {acc.initial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#e8eaed] truncate group-hover:text-white">
                      {acc.name}
                    </div>
                    <div className="text-xs text-[#9aa0a6] truncate">{acc.email}</div>
                  </div>
                </button>
              ))}

              <div className="border-t border-[#3c4043] my-1" />

              {/* Use another account option */}
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                disabled={loading}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#28292c] transition-colors text-left group cursor-pointer border border-transparent hover:border-[#3c4043] disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-full border border-[#5f6368] flex items-center justify-center text-[#9aa0a6] shrink-0 group-hover:border-[#8ab4f8] group-hover:text-[#8ab4f8] transition-colors">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                </div>
                <div className="text-sm font-medium text-[#e8eaed] group-hover:text-white">
                  Use another account
                </div>
              </button>

              <div className="border-t border-[#3c4043] my-1" />
            </div>
          ) : (
            /* Custom account entry */
            <form onSubmit={handleCustomSubmit} className="space-y-3 pt-1">
              {customError && <p className="text-xs text-[#f28b82]">{customError}</p>}
              <div>
                <label className="block text-xs text-[#9aa0a6] mb-1">Email or phone</label>
                <input
                  type="email"
                  placeholder="Enter your Google email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-[#202124] border border-[#5f6368] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaed] placeholder-[#80868b] focus:border-[#8ab4f8] focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-[#9aa0a6] mb-1">Name (optional)</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#202124] border border-[#5f6368] rounded-lg px-3.5 py-2.5 text-sm text-[#e8eaed] placeholder-[#80868b] focus:border-[#8ab4f8] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="text-xs text-[#8ab4f8] hover:underline"
                >
                  Back to account list
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#202124] font-medium text-xs px-5 py-2 rounded-full transition-colors disabled:opacity-60"
                >
                  {loading ? "Authenticating…" : "Next"}
                </button>
              </div>
            </form>
          )}

          {/* Legal / Policy Note */}
          <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
            Before using this app, you can review Valora's{" "}
            <button
              type="button"
              onClick={() => window.open("/privacy", "_blank")}
              className="text-[#8ab4f8] hover:underline"
            >
              Privacy Policy
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => window.open("/terms", "_blank")}
              className="text-[#8ab4f8] hover:underline"
            >
              Terms of Service
            </button>
            .
          </p>

          {/* Window Footer Links */}
          <div className="pt-3 border-t border-[#303134] flex items-center justify-between text-[11px] text-[#9aa0a6]">
            <span className="cursor-pointer hover:text-[#e8eaed]">English (United Kingdom) ▾</span>
            <div className="flex gap-3">
              <span className="cursor-pointer hover:text-[#e8eaed]">Help</span>
              <span className="cursor-pointer hover:text-[#e8eaed]">Privacy</span>
              <span className="cursor-pointer hover:text-[#e8eaed]">Terms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Facebook OAuth Selection Dialog (Matching Meta OAuth Window) ─── */
function FacebookOAuthModal({
  isOpen,
  onConfirm,
  onClose,
  loading,
}: {
  isOpen: boolean;
  onConfirm: (email: string, name?: string, photo?: string) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [fbEmail, setFbEmail] = useState("");
  const [fbName, setFbName] = useState("");
  const [fbError, setFbError] = useState("");

  if (!isOpen) return null;

  const handleSelectPrimary = async (email: string, name: string) => {
    await onConfirm(
      email,
      name,
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&auto=format&fit=crop&q=80"
    );
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbEmail || !/\S+@\S+\.\S+/.test(fbEmail.trim())) {
      setFbError("Please enter a valid Facebook account email");
      return;
    }
    setFbError("");
    await onConfirm(fbEmail.trim(), fbName.trim() || undefined);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fb-oauth-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[440px] bg-[#1c1e21] text-[#e4e6eb] rounded-2xl border border-[#393a3b] shadow-2xl overflow-hidden font-sans select-none animate-in zoom-in-95 duration-200">
        {/* Title Bar */}
        <div className="h-10 bg-[#1c1e21] border-b border-[#2d2f31] flex items-center justify-between px-3.5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Facebook favicon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2" className="shrink-0" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-[11px] text-[#b0b3b8] font-medium truncate max-w-[280px]">
              Log in with Facebook - Google Chrome
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              className="text-[#b0b3b8] hover:bg-[#2d2f31] px-2 py-0.5 text-xs rounded transition-colors"
              title="Minimize"
            >
              —
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="text-[#b0b3b8] hover:bg-[#2d2f31] px-2 py-0.5 text-xs rounded transition-colors"
              title="Maximize"
            >
              □
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-[#b0b3b8] hover:bg-[#e81123] hover:text-white px-2.5 py-0.5 text-xs rounded transition-colors"
              title="Close window"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Address Bar */}
        <div className="px-3.5 py-2 bg-[#1c1e21] border-b border-[#2d2f31]">
          <div className="bg-[#242526] text-[#b0b3b8] rounded-full px-3.5 py-1.5 flex items-center gap-2 text-[11px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden="true">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span className="truncate font-mono">
              www.facebook.com/v18.0/dialog/oauth?client_id=valora_meta_auth&response_type=token...
            </span>
          </div>
        </div>

        {/* Facebook Content */}
        <div className="px-7 sm:px-8 py-6 space-y-5 bg-[#1c1e21]">
          {/* Header */}
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="text-base font-bold text-[#1877F2]">facebook</span>
          </div>

          {/* App Info Card */}
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1b382b] to-[#12261d] border border-[#2e5944] flex items-center justify-center text-ivory font-serif font-bold text-base shadow-sm mb-2">
              V
            </div>
            <h2 id="fb-oauth-title" className="text-xl font-semibold text-[#e4e6eb] leading-snug">
              Log into your Facebook account to connect with Valora
            </h2>
            <p className="text-xs text-[#b0b3b8]">
              Valora will receive your name, profile picture, and email address.
            </p>
          </div>

          {!customMode ? (
            <div className="space-y-2.5">
              {/* Primary Facebook Action */}
              <button
                type="button"
                onClick={() => handleSelectPrimary("user@valora.internal", "USER")}
                disabled={loading}
                className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white p-3.5 rounded-xl flex items-center justify-between font-medium text-sm transition-colors shadow-xs group cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <img
                    src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&auto=format&fit=crop&q=80"
                    alt="USER"
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-white/30"
                  />
                  <span>Continue as USER</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              {/* Secondary Facebook Account */}
              <button
                type="button"
                onClick={() => handleSelectPrimary("dude.5796.3223@gmail.com", "Dude Member")}
                disabled={loading}
                className="w-full bg-[#242526] hover:bg-[#303031] text-[#e4e6eb] p-3 rounded-xl flex items-center justify-between text-xs font-medium transition-colors border border-[#393a3b] cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-ivory flex items-center justify-center text-xs font-medium">
                    D
                  </div>
                  <span>Continue as Dude (dude.5796.3223@gmail.com)</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              {/* Log in with another account */}
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                disabled={loading}
                className="w-full text-center text-xs text-[#4599ff] hover:underline pt-2 font-medium"
              >
                Log into another Facebook account
              </button>
            </div>
          ) : (
            /* Custom Facebook Account Form */
            <form onSubmit={handleCustomSubmit} className="space-y-3 pt-1">
              {fbError && <p className="text-xs text-[#f28b82]">{fbError}</p>}
              <div>
                <label className="block text-xs text-[#b0b3b8] mb-1">Mobile number or email</label>
                <input
                  type="email"
                  placeholder="Enter your Facebook email"
                  value={fbEmail}
                  onChange={(e) => setFbEmail(e.target.value)}
                  className="w-full bg-[#242526] border border-[#393a3b] rounded-lg px-3.5 py-2.5 text-sm text-[#e4e6eb] placeholder-[#80868b] focus:border-[#1877F2] focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-[#b0b3b8] mb-1">Facebook Name (optional)</label>
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={fbName}
                  onChange={(e) => setFbName(e.target.value)}
                  className="w-full bg-[#242526] border border-[#393a3b] rounded-lg px-3.5 py-2.5 text-sm text-[#e4e6eb] placeholder-[#80868b] focus:border-[#1877F2] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="text-xs text-[#4599ff] hover:underline"
                >
                  Back to accounts
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium text-xs px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
                >
                  {loading ? "Logging in…" : "Log In"}
                </button>
              </div>
            </form>
          )}

          {/* Privacy Note */}
          <div className="p-3 bg-[#242526] rounded-xl border border-[#303134] text-[11px] text-[#b0b3b8] space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-[#e4e6eb]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
              Your privacy is protected
            </p>
            <p className="leading-relaxed">
              This does not allow Valora to post to Facebook without your permission.
            </p>
          </div>

          {/* Actions & Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2d2f31]">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#b0b3b8] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <span className="text-[11px] text-[#b0b3b8]">Meta © 2026 · Privacy · Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Login ─── */
function LoginForm({
  onLogin,
  switchTo,
  onInitiateOtp,
}: {
  onLogin: () => void;
  switchTo: (m: AuthMode) => void;
  onInitiateOtp: (params: {
    email: string;
    purpose: "login";
    password?: string;
    devOtp?: string;
  }) => void;
}) {
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showFacebookModal, setShowFacebookModal] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (authMethod === "password" && !password) e.password = "Password is required";
    return e;
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      tokenStorage.initDummyAccount("USER (Google)", email || "dude.5796.3223@gmail.com");
      onLogin();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setFacebookLoading(true);
    try {
      tokenStorage.initDummyAccount("USER (Facebook)", email || "dude.5796.3223@gmail.com");
      onLogin();
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleConfirmGoogleAccount = async (chosenEmail: string, chosenName?: string) => {
    setGoogleLoading(true);
    try {
      tokenStorage.initDummyAccount(chosenName || "USER", chosenEmail || "dude.5796.3223@gmail.com");
      setShowGoogleModal(false);
      onLogin();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleConfirmFacebookAccount = async (chosenEmail: string, chosenName?: string) => {
    setFacebookLoading(true);
    try {
      tokenStorage.initDummyAccount(chosenName || "USER", chosenEmail || "dude.5796.3223@gmail.com");
      setShowFacebookModal(false);
      onLogin();
    } finally {
      setFacebookLoading(false);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    try {
      // Instant Dummy Account creation & enter website
      tokenStorage.initDummyAccount(undefined, email || "dude.5796.3223@gmail.com");
      onLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sign-in Method Tabs */}
      <div className="grid grid-cols-2 p-1 bg-sand/60 rounded-xl border border-mist text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setAuthMethod("password");
            setErrors({});
          }}
          className={`py-2 rounded-lg transition-all text-center ${
            authMethod === "password"
              ? "bg-white text-charcoal shadow-xs font-semibold"
              : "text-stone hover:text-charcoal"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMethod("otp");
            setErrors({});
          }}
          className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
            authMethod === "otp"
              ? "bg-white text-charcoal shadow-xs font-semibold"
              : "text-stone hover:text-charcoal"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          One-Time Code (OTP)
        </button>
      </div>

      <form onSubmit={submit} noValidate className="space-y-4" aria-label="Sign in form">
        {errors.form && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-xs text-danger">
            {errors.form}
          </div>
        )}

        <div>
          <Label required>Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            error={errors.email}
            autoComplete="email"
          />
        </div>

        {authMethod === "password" ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label required>Password</Label>
              <button
                type="button"
                onClick={() => switchTo("reset")}
                className="text-xs text-clay hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              error={errors.password}
              autoComplete="current-password"
            />

            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requireTwoFactor}
                  onChange={(e) => setRequireTwoFactor(e.target.checked)}
                  className="w-4 h-4 rounded border-mist accent-brand"
                />
                <span className="text-xs text-stone">
                  Verify with 2-step OTP code after password
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="bg-brand/5 border border-brand/15 rounded-xl p-3 text-xs text-charcoal">
            <div className="flex items-center gap-2 font-medium text-brand mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Passwordless OTP Sign-in
            </div>
            <p className="text-stone text-[11px] leading-relaxed">
              We'll send a 6-digit one-time passcode to your email. Enter it on the next screen to sign in instantly.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-ivory py-3.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-60 shadow-xs"
        >
          {loading
            ? authMethod === "otp"
              ? "Sending verification code…"
              : "Signing in…"
            : authMethod === "otp"
            ? "Send verification code"
            : requireTwoFactor
            ? "Continue with 2-Step OTP"
            : "Sign in"}
        </button>

        <p className="text-center text-sm text-stone">
          No account?{" "}
          <button
            type="button"
            onClick={() => switchTo("signup")}
            className="text-brand font-medium hover:underline"
          >
            Create one
          </button>
        </p>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-mist" />
          </div>
          <span className="relative bg-white px-3 text-xs text-stone mx-auto flex justify-center">
            or sign in with
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full border border-mist bg-white py-3 rounded-full text-sm text-flint font-medium flex items-center justify-center gap-2 hover:bg-cream transition-colors disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? "Connecting with Google…" : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={handleFacebookSignIn}
          disabled={facebookLoading}
          className="w-full border border-mist bg-white py-3 rounded-full text-sm text-flint font-medium flex items-center justify-center gap-2 hover:bg-cream transition-colors disabled:opacity-60 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {facebookLoading ? "Connecting with Facebook…" : "Continue with Facebook"}
        </button>
      </form>

      <GoogleAccountChooserModal
        isOpen={showGoogleModal}
        onConfirm={handleConfirmGoogleAccount}
        onClose={() => setShowGoogleModal(false)}
        loading={googleLoading}
      />

      <FacebookOAuthModal
        isOpen={showFacebookModal}
        onConfirm={handleConfirmFacebookAccount}
        onClose={() => setShowFacebookModal(false)}
        loading={facebookLoading}
      />
    </div>
  );
}

/* ─── Sign Up ─── */
function SignUpForm({
  onLogin,
  switchTo,
  onInitiateOtp,
}: {
  onLogin: () => void;
  switchTo: (m: AuthMode) => void;
  onInitiateOtp: (params: {
    email: string;
    purpose: "signup";
    name: string;
    password: string;
    devOtp?: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [confirmedImmutable, setConfirmedImmutable] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [showFacebookModal, setShowFacebookModal] = useState(false);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      tokenStorage.initDummyAccount(name.trim() || "USER (Google)", email.trim() || "dude.5796.3223@gmail.com");
      onLogin();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignUp = async () => {
    setFacebookLoading(true);
    try {
      tokenStorage.initDummyAccount(name.trim() || "USER (Facebook)", email.trim() || "dude.5796.3223@gmail.com");
      onLogin();
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleConfirmGoogleAccount = async (chosenEmail: string, chosenName?: string) => {
    setGoogleLoading(true);
    try {
      tokenStorage.initDummyAccount(chosenName || name.trim() || "USER", chosenEmail || "dude.5796.3223@gmail.com");
      setShowGoogleModal(false);
      onLogin();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleConfirmFacebookAccount = async (chosenEmail: string, chosenName?: string) => {
    setFacebookLoading(true);
    try {
      tokenStorage.initDummyAccount(chosenName || name.trim() || "USER", chosenEmail || "dude.5796.3223@gmail.com");
      setShowFacebookModal(false);
      onLogin();
    } finally {
      setFacebookLoading(false);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    try {
      tokenStorage.initDummyAccount(name.trim() || "USER", email.trim() || "dude.5796.3223@gmail.com");
      onLogin();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-4" aria-label="Create account form">
      {errors.form && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-xs text-danger">
          {errors.form}
        </div>
      )}
      <div>
        <Label required>Your name</Label>
        <Input id="name" placeholder="How you'd like to be called" value={name} onChange={setName} error={errors.name} autoComplete="name" />
      </div>
      <div>
        <Label required>Email</Label>
        <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
      </div>
      <div>
        <Label required>Create a password</Label>
        <Input id="signup-password" type="password" placeholder="At least 8 characters" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" />
      </div>
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-describedby={errors.agreed ? "agreed-error" : undefined}
            className="mt-0.5 w-4 h-4 rounded border-mist accent-brand"
          />
          <span className="text-sm text-stone leading-relaxed">
            I agree to Valora's{" "}
            <a href="#" className="text-brand underline">Terms of Service</a> and{" "}
            <a href="#" className="text-brand underline">Privacy Policy</a>.
          </span>
        </label>
        {errors.agreed && <p id="agreed-error" role="alert" className="text-danger text-xs mt-1">{errors.agreed}</p>}
      </div>
      {/* Immutability warning */}
      <div className="bg-sand/40 border border-mist rounded-xl p-3.5 text-xs text-flint flex items-start gap-2.5">
        <svg className="w-4 h-4 text-clay shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 3.5h1.5v5h-1.5v-5zm0 6.5h1.5v1.5h-1.5V11z"/>
        </svg>
        <p className="leading-relaxed">
          <strong className="text-charcoal font-medium">Permanent Account Identifiers:</strong> Please check your name and email carefully. Your name and email address are used as your permanent account identifiers and cannot be changed after registration.
        </p>
      </div>

      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedImmutable}
            onChange={(e) => setConfirmedImmutable(e.target.checked)}
            aria-describedby={errors.confirmedImmutable ? "immutable-error" : undefined}
            className="mt-0.5 w-4 h-4 rounded border-mist accent-brand"
          />
          <span className="text-xs text-stone leading-relaxed">
            I confirm my name and email are accurate and acknowledge they cannot be modified later.
          </span>
        </label>
        {errors.confirmedImmutable && <p id="immutable-error" role="alert" className="text-danger text-xs mt-1">{errors.confirmedImmutable}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-ivory py-3.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-60 mt-2 shadow-xs"
      >
        {loading ? "Sending verification code…" : "Verify with OTP & create account"}
      </button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-mist" /></div>
        <span className="relative bg-white px-3 text-xs text-stone mx-auto flex justify-center">or sign up with</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={googleLoading}
        className="w-full border border-mist bg-white py-3 rounded-full text-sm text-flint font-medium flex items-center justify-center gap-2 hover:bg-cream transition-colors disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {googleLoading ? "Connecting with Google…" : "Continue with Google"}
      </button>

      <button
        type="button"
        onClick={handleFacebookSignUp}
        disabled={facebookLoading}
        className="w-full border border-mist bg-white py-3 rounded-full text-sm text-flint font-medium flex items-center justify-center gap-2 hover:bg-cream transition-colors disabled:opacity-60 cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        {facebookLoading ? "Connecting with Facebook…" : "Continue with Facebook"}
      </button>

      <p className="text-center text-sm text-stone">
        Already a member?{" "}
        <button type="button" onClick={() => switchTo("login")} className="text-brand font-medium hover:underline">
          Sign in
        </button>
      </p>
    </form>

    <GoogleAccountChooserModal
      isOpen={showGoogleModal}
      onConfirm={handleConfirmGoogleAccount}
      onClose={() => setShowGoogleModal(false)}
      loading={googleLoading}
    />

    <FacebookOAuthModal
      isOpen={showFacebookModal}
      onConfirm={handleConfirmFacebookAccount}
      onClose={() => setShowFacebookModal(false)}
      loading={facebookLoading}
    />
  </>
  );
}

/* ─── Password Reset ─── */
function ResetForm({ switchTo }: { switchTo: (m: AuthMode) => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email) { setError("Email is required"); return; }
    try {
      await authApi.forgotPassword(email).catch(() => {});
      await firebaseService.resetPassword(email).catch(() => {});
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A4A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-charcoal mb-2">Check your inbox</h3>
        <p className="text-stone text-sm mb-6">We've sent a reset link to <strong className="text-flint">{email}</strong>. It expires in 30 minutes.</p>
        <button onClick={() => switchTo("login")} className="text-brand text-sm font-medium hover:underline">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-label="Password reset form">
      <p className="text-sm text-stone leading-relaxed">
        Enter the email address associated with your account and we'll send you a reset link.
      </p>
      <div>
        <Label required>Email address</Label>
        <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} error={error} autoComplete="email" />
      </div>
      <button type="submit" className="w-full bg-brand text-ivory py-3.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors">
        Send reset link
      </button>
      <p className="text-center text-sm text-stone">
        Remembered it?{" "}
        <button type="button" onClick={() => switchTo("login")} className="text-brand font-medium hover:underline">
          Back to sign in
        </button>
      </p>
    </form>
  );
}

/* ─── OTP Verification View ─── */
function OtpVerification({
  email,
  purpose,
  pendingData,
  devOtp,
  onVerified,
  onBack,
}: {
  email: string;
  purpose: "signup" | "login";
  pendingData?: { name?: string; password?: string };
  devOtp?: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [currentDevCode, setCurrentDevCode] = useState<string | undefined>(devOtp || "123456");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (codeToVerify: string) => {
    if (codeToVerify.length < 6) {
      setError("Please enter the complete 6-digit verification code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.verifyOtp({
        email,
        code: codeToVerify,
        purpose,
        name: pendingData?.name,
        password: pendingData?.password,
      });

      // Synchronize with Firebase
      if (purpose === "signup" && pendingData?.name && pendingData?.password) {
        firebaseService.signUpWithEmail(pendingData.name, email, pendingData.password).catch(() => {});
      } else if (pendingData?.password) {
        firebaseService.signInWithEmail(email, pendingData.password).catch(() => {});
      }

      onVerified();
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const char = clean.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const combined = next.join("");
    if (combined.length === 6 && !next.includes("")) {
      handleVerify(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      } else {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setDigits(next);
    setError(null);

    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();

    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError(null);
    setResendNotice(null);

    try {
      const res = await authApi.sendOtp(email, purpose);
      if (res.devOtp) {
        setCurrentDevCode(res.devOtp);
      }
      setCountdown(30);
      setResendNotice("A new 6-digit code has been dispatched to your email.");
      setTimeout(() => setResendNotice(null), 5000);
    } catch (err: any) {
      setError(err?.message || "Failed to resend code. Please wait a moment.");
    } finally {
      setResending(false);
    }
  };

  const handleQuickFill = () => {
    const code = currentDevCode || "123456";
    const next = code.split("").slice(0, 6);
    setDigits(next);
    setError(null);
    inputRefs.current[5]?.focus();
    handleVerify(code);
  };

  const codeFilled = digits.join("").length === 6;

  return (
    <div className="py-2">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-brand-light rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand/15">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2A4A1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="font-display text-2xl text-charcoal mb-2">
          {purpose === "signup" ? "Verify your email" : "Two-step verification"}
        </h2>
        <p className="text-stone text-sm max-w-sm mx-auto leading-relaxed">
          {purpose === "signup"
            ? "We sent a 6-digit verification code to"
            : "Enter the 6-digit authentication code sent to"}
          <span className="block font-medium text-flint mt-0.5">{email}</span>
        </p>
      </div>

      {/* Demo helper banner */}
      <div className="mb-6 p-3.5 bg-sand/60 border border-mist rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-flint">
          <span className="inline-block w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span>Demo verification code: <strong className="font-mono text-brand font-semibold text-sm tracking-wider">{currentDevCode || "123456"}</strong></span>
        </div>
        <button
          type="button"
          onClick={handleQuickFill}
          className="text-brand font-medium hover:underline bg-white px-2.5 py-1 rounded-md border border-mist shadow-xs"
        >
          Auto-fill
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-xs text-danger mb-5 flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 mt-0.5" aria-hidden="true">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 3.5h1.5v5h-1.5v-5zm0 6.5h1.5v1.5h-1.5V11z"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {resendNotice && (
        <div className="bg-brand/10 border border-brand/30 rounded-xl p-3 text-xs text-brand mb-5 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>{resendNotice}</span>
        </div>
      )}

      {/* 6-box input */}
      <div className="flex justify-center gap-2 sm:gap-2.5 mb-6">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${idx + 1}`}
            className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-mono font-semibold rounded-xl bg-white border ${
              error ? "border-danger focus:border-danger" : digit ? "border-brand bg-brand/[0.02]" : "border-mist"
            } text-charcoal focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-xs`}
          />
        ))}
      </div>

      {/* Verify Button */}
      <button
        type="button"
        disabled={loading || !codeFilled}
        onClick={() => handleVerify(digits.join(""))}
        className="w-full bg-brand text-ivory py-3.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-4 shadow-sm"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-ivory border-t-transparent rounded-full animate-spin" />
            <span>Verifying code…</span>
          </>
        ) : (
          <span>Confirm & Continue</span>
        )}
      </button>

      {/* Resend & Change email controls */}
      <div className="text-center space-y-2">
        <p className="text-xs text-stone">
          Didn't receive the email?{" "}
          {countdown > 0 ? (
            <span className="text-flint font-medium">Resend in {countdown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-brand font-medium hover:underline disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </p>

        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-stone hover:text-charcoal transition-colors underline"
          >
            Wrong email address? Change email
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Auth shell ─── */
export default function Auth({ mode, setMode, navigate, onLogin }: AuthProps) {
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"signup" | "login">("signup");
  const [otpPendingData, setOtpPendingData] = useState<{ name?: string; password?: string }>({});
  const [otpDevCode, setOtpDevCode] = useState<string | undefined>(undefined);

  const titles: Record<AuthMode, string> = {
    login: "Welcome back",
    signup: "Create your account",
    reset: "Reset your password",
    verify: otpPurpose === "signup" ? "Verify your email" : "Two-step verification",
  };

  const handleInitiateOtp = (params: {
    email: string;
    purpose: "signup" | "login";
    name?: string;
    password?: string;
    devOtp?: string;
  }) => {
    setOtpEmail(params.email);
    setOtpPurpose(params.purpose);
    setOtpPendingData({ name: params.name, password: params.password });
    setOtpDevCode(params.devOtp);
    setMode("verify");
  };

  const handleVerified = () => {
    onLogin();
    if (otpPurpose === "signup") {
      navigate("onboarding");
    } else {
      navigate("discover");
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Left panel — decorative, desktop only */}
      <div className="hidden lg:flex w-1/2 bg-brand flex-col justify-between p-14">
        <div>
          <div className="mb-16">
            <ValoraLogo dark size="md" />
          </div>
          <h2 className="font-display text-4xl text-ivory leading-tight mb-6">
            Every connection<br />starts with<br /><em>knowing yourself.</em>
          </h2>
          <p className="text-brand-mid text-base leading-relaxed max-w-xs">
            Valora helps you articulate your values, communicate your needs, and find someone who actually aligns.
          </p>
        </div>
        <div className="space-y-3">
          {["Lifestyle compatibility", "Values alignment", "Communication preferences", "Boundary awareness"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-brand-mid text-sm">
              <div className="w-5 h-5 rounded-full bg-ivory/15 flex items-center justify-center shrink-0">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Back to landing */}
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-1.5 text-sm text-stone hover:text-charcoal transition-colors mb-10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Back to Valora
          </button>

          <h1 className="font-display text-3xl text-charcoal mb-2">{titles[mode]}</h1>
          {mode === "signup" && (
            <p className="text-stone text-sm mb-8">You must be 18 or older to use Valora.</p>
          )}
          {mode === "login" && <p className="text-stone text-sm mb-6">Good to have you back.</p>}
          {mode === "reset" && <p className="text-stone text-sm mb-6">We'll get you sorted.</p>}
          {mode === "verify" && (
            <p className="text-stone text-sm mb-6">
              {otpPurpose === "signup"
                ? "Enter your 6-digit code to activate your account."
                : "Enter your 6-digit security code to confirm your identity."}
            </p>
          )}

          {/* Developer / Quick Bypass: Instant Dummy Account Entry */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 mb-6 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Instant Access Active
              </span>
              <span className="text-[11px] text-emerald-700 font-medium">No password/OTP needed</span>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-relaxed">
              Authentication barriers are disabled. Click below to enter the website directly with a pre-configured dummy account.
            </p>
            <button
              type="button"
              onClick={() => {
                tokenStorage.initDummyAccount();
                onLogin();
              }}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-ivory font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span>Enter Website with Dummy Account</span>
            </button>
          </div>

          {mode === "login" && (
            <LoginForm
              onLogin={onLogin}
              switchTo={setMode}
              onInitiateOtp={handleInitiateOtp}
            />
          )}
          {mode === "signup" && (
            <SignUpForm
              onLogin={onLogin}
              switchTo={setMode}
              onInitiateOtp={handleInitiateOtp}
            />
          )}
          {mode === "reset" && <ResetForm switchTo={setMode} />}
          {mode === "verify" && (
            <OtpVerification
              email={otpEmail || "you@example.com"}
              purpose={otpPurpose}
              pendingData={otpPendingData}
              devOtp={otpDevCode}
              onVerified={handleVerified}
              onBack={() => setMode(otpPurpose === "signup" ? "signup" : "login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
