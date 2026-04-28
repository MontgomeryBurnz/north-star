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
  const northStarClipPath =
    "polygon(21.25% 77.5%, 21.25% 22.5%, 35% 22.5%, 61.25% 56.25%, 61.25% 22.5%, 78.75% 22.5%, 78.75% 77.5%, 65% 77.5%, 38.75% 43.75%, 38.75% 77.5%)";
  const trailPixels = isNav
    ? [
        { left: 42, top: 8, size: 2, opacity: 0.22 },
        { left: 37, top: 4, size: 2, opacity: 0.3 },
        { left: 32, top: 10, size: 2, opacity: 0.38 },
        { left: 27, top: 5, size: 3, opacity: 0.48 },
        { left: 22, top: 11, size: 3, opacity: 0.6 },
        { left: 16, top: 6, size: 3, opacity: 0.72 },
        { left: 10, top: 12, size: 4, opacity: 0.84 },
        { left: 4, top: 7, size: 4, opacity: 0.94 }
      ]
    : [
        { left: 92, top: 12, size: 3, opacity: 0.2 },
        { left: 82, top: 7, size: 3, opacity: 0.24 },
        { left: 72, top: 16, size: 3, opacity: 0.3 },
        { left: 61, top: 6, size: 4, opacity: 0.38 },
        { left: 50, top: 18, size: 4, opacity: 0.48 },
        { left: 39, top: 7, size: 5, opacity: 0.6 },
        { left: 28, top: 19, size: 5, opacity: 0.72 },
        { left: 17, top: 9, size: 6, opacity: 0.86 },
        { left: 7, top: 20, size: 6, opacity: 0.96 }
      ];
  const northStarDepthLayers = isNav
    ? [
        { z: 16, x: 5, y: 3, opacity: 0.2 },
        { z: 12, x: 4, y: 2.5, opacity: 0.28 },
        { z: 8, x: 3, y: 2, opacity: 0.38 },
        { z: 4, x: 1.5, y: 1, opacity: 0.52 }
      ]
    : [
        { z: 26, x: 8, y: 5, opacity: 0.18 },
        { z: 20, x: 6, y: 4, opacity: 0.24 },
        { z: 14, x: 4.5, y: 3, opacity: 0.34 },
        { z: 8, x: 3, y: 2, opacity: 0.46 },
        { z: 4, x: 1.5, y: 1, opacity: 0.6 }
      ];

  return (
    <div className={cn(isNav ? "relative h-12 w-12" : "relative h-44 w-44", className)}>
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(103,232,249,0.16)_0%,rgba(167,243,208,0.10)_35%,transparent_72%)]",
          isNav ? "h-10 w-10" : "h-32 w-32"
        )}
      />

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isNav ? "[perspective:900px]" : "[perspective:1400px]"
        )}
      >
        <div
          className={cn("relative northstar-core-rotate", isNav ? "h-8 w-8" : "h-32 w-32")}
          style={{ transformStyle: "preserve-3d" }}
        >
          {northStarDepthLayers.map((layer) => (
            <div
              key={`${variant}-depth-${layer.z}`}
              className="absolute inset-0"
              style={{
                clipPath: northStarClipPath,
                background:
                  "linear-gradient(145deg, rgba(8,47,73,0.96) 0%, rgba(14,116,144,0.92) 40%, rgba(15,118,110,0.84) 100%)",
                opacity: layer.opacity,
                transform: `translate3d(${layer.x}px, ${layer.y}px, -${layer.z}px)`
              }}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{
              clipPath: northStarClipPath,
              background:
                "linear-gradient(155deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 14%, rgba(103,232,249,0.96) 30%, rgba(34,211,238,0.92) 56%, rgba(167,243,208,0.98) 100%)",
              boxShadow:
                "0 0 28px rgba(103,232,249,0.34), 0 18px 26px rgba(8,145,178,0.18)",
              transform: isNav ? "translateZ(3px)" : "translateZ(6px)"
            }}
          />
          <div
            className="absolute inset-0 opacity-90"
            style={{
              clipPath: northStarClipPath,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.26) 0%, transparent 24%, transparent 76%, rgba(8,47,73,0.24) 100%)",
              transform: isNav ? "translateZ(7px)" : "translateZ(12px)"
            }}
          />
        </div>
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
                isNav ? "right-2 h-[4px] w-12" : "right-3 h-[7px] w-[6rem]"
              )}
            />
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-200/95 via-cyan-200/65 to-transparent blur-[5px]",
                isNav ? "right-1 h-[8px] w-14" : "right-2 h-[12px] w-[7rem]"
              )}
            />
            {trailPixels.map((pixel, index) => (
              <span
                key={`${variant}-trail-${index}`}
                className="trail-pixel absolute rounded-[1px] bg-cyan-50 shadow-[0_0_16px_rgba(103,232,249,0.9)]"
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
          transform-style: preserve-3d;
          will-change: transform;
          filter: drop-shadow(0 20px 26px rgba(8, 145, 178, 0.22)) drop-shadow(0 0 30px rgba(103, 232, 249, 0.2));
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
            transform: rotateX(22deg) rotateY(0deg) rotateZ(-5deg);
          }

          50% {
            transform: rotateX(-14deg) rotateY(180deg) rotateZ(5deg);
          }

          100% {
            transform: rotateX(22deg) rotateY(360deg) rotateZ(-5deg);
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
