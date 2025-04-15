export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface DreamConfig {
  size: Vector3;
  biomeType: string;
  features: string[];
  mood: string;
  colors: string[];
}

export interface BiomeData {
  type: string;
  baseHeight: number;
  variation: number;
  blocks: string[];
}

export interface DreamFeature {
  type: string;
  position: Vector3;
  size: Vector3;
  properties: Record<string, any>;
} 