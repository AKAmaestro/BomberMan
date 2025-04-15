export enum BlockType {
  EMPTY = 'empty',
  WALL = 'wall',
  BREAKABLE = 'breakable',
  TNT = 'tnt',
  POWERUP = 'powerup',
  PORTAL = 'portal',
  TIME_WARP = 'time_warp'
}

export enum PowerUpType {
  HEALTH = 'health',
  SPEED = 'speed',
  EXTRA_TNT = 'extra_tnt',
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