import { Link } from "react-router-dom";
const logo = "/brand-mark.png";

type LogoSize = "sm" | "md" | "lg";

interface AppLogoProps {
  size?: LogoSize;
  /** The logo image already contains the "DREAMZ SERVICES" wordmark, so the
   *  side-by-side text label is off by default. Set to true to render the
   *  fallback text next to the image (used in places where the image may not
   *  render — e.g. plain-text email shells). */
  showText?: boolean;
  textClassName?: string;
  to?: string;
  className?: string;
}

const sizeMap: Record<LogoSize, { img: string; text: string }> = {
  sm: { img: "h-9 w-auto max-w-[150px]", text: "text-base" },
  md: { img: "h-11 w-auto max-w-[180px]", text: "text-lg" },
  lg: { img: "h-16 w-auto max-w-[260px]", text: "text-2xl" },
};

export function AppLogo({
  size = "md",
  showText = true,
  textClassName = "text-foreground",
  to = "/",
  className = "",
}: AppLogoProps) {
  const { text } = sizeMap[size];

  const content = (
    <>
      <img
        src={logo}
        alt="Searchcraft"
        className="h-11 w-11 object-contain shrink-0"
      />
      {showText && (
        <span className={`${text} font-bold tracking-tight whitespace-nowrap ${textClassName}`}>
          Searchcraft
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`flex items-center gap-2.5 no-underline ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {content}
    </div>
  );
}
