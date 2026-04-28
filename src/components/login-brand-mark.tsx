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
        { left: 28, top: 7, size: 2, opacity: 0.16 },
        { left: 23, top: 5, size: 2, opacity: 0.26 },
        { left: 19, top: 8, size: 2, opacity: 0.38 },
        { left: 14, top: 4, size: 3, opacity: 0.52 },
        { left: 8, top: 9, size: 3, opacity: 0.72 }
      ]
    : [
        { left: 52, top: 12, size: 3, opacity: 0.12 },
        { left: 44, top: 7, size: 3, opacity: 0.18 },
        { left: 37, top: 13, size: 4, opacity: 0.28 },
        { left: 29, top: 6, size: 4, opacity: 0.42 },
        { left: 21, top: 14, size: 5, opacity: 0.58 },
        { left: 11, top: 8, size: 6, opacity: 0.78 }
      ];
  const depthLayers = isNav
    ? [
        { dx: 6, dy: 4, opacity: 0.16 },
        { dx: 4.5, dy: 3, opacity: 0.2 },
        { dx: 3, dy: 2, opacity: 0.28 },
        { dx: 1.5, dy: 1, opacity: 0.34 }
      ]
    : [
        { dx: 11, dy: 7, opacity: 0.12 },
        { dx: 8, dy: 5.5, opacity: 0.18 },
        { dx: 5.5, dy: 3.5, opacity: 0.24 },
        { dx: 3, dy: 2, opacity: 0.32 },
        { dx: 1.5, dy: 1, opacity: 0.4 }
      ];

  return (
    <div className={cn(isNav ? "relative h-12 w-12" : "relative h-44 w-44", className)}>
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(103,232,249,0.16)_0%,rgba(167,243,208,0.10)_35%,transparent_72%)]",
          isNav ? "h-10 w-10" : "h-32 w-32"
        )}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className={cn(isNav ? "h-8 w-8 overflow-visible" : "h-32 w-32 overflow-visible")} aria-hidden="true">
          <defs>
            <linearGradient id="northstar-login-n" x1="22" y1="126" x2="126" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#67e8f9" />
              <stop offset="1" stopColor="#a7f3d0" />
            </linearGradient>
            <linearGradient id="northstar-login-depth" x1="32" y1="120" x2="130" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgba(8,145,178,0.95)" />
              <stop offset="1" stopColor="rgba(20,184,166,0.92)" />
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
            {depthLayers.map((layer) => (
              <path
                key={`${variant}-depth-${layer.dx}-${layer.dy}`}
                d="M34 120V40h18l38 49V40h36v80h-18L70 70v50z"
                fill="none"
                stroke="url(#northstar-login-depth)"
                strokeWidth="10"
                strokeLinejoin="round"
                opacity={layer.opacity}
                transform={`translate(${layer.dx} ${layer.dy})`}
              />
            ))}
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
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            isNav ? "h-11 w-11" : "h-[152px] w-[152px]"
          )}
        >
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2",
              isNav ? "-top-[8px] h-4 w-9" : "-top-[13px] h-6 w-16"
            )}
          >
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-cyan-200/95 via-cyan-200/45 to-transparent blur-[1.2px]",
                isNav ? "right-2 h-[3px] w-7" : "right-3 h-[4px] w-12"
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
          filter: drop-shadow(0 0 24px rgba(103, 232, 249, 0.22));
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
            transform: perspective(720px) rotateX(15deg) rotateY(0deg) rotateZ(-4deg);
          }

          50% {
            transform: perspective(720px) rotateX(-11deg) rotateY(180deg) rotateZ(4deg);
          }

          100% {
            transform: perspective(720px) rotateX(15deg) rotateY(360deg) rotateZ(-4deg);
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
