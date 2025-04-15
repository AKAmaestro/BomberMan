export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface GameConfig {
  initialGridSize: number;
  maxGridSize: number;
  playerHealth: number;
  initialTNTCount: number;
  maxTNTCount: number;
  explosionRadius: number;
  levelTimeLimit: number; // in seconds
  enemySpawnInterval: number; // in seconds
  powerUpSpawnInterval: number; // in seconds
}

export enum BlockType {
  EMPTY = 0,
  WALL = 1,
  BREAKABLE = 2,
  POWER_UP = 3,
  TIME_WARP = 4,
}

export enum PowerUpType {
  HEALTH = 'health',
  TNT = 'tnt',
  SPEED = 'speed',
  EXPLOSION_RADIUS = 'explosion_radius',
  SHIELD = 'shield',
  REMOTE_DETONATOR = 'remote_detonator',
}

export enum EnemyType {
  BASIC = 'basic',
  FAST = 'fast',
  TANK = 'tank',
  BOMBER = 'bomber',
}

export interface Block {
  type: BlockType;
  position: Vector3;
  powerUpType?: PowerUpType;
}

export interface Player {
  id: string;
  position: Vector3;
  health: number;
  tntCount: number;
  speed: number;
  explosionRadius: number;
  hasShield: boolean;
  remoteDetonators: number;
  score: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Vector3;
  health: number;
  speed: number;
}

export interface TNT {
  id: string;
  position: Vector3;
  placedBy: string;
  explosionRadius: number;
  timeToExplode: number;
}

export interface GameState {
  players: Map<string, Player>;
  enemies: Map<string, Enemy>;
  blocks: Map<string, Block>;
  tnt: Map<string, TNT>;
  currentLevel: number;
  timeLeft: number;
  gridSize: number;
  gameStatus: 'waiting' | 'playing' | 'levelComplete' | 'gameOver';
}

export const DEFAULT_CONFIG: GameConfig = {
  initialGridSize: 11,
  maxGridSize: 21,
  playerHealth: 100,
  initialTNTCount: 3,
  maxTNTCount: 10,
  explosionRadius: 2,
  levelTimeLimit: 180,
  enemySpawnInterval: 15,
  powerUpSpawnInterval: 20,
}; 