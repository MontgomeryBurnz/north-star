"use client";

import { useEffect, useId, useRef } from "react";

import type {
  BoxGeometry,
  Group,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  Timer,
  WebGLRenderer
} from "three";

import { cn } from "@/lib/utils";

type MarkVariant = "hero" | "nav";

type TrailPixel = {
  left: number;
  top: number;
  size: number;
  opacity: number;
};

type MaterialConfig = {
  color: number;
  emissive: number;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
};

type ThreeRuntime = typeof import("three");

type NorthStarScene = {
  camera: OrthographicCamera;
  geometries: BoxGeometry[];
  group: Group;
  materials: MeshStandardMaterial[];
  renderer: WebGLRenderer;
  scene: Scene;
};

const MARK_SCALE: Record<MarkVariant, number> = {
  hero: 0.88,
  nav: 0.7
};

const CAMERA_FRUSTUM: Record<MarkVariant, number> = {
  hero: 3.8,
  nav: 3.55
};

const MARK_ROTATION = {
  pitch: 0.18,
  roll: -0.04,
  speed: -0.26
};

const MAX_RENDER_PIXEL_RATIO = 2;
const TRAIL_FLICKER_STAGGER_MS = 120;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const FACE_MATERIALS: MaterialConfig[] = [
  { color: 0x10b981, emissive: 0x065f46, emissiveIntensity: 0.22, metalness: 0.32, roughness: 0.34 },
  { color: 0x047857, emissive: 0x064e3b, emissiveIntensity: 0.18, metalness: 0.24, roughness: 0.46 },
  { color: 0xd1fae5, emissive: 0x6ee7b7, emissiveIntensity: 0.36, metalness: 0.18, roughness: 0.26 },
  { color: 0x022c22, emissive: 0x022c22, emissiveIntensity: 0.12, metalness: 0.18, roughness: 0.58 },
  { color: 0x34d399, emissive: 0x059669, emissiveIntensity: 0.34, metalness: 0.22, roughness: 0.28 },
  { color: 0x064e3b, emissive: 0x022c22, emissiveIntensity: 0.16, metalness: 0.18, roughness: 0.52 }
];

const TRAIL_PIXELS: Record<MarkVariant, TrailPixel[]> = {
  hero: [
    { left: 92, top: 12, size: 3, opacity: 0.2 },
    { left: 82, top: 7, size: 3, opacity: 0.24 },
    { left: 72, top: 16, size: 3, opacity: 0.3 },
    { left: 61, top: 6, size: 4, opacity: 0.38 },
    { left: 50, top: 18, size: 4, opacity: 0.48 },
    { left: 39, top: 7, size: 5, opacity: 0.6 },
    { left: 28, top: 19, size: 5, opacity: 0.72 },
    { left: 17, top: 9, size: 6, opacity: 0.86 },
    { left: 7, top: 20, size: 6, opacity: 0.96 }
  ],
  nav: [
    { left: 42, top: 8, size: 2, opacity: 0.22 },
    { left: 37, top: 4, size: 2, opacity: 0.3 },
    { left: 32, top: 10, size: 2, opacity: 0.38 },
    { left: 27, top: 5, size: 3, opacity: 0.48 },
    { left: 22, top: 11, size: 3, opacity: 0.6 },
    { left: 16, top: 6, size: 3, opacity: 0.72 },
    { left: 10, top: 12, size: 4, opacity: 0.84 },
    { left: 4, top: 7, size: 4, opacity: 0.94 }
  ]
};

function createNorthStarScene(THREE: ThreeRuntime, canvas: HTMLCanvasElement, variant: MarkVariant): NorthStarScene {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
    powerPreference: "high-performance"
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO));

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

  const rimLight = new THREE.PointLight(0xa7f3d0, 7.6, 8);
  rimLight.position.set(0.2, 1.8, 2.8);
  scene.add(rimLight);

  const group = new THREE.Group();
  group.scale.setScalar(MARK_SCALE[variant]);
  scene.add(group);

  const materials = FACE_MATERIALS.map((material) => new THREE.MeshStandardMaterial(material));
  const verticalGeometry = new THREE.BoxGeometry(0.5, 2.65, 0.95);
  const diagonalGeometry = new THREE.BoxGeometry(0.52, 3.08, 0.95);

  const left = new THREE.Mesh(verticalGeometry, materials);
  left.position.set(-0.78, 0, 0);
  group.add(left);

  const right = new THREE.Mesh(verticalGeometry, materials);
  right.position.set(0.78, 0, 0);
  group.add(right);

  const diagonal = new THREE.Mesh(diagonalGeometry, materials);
  diagonal.rotation.z = -0.58;
  diagonal.position.set(0, 0, 0.02);
  group.add(diagonal);

  return {
    camera,
    geometries: [verticalGeometry, diagonalGeometry],
    group,
    materials,
    renderer,
    scene
  };
}

function resizeNorthStarScene(scene: NorthStarScene, canvas: HTMLCanvasElement, variant: MarkVariant) {
  const { width, height } = canvas.getBoundingClientRect();
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);

  scene.renderer.setSize(safeWidth, safeHeight, false);

  const aspect = safeWidth / safeHeight;
  const frustum = CAMERA_FRUSTUM[variant];
  scene.camera.left = (-frustum * aspect) / 2;
  scene.camera.right = (frustum * aspect) / 2;
  scene.camera.top = frustum / 2;
  scene.camera.bottom = -frustum / 2;
  scene.camera.updateProjectionMatrix();
}

function updateNorthStarRotation(group: Group, elapsedSeconds: number) {
  group.rotation.x = MARK_ROTATION.pitch;
  group.rotation.y = elapsedSeconds * MARK_ROTATION.speed;
  group.rotation.z = MARK_ROTATION.roll;
}

function disposeNorthStarScene(scene: NorthStarScene) {
  scene.renderer.dispose();
  scene.geometries.forEach((geometry) => geometry.dispose());
  scene.materials.forEach((material) => material.dispose());
}

function prefersReducedMotion() {
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

function NorthStarThreeMark({ variant }: { variant: MarkVariant }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let animationFrame = 0;
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let removeWindowResizeListener: (() => void) | undefined;
    let sceneHandle: NorthStarScene | undefined;
    let timerHandle: Timer | undefined;

    import("three")
      .then((THREE) => {
        if (disposed) {
          return;
        }

        sceneHandle = createNorthStarScene(THREE, canvas, variant);

        const resize = () => {
          if (sceneHandle) {
            resizeNorthStarScene(sceneHandle, canvas, variant);
          }
        };

        resize();

        if (typeof ResizeObserver === "undefined") {
          window.addEventListener("resize", resize);
          removeWindowResizeListener = () => window.removeEventListener("resize", resize);
        } else {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(canvas);
        }

        const timer = new THREE.Timer();
        timer.connect(document);
        timerHandle = timer;
        const reduceMotion = prefersReducedMotion();
        const renderFrame = (timestamp?: number) => {
          if (!sceneHandle || disposed) {
            return;
          }

          timer.update(timestamp);
          updateNorthStarRotation(sceneHandle.group, timer.getElapsed());
          sceneHandle.renderer.render(sceneHandle.scene, sceneHandle.camera);

          if (!reduceMotion) {
            animationFrame = window.requestAnimationFrame(renderFrame);
          }
        };

        renderFrame();
      })
      .catch(() => {
        if (!disposed) {
          canvas.dataset.northStar3d = "unavailable";
        }
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      removeWindowResizeListener?.();
      timerHandle?.dispose();

      if (sceneHandle) {
        disposeNorthStarScene(sceneHandle);
      }
    };
  }, [variant]);

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" data-north-star-3d aria-hidden="true" />;
}

function BrandGlow({ variant }: { variant: MarkVariant }) {
  const isNav = variant === "nav";

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,250,229,0.18)_0%,rgba(52,211,153,0.2)_32%,rgba(16,185,129,0.08)_58%,transparent_76%)] blur-sm",
          isNav ? "h-12 w-12" : "h-40 w-40"
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.16)_0%,rgba(16,185,129,0.08)_42%,transparent_72%)] blur-xl",
          isNav ? "h-14 w-14" : "h-48 w-48"
        )}
      />
    </>
  );
}

function CometTrail({ variant }: { variant: MarkVariant }) {
  return (
    <>
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-100 via-emerald-200/80 to-transparent blur-[1.6px]",
          variant === "nav" ? "right-2 h-[4px] w-12" : "right-3 h-[7px] w-[6rem]"
        )}
      />
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-100 via-emerald-300/70 to-transparent blur-[5px]",
          variant === "nav" ? "right-1 h-[8px] w-14" : "right-2 h-[12px] w-[7rem]"
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

function CometHead({ variant, gradientPrefix }: { gradientPrefix: string; variant: MarkVariant }) {
  const tailId = `${gradientPrefix}-tail`;
  const headId = `${gradientPrefix}-head`;
  const burnId = `${gradientPrefix}-burn`;

  return (
    <svg
      viewBox="0 0 28 20"
      aria-hidden="true"
      className={cn(
        "absolute right-0 top-1/2 -translate-y-1/2 overflow-visible drop-shadow-[0_0_18px_rgba(167,243,208,0.78)]",
        variant === "nav" ? "h-4 w-4" : "h-6 w-6"
      )}
    >
      <defs>
        <linearGradient id={tailId} x1="2" y1="10" x2="16" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgba(255,255,255,0)" />
          <stop offset="0.42" stopColor="rgba(52,211,153,0.3)" />
          <stop offset="1" stopColor="rgba(167,243,208,0.82)" />
        </linearGradient>
        <radialGradient id={headId} cx="58%" cy="42%" r="62%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.24" stopColor="#d9fdf8" />
          <stop offset="0.62" stopColor="#a7f3d0" />
          <stop offset="1" stopColor="#34d399" />
        </radialGradient>
        <radialGradient id={burnId} cx="72%" cy="40%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.18" stopColor="#fef9c3" />
          <stop offset="0.46" stopColor="#bbf7d0" />
          <stop offset="1" stopColor="rgba(52,211,153,0)" />
        </radialGradient>
      </defs>
      <g transform="rotate(-18 18 10)">
        <path
          d="M3 10c3.9-1.8 7.7-2.8 12.4-3-2 1.2-3.8 2.7-5 4.7-2.7-.2-5.1-.7-7.4-1.7z"
          fill={`url(#${tailId})`}
          opacity="0.92"
        />
        <path
          d="M15.6 4.5c4.4-1 8.5 1.4 9.7 5.4-1.1 4.1-5.4 6.6-9.7 5.6 1.8-1.4 2.9-3.3 3-5.5-.1-2.2-1.2-4.1-3-5.5z"
          fill={`url(#${burnId})`}
          opacity="0.96"
        />
        <ellipse cx="18" cy="10" rx="4.7" ry="3.5" fill={`url(#${headId})`} />
        <ellipse cx="20.2" cy="9.1" rx="2.15" ry="1.4" fill="rgba(255,255,255,0.92)" />
        <circle cx="21.1" cy="8.6" r="0.72" fill="#fef9c3" />
      </g>
    </svg>
  );
}

function OrbitingComet({ orbitClassName, variant }: { orbitClassName?: string; variant: MarkVariant }) {
  const gradientPrefix = `northstar-comet-${useId().replace(/:/g, "")}`;
  const isNav = variant === "nav";

  return (
    <div className={cn("north-star-orbit-spin pointer-events-none absolute inset-0", orbitClassName)}>
      <div
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          isNav ? "h-11 w-11" : "h-[152px] w-[152px]"
        )}
      >
        <div className={cn("absolute left-1/2 -translate-x-1/2", isNav ? "-top-[9px] h-5 w-12" : "-top-[15px] h-7 w-24")}>
          <CometTrail variant={variant} />
          <CometHead gradientPrefix={gradientPrefix} variant={variant} />
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

      <div className={cn("absolute inset-0 flex items-center justify-center", isNav ? "[perspective:900px]" : "[perspective:1400px]")}>
        <div className={cn("relative", isNav ? "h-10 w-10" : "h-36 w-36")}>
          <NorthStarThreeMark variant={variant} />
        </div>
      </div>

      <OrbitingComet orbitClassName={orbitClassName} variant={variant} />

      <style jsx global>{`
        .north-star-orbit-spin {
          animation: orbit-spin 14s linear infinite;
        }

        .north-star-trail-pixel {
          animation: trail-pixel-flicker 1.6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .north-star-orbit-spin,
          .north-star-trail-pixel {
            animation: none;
          }
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
