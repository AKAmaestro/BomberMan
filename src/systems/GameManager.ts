import { World, Entity, EntityEvent, PlayerEntity, Audio, ColliderShape, RigidBodyType, CollisionGroup } from 'hytopia';
import { v4 as uuidv4 } from 'uuid';
import type { GameState, GameConfig, Block, Player, Enemy, Vector3, TNT } from '../types/GameTypes';
import { BlockType, PowerUpType, EnemyType } from '../types/BombermanEnums';
import { DEFAULT_CONFIG } from '../config/gameConfig';

export class GameManager {
  private world: World;
  private config: GameConfig;
  private state: GameState;
  private blockEntities: Map<string, Entity>;
  private playerEntities: Map<string, PlayerEntity>;
  private enemyEntities: Map<string, Entity>;
  private tntEntities: Map<string, Entity>;

  constructor(world: World, config: GameConfig = DEFAULT_CONFIG) {
    this.world = world;
    this.config = config;
    this.state = this.initializeGameState();
    this.blockEntities = new Map();
    this.playerEntities = new Map();
    this.enemyEntities = new Map();
    this.tntEntities = new Map();
  }

  private initializeGameState(): GameState {
    return {
      players: new Map(),
      enemies: new Map(),
      blocks: new Map(),
      tnt: new Map(),
      currentLevel: 1,
      timeLeft: this.config.levelTimeLimit,
      gridSize: this.config.initialGridSize,
      gameStatus: 'waiting',
    };
  }

  public startGame(): void {
    this.state.gameStatus = 'playing';
    this.generateLevel();
    this.startGameLoop();
    
    // Play background music
    const music = new Audio({
      uri: 'audio/music/hytopia-main.mp3',
      loop: true,
      volume: 0.5,
    });
    music.play(this.world);
  }

  private generateLevel(): void {
    const { gridSize } = this.state;
    
    // Clear existing blocks
    this.blockEntities.forEach(entity => entity.despawn());
    this.blockEntities.clear();
    this.state.blocks.clear();

    // Generate walls and breakable blocks
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        // Border walls
        if (x === 0 || x === gridSize - 1 || z === 0 || z === gridSize - 1) {
          this.createBlock({ x, y: 0, z }, BlockType.WALL);
          continue;
        }

        // Interior walls (every 2 blocks)
        if (x % 2 === 0 && z % 2 === 0) {
          this.createBlock({ x, y: 0, z }, BlockType.WALL);
          continue;
        }

        // Breakable blocks (70% chance)
        if (Math.random() < 0.7) {
          this.createBlock({ x, y: 0, z }, BlockType.BREAKABLE);
        }
      }
    }

    // Add power-ups
    this.addPowerups();

    // Add time warp block
    this.addTimeWarpBlock();
  }

  private createBlock(position: Vector3, type: BlockType, powerUpType?: PowerUpType): void {
    const blockId = `block_${position.x}_${position.z}`;
    const block: Block = { type, position, powerUpType };
    this.state.blocks.set(blockId, block);

    const blockEntity = new Entity({
      modelUri: type === BlockType.WALL ? 'models/items/iron-ingot.gltf' : 'models/items/gold-ingot.gltf',
      modelScale: 1,
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        colliders: [
          {
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
            collisionGroups: {
              belongsTo: [CollisionGroup.BLOCK],
              collidesWith: [CollisionGroup.ENTITY, CollisionGroup.PLAYER],
            },
          },
        ],
      },
    });

    blockEntity.spawn(this.world, position);
    this.blockEntities.set(blockId, blockEntity);
  }

  private addPowerups(): void {
    const breakableBlocks = Array.from(this.state.blocks.values())
      .filter(block => block.type === BlockType.BREAKABLE);

    // Add power-ups to 30% of breakable blocks
    const powerUpCount = Math.floor(breakableBlocks.length * 0.3);
    const powerUpTypes = Object.values(PowerUpType);

    for (let i = 0; i < powerUpCount; i++) {
      const randomBlock = breakableBlocks[Math.floor(Math.random() * breakableBlocks.length)];
      if (!randomBlock) continue;
      randomBlock.powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    }
  }

  private addTimeWarpBlock(): void {
    const emptySpaces = Array.from(this.state.blocks.values())
      .filter(block => block.type === BlockType.EMPTY);

    const randomBlock = emptySpaces[Math.floor(Math.random() * emptySpaces.length)];
    if (!randomBlock) return;
    this.createBlock(randomBlock.position, BlockType.TIME_WARP);
  }

  public addPlayer(playerEntity: PlayerEntity): void {
    const player: Player = {
      id: playerEntity.id,
      position: { x: 1, y: 0, z: 1 },
      health: this.config.playerHealth,
      tntCount: this.config.initialTNTCount,
      speed: 1,
      explosionRadius: this.config.explosionRadius,
      hasShield: false,
      remoteDetonators: 0,
      score: 0,
    };

    this.state.players.set(player.id, player);
    this.playerEntities.set(player.id, playerEntity);
    playerEntity.setPosition(player.position);
  }

  public removePlayer(playerId: string): void {
    this.state.players.delete(playerId);
    const playerEntity = this.playerEntities.get(playerId);
    if (playerEntity) {
      playerEntity.despawn();
      this.playerEntities.delete(playerId);
    }
  }

  public placeTNT(playerId: string, position: Vector3): void {
    const player = this.state.players.get(playerId);
    if (!player || player.tntCount <= 0) return;

    const tntId = uuidv4();
    const tnt: TNT = {
      id: tntId,
      position,
      placedBy: playerId,
      explosionRadius: player.explosionRadius,
      timeToExplode: 3000, // 3 seconds
    };

    this.state.tnt.set(tntId, tnt);
    player.tntCount--;

    // Create TNT entity
    const tntEntity = new Entity({
      modelUri: 'models/items/firework.gltf',
      modelScale: 0.5,
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        colliders: [
          {
            shape: ColliderShape.BALL,
            radius: 0.25,
          },
        ],
      },
    });

    tntEntity.spawn(this.world, position);
    this.tntEntities.set(tntId, tntEntity);

    // Play placement sound
    new Audio({
      uri: 'audio/sfx/ui/inventory-place-item.mp3',
      position,
      volume: 1,
    }).play(this.world);

    // Schedule explosion
    setTimeout(() => this.explodeTNT(tntId), tnt.timeToExplode);
  }

  private explodeTNT(tntId: string): void {
    const tnt = this.state.tnt.get(tntId);
    if (!tnt) return;

    // Play explosion sound
    new Audio({
      uri: 'audio/sfx/damage/explode.mp3',
      position: tnt.position,
      volume: 1,
    }).play(this.world);

    // Check for damage to players, enemies, and blocks
    this.checkExplosionDamage(tnt);

    // Remove TNT
    this.state.tnt.delete(tntId);
    const tntEntity = this.tntEntities.get(tntId);
    if (tntEntity) {
      tntEntity.despawn();
      this.tntEntities.delete(tntId);
    }
  }

  private checkExplosionDamage(tnt: TNT): void {
    const { position, explosionRadius } = tnt;

    // Check players
    this.state.players.forEach((player, playerId) => {
      if (this.isInExplosionRange(player.position, position, explosionRadius)) {
        this.damagePlayer(playerId, 25);
      }
    });

    // Check enemies
    this.state.enemies.forEach((enemy, enemyId) => {
      if (this.isInExplosionRange(enemy.position, position, explosionRadius)) {
        this.damageEnemy(enemyId, 50);
      }
    });

    // Check blocks
    this.state.blocks.forEach((block, blockId) => {
      if (block.type === BlockType.BREAKABLE && 
          this.isInExplosionRange(block.position, position, explosionRadius)) {
        this.destroyBlock(blockId);
      }
    });
  }

  private isInExplosionRange(pos1: Vector3, pos2: Vector3, radius: number): boolean {
    return Math.abs(pos1.x - pos2.x) <= radius && Math.abs(pos1.z - pos2.z) <= radius;
  }

  private damagePlayer(playerId: string, amount: number): void {
    const player = this.state.players.get(playerId);
    if (!player) return;

    if (player.hasShield) {
      player.hasShield = false;
      return;
    }

    player.health -= amount;
    if (player.health <= 0) {
      this.removePlayer(playerId);
    }

    // Play hurt sound
    new Audio({
      uri: 'audio/sfx/damage/hit.mp3',
      position: player.position,
      volume: 1,
    }).play(this.world);
  }

  private damageEnemy(enemyId: string, amount: number): void {
    const enemy = this.state.enemies.get(enemyId);
    if (!enemy) return;

    enemy.health -= amount;
    if (enemy.health <= 0) {
      this.removeEnemy(enemyId);
    }
  }

  private destroyBlock(blockId: string): void {
    const block = this.state.blocks.get(blockId);
    if (!block) return;

    // Handle power-up reveal
    if (block.powerUpType) {
      this.createPowerUp(block.position, block.powerUpType);
    }

    // Remove block
    this.state.blocks.delete(blockId);
    const blockEntity = this.blockEntities.get(blockId);
    if (blockEntity) {
      blockEntity.despawn();
      this.blockEntities.delete(blockId);
    }

    // Play break sound
    new Audio({
      uri: 'audio/sfx/damage/hit-woodbreak.mp3',
      position: block.position,
      volume: 1,
    }).play(this.world);
  }

  private createPowerUp(position: Vector3, type: PowerUpType): void {
    const powerUpEntity = new Entity({
      modelUri: 'models/items/golden-apple.gltf',
      modelScale: 0.5,
      rigidBodyOptions: {
        type: RigidBodyType.FIXED,
        colliders: [
          {
            shape: ColliderShape.BALL,
            radius: 0.25,
            isSensor: true,
          },
        ],
      },
    });

    powerUpEntity.spawn(this.world, position);
    powerUpEntity.on(EntityEvent.ENTITY_COLLISION, ({ otherEntity }) => {
      if (otherEntity instanceof PlayerEntity) {
        this.applyPowerUp(otherEntity.id, type);
        powerUpEntity.despawn();
      }
    });
  }

  private applyPowerUp(playerId: string, type: PowerUpType): void {
    const player = this.state.players.get(playerId);
    if (!player) return;

    switch (type) {
      case PowerUpType.HEALTH:
        player.health = Math.min(player.health + 25, this.config.playerHealth);
        break;
      case PowerUpType.TNT:
        player.tntCount = Math.min(player.tntCount + 1, this.config.maxTNTCount);
        break;
      case PowerUpType.SPEED:
        player.speed *= 1.2;
        break;
      case PowerUpType.EXPLOSION_RADIUS:
        player.explosionRadius++;
        break;
      case PowerUpType.SHIELD:
        player.hasShield = true;
        break;
      case PowerUpType.REMOTE_DETONATOR:
        player.remoteDetonators++;
        break;
    }

    // Play power-up sound
    new Audio({
      uri: 'audio/sfx/ui/notification-1.mp3',
      position: player.position,
      volume: 1,
    }).play(this.world);
  }

  private spawnEnemy(): void {
    const enemyId = uuidv4();
    const enemyTypes = Object.values(EnemyType);
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    // Find empty position
    const emptySpaces = Array.from(this.state.blocks.values())
      .filter(block => block.type === BlockType.EMPTY);
    const randomPosition = emptySpaces[Math.floor(Math.random() * emptySpaces.length)]?.position;
    if (!randomPosition) return;

    const enemy: Enemy = {
      id: enemyId,
      type,
      position: randomPosition,
      health: type === EnemyType.TANK ? 100 : 50,
      speed: type === EnemyType.FAST ? 2 : 1,
    };

    this.state.enemies.set(enemyId, enemy);

    const enemyEntity = new Entity({
      modelUri: 'models/npcs/zombie.gltf',
      modelScale: 1,
      modelLoopedAnimations: ['walk'],
      rigidBodyOptions: {
        type: RigidBodyType.DYNAMIC,
        colliders: [
          {
            shape: ColliderShape.CAPSULE,
            halfHeight: 0.5,
            radius: 0.3,
          },
        ],
      },
    });

    enemyEntity.spawn(this.world, randomPosition);
    this.enemyEntities.set(enemyId, enemyEntity);
  }

  private moveEnemy(enemyId: string): void {
    const enemy = this.state.enemies.get(enemyId);
    if (!enemy) return;

    const possibleDirections: Vector3[] = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 }
    ];

    const validDirections = possibleDirections.filter(dir => {
      const newPos = {
        x: enemy.position.x + dir.x,
        y: enemy.position.y + dir.y,
        z: enemy.position.z + dir.z
      };
      return this.isValidPosition(newPos);
    });

    if (validDirections.length === 0) return;

    const newDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
    if (!newDirection) return;

    const newPosition = {
      x: enemy.position.x + newDirection.x,
      y: enemy.position.y + newDirection.y,
      z: enemy.position.z + newDirection.z
    };

    enemy.position = newPosition;
    const enemyEntity = this.enemyEntities.get(enemyId);
    if (enemyEntity) {
      enemyEntity.setPosition(newPosition);
    }
  }

  private removeEnemy(enemyId: string): void {
    this.state.enemies.delete(enemyId);
    const enemyEntity = this.enemyEntities.get(enemyId);
    if (enemyEntity) {
      enemyEntity.despawn();
      this.enemyEntities.delete(enemyId);
    }
  }

  private isValidPosition(position: Vector3): boolean {
    // Check if position is within grid bounds
    if (position.x < 0 || position.x >= this.state.gridSize ||
        position.z < 0 || position.z >= this.state.gridSize) {
      return false;
    }

    // Check if position is occupied by a block
    const isOccupied = Array.from(this.state.blocks.values()).some(block =>
      block.position.x === position.x && block.position.z === position.z);

    return !isOccupied;
  }

  private startGameLoop(): void {
    let lastTime = Date.now();
    let enemySpawnTimer = 0;
    let powerUpSpawnTimer = 0;

    this.world.on(EntityEvent.TICK, ({ deltaTimeMs }) => {
      if (this.state.gameStatus !== 'playing') return;

      const currentTime = Date.now();
      const deltaSeconds = deltaTimeMs / 1000;

      // Update timers
      this.state.timeLeft -= deltaSeconds;
      enemySpawnTimer += deltaSeconds;
      powerUpSpawnTimer += deltaSeconds;

      // Spawn enemies
      if (enemySpawnTimer >= this.config.enemySpawnInterval) {
        this.spawnEnemy();
        enemySpawnTimer = 0;
      }

      // Move enemies
      this.state.enemies.forEach((enemy, enemyId) => {
        this.moveEnemy(enemyId);
      });

      // Check game over conditions
      if (this.state.timeLeft <= 0 || this.state.players.size === 0) {
        this.endGame();
      }

      lastTime = currentTime;
    });
  }

  private endGame(): void {
    this.state.gameStatus = 'gameOver';
    
    // Play game over sound
    new Audio({
      uri: 'audio/music/end-theme.mp3',
      volume: 1,
    }).play(this.world);

    // Clean up entities
    this.blockEntities.forEach(entity => entity.despawn());
    this.enemyEntities.forEach(entity => entity.despawn());
    this.tntEntities.forEach(entity => entity.despawn());

    this.blockEntities.clear();
    this.enemyEntities.clear();
    this.tntEntities.clear();
  }

  public nextLevel(): void {
    this.state.currentLevel++;
    this.state.gridSize = Math.min(
      this.state.gridSize + 2,
      this.config.maxGridSize
    );
    this.state.timeLeft = this.config.levelTimeLimit;
    this.generateLevel();

    // Play level complete sound
    new Audio({
      uri: 'audio/sfx/ui/notification-1.mp3',
      volume: 1,
    }).play(this.world);
  }
} 