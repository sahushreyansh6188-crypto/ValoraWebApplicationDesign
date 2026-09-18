import { useState, useRef, useEffect } from "react";
import type { NavigateFn, AuthMode } from "../types";
import ValoraLogo from "../components/ValoraLogo";
import { authApi } from "../services/api";
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (authMethod === "password" && !password) e.password = "Password is required";
    return e;
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrors({});
    try {
      const { user } = await firebaseService.signInWithGoogle(email || undefined);
      if (user?.email) {
        await authApi.googleAuth({
          email: user.email,
          name: user.displayName || user.email.split("@")[0],
          photoUrl: user.photoURL || undefined,
        });
      }
      onLogin();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setErrors({ form: err?.message || "Failed to sign in with Google" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);

    try {
      if (authMethod === "otp") {
        // Dispatches OTP to email and switches to verification
        const res = await authApi.sendOtp(email, "login");
        onInitiateOtp({
          email,
          purpose: "login",
          devOtp: res.devOtp,
        });
        return;
      }

      if (requireTwoFactor) {
        // First verify password or credentials, then dispatch OTP challenge
        const res = await authApi.sendOtp(email, "login");
        onInitiateOtp({
          email,
          purpose: "login",
          password,
          devOtp: res.devOtp,
        });
        return;
      }

      await authApi.login(email, password);
      // Synchronize with Firebase Auth in background
      firebaseService.signInWithEmail(email, password).catch(() => {});
      onLogin();
    } catch (err) {
      if (authMethod === "password") {
        try {
          const res = await firebaseService.signInWithEmail(email, password);
          if (res && res.user) {
            onLogin();
            return;
          }
        } catch {}
      }
      setErrors({ form: (err as Error).message });
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
      </form>
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
  const [agreed, setAgreed] = useState(false);
  const [confirmedImmutable, setConfirmedImmutable] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Your name is required";
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Must be at least 8 characters";
    if (!agreed) e.agreed = "You must agree to continue";
    if (!confirmedImmutable) e.confirmedImmutable = "Please acknowledge that your name and email cannot be changed later";
    return e;
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setErrors({});
    try {
      const { user } = await firebaseService.signInWithGoogle(email || undefined);
      if (user?.email) {
        await authApi.googleAuth({
          email: user.email,
          name: user.displayName || name || user.email.split("@")[0],
          photoUrl: user.photoURL || undefined,
        });
      }
      onLogin();
    } catch (err: any) {
      console.error("Google sign up error:", err);
      setErrors({ form: err?.message || "Failed to sign up with Google" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);

    try {
      // Initiate OTP verification for sign up
      const otpRes = await authApi.sendOtp(email, "signup");
      onInitiateOtp({
        email,
        purpose: "signup",
        name: name.trim(),
        password,
        devOtp: otpRes.devOtp,
      });
    } catch (err) {
      setErrors({ form: (err as Error).message || "Failed to initiate verification" });
    } finally {
      setLoading(false);
    }
  };

  return (
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

      <p className="text-center text-sm text-stone">
        Already a member?{" "}
        <button type="button" onClick={() => switchTo("login")} className="text-brand font-medium hover:underline">
          Sign in
        </button>
      </p>
    </form>
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
      await authApi.resetPassword(email).catch(() => {});
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
          {mode === "login" && <p className="text-stone text-sm mb-8">Good to have you back.</p>}
          {mode === "reset" && <p className="text-stone text-sm mb-8">We'll get you sorted.</p>}
          {mode === "verify" && (
            <p className="text-stone text-sm mb-8">
              {otpPurpose === "signup"
                ? "Enter your 6-digit code to activate your account."
                : "Enter your 6-digit security code to confirm your identity."}
            </p>
          )}

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
