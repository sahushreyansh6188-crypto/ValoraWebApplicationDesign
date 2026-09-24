import { useState } from "react";
import type { NavigateFn, AuthMode } from "../types";
import ValoraLogo, { ValoraIcon } from "../components/ValoraLogo";
import heroBanner from "@/imports/Gemini_Generated_Image_23i34623i34623i3.png";

interface LandingProps {
  navigate: NavigateFn;
  setAuthMode: (mode: AuthMode) => void;
  onLogin?: () => void;
}

const values = [
  "authenticity", "compassion", "growth", "simplicity",
  "justice", "creativity", "intellectual curiosity",
  "community", "loyalty", "humor", "independence", "spirituality",
];

const lifestyles = [
  "alcohol-free", "vegan", "zero-waste", "mindfulness practice",
  "outdoor lifestyle", "plant-based", "sustainability focused",
  "arts & creative", "fitness focused", "homebody",
];

const steps = [
  {
    num: "01",
    title: "Share your world",
    body: "Tell us how you live — your values, communication style, boundaries, and lifestyle. No checkboxes required, no algorithm guessing. Just you, in your own words.",
  },
  {
    num: "02",
    title: "Meet real compatibility",
    body: "We surface people whose lives genuinely overlap with yours. Not just similar interests, but aligned values and compatible ways of being in the world.",
  },
  {
    num: "03",
    title: "Connect with intention",
    body: "When you reach out, you'll already have context. Valora gives you the foundations for a real first conversation — not just 'hey'.",
  },
];

const testimonials = [
  {
    quote: "For the first time in years, I didn't feel like I had to hide the parts of myself that most people find inconvenient. Valora introduced me to someone who understood immediately.",
    name: "Jade R.",
    detail: "Matched in October · Together since January",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format",
  },
  {
    quote: "I'm neurodivergent and sober, and every other platform felt like it was built for someone else. Here I found people who actually communicate the way I need them to.",
    name: "Marcus T.",
    detail: "Member since 2023",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format",
  },
];

const pricingTiers = [
  {
    name: "Explore",
    price: "Free",
    period: "",
    description: "Start building your values profile and see who's out there.",
    features: [
      "Complete values & lifestyle profile",
      "Browse up to 15 profiles/week",
      "3 conversations per month",
      "Basic compatibility view",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Connect",
    price: "$14",
    period: "/month",
    description: "For those ready to invest in finding real compatibility.",
    features: [
      "Unlimited profile browsing",
      "Unlimited conversations",
      "Full compatibility breakdown",
      "Advanced lifestyle filters",
      "Read receipts",
      "Priority visibility",
    ],
    cta: "Start connecting",
    highlight: true,
  },
  {
    name: "Annual",
    price: "$99",
    period: "/year",
    description: "Everything in Connect, billed once. Save 41%.",
    features: [
      "All Connect features",
      "Significant annual savings",
      "Early access to new features",
    ],
    cta: "Go annual",
    highlight: false,
  },
];

export default function Landing({ navigate, setAuthMode, onLogin }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goToSignup = () => {
    setAuthMode("signup");
    navigate("auth");
  };
  const goToLogin = () => {
    setAuthMode("login");
    navigate("auth");
  };

  return (
    <div className="bg-ivory min-h-screen">
      {/* Marketing header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ivory/90 backdrop-blur-sm border-b border-mist">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="md:hidden"><ValoraIcon width={22} /></div>
          <div className="hidden md:block"><ValoraLogo size="md" /></div>

          <nav className="hidden md:flex items-center gap-7 text-sm text-flint">
            <a href="#how" className="hover:text-charcoal transition-colors">How it works</a>
            <a href="#values" className="hover:text-charcoal transition-colors">Our values</a>
            <a href="#pricing" className="hover:text-charcoal transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={goToLogin}
              className="hidden md:block text-sm font-medium text-flint hover:text-charcoal transition-colors px-4 py-2 cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={goToSignup}
              className="hidden md:inline-flex bg-brand text-ivory text-sm font-medium px-5 py-2 rounded-full hover:bg-brand-hover transition-colors cursor-pointer"
            >
              Get started
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 text-flint"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            className="md:hidden bg-ivory/98 border-t border-mist px-6 pb-6 pt-3"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <nav className="mb-5">
              {[
                { href: "#how", label: "How it works" },
                { href: "#values", label: "Our values" },
                { href: "#pricing", label: "Pricing" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3.5 text-sm text-flint border-b border-mist last:border-0 hover:text-charcoal transition-colors"
                >
                  {label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => { goToLogin(); setMobileMenuOpen(false); }}
                className="w-full border border-mist bg-white text-flint text-sm font-medium py-3.5 rounded-full hover:bg-cream transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => { goToSignup(); setMobileMenuOpen(false); }}
                className="w-full bg-brand text-ivory text-sm font-medium py-3.5 rounded-full hover:bg-brand-hover transition-colors"
              >
                Get started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─── no pt-16 on main so the hero can breathe under the transparent nav ─── */}
      <main>

        {/* ── Hero — editorial brand banner ──────────────────────────────────── */}
        <section
          className="relative flex flex-col overflow-hidden"
          style={{ minHeight: "100svh", backgroundColor: "#c3a887" }}
          aria-labelledby="hero-headline"
        >
          {/*
            Image is shifted down 9% so the VALORA wordmark in the PNG
            clears the fixed nav bar and reads fully within the hero frame.
            The translateY wrapper is separate from the scale-animation div
            so both transforms compose independently.
            overflow-hidden on the section clips the bottom overhang.
          */}
          <div className="absolute inset-0" style={{ transform: "translateY(9%)" }}>
            <div className="absolute inset-0 hero-img-anim">
              <img
                src={heroBanner}
                alt="Valora — values-first matchmaking"
                className="w-full h-full object-cover hero-img-pos"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to top, rgba(26,26,24,0.62) 0%, rgba(26,26,24,0.28) 30%, rgba(26,26,24,0.06) 58%, transparent 75%)",
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to right, rgba(26,26,24,0.28) 0%, rgba(26,26,24,0.08) 40%, transparent 65%)",
                }}
              />
            </div>
          </div>

          {/* Gradient that blends the section background colour into the image top */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: "13%",
              zIndex: 1,
              background: "linear-gradient(to bottom, #c3a887 0%, transparent 100%)",
            }}
          />

          {/* ── Content — pinned bottom-left, entrance fade ── */}
          <div className="relative flex-1 flex flex-col justify-end" style={{ zIndex: 2 }}>
            <div className="max-w-6xl mx-auto w-full px-6 md:px-12 pb-16 md:pb-28 hero-text-anim">
              <div className="max-w-lg">

                {/* Eyebrow */}
                <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-ivory/60 mb-5 select-none">
                  Values &nbsp;·&nbsp; Lifestyle &nbsp;·&nbsp; Connection
                </p>

                {/* Thin horizontal rule */}
                <div className="w-8 h-px bg-ivory/25 mb-8" aria-hidden="true" />

                {/* Headline */}
                <h1
                  id="hero-headline"
                  className="font-display text-ivory leading-[1.07] mb-6"
                  style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)" }}
                >
                  Meet people who align<br />
                  with what matters.
                </h1>

                {/* Supporting text */}
                <p
                  className="text-ivory/70 leading-relaxed mb-10"
                  style={{ fontSize: "clamp(0.9rem, 1.5vw, 1.05rem)", maxWidth: "34ch" }}
                >
                  Meaningful connections begin with shared values, compatible lifestyles,
                  and the freedom to be understood.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                  {/* Primary */}
                  <button
                    onClick={goToSignup}
                    className="bg-ivory text-charcoal text-sm font-medium tracking-wide px-7 py-3.5 rounded-sm hover:bg-cream transition-colors text-center cursor-pointer shadow-xs"
                  >
                    Find your alignment
                  </button>

                  {/* Secondary — ghost text link with arrow */}
                  <button
                    onClick={() =>
                      document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="hero-cta-ghost flex items-center justify-center sm:justify-start gap-2 text-ivory/70 text-sm hover:text-ivory transition-colors py-1 cursor-pointer"
                  >
                    Explore how it works
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="hero-arrow"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Trust note */}
                <p className="text-ivory/35 text-xs mt-9 tracking-wide">
                  Free to join &nbsp;·&nbsp; No credit card required
                </p>
              </div>
            </div>
          </div>

          {/* Scroll-down cue — subtle sparkle star + vertical scroll indicator */}
          <div
            className="absolute bottom-8 right-8 hidden md:flex items-center gap-3.5 opacity-30 select-none pointer-events-none"
            aria-hidden="true"
          >
            {/* 4-point sparkle star */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-ivory/60"
            >
              <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6L12 0Z" />
            </svg>

            <div className="flex flex-col items-center gap-1.5">
              <span
                className="text-[9px] text-ivory tracking-[0.25em] uppercase rotate-180"
                style={{ writingMode: "vertical-rl" }}
              >
                Scroll
              </span>
              <svg width="1" height="32" viewBox="0 0 1 32" fill="none">
                <line x1="0.5" y1="0" x2="0.5" y2="32" stroke="white" strokeWidth="0.75" />
              </svg>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-white py-14 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-10 md:mb-16">
              <h2 className="font-display text-2xl md:text-4xl text-charcoal mb-3 md:mb-4">Built for how relationships actually start</h2>
              <p className="text-stone text-base md:text-lg">
                Not swipes. Not superficial likes. A thoughtful process that respects your time and your values.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 md:gap-10">
              {steps.map((step) => (
                <div key={step.num} className="flex md:block gap-5 md:gap-0">
                  <div className="font-display text-3xl md:text-4xl text-brand mb-0 md:mb-5 shrink-0">{step.num}</div>
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-charcoal mb-2 md:mb-3">{step.title}</h3>
                    <p className="text-stone text-sm leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values cloud */}
        <section id="values" className="py-14 md:py-24">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h2 className="font-display text-2xl md:text-4xl text-charcoal mb-3 md:mb-4">Define your world, not a type</h2>
            <p className="text-stone text-base md:text-lg mb-8 md:mb-12 max-w-xl mx-auto">
              Most platforms ask you to describe a person you want. We ask you to describe who you are.
            </p>
            <div className="flex flex-col gap-5 items-center">
              <div className="flex flex-wrap justify-center gap-3">
                {values.map((v) => (
                  <span key={v} className="bg-white border border-mist text-flint text-sm px-4 py-2 rounded-full">
                    {v}
                  </span>
                ))}
              </div>
              <div className="text-stone text-xs my-1 font-medium tracking-widest uppercase">
                + lifestyle
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {lifestyles.map((l) => (
                  <span key={l} className="bg-brand-light text-brand text-sm px-4 py-2 rounded-full">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-cream py-14 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="font-display text-2xl md:text-4xl text-charcoal mb-8 md:mb-14 max-w-sm">What members are saying</h2>
            <div className="grid md:grid-cols-2 gap-5 md:gap-8">
              {testimonials.map((t) => (
                <div key={t.name} className="bg-white rounded-2xl p-6 md:p-8">
                  <p className="text-flint text-base leading-relaxed mb-6 md:mb-8 font-display italic text-lg md:text-xl">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-mist" />
                    <div>
                      <div className="text-sm font-semibold text-charcoal">{t.name}</div>
                      <div className="text-xs text-stone">{t.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-14 md:py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl mb-10 md:mb-14">
              <h2 className="font-display text-2xl md:text-4xl text-charcoal mb-3 md:mb-4">Simple, transparent pricing</h2>
              <p className="text-stone text-base md:text-lg">No dark patterns, no surprise charges. Start free, upgrade when you're ready.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 items-start">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl p-8 ${
                    tier.highlight
                      ? "bg-brand text-ivory"
                      : "bg-white border border-mist"
                  }`}
                >
                  <div className={`text-sm font-semibold mb-1 ${tier.highlight ? "text-brand-mid" : "text-stone"}`}>
                    {tier.name}
                  </div>
                  <div className="flex items-end gap-0.5 mb-2">
                    <span className={`font-display text-4xl ${tier.highlight ? "text-ivory" : "text-charcoal"}`}>
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className={`text-sm mb-1 ${tier.highlight ? "text-brand-mid" : "text-stone"}`}>
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mb-7 leading-relaxed ${tier.highlight ? "text-brand-mid" : "text-stone"}`}>
                    {tier.description}
                  </p>
                  <ul className="space-y-2.5 mb-8">
                    {tier.features.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-sm ${tier.highlight ? "text-ivory" : "text-flint"}`}>
                        <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" fill={tier.highlight ? "rgba(255,255,255,0.15)" : "#EEF4EB"}/>
                          <path d="M5 8l2 2 4-4" stroke={tier.highlight ? "white" : "#2A4A1E"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={goToSignup}
                    className={`w-full py-3 rounded-full text-sm font-medium transition-colors ${
                      tier.highlight
                        ? "bg-ivory text-brand hover:bg-cream"
                        : "border border-mist text-charcoal hover:bg-cream"
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 md:py-24 bg-brand">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <div className="flex justify-center mb-6 md:mb-8">
              <ValoraLogo dark size="lg" />
            </div>
            <h2 className="font-display text-3xl md:text-5xl text-ivory mb-4 md:mb-6">Ready to be known?</h2>
            <p className="text-brand-mid text-base md:text-lg mb-8 md:mb-10 max-w-md mx-auto">
              Valora is for people who believe a relationship built on shared values is worth waiting for.
            </p>
            <button
              onClick={goToSignup}
              className="w-full sm:w-auto bg-ivory text-brand font-medium px-8 py-4 rounded-full hover:bg-cream transition-colors text-sm"
            >
              Create your free profile
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-charcoal py-10 md:py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <ValoraLogo dark size="md" />
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-stone">
                <a href="#" className="hover:text-pebble transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-pebble transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-pebble transition-colors">Safety</a>
                <a href="#" className="hover:text-pebble transition-colors">Contact</a>
              </div>
              <p className="text-xs text-stone">© 2026 Valora. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
