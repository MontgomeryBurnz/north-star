"use client";

import { useEffect, useRef, useState } from "react";
import type * as ThreeNamespace from "three";
import { cn } from "@/lib/utils";

type MarkVariant = "hero" | "nav";
type ThreeModule = typeof ThreeNamespace;

type SceneConfig = {
  cameraZ: number;
  className: string;
  earthRadius: number;
  northStarScale: number;
  starCount: number;
};

const SCENE_CONFIG: Record<MarkVariant, SceneConfig> = {
  hero: {
    cameraZ: 4.1,
    className: "h-44 w-44",
    earthRadius: 1.08,
    northStarScale: 0.42,
    starCount: 130
  },
  nav: {
    cameraZ: 4.4,
    className: "h-12 w-12",
    earthRadius: 0.94,
    northStarScale: 0.24,
    starCount: 54
  }
};

const LAND_MASSES: Array<Array<[number, number]>> = [
  [
    [-168, 71],
    [-137, 72],
    [-111, 62],
    [-97, 52],
    [-80, 48],
    [-65, 34],
    [-76, 21],
    [-101, 18],
    [-118, 29],
    [-134, 47],
    [-158, 56]
  ],
  [
    [-82, 13],
    [-62, 9],
    [-49, -8],
    [-44, -25],
    [-55, -53],
    [-68, -45],
    [-77, -20]
  ],
  [
    [-73, 76],
    [-21, 82],
    [-14, 63],
    [-48, 59]
  ],
  [
    [-12, 58],
    [31, 70],
    [55, 58],
    [37, 43],
    [6, 36],
    [-10, 45]
  ],
  [
    [-18, 35],
    [13, 37],
    [34, 24],
    [49, 5],
    [35, -33],
    [15, -35],
    [-4, -18],
    [-12, 9]
  ],
  [
    [36, 61],
    [87, 73],
    [137, 58],
    [151, 43],
    [121, 22],
    [104, 5],
    [76, 8],
    [54, 25],
    [43, 42]
  ],
  [
    [111, -11],
    [155, -12],
    [150, -39],
    [119, -44],
    [106, -28]
  ]
];

const CITY_LIGHTS: Array<[number, number]> = [
  [-122, 37],
  [-118, 34],
  [-74, 41],
  [-46, -23],
  [-0.1, 51],
  [2, 49],
  [13, 52],
  [29, 41],
  [55, 25],
  [77, 28],
  [103, 1],
  [121, 31],
  [139, 36],
  [151, -34]
];

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function lonLatToTexturePoint(lon: number, lat: number, width: number, height: number) {
  return {
    x: ((lon + 180) / 360) * width,
    y: ((90 - lat) / 180) * height
  };
}

function drawLandMass(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  width: number,
  height: number
) {
  const [firstLon, firstLat] = points[0];
  const first = lonLatToTexturePoint(firstLon, firstLat, width, height);

  context.beginPath();
  context.moveTo(first.x, first.y);

  for (const [lon, lat] of points.slice(1)) {
    const point = lonLatToTexturePoint(lon, lat, width, height);
    context.lineTo(point.x, point.y);
  }

  context.closePath();
  context.fill();
  context.stroke();
}

function createEarthTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size / 2;

  if (!context) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const ocean = context.createLinearGradient(0, 0, width, height);
  ocean.addColorStop(0, "#031915");
  ocean.addColorStop(0.42, "#052d2b");
  ocean.addColorStop(1, "#010708");

  context.fillStyle = ocean;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = "#67e8f9";
  context.lineWidth = 1;

  for (let lon = -150; lon <= 180; lon += 30) {
    const { x } = lonLatToTexturePoint(lon, 0, width, height);
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let lat = -60; lat <= 60; lat += 20) {
    const { y } = lonLatToTexturePoint(0, lat, width, height);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();

  context.save();
  context.shadowBlur = 18;
  context.shadowColor = "rgba(52,211,153,0.48)";
  context.fillStyle = "rgba(22,163,74,0.74)";
  context.strokeStyle = "rgba(190,242,100,0.22)";
  context.lineWidth = 4;
  LAND_MASSES.forEach((mass) => drawLandMass(context, mass, width, height));
  context.restore();

  context.save();
  context.globalAlpha = 0.36;
  context.fillStyle = "#a7f3d0";
  context.strokeStyle = "rgba(236,253,245,0.28)";
  context.lineWidth = 1;
  LAND_MASSES.forEach((mass) => {
    context.save();
    context.translate(0, 4);
    drawLandMass(context, mass, width, height);
    context.restore();
  });
  context.restore();

  context.save();
  context.fillStyle = "rgba(254,249,195,0.88)";
  context.shadowBlur = 8;
  context.shadowColor = "rgba(254,249,195,0.8)";
  CITY_LIGHTS.forEach(([lon, lat]) => {
    const { x, y } = lonLatToTexturePoint(lon, lat, width, height);
    context.beginPath();
    context.arc(x, y, 2.1, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();

  return canvas;
}

function createCloudTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size / 2;

  if (!context) return canvas;

  const random = seededRandom(406);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineCap = "round";

  for (let index = 0; index < 46; index += 1) {
    const y = random() * canvas.height;
    const x = random() * canvas.width;
    const length = 44 + random() * 160;

    context.save();
    context.translate(x, y);
    context.rotate((random() - 0.5) * 0.6);
    context.globalAlpha = 0.08 + random() * 0.16;
    context.strokeStyle = "#ecfeff";
    context.lineWidth = 5 + random() * 12;
    context.shadowBlur = 14;
    context.shadowColor = "rgba(236,253,245,0.38)";
    context.beginPath();
    context.moveTo(-length / 2, 0);
    context.bezierCurveTo(-length * 0.16, -18, length * 0.15, 18, length / 2, 0);
    context.stroke();
    context.restore();
  }

  return canvas;
}

function createNorthStarTexture() {
  const size = 160;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size;

  if (!context) return canvas;

  const center = size / 2;
  const halo = context.createRadialGradient(center, center, 0, center, center, center);
  halo.addColorStop(0, "rgba(255,255,255,1)");
  halo.addColorStop(0.12, "rgba(236,253,245,0.98)");
  halo.addColorStop(0.28, "rgba(167,243,208,0.72)");
  halo.addColorStop(0.58, "rgba(52,211,153,0.24)");
  halo.addColorStop(1, "rgba(52,211,153,0)");

  context.fillStyle = halo;
  context.fillRect(0, 0, size, size);

  context.save();
  context.translate(center, center);
  context.strokeStyle = "rgba(255,255,255,0.86)";
  context.lineWidth = 2;
  context.shadowBlur = 14;
  context.shadowColor = "rgba(236,253,245,0.94)";

  for (const rotation of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
    context.rotate(rotation);
    context.beginPath();
    context.moveTo(-46, 0);
    context.lineTo(46, 0);
    context.stroke();
    context.rotate(-rotation);
  }

  context.restore();
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(center, center, 5, 0, Math.PI * 2);
  context.fill();

  return canvas;
}

function createStarField(THREE: ThreeModule, count: number) {
  const random = seededRandom(92 + count);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const spread = 4.5;
    const x = (random() - 0.5) * spread;
    const y = (random() - 0.5) * spread;
    const z = -2.2 - random() * 1.8;
    const intensity = 0.48 + random() * 0.5;

    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;

    color.setRGB(0.72 * intensity, 1 * intensity, 0.86 * intensity);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  return geometry;
}

function BrandMarkFallback({ variant }: { variant: MarkVariant }) {
  const isNav = variant === "nav";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative rounded-full bg-[radial-gradient(circle_at_38%_34%,rgba(236,253,245,0.9)_0%,rgba(167,243,208,0.46)_10%,rgba(20,184,166,0.25)_26%,rgba(3,7,18,0.64)_62%,transparent_74%)] shadow-[0_0_36px_rgba(52,211,153,0.42)]",
        isNav ? "h-12 w-12" : "h-44 w-44"
      )}
    >
      <span
        className={cn(
          "absolute rounded-full bg-white shadow-[0_0_22px_rgba(236,253,245,0.94),0_0_42px_rgba(52,211,153,0.52)]",
          isNav ? "right-2 top-2 h-1.5 w-1.5" : "right-9 top-8 h-3 w-3"
        )}
      />
    </div>
  );
}

function initializeBrandScene({
  THREE,
  canvas,
  config,
  onReady,
  track,
  variant
}: {
  THREE: ThreeModule;
  canvas: HTMLCanvasElement;
  config: SceneConfig;
  onReady: () => void;
  track: <T extends { dispose: () => void }>(item: T) => T;
  variant: MarkVariant;
}) {
  let frameId = 0;
  let ready = false;

  const renderer = track(
    new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true
    })
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, config.cameraZ);

  const earthTexture = track(new THREE.CanvasTexture(createEarthTexture()));
  earthTexture.colorSpace = THREE.SRGBColorSpace;
  earthTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  const cloudTexture = track(new THREE.CanvasTexture(createCloudTexture()));
  cloudTexture.colorSpace = THREE.SRGBColorSpace;

  const northStarTexture = track(new THREE.CanvasTexture(createNorthStarTexture()));
  northStarTexture.colorSpace = THREE.SRGBColorSpace;

  const earthGroup = new THREE.Group();
  earthGroup.rotation.set(-0.15, -0.72, 0.08);
  scene.add(earthGroup);

  const earthGeometry = track(new THREE.SphereGeometry(config.earthRadius, 96, 96));
  const earthMaterial = track(
    new THREE.MeshStandardMaterial({
      emissive: new THREE.Color("#052e22"),
      emissiveIntensity: 0.2,
      map: earthTexture,
      metalness: 0.08,
      roughness: 0.72
    })
  );
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earthGroup.add(earth);

  const cloudGeometry = track(new THREE.SphereGeometry(config.earthRadius * 1.014, 96, 96));
  const cloudMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#ecfeff",
      depthWrite: false,
      map: cloudTexture,
      opacity: 0.34,
      transparent: true
    })
  );
  const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
  earthGroup.add(clouds);

  const atmosphereGeometry = track(new THREE.SphereGeometry(config.earthRadius * 1.07, 96, 96));
  const atmosphereMaterial = track(
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: "#6ee7b7",
      depthWrite: false,
      opacity: variant === "nav" ? 0.16 : 0.2,
      side: THREE.BackSide,
      transparent: true
    })
  );
  scene.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));

  const starsGeometry = track(createStarField(THREE, config.starCount));
  const starsMaterial = track(
    new THREE.PointsMaterial({
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      size: variant === "nav" ? 0.035 : 0.026,
      transparent: true,
      vertexColors: true
    })
  );
  scene.add(new THREE.Points(starsGeometry, starsMaterial));

  const northStarMaterial = track(
    new THREE.SpriteMaterial({
      blending: THREE.AdditiveBlending,
      color: "#ecfdf5",
      depthWrite: false,
      map: northStarTexture,
      transparent: true
    })
  );
  const northStar = new THREE.Sprite(northStarMaterial);
  northStar.position.set(config.earthRadius * 1.08, config.earthRadius * 0.84, -0.82);
  northStar.scale.setScalar(config.northStarScale);
  scene.add(northStar);

  const northStarHaloMaterial = track(
    new THREE.SpriteMaterial({
      blending: THREE.AdditiveBlending,
      color: "#34d399",
      depthWrite: false,
      map: northStarTexture,
      opacity: 0.34,
      transparent: true
    })
  );
  const northStarHalo = new THREE.Sprite(northStarHaloMaterial);
  northStarHalo.position.copy(northStar.position);
  northStarHalo.scale.setScalar(config.northStarScale * 2.8);
  scene.add(northStarHalo);

  scene.add(new THREE.AmbientLight("#d1fae5", 0.42));

  const sunLight = new THREE.DirectionalLight("#ecfeff", 2.15);
  sunLight.position.set(2.8, 2.3, 4.2);
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight("#34d399", 1.28);
  rimLight.position.set(-3.2, 0.6, -1.8);
  scene.add(rimLight);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const timer = new THREE.Timer();
  timer.connect(document);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const render = (timestamp?: number) => {
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.05);
    const elapsed = timer.getElapsed();

    earthGroup.rotation.y += delta * 0.045;
    clouds.rotation.y += delta * 0.018;
    northStarMaterial.opacity = 0.92 + Math.sin(elapsed * 1.1) * 0.08;
    northStarHaloMaterial.opacity = 0.28 + Math.sin(elapsed * 1.1) * 0.09;

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      onReady();
    }

    if (!reduceMotion) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  render();

  return () => {
    window.cancelAnimationFrame(frameId);
    timer.disconnect();
    timer.dispose();
    resizeObserver.disconnect();
  };
}

export function AnimatedNorthStarMark({
  variant = "hero",
  className
}: {
  variant?: MarkVariant;
  className?: string;
  orbitClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderFallback, setRenderFallback] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const config = SCENE_CONFIG[variant];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let cleanupScene: (() => void) | undefined;
    setSceneReady(false);

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T) => {
      disposables.push(item);
      return item;
    };

    const disposeTracked = () => {
      while (disposables.length > 0) {
        disposables.pop()?.dispose();
      }
    };

    void import("three")
      .then((THREE) => {
        if (disposed) return;

        cleanupScene = initializeBrandScene({
          THREE,
          canvas,
          config,
          onReady: () => {
            if (!disposed) setSceneReady(true);
          },
          track,
          variant
        });
      })
      .catch(() => {
        disposeTracked();
        if (!disposed) setRenderFallback(true);
      });

    return () => {
      disposed = true;
      cleanupScene?.();
      disposeTracked();
    };
  }, [config, variant]);

  if (renderFallback) {
    return <BrandMarkFallback variant={variant} />;
  }

  return (
    <div
      className={cn("relative isolate shrink-0 overflow-visible", config.className, className)}
      aria-label="Slowly rotating Earth with a bright North Star"
      role="img"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(167,243,208,0.18)_0%,rgba(52,211,153,0.15)_34%,rgba(6,78,59,0.08)_58%,transparent_76%)] blur-xl",
          variant === "nav" ? "h-16 w-16" : "h-56 w-56"
        )}
      />
      {!sceneReady ? (
        <div aria-hidden="true" className="absolute inset-0">
          <BrandMarkFallback variant={variant} />
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className={cn("block h-full w-full transition-opacity duration-500", sceneReady ? "opacity-100" : "opacity-0")}
      />
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
