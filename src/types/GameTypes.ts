export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface GameConfig {
  initialGridSize: number;
  levelTimeLimit: number;
  maxHealth: number;
  initialTNTCount: number;
  explosionRadius: number;
  maxGridSize: number;
  enemySpawnInterval: number;
}

export interface Block {
  type: BlockType;
  position: Vector3;
  powerupType?: PowerupType;
  portalDestination?: Vector3;
}

export interface Player {
  id: string;
  position: Vector3;
  health: number;
  tntCount: number;
  hasShield: boolean;
  isInvisible: boolean;
  remoteDetonators: number;
  speed: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  position: Vector3;
  health: number;
  tntCount: number;
  lastBombTime: number;
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
  blocks: Map<string, Block>;
  players: Map<string, Player>;
  enemies: Map<string, Enemy>;
  tnt: Map<string, TNT>;
  gridSize: number;
  timeLeft: number;
  gameStatus: 'waiting' | 'playing' | 'paused' | 'gameOver';
  currentLevel: number;
  score: number;
  highScore: number;
}

export enum BlockType {
  EMPTY = 'empty',
  WALL = 'wall',
  BREAKABLE = 'breakable',
  PORTAL = 'portal',
  POWERUP = 'powerup'
}

export enum PowerupType {
  HEALTH = 'health',
  EXTRA_TNT = 'extra_tnt',
  SPEED_BOOST = 'speed_boost',
  SHIELD = 'shield',
  TELEPORT = 'teleport',
  INVISIBILITY = 'invisibility',
  REMOTE_DETONATOR = 'remote_detonator'
}

export enum EnemyType {
  BASIC = 'basic',
  FAST = 'fast',
  TANK = 'tank',
  BOMBER = 'bomber',
  TELEPORTER = 'teleporter'
}