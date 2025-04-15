import { startServer, World, PlayerEvent, ChatEvent } from 'hytopia';
import { GameManager } from './systems/GameManager';

startServer((world: World) => {
  const gameManager = new GameManager(world);

  // Handle player joining
  world.on(PlayerEvent.JOINED_WORLD, (event) => {
    const playerId = event.player.id;
    gameManager.addPlayer(playerId);
  });

  // Handle player leaving
  world.on(PlayerEvent.LEFT_WORLD, (event) => {
    const gameState = gameManager.getGameState();
    gameState.players.delete(event.player.id);
  });

  // Handle player movement
  world.on('player:move', (event) => {
    const { player, direction } = event;
    gameManager.movePlayer(player.id, direction);
  });

  // Handle TNT placement
  world.on('player:action', (event) => {
    const { player, action } = event;
    if (action === 'placeTNT') {
      gameManager.placeTNT(player.id);
    }
  });

  // Handle chat commands
  world.on(ChatEvent.SENT, (event) => {
    const { message } = event;
    
    if (message === '/start') {
      gameManager.startGame();
    }
  });

  // Game update loop
  setInterval(() => {
    gameManager.update();
    
    // Update UI for all players
    const gameState = gameManager.getGameState();
    for (const [playerId, player] of gameState.players) {
      const worldPlayer = world.getPlayer(playerId);
      if (!worldPlayer) continue;

      world.setUI(worldPlayer, `
        <div class="game-ui">
          <div class="stats">
            <div>Level: ${gameState.currentLevel}</div>
            <div>Health: ${player.health}</div>
            <div>TNT: ${player.tntCount}</div>
            <div>Score: ${player.score}</div>
            <div>Time: ${Math.max(0, Math.floor(gameState.timeRemaining))}</div>
          </div>
          ${gameState.gameStatus === 'gameOver' ? `
            <div class="game-over">
              <h2>Game Over!</h2>
              <p>Final Score: ${player.score}</p>
              <p>Level Reached: ${gameState.currentLevel}</p>
              <button onclick="window.location.reload()">Play Again</button>
            </div>
          ` : ''}
          ${gameState.gameStatus === 'levelComplete' ? `
            <div class="level-complete">
              <h2>Level ${gameState.currentLevel - 1} Complete!</h2>
              <p>Advancing to Level ${gameState.currentLevel}...</p>
            </div>
          ` : ''}
        </div>
      `);
    }
  }, 1000);
}); 