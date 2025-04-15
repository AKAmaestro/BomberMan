import { World, Entity, EntityEvent, PlayerEntity, Audio, ColliderShape, RigidBodyType, CollisionGroup } from 'hytopia';
import { v4 as uuidv4 } from 'uuid';
import { BlockType, PowerupType, EnemyType } from '../enums/GameEnums';
import type { GameState, GameConfig, Block, Player, Enemy, TNT, Vector3 } from '../types/GameTypes';
import { DEFAULT_CONFIG } from '../config/gameConfig';

export class BombermanGameManager {
  private world: World;
  private state: GameState;
  private config: GameConfig;

  constructor(world: World) {
    this.world = world;
    this.config = DEFAULT_CONFIG;
    this.state = this.initializeGameState();
  }

  private initializeGameState(): GameState {
    return {
      blocks: new Map<string, Block>(),
      players: new Map<string, Player>(),
      enemies: [],
      tnt: new Map<string, TNT>(),
      gridSize: this.config.initialGridSize,
      gameStatus: 'waiting',
      score: 0,
      highScore: 0
    };
  }

  private getEmptyBlocks(): Block[] {
    return Array.from(this.state.blocks.values())
      .filter(block => block.type === BlockType.EMPTY);
  }

  private addPowerups(): void {
    const emptyBlocks = this.getEmptyBlocks();
    const powerupCount = Math.floor(emptyBlocks.length * 0.1);
    for (let i = 0; i < powerupCount; i++) {
      const randomBlock = emptyBlocks[Math.floor(Math.random() * emptyBlocks.length)];
      if (!randomBlock) continue;
      
      const powerupTypes = Object.values(PowerupType);
      randomBlock.type = BlockType.POWERUP;
      randomBlock.powerupType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)] as PowerupType;
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
    if (player.tntCount <= 0) return;

    const tntId = uuidv4();
    const tnt: TNT = {
      id: tntId,
      position,
      placedBy: player.id,
      explosionRadius: this.config.explosionRadius
    };

    this.state.tnt.set(tntId, tnt);
    player.tntCount--;
  }

  private findEnemyById(id: string): Enemy | undefined {
    return this.state.enemies.find(enemy => enemy.id === id);
  }

  private handlePowerup(block: Block, player: Player): void {
    if (block.type !== BlockType.POWERUP || !block.powerupType) return;

    switch (block.powerupType) {
      case PowerupType.HEALTH:
        player.health = Math.min(player.health + 1, this.config.maxHealth);
        break;
      case PowerupType.TNT:
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
} 