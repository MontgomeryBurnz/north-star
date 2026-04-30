"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type MarkVariant = "hero" | "nav";

type TrailPixel = {
  left: number;
  top: number;
  size: number;
  opacity: number;
};

const TRAIL_FLICKER_STAGGER_MS = 120;

const TRAIL_PIXELS: Record<MarkVariant, TrailPixel[]> = {
  hero: [
    { left: 92, top: 12, size: 3, opacity: 0.22 },
    { left: 82, top: 7, size: 3, opacity: 0.28 },
    { left: 72, top: 16, size: 3, opacity: 0.34 },
    { left: 61, top: 6, size: 4, opacity: 0.44 },
    { left: 50, top: 18, size: 4, opacity: 0.54 },
    { left: 39, top: 7, size: 5, opacity: 0.66 },
    { left: 28, top: 19, size: 5, opacity: 0.78 },
    { left: 17, top: 9, size: 6, opacity: 0.9 }
  ],
  nav: [
    { left: 42, top: 8, size: 2, opacity: 0.24 },
    { left: 37, top: 4, size: 2, opacity: 0.32 },
    { left: 32, top: 10, size: 2, opacity: 0.42 },
    { left: 27, top: 5, size: 3, opacity: 0.54 },
    { left: 22, top: 11, size: 3, opacity: 0.66 },
    { left: 16, top: 6, size: 3, opacity: 0.78 },
    { left: 10, top: 12, size: 4, opacity: 0.9 }
  ]
};

function BrandGlow({ variant }: { variant: MarkVariant }) {
  const isNav = variant === "nav";

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,250,229,0.18)_0%,rgba(52,211,153,0.24)_32%,rgba(16,185,129,0.09)_58%,transparent_76%)] blur-sm",
          isNav ? "h-12 w-12" : "h-40 w-40"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.18)_0%,rgba(8,145,178,0.08)_45%,transparent_74%)] blur-xl",
          isNav ? "h-16 w-16" : "h-52 w-52"
        )}
      />
    </>
  );
}

function GlobeCore({ variant }: { variant: MarkVariant }) {
  const isNav = variant === "nav";

  return (
    <div
      className={cn(
        "north-star-globe relative overflow-hidden rounded-full border border-emerald-200/25 bg-[radial-gradient(circle_at_32%_28%,rgba(236,253,245,0.96)_0%,rgba(167,243,208,0.62)_12%,rgba(16,185,129,0.42)_31%,rgba(4,120,87,0.52)_56%,rgba(2,44,34,0.96)_100%)] shadow-[inset_-12px_-14px_22px_rgba(2,44,34,0.86),inset_10px_8px_18px_rgba(236,253,245,0.18),0_0_28px_rgba(52,211,153,0.52)]",
        isNav ? "h-7 w-7" : "h-[6.6rem] w-[6.6rem]"
      )}
      aria-hidden="true"
    >
      <div className="north-star-globe-drift absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(103,232,249,0.18)_15%,transparent_30%,rgba(52,211,153,0.2)_48%,transparent_64%,rgba(167,243,208,0.14)_83%,transparent_100%)] opacity-70" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-70" aria-hidden="true">
        <path d="M12 50h76" stroke="rgba(209,250,229,0.34)" strokeWidth="1.2" fill="none" />
        <path d="M18 32c19 8 45 8 64 0" stroke="rgba(209,250,229,0.24)" strokeWidth="1" fill="none" />
        <path d="M18 68c19-8 45-8 64 0" stroke="rgba(209,250,229,0.2)" strokeWidth="1" fill="none" />
        <ellipse cx="50" cy="50" rx="22" ry="43" stroke="rgba(209,250,229,0.2)" strokeWidth="1" fill="none" />
        <ellipse cx="50" cy="50" rx="38" ry="43" stroke="rgba(103,232,249,0.16)" strokeWidth="1" fill="none" />
      </svg>
      <span className="absolute left-[18%] top-[16%] h-1/4 w-1/4 rounded-full bg-emerald-50/45 blur-[2px]" />
    </div>
  );
}

function MeteorTrail({ variant }: { variant: MarkVariant }) {
  return (
    <>
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-50 via-emerald-200/80 to-transparent blur-[1.4px]",
          variant === "nav" ? "right-2 h-[4px] w-12" : "right-3 h-[7px] w-[6rem]"
        )}
      />
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-cyan-100 via-emerald-300/65 to-transparent blur-[5px]",
          variant === "nav" ? "right-1 h-[8px] w-14" : "right-2 h-[13px] w-[7rem]"
        )}
      />
      {TRAIL_PIXELS[variant].map((pixel, index) => (
        <span
          key={`${variant}-trail-${pixel.left}-${pixel.top}-${pixel.size}`}
          className="north-star-trail-pixel absolute rounded-[1px] bg-emerald-50 shadow-[0_0_16px_rgba(52,211,153,0.9)]"
          style={{
            animationDelay: `${index * TRAIL_FLICKER_STAGGER_MS}ms`,
            height: `${pixel.size}px`,
            left: `${pixel.left}px`,
            opacity: pixel.opacity,
            top: `${pixel.top}px`,
            width: `${pixel.size}px`
          }}
        />
      ))}
    </>
  );
}

function MeteorHead({ gradientPrefix, variant }: { gradientPrefix: string; variant: MarkVariant }) {
  const tailId = `${gradientPrefix}-tail`;
  const headId = `${gradientPrefix}-head`;
  const burnId = `${gradientPrefix}-burn`;

  return (
    <svg
      viewBox="0 0 32 22"
      aria-hidden="true"
      className={cn(
        "absolute right-0 top-1/2 -translate-y-1/2 overflow-visible drop-shadow-[0_0_18px_rgba(167,243,208,0.9)]",
        variant === "nav" ? "h-4 w-5" : "h-7 w-8"
      )}
    >
      <defs>
        <linearGradient id={tailId} x1="1" y1="11" x2="17" y2="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgba(255,255,255,0)" />
          <stop offset="0.45" stopColor="rgba(52,211,153,0.32)" />
          <stop offset="1" stopColor="rgba(167,243,208,0.84)" />
        </linearGradient>
        <radialGradient id={headId} cx="58%" cy="42%" r="62%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.22" stopColor="#ecfeff" />
          <stop offset="0.58" stopColor="#a7f3d0" />
          <stop offset="1" stopColor="#34d399" />
        </radialGradient>
        <radialGradient id={burnId} cx="74%" cy="42%" r="72%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.18" stopColor="#fef9c3" />
          <stop offset="0.48" stopColor="#bbf7d0" />
          <stop offset="1" stopColor="rgba(52,211,153,0)" />
        </radialGradient>
      </defs>
      <g transform="rotate(-16 19 11)">
        <path
          d="M2.5 11c4.4-2 8.4-3.1 13.8-3.2-2.3 1.3-4.2 3-5.4 5.2-3.1-.2-5.8-.8-8.4-2z"
          fill={`url(#${tailId})`}
          opacity="0.94"
        />
        <path
          d="M16.2 4.8c5-1.2 9.6 1.5 11 6.1-1.3 4.5-6.1 7.3-11 6.1 2-1.6 3.2-3.7 3.4-6.1-.2-2.5-1.4-4.6-3.4-6.1z"
          fill={`url(#${burnId})`}
          opacity="0.98"
        />
        <ellipse cx="19.7" cy="11" rx="5.2" ry="3.8" fill={`url(#${headId})`} />
        <ellipse cx="22.1" cy="10" rx="2.25" ry="1.45" fill="rgba(255,255,255,0.94)" />
        <circle cx="23.1" cy="9.5" r="0.72" fill="#fef9c3" />
      </g>
    </svg>
  );
}

function OrbitingMeteor({ orbitClassName, variant }: { orbitClassName?: string; variant: MarkVariant }) {
  const gradientPrefix = `northstar-meteor-${useId().replace(/:/g, "")}`;
  const isNav = variant === "nav";

  return (
    <div className={cn("north-star-orbit-spin pointer-events-none absolute inset-0", orbitClassName)} aria-hidden="true">
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          isNav ? "h-[3.05rem] w-[3.05rem]" : "h-[10.1rem] w-[10.1rem]"
        )}
      >
        <div className={cn("absolute left-1/2 -translate-x-1/2", isNav ? "-top-[7px] h-5 w-12" : "-top-[14px] h-7 w-24")}>
          <MeteorTrail variant={variant} />
          <MeteorHead gradientPrefix={gradientPrefix} variant={variant} />
        </div>
      </div>
    </div>
  );
}

export function AnimatedNorthStarMark({
  variant = "hero",
  className,
  orbitClassName
}: {
  variant?: MarkVariant;
  className?: string;
  orbitClassName?: string;
}) {
  const isNav = variant === "nav";

  return (
    <div className={cn(isNav ? "relative h-12 w-12" : "relative h-44 w-44", className)}>
      <BrandGlow variant={variant} />

      <div className="absolute inset-0 flex items-center justify-center">
        <GlobeCore variant={variant} />
      </div>

      <OrbitingMeteor orbitClassName={orbitClassName} variant={variant} />

      <style jsx global>{`
        .north-star-orbit-spin {
          animation: north-star-orbit-spin 18s linear infinite;
        }

        .north-star-globe-drift {
          animation: north-star-globe-drift 12s ease-in-out infinite;
        }

        .north-star-trail-pixel {
          animation: north-star-trail-pixel-flicker 1.7s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .north-star-orbit-spin,
          .north-star-globe-drift,
          .north-star-trail-pixel {
            animation: none;
          }
        }

        @keyframes north-star-orbit-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes north-star-globe-drift {
          0%,
          100% {
            transform: translateX(-18%);
          }

          50% {
            transform: translateX(18%);
          }
        }

        @keyframes north-star-trail-pixel-flicker {
          0%,
          100% {
            transform: scale(0.86);
          }

          50% {
            transform: scale(1.16);
          }
        }
      `}</style>
    </div>
  );
}

export function LoginBrandMark({
  title,
  subtitle
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid justify-items-center gap-6 text-center">
      <AnimatedNorthStarMark />

      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">{title}</h1>
        <p className="mx-auto max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">{subtitle}</p>
      </div>
    </div>
  );
}
