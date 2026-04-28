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

          <g className={cn("origin-center northstar-core-spin", isNav ? "[animation-duration:26s]" : "[animation-duration:30s]")}>
            <path
              d="M34 120V40h18l38 49V40h36v80h-18L70 70v50z"
              fill="none"
              stroke="url(#northstar-login-n)"
              strokeWidth="10"
              strokeLinejoin="round"
              filter="url(#northstar-login-glow)"
            />

            <path
              d="M117 24l3.8 8.8 9.2.9-7 6 2.1 9-8.1-4.8-8.1 4.8 2.1-9-7-6 9.2-.9z"
              fill="#a7f3d0"
              opacity="0.95"
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
              "absolute left-1/2 -translate-x-1/2 rounded-full border border-cyan-200/40 bg-zinc-950 shadow-[0_0_18px_rgba(103,232,249,0.24)]",
              isNav ? "-top-1.5 h-3.5 w-3.5 border-cyan-200/70 shadow-[0_0_20px_rgba(103,232,249,0.45)]" : "-top-2 h-5 w-5"
            )}
          >
            <div className={cn("absolute rounded-full bg-gradient-to-br from-cyan-300 to-emerald-200", isNav ? "inset-px" : "inset-[3px]")} />
            <div className={cn("absolute left-1/2 w-px -translate-x-1/2 bg-zinc-950/60", isNav ? "inset-y-[2px]" : "inset-y-[4px]")} />
            <div className={cn("absolute top-1/2 h-px -translate-y-1/2 bg-zinc-950/60", isNav ? "inset-x-[2px]" : "inset-x-[4px]")} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .orbit-spin {
          animation: orbit-spin 14s linear infinite;
        }

        .northstar-core-spin {
          animation: northstar-core-spin 30s linear infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        @keyframes orbit-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes northstar-core-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
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
