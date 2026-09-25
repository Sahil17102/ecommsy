import { Link } from "react-router-dom";

const logo = "/brand-mark.png";

type LogoSize = "sm" | "md" | "lg";

interface AppLogoProps {
  size?: LogoSize;
  showText?: boolean;
  label?: string;
  textClassName?: string;
  to?: string;
  className?: string;
}

const sizeMap: Record<LogoSize, { img: string; text: string }> = {
  sm: { img: "h-9 w-9", text: "text-base" },
  md: { img: "h-11 w-11", text: "text-lg" },
  lg: { img: "h-16 w-16", text: "text-2xl" },
};

export function AppLogo({
  size = "md",
  showText = true,
  label = "Searchcraft",
  textClassName = "text-foreground",
  to = "/",
  className = "",
}: AppLogoProps) {
  const { img, text } = sizeMap[size];
  const content = (
    <>
      <img src={logo} alt="Searchcraft" className={`${img} object-contain shrink-0`} />
      {showText && (
        <span className={`${text} font-extrabold tracking-tight whitespace-nowrap ${textClassName}`}>
          {label}
        </span>
      )}
    </>
  );

  if (to) {
    return <Link to={to} className={`flex items-center gap-2.5 no-underline ${className}`}>{content}</Link>;
  }
  return <div className={`flex items-center gap-2.5 ${className}`}>{content}</div>;
}
