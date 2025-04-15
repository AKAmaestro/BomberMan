import { World } from 'hytopia';
import type { GameState, GameConfig, Player } from '../types/GameTypes';

export interface Lobby {
  id: string;
  name: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  gameMode: 'coop' | 'versus';
  isPrivate: boolean;
  password?: string;
  status: 'waiting' | 'starting' | 'in_progress';
  gameState?: GameState;
}

export class LobbyManager {
  private world: World;
  private lobbies: Map<string, Lobby>;
  private playerLobbies: Map<string, string>; // playerId -> lobbyId

  constructor(world: World) {
    this.world = world;
    this.lobbies = new Map();
    this.playerLobbies = new Map();
  }

  public createLobby(
    hostId: string,
    hostName: string,
    lobbyName: string,
    gameMode: 'coop' | 'versus',
    isPrivate: boolean = false,
    password?: string
  ): Lobby {
    const lobbyId = this.generateLobbyId();
    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      position: { x: 0, y: 0, z: 0 },
      health: 3,
      tntCount: 3,
      speed: 1,
      isAlive: true,
      hasShield: false,
      isInvisible: false,
      remoteDetonators: 0,
      color: '#FF0000',
      score: 0
    };

    const lobby: Lobby = {
      id: lobbyId,
      name: lobbyName,
      hostId,
      players: [hostPlayer],
      maxPlayers: 4,
      gameMode,
      isPrivate,
      password,
      status: 'waiting'
    };

    this.lobbies.set(lobbyId, lobby);
    this.playerLobbies.set(hostId, lobbyId);
    return lobby;
  }

  public joinLobby(
    playerId: string,
    playerName: string,
    lobbyId: string,
    password?: string
  ): boolean {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return false;
    if (lobby.status !== 'waiting') return false;
    if (lobby.players.length >= lobby.maxPlayers) return false;
    if (lobby.isPrivate && lobby.password !== password) return false;

    const player: Player = {
      id: playerId,
      name: playerName,
      position: { x: 0, y: 0, z: 0 },
      health: 3,
      tntCount: 3,
      speed: 1,
      isAlive: true,
      hasShield: false,
      isInvisible: false,
      remoteDetonators: 0,
      color: this.getNextPlayerColor(lobby),
      score: 0
    };

    lobby.players.push(player);
    this.playerLobbies.set(playerId, lobbyId);
    return true;
  }

  public leaveLobby(playerId: string): boolean {
    const lobbyId = this.playerLobbies.get(playerId);
    if (!lobbyId) return false;

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return false;

    // Remove player from lobby
    lobby.players = lobby.players.filter(p => p.id !== playerId);
    this.playerLobbies.delete(playerId);

    // If host left, assign new host or delete lobby
    if (lobby.hostId === playerId) {
      if (lobby.players.length > 0) {
        lobby.hostId = lobby.players[0].id;
      } else {
        this.lobbies.delete(lobbyId);
      }
    }

    return true;
  }

  public startGame(lobbyId: string): boolean {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.status !== 'waiting') return false;
    if (lobby.players.length < 2) return false;

    lobby.status = 'starting';
    return true;
  }

  public getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  public getPlayerLobby(playerId: string): Lobby | undefined {
    const lobbyId = this.playerLobbies.get(playerId);
    return lobbyId ? this.lobbies.get(lobbyId) : undefined;
  }

  public listLobbies(): Lobby[] {
    return Array.from(this.lobbies.values())
      .filter(lobby => !lobby.isPrivate && lobby.status === 'waiting');
  }

  private generateLobbyId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private getNextPlayerColor(lobby: Lobby): string {
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'];
    const usedColors = new Set(lobby.players.map(p => p.color));
    return colors.find(color => !usedColors.has(color)) || '#FFFFFF';
  }
} 