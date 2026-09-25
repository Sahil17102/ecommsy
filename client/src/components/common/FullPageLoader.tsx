const logo = "/brand-mark.png";
import { useTheme } from "@/contexts/ThemeContext";
import { getThemeVarsStyle } from "@/theme";

export default function FullPageLoader() {
  const { mode } = useTheme();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background gap-8"
      style={getThemeVarsStyle(mode)}
      data-theme={mode}
    >
      {/* Logo with pulse ring */}
      <div className="relative">
        {/* Outer pulsing rings */}
        <div className="absolute inset-0 -m-4 rounded-full border-2 border-primary/20 animate-[ping_2s_ease-out_infinite]" />
        <div className="absolute inset-0 -m-2 rounded-full border border-primary/10 animate-[ping_2s_ease-out_0.5s_infinite]" />

        {/* Logo container with subtle float */}
        <div className="relative w-16 h-16 animate-[float_2.5s_ease-in-out_infinite]">
          <img
            src={logo}
            alt="Searchcraft"
            className="w-16 h-16 object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* Tagline */}
      <p className="text-muted text-sm font-medium tracking-wide animate-pulse">
        Loading your workspace…
      </p>
    </div>
  );
}
