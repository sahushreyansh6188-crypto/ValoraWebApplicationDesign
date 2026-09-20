/**
 * UndiscoveredAvatar component
 * Renders an undiscovered profile silhouette / brand aesthetic badge
 * when a user has not yet imported or taken their own photo.
 * If photo is provided, renders the photo with graceful error fallback.
 */

export const DEFAULT_DP_URL =
  "https://upload.wikimedia.org/wikipedia/commons/8/83/Default-Icon.jpg?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=original";

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
  const hasCustomPhoto = Boolean(
    photo &&
    photo.trim().length > 0 &&
    !photo.includes("undiscovered-placeholder") &&
    photo !== DEFAULT_DP_URL
  );

  const displaySrc = hasCustomPhoto && photo ? photo : DEFAULT_DP_URL;

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <img
        src={displaySrc}
        alt={name ? `${name}'s display photo` : "Default profile photo"}
        className={`${sizeClasses[size]} rounded-full object-cover border border-mist shadow-xs bg-sand/30`}
        onError={(e) => {
          if (e.currentTarget.src !== DEFAULT_DP_URL) {
            e.currentTarget.src = DEFAULT_DP_URL;
          }
        }}
      />
      {(showBadge || !hasCustomPhoto) && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-brand text-ivory text-[9px] font-semibold px-1 rounded-full border border-white leading-tight shadow-xs"
          title="Import custom photo"
        >
          +
        </span>
      )}
    </div>
  );
}
