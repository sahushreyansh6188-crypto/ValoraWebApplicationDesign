/**
 * Option 5 brand mark — two tapered forms converging to a single point.
 * Communicates alignment, compatibility, individuality, and harmony.
 *
 * Light mode:  deep forest green  (#2A4A1E)
 * Dark mode:   warm ivory         (#F8F7F4)
 */

interface ValoraIconProps {
  /** Render the ivory variant for dark backgrounds */
  dark?: boolean;
  /** Pixel width — height is auto-calculated at 1.14× ratio */
  width?: number;
}

/** The raw Option 5 mark — two elegant converging forms */
export function ValoraIcon({ dark = false, width = 26 }: ValoraIconProps) {
  const fill = dark ? "#F8F7F4" : "#2A4A1E";
  const h = Math.round(width * 1.14);

  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 100 114"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/*
        Left arm — outer edge bows gently outward; inner edge curves concavely
        toward the centre, giving the impression of reaching inward.
      */}
      <path
        d="M 7 4 C 1 46, 16 88, 50 110 C 44 88, 36 30, 36 4 Z"
        fill={fill}
      />
      {/*
        Right arm — mirror of left arm.
        Together the two forms create the V silhouette with the natural gap
        between their inner edges acting as intentional negative space.
      */}
      <path
        d="M 93 4 C 99 46, 84 88, 50 110 C 56 88, 64 30, 64 4 Z"
        fill={fill}
      />
    </svg>
  );
}

interface ValoraLogoProps {
  /** Render on a dark background (uses ivory mark + light wordmark) */
  dark?: boolean;
  /** Show only the icon — hides the wordmark (used on narrow viewports) */
  iconOnly?: boolean;
  /** Controls the icon size; the wordmark scales proportionally */
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { icon: 20, text: "text-base" },
  md: { icon: 26, text: "text-xl" },
  lg: { icon: 34, text: "text-2xl" },
} as const;

/**
 * Full Valora brand lockup — Option 5 icon + refined wordmark.
 *
 * Desktop/tablet: [ICON] Valora
 * Mobile (iconOnly=true): [ICON]
 */
export default function ValoraLogo({
  dark = false,
  iconOnly = false,
  size = "md",
}: ValoraLogoProps) {
  const { icon, text } = sizeMap[size];
  const wordmarkColor = dark ? "text-ivory" : "text-charcoal";

  return (
    <div className="flex items-center gap-2.5" role="img" aria-label="Valora">
      <ValoraIcon dark={dark} width={icon} />
      {!iconOnly && (
        <span
          className={`font-display ${text} ${wordmarkColor} tracking-[0.12em] leading-none select-none`}
        >
          Valora
        </span>
      )}
    </div>
  );
}
