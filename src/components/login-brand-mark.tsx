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
  const northStarMarkPath = "M34 124V36H56L98 90V36H126V124H104L62 70V124Z";
  const trailPixels = isNav
    ? [
        { left: 38, top: 8, size: 2, opacity: 0.2 },
        { left: 33, top: 4, size: 2, opacity: 0.26 },
        { left: 28, top: 10, size: 2, opacity: 0.34 },
        { left: 23, top: 5, size: 3, opacity: 0.44 },
        { left: 18, top: 11, size: 3, opacity: 0.56 },
        { left: 12, top: 6, size: 3, opacity: 0.7 },
        { left: 6, top: 12, size: 4, opacity: 0.82 }
      ]
    : [
        { left: 74, top: 12, size: 3, opacity: 0.18 },
        { left: 66, top: 7, size: 3, opacity: 0.22 },
        { left: 58, top: 16, size: 3, opacity: 0.28 },
        { left: 49, top: 6, size: 4, opacity: 0.36 },
        { left: 40, top: 18, size: 4, opacity: 0.46 },
        { left: 31, top: 7, size: 5, opacity: 0.58 },
        { left: 21, top: 19, size: 5, opacity: 0.7 },
        { left: 11, top: 9, size: 6, opacity: 0.84 }
      ];
  const depthLayers = isNav
    ? [
        { dx: 10, dy: 7, opacity: 0.18 },
        { dx: 7.5, dy: 5.25, opacity: 0.26 },
        { dx: 5, dy: 3.5, opacity: 0.34 },
        { dx: 2.5, dy: 1.75, opacity: 0.44 }
      ]
    : [
        { dx: 18, dy: 12, opacity: 0.16 },
        { dx: 14, dy: 9, opacity: 0.22 },
        { dx: 10, dy: 6.5, opacity: 0.3 },
        { dx: 6, dy: 4, opacity: 0.4 },
        { dx: 3, dy: 2, opacity: 0.5 }
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
              <stop offset="0" stopColor="#0e7490" />
              <stop offset="1" stopColor="#115e59" />
            </linearGradient>
            <linearGradient id="northstar-login-edge" x1="38" y1="130" x2="126" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgba(12,74,110,0.92)" />
              <stop offset="1" stopColor="rgba(15,118,110,0.82)" />
            </linearGradient>
            <filter id="northstar-login-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="northstar-login-trail-glow" x="-100%" y="-200%" width="300%" height="400%">
              <feGaussianBlur stdDeviation="2.6" result="trailBlur" />
              <feMerge>
                <feMergeNode in="trailBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className={cn("origin-center northstar-core-rotate", isNav ? "[animation-duration:12s]" : "[animation-duration:16s]")}>
            {depthLayers.map((layer) => (
              <path
                key={`${variant}-depth-${layer.dx}-${layer.dy}`}
                d={northStarMarkPath}
                fill="url(#northstar-login-edge)"
                opacity={layer.opacity}
                transform={`translate(${layer.dx} ${layer.dy})`}
              />
            ))}
            <path
              d={northStarMarkPath}
              fill="url(#northstar-login-depth)"
              opacity="0.8"
              transform={isNav ? "translate(1.5 1.5)" : "translate(2.5 2.5)"}
            />
            <path
              d={northStarMarkPath}
              fill="url(#northstar-login-n)"
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
              isNav ? "-top-[9px] h-5 w-12" : "-top-[15px] h-7 w-24"
            )}
          >
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-cyan-100 via-cyan-200/80 to-transparent blur-[1.6px]",
                isNav ? "right-2 h-[4px] w-10" : "right-3 h-[6px] w-[4.5rem]"
              )}
            />
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-200/90 via-cyan-200/50 to-transparent blur-[4px]",
                isNav ? "right-1 h-[7px] w-11" : "right-2 h-[10px] w-[5.5rem]"
              )}
            />
            {trailPixels.map((pixel, index) => (
              <span
                key={`${variant}-trail-${index}`}
                className="trail-pixel absolute rounded-[1px] bg-cyan-100 shadow-[0_0_12px_rgba(103,232,249,0.78)]"
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
                opacity="0.98"
                filter="url(#northstar-login-trail-glow)"
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
          filter: drop-shadow(0 18px 22px rgba(8, 145, 178, 0.22)) drop-shadow(0 0 28px rgba(103, 232, 249, 0.24));
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
            transform: perspective(900px) rotateX(24deg) rotateY(0deg) rotateZ(-5deg);
          }

          50% {
            transform: perspective(900px) rotateX(-18deg) rotateY(180deg) rotateZ(5deg);
          }

          100% {
            transform: perspective(900px) rotateX(24deg) rotateY(360deg) rotateZ(-5deg);
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
