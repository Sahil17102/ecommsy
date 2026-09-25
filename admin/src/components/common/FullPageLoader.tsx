const logo = "/brand-mark.png";

export default function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-8">
      {/* Logo with pulse ring */}
      <div className="relative">
        {/* Outer pulsing rings */}
        <div className="absolute inset-0 -m-4 rounded-full border-2 border-primary/20 animate-[ping_2s_ease-out_infinite]" />
        <div className="absolute inset-0 -m-2 rounded-full border border-primary/10 animate-[ping_2s_ease-out_0.5s_infinite]" />

        {/* Logo container with subtle float */}
        <div className="relative w-16 h-16 animate-[float_2.5s_ease-in-out_infinite]">
          <img
            src={logo}
            alt="Box and Beyond"
            className="w-16 h-16 object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* Progress bar */}
      {/* <div className="w-48 h-1 bg-border-light rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
      </div> */}

      {/* Tagline */}
      <p className="text-tertiary text-sm font-medium tracking-wide animate-pulse">
        Loading your workspace…
      </p>
    </div>
  );
}
