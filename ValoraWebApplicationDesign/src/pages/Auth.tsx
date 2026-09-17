import { useState } from "react";
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
function LoginForm({ onLogin, switchTo }: { onLogin: () => void; switchTo: (m: AuthMode) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    return e;
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrors({});
    try {
      const { user, profile } = await firebaseService.signInWithGoogle();
      // Store standard session token and user info
      if (user.email) {
        // Also register/login in backend service if available
        try {
          await authApi.signup({
            email: user.email,
            password: "firebase_oauth_session",
            name: user.displayName || "Valora Member",
            termsAccepted: true,
          }).catch(async () => {
            await authApi.login(user.email!, "firebase_oauth_session");
          });
        } catch {}
      }
      onLogin();
    } catch (err: any) {
      setErrors({ form: err.message || "Failed to sign in with Google" });
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
      await authApi.login(email, password);
      // Synchronize with Firebase Auth in background
      firebaseService.signInWithEmail(email, password).catch(() => {});
      onLogin();
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-label="Sign in form">
      {errors.form && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-xs text-danger">
          {errors.form}
        </div>
      )}
      <div>
        <Label required>Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label required>Password</Label>
          <button type="button" onClick={() => switchTo("reset")} className="text-xs text-clay hover:underline">
            Forgot password?
          </button>
        </div>
        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-ivory py-3.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-stone">
        No account?{" "}
        <button type="button" onClick={() => switchTo("signup")} className="text-brand font-medium hover:underline">
          Create one
        </button>
      </p>
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-mist" /></div>
        <span className="relative bg-white px-3 text-xs text-stone mx-auto flex justify-center">or sign in with</span>
      </div>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full border border-mist bg-white py-3 rounded-full text-sm text-flint font-medium flex items-center justify-center gap-2 hover:bg-cream transition-colors disabled:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {googleLoading ? "Connecting with Google…" : "Continue with Google"}
      </button>
    </form>
  );
}

/* ─── Sign Up ─── */
function SignUpForm({ onLogin, switchTo }: { onLogin: () => void; switchTo: (m: AuthMode) => void }) {
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
      const { user, profile } = await firebaseService.signInWithGoogle();
      if (user.email) {
        try {
          await authApi.signup({
            email: user.email,
            password: "firebase_oauth_session",
            name: user.displayName || name || "Valora Member",
            termsAccepted: true,
          }).catch(async () => {
            await authApi.login(user.email!, "firebase_oauth_session");
          });
        } catch {}
      }
      onLogin();
    } catch (err: any) {
      setErrors({ form: err.message || "Failed to sign up with Google" });
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
      await authApi.signup({ email, password, name, termsAccepted: agreed });
      // Create Firebase Auth user and initial Firestore profile
      firebaseService.signUpWithEmail(name, email, password).catch(() => {});
      switchTo("verify");
    } catch (err) {
      setErrors({ form: (err as Error).message });
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
        className="w-full bg-brand text-ivory py-3.5 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-60 mt-2"
      >
        {loading ? "Creating account…" : "Create my account"}
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

/* ─── Email Verification State ─── */
function VerifyEmail({ onVerify }: { onVerify: () => void }) {
  const handleVerify = async () => {
    try {
      await authApi.verifyEmail("demo_token");
    } catch {}
    onVerify();
  };

  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2A4A1E" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-charcoal mb-3">Verify your email</h3>
      <p className="text-stone text-sm leading-relaxed mb-8 max-w-xs mx-auto">
        We've sent a verification link to your email address. Click it to activate your account, then return here to get started.
      </p>
      <div className="bg-ivory border border-mist rounded-xl p-4 text-left mb-6">
        <p className="text-xs text-stone font-medium mb-1">Didn't receive it?</p>
        <ul className="text-xs text-stone space-y-1 list-disc list-inside">
          <li>Check your spam or junk folder</li>
          <li>Make sure the address you entered is correct</li>
          <li>Allow a few minutes for delivery</li>
        </ul>
      </div>
      <button onClick={handleVerify} className="bg-brand text-ivory px-8 py-3 rounded-full text-sm font-medium hover:bg-brand-hover transition-colors">
        I've verified — continue
      </button>
      <p className="text-xs text-stone mt-4">
        <button className="hover:underline">Resend verification email</button>
      </p>
    </div>
  );
}

/* ─── Auth shell ─── */
export default function Auth({ mode, setMode, navigate, onLogin }: AuthProps) {
  const titles: Record<AuthMode, string> = {
    login: "Welcome back",
    signup: "Create your account",
    reset: "Reset your password",
    verify: "One more step",
  };

  const handleVerified = () => {
    onLogin();
    navigate("onboarding");
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
          {mode === "verify" && <p className="text-stone text-sm mb-8">Almost there.</p>}

          {mode === "login" && <LoginForm onLogin={onLogin} switchTo={setMode} />}
          {mode === "signup" && <SignUpForm onLogin={onLogin} switchTo={setMode} />}
          {mode === "reset" && <ResetForm switchTo={setMode} />}
          {mode === "verify" && <VerifyEmail onVerify={handleVerified} />}
        </div>
      </div>
    </div>
  );
}
