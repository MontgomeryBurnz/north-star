"use client";

import { cn } from "@/lib/utils";

export function AnimatedNorthStarMark({
  variant = "hero",
  className,
  orbitClassName
}: {
  variant?: "hero" | "nav";
  className?: string;
  orbitClassName?: string;
}) {
  const isNav = variant === "nav";
  const trailPixels = isNav
    ? [
        { left: 22, top: 5, size: 2, opacity: 0.18 },
        { left: 17, top: 4, size: 2, opacity: 0.28 },
        { left: 12, top: 6, size: 2, opacity: 0.42 },
        { left: 7, top: 3, size: 3, opacity: 0.58 }
      ]
    : [
        { left: 36, top: 8, size: 3, opacity: 0.12 },
        { left: 29, top: 6, size: 3, opacity: 0.2 },
        { left: 23, top: 9, size: 4, opacity: 0.32 },
        { left: 16, top: 5, size: 4, opacity: 0.46 },
        { left: 9, top: 10, size: 5, opacity: 0.62 }
      ];

  return (
    <div className={cn(isNav ? "relative h-12 w-12" : "relative h-44 w-44", className)}>
      <div
        className={cn(
          "absolute border border-cyan-300/20 bg-zinc-950/80 shadow-[0_0_60px_rgba(103,232,249,0.08)]",
          isNav ? "inset-[3px] rounded-[1rem]" : "inset-5 rounded-[2rem]"
        )}
      />
      <div
        className={cn(
          "absolute border border-white/8 bg-gradient-to-br from-cyan-300/[0.05] via-transparent to-emerald-300/[0.04]",
          isNav ? "inset-[5px] rounded-[1.05rem]" : "inset-[18px] rounded-[2.25rem]"
        )}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className={cn(isNav ? "h-8 w-8 overflow-visible" : "h-32 w-32 overflow-visible")} aria-hidden="true">
          <defs>
            <linearGradient id="northstar-login-n" x1="22" y1="126" x2="126" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#67e8f9" />
              <stop offset="1" stopColor="#a7f3d0" />
            </linearGradient>
            <filter id="northstar-login-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className={cn("origin-center northstar-core-rotate", isNav ? "[animation-duration:12s]" : "[animation-duration:16s]")}>
            <path
              d="M34 120V40h18l38 49V40h36v80h-18L70 70v50z"
              fill="none"
              stroke="url(#northstar-login-n)"
              strokeWidth="10"
              strokeLinejoin="round"
              filter="url(#northstar-login-glow)"
            />
          </g>
        </svg>
      </div>

      <div className={cn("pointer-events-none absolute inset-0 orbit-spin", orbitClassName)}>
        <div
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed",
            isNav ? "h-11 w-11 border-cyan-300/35" : "h-[152px] w-[152px] border-cyan-300/15"
          )}
        />
        <div
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            isNav ? "h-11 w-11" : "h-[152px] w-[152px]"
          )}
        >
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              isNav ? "-top-[8px] h-4 w-7" : "-top-[13px] h-6 w-12"
            )}
          >
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-cyan-200/55 via-cyan-200/18 to-transparent blur-[1px]",
                isNav ? "right-2 h-[2px] w-5" : "right-3 h-[3px] w-9"
              )}
            />
            {trailPixels.map((pixel, index) => (
              <span
                key={`${variant}-trail-${index}`}
                className="trail-pixel absolute rounded-[1px] bg-cyan-200/90 shadow-[0_0_10px_rgba(103,232,249,0.45)]"
                style={{
                  left: `${pixel.left}px`,
                  top: `${pixel.top}px`,
                  width: `${pixel.size}px`,
                  height: `${pixel.size}px`,
                  opacity: pixel.opacity,
                  animationDelay: `${index * 120}ms`
                }}
              />
            ))}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 overflow-visible drop-shadow-[0_0_14px_rgba(167,243,208,0.55)]",
                isNav ? "h-4 w-4" : "h-6 w-6"
              )}
            >
              <path
                d="M12 2.5l2.75 6.05 6.6.68-5 4.3 1.52 6.47L12 16.6 6.13 20l1.52-6.47-5-4.3 6.6-.68z"
                fill="#a7f3d0"
                stroke="#67e8f9"
                strokeWidth="0.8"
                opacity="0.98"
              />
            </svg>
          </div>
        </div>
      </div>

      <style jsx>{`
        .orbit-spin {
          animation: orbit-spin 14s linear infinite;
        }

        .northstar-core-rotate {
          animation: northstar-core-rotate 16s linear infinite;
          transform-box: fill-box;
          transform-origin: center;
          transform-style: preserve-3d;
        }

        .trail-pixel {
          animation: trail-pixel-flicker 1.6s ease-in-out infinite;
        }

        @keyframes orbit-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes northstar-core-rotate {
          0% {
            transform: perspective(520px) rotateX(9deg) rotateY(0deg) rotateZ(-2deg);
          }

          50% {
            transform: perspective(520px) rotateX(-7deg) rotateY(180deg) rotateZ(2deg);
          }

          100% {
            transform: perspective(520px) rotateX(9deg) rotateY(360deg) rotateZ(-2deg);
          }
        }

        @keyframes trail-pixel-flicker {
          0%,
          100% {
            transform: scale(0.9);
          }

          50% {
            transform: scale(1.15);
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
