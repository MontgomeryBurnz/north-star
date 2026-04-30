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
    cameraZ: 3.75,
    className: "h-44 w-44",
    earthRadius: 1.13,
    northStarScale: 0.42,
    starCount: 130
  },
  nav: {
    cameraZ: 4.2,
    className: "h-12 w-12",
    earthRadius: 0.98,
    northStarScale: 0.24,
    starCount: 54
  }
};

const LAND_MASSES: Array<Array<[number, number]>> = [
  [
    [-168, 72],
    [-150, 70],
    [-137, 62],
    [-126, 55],
    [-124, 48],
    [-117, 34],
    [-107, 25],
    [-97, 18],
    [-86, 15],
    [-80, 25],
    [-74, 41],
    [-61, 50],
    [-52, 58],
    [-69, 64],
    [-86, 73],
    [-108, 73],
    [-132, 70],
    [-151, 61],
    [-166, 58],
    [-179, 63]
  ],
  [
    [-82, 12],
    [-74, 7],
    [-66, -4],
    [-58, -15],
    [-51, -25],
    [-47, -38],
    [-55, -54],
    [-67, -50],
    [-73, -36],
    [-79, -20],
    [-81, -4]
  ],
  [
    [-73, 78],
    [-45, 83],
    [-18, 76],
    [-18, 62],
    [-40, 59],
    [-58, 65]
  ],
  [
    [-11, 58],
    [2, 60],
    [13, 56],
    [25, 60],
    [41, 56],
    [47, 45],
    [32, 38],
    [16, 40],
    [3, 44],
    [-9, 43]
  ],
  [
    [-17, 36],
    [4, 36],
    [22, 31],
    [34, 22],
    [44, 8],
    [51, -8],
    [42, -25],
    [31, -34],
    [18, -35],
    [9, -25],
    [-4, -12],
    [-12, 5],
    [-16, 21]
  ],
  [
    [36, 61],
    [54, 67],
    [80, 72],
    [110, 69],
    [139, 57],
    [154, 45],
    [145, 32],
    [122, 21],
    [110, 6],
    [93, 8],
    [79, 18],
    [67, 8],
    [55, 21],
    [45, 31],
    [39, 47]
  ],
  [
    [112, -10],
    [130, -12],
    [153, -25],
    [148, -40],
    [132, -43],
    [116, -34],
    [109, -24]
  ],
  [
    [-180, -67],
    [-130, -73],
    [-68, -70],
    [-12, -74],
    [43, -69],
    [98, -74],
    [151, -70],
    [180, -67],
    [180, -86],
    [-180, -86]
  ]
];

const ISLANDS: Array<[number, number, number]> = [
  [-157, 20, 1.9],
  [-4, 54, 2.7],
  [18, 40, 2.4],
  [44, -20, 3.2],
  [78, 7, 2.9],
  [103, 1, 2.2],
  [122, 13, 2.6],
  [139, 37, 2.3],
  [173, -41, 2.6]
];

const MOUNTAIN_RANGES: Array<Array<[number, number]>> = [
  [
    [-151, 61],
    [-132, 52],
    [-121, 42],
    [-112, 34],
    [-105, 27]
  ],
  [
    [-78, 8],
    [-74, -8],
    [-70, -21],
    [-68, -36],
    [-71, -49]
  ],
  [
    [-6, 43],
    [9, 45],
    [21, 43],
    [31, 39]
  ],
  [
    [30, 30],
    [45, 31],
    [62, 33],
    [78, 31],
    [92, 29]
  ],
  [
    [98, 45],
    [116, 43],
    [132, 48],
    [144, 52]
  ],
  [
    [18, 4],
    [24, -8],
    [29, -18],
    [31, -29]
  ]
];

const LAND_FILLS = [
  "rgba(134,239,172,0.96)",
  "rgba(74,222,128,0.96)",
  "rgba(220,252,231,0.94)",
  "rgba(52,211,153,0.96)",
  "rgba(187,247,208,0.92)",
  "rgba(110,231,183,0.95)",
  "rgba(190,242,100,0.88)",
  "rgba(236,253,245,0.96)"
];

const CITY_LIGHTS: Array<[number, number]> = [
  [-122, 37],
  [-118, 34],
  [-95, 29],
  [-87, 42],
  [-74, 41],
  [-99, 19],
  [-46, -23],
  [-58, -34],
  [-0.1, 51],
  [2, 49],
  [13, 52],
  [29, 41],
  [31, 30],
  [37, -1],
  [55, 25],
  [77, 28],
  [90, 23],
  [103, 1],
  [121, 31],
  [116, 40],
  [126, 37],
  [139, 36],
  [151, -34],
  [174, -37]
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

function traceGeoPolygon(
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
}

function drawLandMass(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  width: number,
  height: number
) {
  traceGeoPolygon(context, points, width, height);
  context.fill();
  context.stroke();
}

function drawGeoLine(
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

  context.stroke();
}

function createEarthTexture() {
  const size = 1536;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = size;
  canvas.height = size / 2;

  if (!context) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const random = seededRandom(814);
  const ocean = context.createLinearGradient(0, 0, width, height);
  ocean.addColorStop(0, "#020617");
  ocean.addColorStop(0.34, "#075985");
  ocean.addColorStop(0.68, "#164e63");
  ocean.addColorStop(1, "#001014");

  context.fillStyle = ocean;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.11;
  context.strokeStyle = "#7dd3fc";
  context.lineWidth = 1.3;
  for (let index = 0; index < 90; index += 1) {
    const y = random() * height;
    const x = random() * width;
    const length = 48 + random() * 180;
    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(x + length * 0.35, y - 18, x + length * 0.7, y + 18, x + length, y);
    context.stroke();
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.09;
  context.strokeStyle = "#7dd3fc";
  context.lineWidth = 1.2;

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
  context.lineJoin = "round";
  context.shadowBlur = 18;
  context.shadowColor = "rgba(52,211,153,0.48)";
  context.strokeStyle = "rgba(236,253,245,0.6)";
  context.lineWidth = 5.4;
  LAND_MASSES.forEach((mass, index) => {
    context.fillStyle = LAND_FILLS[index] ?? LAND_FILLS[0];
    drawLandMass(context, mass, width, height);
  });
  context.restore();

  context.save();
  context.globalAlpha = 0.2;
  context.fillStyle = "#d9f99d";
  context.strokeStyle = "rgba(190,242,100,0.24)";
  context.lineWidth = 1.4;
  LAND_MASSES.forEach((mass) => {
    context.save();
    context.translate(0, 5);
    drawLandMass(context, mass, width, height);
    context.restore();
  });
  context.restore();

  context.save();
  context.lineJoin = "round";
  context.shadowBlur = 9;
  context.shadowColor = "rgba(236,253,245,0.5)";
  context.strokeStyle = "rgba(236,253,245,0.82)";
  context.lineWidth = 2.8;
  LAND_MASSES.forEach((mass) => {
    traceGeoPolygon(context, mass, width, height);
    context.stroke();
  });
  context.restore();

  context.save();
  context.globalAlpha = 0.44;
  context.strokeStyle = "rgba(6,78,59,0.78)";
  context.lineWidth = 2.2;
  LAND_MASSES.forEach((mass) => {
    traceGeoPolygon(context, mass, width, height);
    context.stroke();
  });
  context.restore();

  context.save();
  context.fillStyle = "rgba(236,253,245,0.84)";
  context.strokeStyle = "rgba(167,243,208,0.54)";
  context.lineWidth = 1.5;
  context.shadowBlur = 6;
  context.shadowColor = "rgba(236,253,245,0.45)";
  ISLANDS.forEach(([lon, lat, radius]) => {
    const { x, y } = lonLatToTexturePoint(lon, lat, width, height);
    context.beginPath();
    context.ellipse(x, y, radius * 1.35, radius, -0.22, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });
  context.restore();

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(236,253,245,0.48)";
  context.lineWidth = 3.2;
  context.shadowBlur = 8;
  context.shadowColor = "rgba(190,242,100,0.34)";
  MOUNTAIN_RANGES.forEach((range) => drawGeoLine(context, range, width, height));
  context.restore();

  context.save();
  context.fillStyle = "rgba(236,253,245,0.72)";
  context.strokeStyle = "rgba(125,211,252,0.3)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, height * 0.08);
  context.bezierCurveTo(width * 0.18, height * 0.02, width * 0.32, height * 0.1, width * 0.5, height * 0.05);
  context.bezierCurveTo(width * 0.66, height * 0.01, width * 0.82, height * 0.09, width, height * 0.04);
  context.lineTo(width, 0);
  context.lineTo(0, 0);
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(0, height * 0.91);
  context.bezierCurveTo(width * 0.18, height * 0.96, width * 0.34, height * 0.9, width * 0.5, height * 0.94);
  context.bezierCurveTo(width * 0.68, height * 0.98, width * 0.82, height * 0.9, width, height * 0.95);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = "rgba(254,249,195,0.88)";
  context.shadowBlur = 9;
  context.shadowColor = "rgba(254,249,195,0.8)";
  CITY_LIGHTS.forEach(([lon, lat]) => {
    const { x, y } = lonLatToTexturePoint(lon, lat, width, height);
    context.beginPath();
    context.arc(x, y, 2.35, 0, Math.PI * 2);
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
  earthGroup.rotation.set(-0.15, 0.18, 0.08);
  scene.add(earthGroup);

  const earthGeometry = track(new THREE.SphereGeometry(config.earthRadius, 96, 96));
  const earthMaterial = track(
    new THREE.MeshStandardMaterial({
      bumpMap: earthTexture,
      bumpScale: 0.045,
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
      opacity: 0.2,
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
