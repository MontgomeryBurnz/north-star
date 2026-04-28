"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

function NorthStarThreeMark({ isNav }: { isNav: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrame = 0;
    let disposed = false;
    let removeResizeListener: (() => void) | undefined;
    let cleanupThree: (() => void) | undefined;

    import("three").then((THREE) => {
      if (disposed || !canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance"
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-2.2, 2.2, 2.2, -2.2, 0.1, 100);
      camera.position.set(0, 0, 6);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0x6ee7b7, 1.7));

      const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
      keyLight.position.set(3.2, 4.2, 5.2);
      scene.add(keyLight);

      const sideLight = new THREE.DirectionalLight(0x34d399, 2.3);
      sideLight.position.set(-3.6, 1.8, 3.8);
      scene.add(sideLight);

      const rimLight = new THREE.PointLight(0xa7f3d0, 6.5, 8);
      rimLight.position.set(0.2, 1.8, 2.8);
      scene.add(rimLight);

      const group = new THREE.Group();
      scene.add(group);

      const faceMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x065f46, emissiveIntensity: 0.22, metalness: 0.32, roughness: 0.34 }),
        new THREE.MeshStandardMaterial({ color: 0x047857, emissive: 0x064e3b, emissiveIntensity: 0.18, metalness: 0.24, roughness: 0.46 }),
        new THREE.MeshStandardMaterial({ color: 0xd1fae5, emissive: 0x6ee7b7, emissiveIntensity: 0.36, metalness: 0.18, roughness: 0.26 }),
        new THREE.MeshStandardMaterial({ color: 0x022c22, emissive: 0x022c22, emissiveIntensity: 0.12, metalness: 0.18, roughness: 0.58 }),
        new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x059669, emissiveIntensity: 0.34, metalness: 0.22, roughness: 0.28 }),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x022c22, emissiveIntensity: 0.16, metalness: 0.18, roughness: 0.52 })
      ];

      const verticalGeometry = new THREE.BoxGeometry(0.5, 2.65, 0.95);
      const diagonalGeometry = new THREE.BoxGeometry(0.52, 3.08, 0.95);

      const left = new THREE.Mesh(verticalGeometry, faceMaterials);
      left.position.set(-0.78, 0, 0);
      group.add(left);

      const right = new THREE.Mesh(verticalGeometry, faceMaterials);
      right.position.set(0.78, 0, 0);
      group.add(right);

      const diagonal = new THREE.Mesh(diagonalGeometry, faceMaterials);
      diagonal.rotation.z = -0.58;
      diagonal.position.set(0, 0, 0.02);
      group.add(diagonal);

      group.scale.setScalar(isNav ? 0.78 : 1);

      const resize = () => {
        if (!canvasRef.current) {
          return;
        }

        const { width, height } = canvasRef.current.getBoundingClientRect();
        const safeWidth = Math.max(width, 1);
        const safeHeight = Math.max(height, 1);
        renderer.setSize(safeWidth, safeHeight, false);

        const aspect = safeWidth / safeHeight;
        const frustum = isNav ? 3.55 : 3.8;
        camera.left = (-frustum * aspect) / 2;
        camera.right = (frustum * aspect) / 2;
        camera.top = frustum / 2;
        camera.bottom = -frustum / 2;
        camera.updateProjectionMatrix();
      };

      const clock = new THREE.Clock();
      const animate = () => {
        const elapsed = clock.getElapsedTime();
        group.rotation.x = 0.18;
        group.rotation.y = -elapsed * 0.26;
        group.rotation.z = -0.04;
        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(animate);
      };

      resize();
      window.addEventListener("resize", resize);
      removeResizeListener = () => window.removeEventListener("resize", resize);
      animate();

      cleanupThree = () => {
        renderer.dispose();
        verticalGeometry.dispose();
        diagonalGeometry.dispose();
        faceMaterials.forEach((material) => material.dispose());
      };
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      removeResizeListener?.();
      cleanupThree?.();
    };
  }, [isNav]);

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" data-north-star-3d aria-hidden="true" />;
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
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.18)_0%,rgba(167,243,208,0.12)_36%,transparent_72%)]",
          isNav ? "h-10 w-10" : "h-32 w-32"
        )}
      />

      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          isNav ? "[perspective:900px]" : "[perspective:1400px]"
        )}
      >
        <div className={cn("relative", isNav ? "h-10 w-10" : "h-36 w-36")}>
          <NorthStarThreeMark isNav={isNav} />
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
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-100 via-emerald-200/80 to-transparent blur-[1.6px]",
                isNav ? "right-2 h-[4px] w-12" : "right-3 h-[7px] w-[6rem]"
              )}
            />
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-100 via-emerald-300/70 to-transparent blur-[5px]",
                isNav ? "right-1 h-[8px] w-14" : "right-2 h-[12px] w-[7rem]"
              )}
            />
            {trailPixels.map((pixel, index) => (
              <span
                key={`${variant}-trail-${index}`}
                className="trail-pixel absolute rounded-[1px] bg-emerald-50 shadow-[0_0_16px_rgba(52,211,153,0.9)]"
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
                  <stop offset="0.42" stopColor="rgba(52,211,153,0.3)" />
                  <stop offset="1" stopColor="rgba(167,243,208,0.82)" />
                </linearGradient>
                <radialGradient id={`northstar-comet-head-${variant}`} cx="58%" cy="42%" r="62%">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="0.24" stopColor="#d9fdf8" />
                  <stop offset="0.62" stopColor="#a7f3d0" />
                  <stop offset="1" stopColor="#34d399" />
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
