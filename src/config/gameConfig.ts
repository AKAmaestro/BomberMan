import type { GameConfig } from '../types/GameTypes';

export const DEFAULT_CONFIG: GameConfig = {
  gridSize: { x: 15, y: 1, z: 15 },
  initialHealth: 100,
  initialTNT: 3,
  timeLimit: 300,
  explosionRadius: 2,
  enemyCount: 3,
  powerupCount: 5
}; 