/**
 * UndiscoveredAvatar component
 * Renders an undiscovered profile silhouette / brand aesthetic badge
 * when a user has not yet imported or taken their own photo.
 * If photo is provided, renders the photo with graceful error fallback.
 */

interface UndiscoveredAvatarProps {
  photo?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-base",
  xl: "w-20 h-20 text-xl",
};

export default function UndiscoveredAvatar({
  photo,
  name,
  size = "md",
  className = "",
  showBadge = false,
}: UndiscoveredAvatarProps) {
  const hasPhoto = Boolean(photo && photo.trim().length > 0 && !photo.includes("undiscovered-placeholder"));

  if (hasPhoto) {
    return (
      <div className={`relative inline-block flex-shrink-0 ${className}`}>
        <img
          src={photo!}
          alt={name ? `${name}'s photo` : "Profile photo"}
          className={`${sizeClasses[size]} rounded-full object-cover border border-mist shadow-sm`}
          onError={(e) => {
            // Fallback if image fails to load
            (e.currentTarget as HTMLElement).style.display = "none";
            const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (sibling) sibling.style.display = "flex";
          }}
        />
        {/* Hidden fallback in case of load failure */}
        <div
          style={{ display: "none" }}
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-sand/80 to-cream border-2 border-dashed border-stone/30 flex items-center justify-center text-stone`}
          title="Undiscovered photo"
        >
          <svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </div>
      </div>
    );
  }

  // Undiscovered State
  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-sand/90 via-cream to-ivory border-2 border-dashed border-stone/40 flex flex-col items-center justify-center text-stone shadow-sm overflow-hidden group`}
        title="Photo undiscovered — click to import your image"
        aria-label="Undiscovered profile photo placeholder"
      >
        <svg
          width="55%"
          height="55%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-stone/70"
        >
          {/* Subtle person silhouette */}
          <circle cx="12" cy="8" r="4.2" />
          <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </svg>
      </div>
      {showBadge && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-brand text-ivory text-[9px] font-semibold px-1 rounded-full border border-white leading-tight shadow-xs"
          title="Import required"
        >
          +
        </span>
      )}
    </div>
  );
}
