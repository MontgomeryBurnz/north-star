"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MarkVariant = "hero" | "nav";

type SceneConfig = {
  className: string;
  earthScale: number;
  particleCount: number;
  particleOpacity: number;
  starScale: number;
};

type CelestialParticle = {
  alpha: number;
  drift: number;
  length: number;
  phase: number;
  radius: number;
  speed: number;
  x: number;
  y: number;
};

type CelestialParticleState = {
  particles: CelestialParticle[];
};

const SCENE_CONFIG: Record<MarkVariant, SceneConfig> = {
  hero: {
    className: "h-44 w-44",
    earthScale: 0.27,
    particleCount: 76,
    particleOpacity: 1,
    starScale: 1
  },
  nav: {
    className: "h-12 w-12",
    earthScale: 0.31,
    particleCount: 18,
    particleOpacity: 0.5,
    starScale: 0.58
  }
};

function randomCelestialParticleState(count: number, width: number, height: number): CelestialParticleState {
  return {
    particles: Array.from({ length: count }, () => ({
      alpha: 0.16 + Math.random() * 0.48,
      drift: (Math.random() - 0.5) * 0.16,
      length: height * (0.07 + Math.random() * 0.23),
      phase: Math.random() * Math.PI * 2,
      radius: 0.45 + Math.random() * 1.35,
      speed: 0.12 + Math.random() * 0.48,
      x: Math.random() * width,
      y: Math.random() * height
    }))
  };
}

function drawStar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  glow = 1
) {
  context.save();
  context.translate(x, y);
  context.shadowColor = "rgba(108, 255, 123, 0.95)";
  context.shadowBlur = 18 * glow;

  const points = 8;
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const angle = (Math.PI / points) * index - Math.PI / 2;
    const pointRadius = index % 2 === 0 ? radius : radius * 0.33;
    const pointX = Math.cos(angle) * pointRadius;
    const pointY = Math.sin(angle) * pointRadius;

    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();

  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.22, "#d9ffe1");
  gradient.addColorStop(0.55, "#6cff7b");
  gradient.addColorStop(1, "#00ff66");
  context.fillStyle = gradient;
  context.fill();

  context.strokeStyle = "rgba(230, 255, 235, 0.95)";
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

function drawCelestialParticles(
  context: CanvasRenderingContext2D,
  state: CelestialParticleState,
  width: number,
  height: number,
  opacity: number,
  time: number
) {
  context.save();
  context.lineCap = "round";

  for (const particle of state.particles) {
    const twinkle = 0.62 + Math.sin(time * 1.9 + particle.phase) * 0.24;
    const alpha = particle.alpha * opacity * twinkle;
    const x = particle.x + Math.sin(time * 0.7 + particle.phase) * width * particle.drift;
    const y = particle.y;
    const tailLength = particle.length * (0.72 + twinkle * 0.28);

    const trail = context.createLinearGradient(x, y - tailLength, x, y);
    trail.addColorStop(0, "rgba(64, 255, 92, 0)");
    trail.addColorStop(0.7, `rgba(76, 255, 108, ${alpha * 0.18})`);
    trail.addColorStop(1, `rgba(232, 255, 236, ${alpha * 0.86})`);

    context.strokeStyle = trail;
    context.shadowColor = "rgba(76, 255, 108, 0.72)";
    context.shadowBlur = 5 + particle.radius * 4;
    context.lineWidth = Math.max(0.55, particle.radius * 0.45);
    context.beginPath();
    context.moveTo(x, y - tailLength);
    context.lineTo(x, y);
    context.stroke();

    context.fillStyle = `rgba(209, 255, 218, ${Math.min(0.92, alpha + 0.24)})`;
    context.beginPath();
    context.arc(x, y, particle.radius, 0, Math.PI * 2);
    context.fill();

    particle.y += particle.speed;
    if (particle.y > height + tailLength + 8) {
      particle.alpha = 0.16 + Math.random() * 0.48;
      particle.length = height * (0.07 + Math.random() * 0.23);
      particle.radius = 0.45 + Math.random() * 1.35;
      particle.speed = 0.12 + Math.random() * 0.48;
      particle.x = Math.random() * width;
      particle.y = -tailLength - Math.random() * height * 0.4;
    }
  }

  context.restore();
}

function drawAmbientGlow(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) {
  context.save();
  const glow = context.createRadialGradient(centerX, centerY, radius * 0.04, centerX, centerY, radius);
  glow.addColorStop(0, "rgba(47, 151, 84, 0.28)");
  glow.addColorStop(0.42, "rgba(0, 96, 46, 0.16)");
  glow.addColorStop(0.76, "rgba(0, 28, 15, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawEarth(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, time: number) {
  context.save();

  const atmosphere = context.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius * 1.55);
  atmosphere.addColorStop(0, "rgba(0, 0, 0, 0)");
  atmosphere.addColorStop(0.56, "rgba(19, 255, 110, 0.15)");
  atmosphere.addColorStop(1, "rgba(19, 255, 110, 0)");
  context.fillStyle = atmosphere;
  context.beginPath();
  context.arc(centerX, centerY, radius * 1.55, 0, Math.PI * 2);
  context.fill();

  const globe = context.createRadialGradient(
    centerX - radius * 0.38,
    centerY - radius * 0.4,
    radius * 0.08,
    centerX,
    centerY,
    radius
  );
  globe.addColorStop(0, "#68ff8d");
  globe.addColorStop(0.22, "#1d7f48");
  globe.addColorStop(0.58, "#061b13");
  globe.addColorStop(1, "#010705");
  context.fillStyle = globe;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();

  const drift = (-time * 0.24) % (Math.PI * 2);
  context.fillStyle = "rgba(118, 255, 132, 0.65)";
  context.shadowColor = "rgba(74, 255, 104, 0.75)";
  context.shadowBlur = 8;

  for (let index = 0; index < 48; index += 1) {
    const angle = index * 0.62 + drift;
    const band = Math.sin(index * 1.7) * radius * 0.52;
    const x = centerX + Math.cos(angle) * radius * 0.74;
    const y = centerY + band * 0.48 + Math.sin(angle * 0.7) * radius * 0.12;
    const blockWidth = 1.8 + (index % 5) * 1.1;
    const blockHeight = 1.3 + (index % 4) * 0.8;
    const alpha = 0.2 + Math.max(0, Math.cos(angle)) * 0.58;

    context.globalAlpha = alpha;
    context.fillRect(x, y, blockWidth, blockHeight);
  }

  context.globalAlpha = 1;
  context.shadowBlur = 0;

  for (let index = 0; index < 130; index += 1) {
    const angle = index * 0.37 + drift * 0.9;
    const yBand = Math.sin(index * 1.31) * radius * 0.78;
    const depth = Math.cos(angle);
    if (depth < -0.16) continue;

    const x = centerX + Math.sin(angle) * radius * 0.82;
    const y = centerY + yBand * 0.48;
    context.globalAlpha = 0.08 + Math.max(0, depth) * 0.42;
    context.fillStyle = index % 7 === 0 ? "#f7fee7" : "#bef264";
    context.beginPath();
    context.arc(x, y, 0.55 + (index % 3) * 0.35, 0, Math.PI * 2);
    context.fill();
  }

  context.globalAlpha = 1;
  context.strokeStyle = "rgba(130, 255, 146, 0.24)";
  context.lineWidth = 0.65;

  for (let index = -2; index <= 2; index += 1) {
    context.beginPath();
    context.ellipse(centerX, centerY + index * radius * 0.22, radius * 0.92, radius * 0.18, 0, 0, Math.PI * 2);
    context.stroke();
  }

  for (let index = -2; index <= 2; index += 1) {
    context.beginPath();
    context.ellipse(centerX, centerY, radius * 0.22 + Math.abs(index) * radius * 0.12, radius * 0.95, 0, 0, Math.PI * 2);
    context.stroke();
  }

  const shadow = context.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.06)");
  shadow.addColorStop(0.55, "rgba(0, 0, 0, 0.12)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0.72)");
  context.fillStyle = shadow;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.restore();

  context.save();
  context.strokeStyle = "rgba(130, 255, 146, 0.85)";
  context.shadowColor = "rgba(0, 255, 102, 0.85)";
  context.shadowBlur = 14;
  context.lineWidth = 1.25;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawOrbit(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  time: number,
  starScale: number
) {
  const orbitRotation = -0.22;
  const orbitTime = time * 0.38;
  const starAngle = orbitTime % (Math.PI * 2);
  const starX = centerX + Math.cos(starAngle) * radiusX;
  const starY = centerY + Math.sin(starAngle) * radiusY;
  const isFront = Math.sin(starAngle) > 0;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(orbitRotation);

  context.strokeStyle = "rgba(0, 255, 102, 0.2)";
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(0, 0, radiusX, radiusY, 0, Math.PI, Math.PI * 2);
  context.stroke();

  context.strokeStyle = "rgba(95, 255, 110, 0.82)";
  context.shadowColor = "rgba(0, 255, 102, 0.92)";
  context.shadowBlur = 13;
  context.lineWidth = 2.2;
  context.beginPath();
  context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI);
  context.stroke();

  const trailLength = 0.72;
  const trailGradient = context.createLinearGradient(
    Math.cos(starAngle - trailLength) * radiusX,
    Math.sin(starAngle - trailLength) * radiusY,
    Math.cos(starAngle) * radiusX,
    Math.sin(starAngle) * radiusY
  );
  trailGradient.addColorStop(0, "rgba(0, 255, 102, 0)");
  trailGradient.addColorStop(0.6, "rgba(60, 255, 95, 0.36)");
  trailGradient.addColorStop(1, "rgba(220, 255, 225, 0.92)");
  context.strokeStyle = trailGradient;
  context.lineWidth = 3.3;
  context.beginPath();
  context.ellipse(0, 0, radiusX, radiusY, 0, starAngle - trailLength, starAngle);
  context.stroke();
  context.restore();

  const rotatedStarX =
    centerX + Math.cos(orbitRotation) * (starX - centerX) - Math.sin(orbitRotation) * (starY - centerY);
  const rotatedStarY =
    centerY + Math.sin(orbitRotation) * (starX - centerX) + Math.cos(orbitRotation) * (starY - centerY);
  drawStar(context, rotatedStarX, rotatedStarY, (isFront ? 10 : 7) * starScale, isFront ? 1 : 0.65);
}

function drawHudRings(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, time: number) {
  context.save();
  context.strokeStyle = "rgba(0, 255, 102, 0.18)";
  context.lineWidth = 0.8;
  context.setLineDash([3, 6]);
  context.beginPath();
  context.arc(centerX, centerY, radius * 1.48, time * 0.3, Math.PI * 1.35 + time * 0.3);
  context.stroke();
  context.beginPath();
  context.arc(centerX, centerY, radius * 1.72, -time * 0.24, Math.PI * 1.15 - time * 0.24);
  context.stroke();
  context.restore();
}

function BrandMarkFallback({ variant }: { variant: MarkVariant }) {
  const isNav = variant === "nav";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative rounded-full bg-[radial-gradient(circle_at_38%_34%,rgba(236,253,245,0.9)_0%,rgba(116,255,126,0.46)_10%,rgba(20,184,166,0.25)_26%,rgba(3,7,18,0.64)_62%,transparent_74%)] shadow-[0_0_36px_rgba(52,211,153,0.42)]",
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

function initializeCanvasScene({
  canvas,
  config,
  onReady,
  variant
}: {
  canvas: HTMLCanvasElement;
  config: SceneConfig;
  onReady: () => void;
  variant: MarkVariant;
}) {
  const context = canvas.getContext("2d");
  if (!context) return undefined;

  let frameId = 0;
  let ready = false;
  let lastTimestamp = 0;
  let time = 0;
  let width = 1;
  let height = 1;
  let particleState = randomCelestialParticleState(config.particleCount, 1, 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    particleState = randomCelestialParticleState(config.particleCount, width, height);
  };

  const render = (timestamp = 0) => {
    const delta = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.05) : 0.016;
    lastTimestamp = timestamp;
    time += reduceMotion ? 0 : delta;

    context.clearRect(0, 0, width, height);

    const centerX = width * 0.5;
    const centerY = height * (variant === "nav" ? 0.51 : 0.53);
    const earthRadius = Math.min(width, height) * config.earthScale;

    drawAmbientGlow(context, centerX, centerY, Math.min(width, height) * 0.66);
    drawCelestialParticles(context, particleState, width, height, config.particleOpacity, time);
    drawEarth(context, centerX, centerY, earthRadius, time);
    drawOrbit(context, centerX, centerY, width * 0.35, height * 0.13, time, config.starScale);
    drawHudRings(context, centerX, centerY, earthRadius, time);

    if (!ready) {
      ready = true;
      onReady();
    }

    if (!reduceMotion) {
      frameId = window.requestAnimationFrame(render);
    }
  };

  resize();
  const resizeObserver = new ResizeObserver(() => {
    resize();
    render(lastTimestamp);
  });
  resizeObserver.observe(canvas);
  render();

  return () => {
    window.cancelAnimationFrame(frameId);
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

    setRenderFallback(false);
    setSceneReady(false);

    const cleanup = initializeCanvasScene({
      canvas,
      config,
      onReady: () => setSceneReady(true),
      variant
    });

    if (!cleanup) {
      setRenderFallback(true);
      return;
    }

    return cleanup;
  }, [config, variant]);

  if (renderFallback) {
    return <BrandMarkFallback variant={variant} />;
  }

  return (
    <div
      className={cn("relative isolate shrink-0 overflow-visible", config.className, className)}
      aria-label="Slowly rotating digital Earth with an orbiting North Star"
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
        className="block h-full w-full"
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
