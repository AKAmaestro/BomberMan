import { World, Entity, EntityEvent, PlayerEntity, Audio, ColliderShape, RigidBodyType, CollisionGroup } from 'hytopia';
import type { 
  GameState, 
  GameConfig, 
  Block, 
  Player, 
  Enemy,
  TNT,
  Vector3
} from '../types/GameTypes';
import { BlockType, PowerupType, EnemyType } from '../types/GameTypes';
import { DEFAULT_CONFIG } from '../config/gameConfig';

export class GameManager {
  private world: World;
  private config: GameConfig;
  private _state: GameState;
  private blockEntities: Map<string, Entity>;
  private playerEntities: Map<string, PlayerEntity>;
  private enemyEntities: Map<string, Entity>;
  private tntEntities: Map<string, Entity>;
  private idCounter: number = 0;

  constructor(world: World, config: GameConfig = DEFAULT_CONFIG) {
    this.world = world;
    this.config = config;
    this._state = this.initializeGameState();
    this.blockEntities = new Map();
    this.playerEntities = new Map();
    this.enemyEntities = new Map();
    this.tntEntities = new Map();
    this.setupEventListeners();
  }

  private initializeGameState(): GameState {
    return {
      blocks: new Map<string, Block>(),
      players: new Map<string, Player>(),
      enemies: new Map<string, Enemy>(),
      tnt: new Map<string, TNT>(),
      gridSize: this.config.initialGridSize,
      gameStatus: 'waiting',
      score: 0,
      highScore: 0,
      timeLeft: this.config.levelTimeLimit,
      currentLevel: 1
    };
  }

  private setupEventListeners(): void {
    this.world.on(EntityEvent.ENTITY_COLLISION, ({ entity, otherEntity, started }) => {
      if (started && entity instanceof Entity && otherEntity) {
        this.handleTNTCollision(entity, otherEntity);
      }
    });
  }

  public startGame(): void {
    this._state.gameStatus = 'playing';
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
    const { gridSize } = this._state;
    
    // Clear existing blocks
    this.blockEntities.forEach(entity => entity.despawn());
    this.blockEntities.clear();
    this._state.blocks.clear();

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
    this.addPowerups(5);

    // Add time warp block
    this.addTimeWarpBlock();

    // Spawn enemies
    this.spawnEnemies();
  }

  private createBlock(position: Vector3, type: BlockType, powerupType?: PowerupType): void {
    const blockId = `block_${position.x}_${position.z}`;
    const block: Block = { type, position, powerupType };
    this._state.blocks.set(blockId, block);

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

  private getEmptyBlocks(): Block[] {
    return Array.from(this._state.blocks.values())
      .filter(block => block.type === BlockType.EMPTY);
  }

  private addPowerups(numPowerups: number): void {
    const emptyBlocks = this.getEmptyBlocks();
    for (let i = 0; i < numPowerups; i++) {
      const randomBlock = emptyBlocks[Math.floor(Math.random() * emptyBlocks.length)];
      if (randomBlock) {
        randomBlock.type = BlockType.POWERUP;
        randomBlock.powerupType = this.getRandomPowerupType();
      }
    }
  }

  private getRandomPowerupType(): PowerupType {
    return PowerupType.HEALTH; // Default powerup type
  }

  private addTimeWarpBlock(): void {
    const emptyBlocks = this.getEmptyBlocks();
    const randomBlock = emptyBlocks[Math.floor(Math.random() * emptyBlocks.length)];
    if (!randomBlock) return;
    
    randomBlock.type = BlockType.PORTAL;
  }

  public addPlayer(playerEntity: PlayerEntity): void {
    const playerId = playerEntity.id || this.generateId();
    const player: Player = {
      id: playerId,
      position: { x: 1, y: 0, z: 1 },
      health: this.config.maxHealth,
      tntCount: this.config.initialTNTCount,
      hasShield: false,
      isInvisible: false,
      remoteDetonators: 0,
      speed: 1
    };

    this._state.players.set(playerId, player);
    this.playerEntities.set(playerId, playerEntity);
    playerEntity.setPosition(player.position);
  }

  public removePlayer(playerId: string): void {
    this._state.players.delete(playerId);
    const playerEntity = this.playerEntities.get(playerId);
    if (playerEntity) {
      playerEntity.despawn();
      this.playerEntities.delete(playerId);
    }
  }

  private createPlayer(id: string, position: Vector3): Player {
    return {
      id,
      position,
      health: this.config.maxHealth,
      tntCount: this.config.initialTNTCount,
      hasShield: false,
      isInvisible: false,
      remoteDetonators: 0
    };
  }

  private placeTNT(player: Player, position: Vector3): void {
    if (player.tntCount > 0) {
      const tnt: TNT = {
        id: this.generateId(),
        position,
        placedBy: player.id,
        explosionRadius: this.config.explosionRadius,
        timeToExplode: 3000 // 3 seconds
      };
      this._state.tnt.set(tnt.id, tnt);
      player.tntCount--;
    }
  }

  private explodeTNT(tntId: string): void {
    const tnt = this._state.tnt.get(tntId);
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
    this._state.tnt.delete(tntId);
    const tntEntity = this.tntEntities.get(tntId);
    if (tntEntity) {
      tntEntity.despawn();
      this.tntEntities.delete(tntId);
    }
  }

  private checkExplosionDamage(tnt: TNT): void {
    const { position, explosionRadius } = tnt;

    // Check players
    this._state.players.forEach((player, playerId) => {
      if (this.isInExplosionRange(player.position, position, explosionRadius)) {
        this.damagePlayer(playerId, 25);
      }
    });

    // Check enemies
    this._state.enemies.forEach((enemy, enemyId) => {
      if (this.isInExplosionRange(enemy.position, position, explosionRadius)) {
        this.damageEnemy(enemyId, 50);
      }
    });

    // Check blocks
    this._state.blocks.forEach((block, blockId) => {
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
    const player = this._state.players.get(playerId);
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
    const enemy = this._state.enemies.get(enemyId);
    if (!enemy) return;

    enemy.health -= amount;
    if (enemy.health <= 0) {
      this.removeEnemy(enemyId);
    }
  }

  private destroyBlock(blockId: string): void {
    const block = this._state.blocks.get(blockId);
    if (!block) return;

    // Handle power-up reveal
    if (block.powerupType) {
      this.createPowerUp(block.position, block.powerupType);
    }

    // Remove block
    this._state.blocks.delete(blockId);
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

  private createPowerUp(position: Vector3, type: PowerupType): void {
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
        const playerId = otherEntity.id;
        if (playerId) {
          this.applyPowerUp(playerId, type);
          powerUpEntity.despawn();
        }
      }
    });
  }

  private applyPowerUp(playerId: string, type: PowerupType): void {
    const player = this._state.players.get(playerId);
    if (player) {
      switch (type) {
        case PowerupType.HEALTH:
          player.health = Math.min(player.health + 50, this.config.maxHealth);
          break;
        case PowerupType.EXTRA_TNT:
          player.tntCount += 1;
          break;
        case PowerupType.SHIELD:
          player.hasShield = true;
          break;
        case PowerupType.TELEPORT:
          const emptyBlocks = Array.from(this._state.blocks.values())
            .filter(b => b.type === BlockType.EMPTY);
          if (emptyBlocks.length > 0) {
            const randomBlock = emptyBlocks[Math.floor(Math.random() * emptyBlocks.length)];
            if (randomBlock) {
              player.position = { ...randomBlock.position };
            }
          }
          break;
        case PowerupType.INVISIBILITY:
          player.isInvisible = true;
          setTimeout(() => { player.isInvisible = false; }, 10000);
          break;
        case PowerupType.REMOTE_DETONATOR:
          player.remoteDetonators += 1;
          break;
      }
      
      // Remove the powerup
      const block = this._state.blocks.get(player.id);
      if (block) {
        block.type = BlockType.EMPTY;
        block.powerupType = undefined;
      }
    }
  }

  private spawnEnemies(): void {
    const numEnemies = Math.floor(this._state.currentLevel * 1.5);
    const enemyTypes: EnemyType[] = [
        EnemyType.BASIC,
        EnemyType.FAST,
        EnemyType.TANK,
        EnemyType.BOMBER,
        EnemyType.TELEPORTER
    ];

    for (let i = 0; i < numEnemies; i++) {
        const x = Math.floor(Math.random() * (this._state.gridSize - 2)) + 1;
        const z = Math.floor(Math.random() * (this._state.gridSize - 2)) + 1;
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        if (!this._state.blocks.has(`${x},${0},${z}`)) {
            this.createEnemy(x, 0, z, type);
        }
    }
  }

  private generateId(): string {
    this.idCounter += 1;
    return `id_${Date.now()}_${this.idCounter.toString()}`;
  }

  private createEnemy(x: number, y: number, z: number, type: EnemyType): void {
    const enemyId = this.generateId();
    const enemy: Enemy = {
      id: enemyId,
      type,
      position: { x, y, z },
      health: type === EnemyType.TANK ? 100 : 50,
      speed: type === EnemyType.FAST ? 2 : 1,
      tntCount: type === EnemyType.BOMBER ? 3 : 0,
      lastBombTime: 0
    };

    this._state.enemies.set(enemyId, enemy);

    const enemyEntity = new Entity({
      modelUri: `models/npcs/${type.toLowerCase()}.gltf`,
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

    enemyEntity.spawn(this.world, { x, y, z });
    this.enemyEntities.set(enemyId, enemyEntity);

    // Set up enemy behavior
    enemyEntity.on(EntityEvent.TICK, ({ tickDeltaMs }) => {
      this.moveEnemy(enemy);
    });
  }

  private moveEnemy(enemy: Enemy): void {
    const possibleDirections: Vector3[] = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 }
    ];

    // Enemy-specific behavior
    switch (enemy.type) {
      case EnemyType.FAST:
        // Fast enemies move twice per tick and prefer directions towards the nearest player
        this.moveFastEnemy(enemy, possibleDirections);
        break;
      case EnemyType.TANK:
        // Tank enemies move slower but can break through destructible blocks
        this.moveTankEnemy(enemy, possibleDirections);
        break;
      case EnemyType.BOMBER:
        // Bomber enemies occasionally place TNT
        this.moveBomberEnemy(enemy, possibleDirections);
        break;
      case EnemyType.TELEPORTER:
        // Teleporter enemies can occasionally teleport to a random valid position
        this.moveTeleporterEnemy(enemy, possibleDirections);
        break;
      default:
        // Default movement behavior
        this.moveDefaultEnemy(enemy, possibleDirections);
    }
  }

  private moveFastEnemy(enemy: Enemy, possibleDirections: Vector3[]): void {
    const nearestPlayer = this.findNearestPlayer(enemy.position);
    if (nearestPlayer) {
      // Sort directions by distance to nearest player
      possibleDirections.sort((a, b) => {
        const posA = { 
          x: enemy.position.x + a.x, 
          y: enemy.position.y, 
          z: enemy.position.z + a.z 
        };
        const posB = { 
          x: enemy.position.x + b.x, 
          y: enemy.position.y, 
          z: enemy.position.z + b.z 
        };
        const distA = this.getDistance(posA, nearestPlayer.position);
        const distB = this.getDistance(posB, nearestPlayer.position);
        return distA - distB;
      });

      // Move twice per tick
      for (let i = 0; i < 2; i++) {
        const validDirections = possibleDirections.filter(dir => {
          const newPos = {
            x: enemy.position.x + dir.x,
            y: enemy.position.y,
            z: enemy.position.z + dir.z
          };
          return this.isValidPosition(newPos);
        });

        if (validDirections.length > 0) {
          const newDirection = validDirections[0];
          if (newDirection) {
            enemy.position = {
              x: enemy.position.x + newDirection.x,
              y: enemy.position.y,
              z: enemy.position.z + newDirection.z
            };
          }
        }
      }
    }
  }

  private moveTankEnemy(enemy: Enemy, possibleDirections: Vector3[]): void {
    // Implement tank enemy movement logic here
  }

  private moveBomberEnemy(enemy: Enemy, possibleDirections: Vector3[]): void {
    // Implement bomber enemy movement logic here
  }

  private moveTeleporterEnemy(enemy: Enemy, possibleDirections: Vector3[]): void {
    // Implement teleporter enemy movement logic here
  }

  private moveDefaultEnemy(enemy: Enemy, possibleDirections: Vector3[]): void {
    // Implement default enemy movement logic here
  }

  private removeEnemy(enemyId: string): void {
    this._state.enemies.delete(enemyId);
    const enemyEntity = this.enemyEntities.get(enemyId);
    if (enemyEntity) {
      enemyEntity.despawn();
      this.enemyEntities.delete(enemyId);
    }
  }

  private isValidPosition(position: Vector3): boolean {
    // Check if position is within grid bounds
    if (position.x < 0 || position.x >= this._state.gridSize ||
        position.z < 0 || position.z >= this._state.gridSize) {
      return false;
    }

    // Check if position is occupied by a block
    const isOccupied = Array.from(this._state.blocks.values()).some(block =>
      block.position.x === position.x && block.position.z === position.z);

    return !isOccupied;
  }

  private startGameLoop(): void {
    let lastTime = Date.now();
    let enemySpawnTimer = 0;
    let powerUpSpawnTimer = 0;

    this.world.on(EntityEvent.TICK, ({ tickDeltaMs }) => {
      if (this._state.gameStatus !== 'playing') return;

      const currentTime = Date.now();
      const deltaSeconds = tickDeltaMs / 1000;

      // Update timers
      this._state.timeLeft -= deltaSeconds;
      enemySpawnTimer += deltaSeconds;
      powerUpSpawnTimer += deltaSeconds;

      // Spawn enemies
      if (enemySpawnTimer >= this.config.enemySpawnInterval) {
        this.spawnEnemies();
        enemySpawnTimer = 0;
      }

      // Move enemies
      this._state.enemies.forEach(enemy => {
        this.moveEnemy(enemy);
      });

      // Check game over conditions
      if (this._state.timeLeft <= 0 || this._state.players.size === 0) {
        this.endGame();
      }

      lastTime = currentTime;
    });
  }

  private endGame(): void {
    this._state.gameStatus = 'gameOver';
    
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
    this._state.currentLevel++;
    this._state.gridSize = Math.min(
      this._state.gridSize + 2,
      this.config.maxGridSize
    );
    this._state.timeLeft = this.config.levelTimeLimit;
    this.generateLevel();

    // Play level complete sound
    new Audio({
      uri: 'audio/sfx/ui/notification-1.mp3',
      volume: 1,
    }).play(this.world);
  }

  private findEnemyById(id: string): Enemy | undefined {
    return this._state.enemies.get(id);
  }

  private handlePowerup(block: Block, player: Player): void {
    if (block.type !== BlockType.PORTAL || !block.powerupType) return;

    switch (block.powerupType) {
        case PowerupType.HEALTH:
            player.health = Math.min(player.health + 1, this.config.maxHealth);
            break;
        case PowerupType.EXTRA_TNT:
            player.tntCount++;
            break;
        case PowerupType.SHIELD:
            player.hasShield = true;
            break;
        case PowerupType.INVISIBILITY:
            player.isInvisible = true;
            break;
        case PowerupType.REMOTE_DETONATOR:
            player.remoteDetonators++;
            break;
    }

    block.type = BlockType.EMPTY;
    block.powerupType = undefined;
  }

  private handleTNTCollision(tnt: Entity, otherEntity: Entity): void {
    if (!tnt.id) return;
    
    const tntState = this._state.tnt.get(tnt.id);
    if (!tntState || !tntState.timeToExplode) return;

    // Play explosion sound
    new Audio({
      uri: 'audio/sfx/explosion.mp3',
      volume: 0.8,
    }).play(this.world);

    // Handle chain reactions with other TNT
    this._state.tnt.forEach((otherTNT, otherId) => {
      if (otherId !== tnt.id && this.isInExplosionRange(tntState.position, otherTNT.position, tntState.explosionRadius)) {
        this.explodeTNT(otherId);
      }
    });

    // Check for damage to players, enemies, and blocks
    this.checkExplosionDamage(tntState);
  }

  private handlePlayerDeath(playerId: string): void {
    const player = this._state.players.get(playerId);
    if (player) {
      player.health = this.config.maxHealth;
      player.tntCount = this.config.initialTNTCount;
      player.hasShield = false;
      // ... existing code ...
    }
  }

  private findNearestPlayer(position: Vector3): Player | undefined {
    let nearestPlayer: Player | undefined;
    let minDistance = Infinity;

    this._state.players.forEach(player => {
      const distance = this.getDistance(position, player.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPlayer = player;
      }
    });

    return nearestPlayer;
  }

  private getDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
} 