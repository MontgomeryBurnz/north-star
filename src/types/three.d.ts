declare module "three" {
  export const SRGBColorSpace: string;

  export type RendererParameters = {
    alpha?: boolean;
    antialias?: boolean;
    canvas?: HTMLCanvasElement;
    powerPreference?: WebGLPowerPreference;
  };

  export type MeshStandardMaterialParameters = {
    color?: number;
    emissive?: number;
    emissiveIntensity?: number;
    metalness?: number;
    roughness?: number;
  };

  export class Clock {
    getElapsedTime(): number;
  }

  export class Vector3 {
    set(x: number, y: number, z: number): this;
    setScalar(value: number): this;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
  }

  export class Object3D {
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    add(...objects: Object3D[]): void;
  }

  export class Scene extends Object3D {}

  export class Group extends Object3D {}

  export class AmbientLight extends Object3D {
    constructor(color: number, intensity?: number);
  }

  export class DirectionalLight extends Object3D {
    constructor(color: number, intensity?: number);
  }

  export class PointLight extends Object3D {
    constructor(color: number, intensity?: number, distance?: number);
  }

  export class OrthographicCamera extends Object3D {
    bottom: number;
    left: number;
    right: number;
    top: number;

    constructor(left: number, right: number, top: number, bottom: number, near?: number, far?: number);
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
  }

  export class BoxGeometry {
    constructor(width?: number, height?: number, depth?: number);
    dispose(): void;
  }

  export class MeshStandardMaterial {
    constructor(parameters?: MeshStandardMaterialParameters);
    dispose(): void;
  }

  export class Mesh extends Object3D {
    constructor(geometry: BoxGeometry, material: MeshStandardMaterial | MeshStandardMaterial[]);
  }

  export class WebGLRenderer {
    outputColorSpace: string;

    constructor(parameters?: RendererParameters);
    dispose(): void;
    render(scene: Scene, camera: OrthographicCamera): void;
    setClearColor(color: number, alpha?: number): void;
    setPixelRatio(value: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
  }
}
