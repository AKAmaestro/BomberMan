import { BlockType, PowerUpType, EnemyType } from './BombermanEnums';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface GameConfig {
  gridSize: Vector3;
  initialHealth: number;
  initialTNT: number;
  timeLimit: number;
  explosionRadius: number;
  enemyCount: number;
  powerupCount: number;
}

export interface Block {
  type: BlockType;
  powerupType?: PowerUpType;
  portalDestination?: Vector3;
}

export interface Player {
  position: Vector3;
  health: number;
  tntCount: number;
  hasShield: boolean;
  isInvisible: boolean;
  remoteDetonators: number;
  speed: number;
}

export interface Enemy {
  position: Vector3;
  type: EnemyType;
  health: number;
  tntCount: number;
  lastBombTime: number;
}

export interface GameState {
  grid: Block[][][];
  player: Player;
  enemies: Enemy[];
  timeLeft: number;
  score: number;
  highScore: number;
  level: number;
} 