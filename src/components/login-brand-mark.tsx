"use client";

import { cn } from "@/lib/utils";

function ExtrudedBeam({
  left,
  top,
  width,
  height,
  depth,
  rotateZ = 0,
  glow = false
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  depth: number;
  rotateZ?: number;
  glow?: boolean;
}) {
  const radius = Math.max(1, Math.round(width * 0.08));

  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width,
        height,
        transform: `rotateZ(${rotateZ}deg)`,
        transformStyle: "preserve-3d"
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          borderRadius: radius,
          background:
            "linear-gradient(155deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.08) 14%, rgba(103,232,249,0.98) 30%, rgba(34,211,238,0.94) 58%, rgba(167,243,208,0.98) 100%)",
          transform: `translateZ(${depth / 2}px)`,
          boxShadow: glow ? "0 0 28px rgba(103,232,249,0.34), 0 16px 22px rgba(8,145,178,0.16)" : undefined,
          backfaceVisibility: "hidden"
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          borderRadius: radius,
          background: "linear-gradient(145deg, rgba(8,47,73,0.98) 0%, rgba(14,116,144,0.9) 52%, rgba(15,118,110,0.82) 100%)",
          transform: `translateZ(-${depth / 2}px) rotateY(180deg)`,
          backfaceVisibility: "hidden"
        }}
      />
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: 0,
          width: depth,
          background: "linear-gradient(180deg, rgba(8,47,73,0.98) 0%, rgba(12,74,110,0.9) 100%)",
          transformOrigin: "left center",
          transform: `translateZ(-${depth / 2}px) rotateY(-90deg)`,
          backfaceVisibility: "hidden"
        }}
      />
      <div
        className="absolute top-0 bottom-0"
        style={{
          right: 0,
          width: depth,
          background: "linear-gradient(180deg, rgba(15,118,110,0.82) 0%, rgba(20,184,166,0.7) 100%)",
          transformOrigin: "right center",
          transform: `translateZ(-${depth / 2}px) rotateY(90deg)`,
          backfaceVisibility: "hidden"
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          top: 0,
          height: depth,
          background: "linear-gradient(90deg, rgba(186,230,253,0.55) 0%, rgba(103,232,249,0.3) 100%)",
          transformOrigin: "center top",
          transform: `translateZ(-${depth / 2}px) rotateX(90deg)`,
          backfaceVisibility: "hidden"
        }}
      />
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 0,
          height: depth,
          background: "linear-gradient(90deg, rgba(8,47,73,0.62) 0%, rgba(15,118,110,0.46) 100%)",
          transformOrigin: "center bottom",
          transform: `translateZ(-${depth / 2}px) rotateX(-90deg)`,
          backfaceVisibility: "hidden"
        }}
      />
    </div>
  );
}

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
  const coreSize = isNav ? 32 : 128;
  const beamWidth = isNav ? 5 : 18;
  const beamDepth = isNav ? 5 : 18;
  const beamHeight = isNav ? 22 : 88;
  const diagonalHeight = isNav ? 24 : 96;
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
          style={{ width: coreSize, height: coreSize, transformStyle: "preserve-3d" }}
        >
          <ExtrudedBeam left={isNav ? 7 : 24} top={isNav ? 5 : 20} width={beamWidth} height={beamHeight} depth={beamDepth} glow />
          <ExtrudedBeam left={isNav ? 20 : 88} top={isNav ? 5 : 20} width={beamWidth} height={beamHeight} depth={beamDepth} glow />
          <ExtrudedBeam
            left={isNav ? 14 : 55}
            top={isNav ? 4 : 16}
            width={beamWidth}
            height={diagonalHeight}
            depth={beamDepth}
            rotateZ={-36}
            glow
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
              viewBox="0 0 28 20"
              aria-hidden="true"
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 overflow-visible drop-shadow-[0_0_14px_rgba(167,243,208,0.55)]",
                isNav ? "h-4 w-4" : "h-6 w-6"
              )}
            >
              <defs>
                <linearGradient id={`northstar-comet-tail-${variant}`} x1="2" y1="10" x2="16" y2="10" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="rgba(255,255,255,0)" />
                  <stop offset="0.42" stopColor="rgba(103,232,249,0.3)" />
                  <stop offset="1" stopColor="rgba(167,243,208,0.82)" />
                </linearGradient>
                <radialGradient id={`northstar-comet-head-${variant}`} cx="58%" cy="42%" r="62%">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="0.24" stopColor="#d9fdf8" />
                  <stop offset="0.62" stopColor="#a7f3d0" />
                  <stop offset="1" stopColor="#67e8f9" />
                </radialGradient>
              </defs>
              <g transform="rotate(-18 18 10)">
                <path
                  d="M3 10c3.9-1.8 7.7-2.8 12.4-3-2 1.2-3.8 2.7-5 4.7-2.7-.2-5.1-.7-7.4-1.7z"
                  fill={`url(#northstar-comet-tail-${variant})`}
                  opacity="0.92"
                />
                <ellipse cx="18" cy="10" rx="4.7" ry="3.5" fill={`url(#northstar-comet-head-${variant})`} />
                <circle cx="19.2" cy="8.8" r="1.15" fill="rgba(255,255,255,0.9)" />
              </g>
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
            transform: rotateX(20deg) rotateY(0deg) rotateZ(-5deg);
          }

          50% {
            transform: rotateX(-12deg) rotateY(180deg) rotateZ(5deg);
          }

          100% {
            transform: rotateX(20deg) rotateY(360deg) rotateZ(-5deg);
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
