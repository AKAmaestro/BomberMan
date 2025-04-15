import { World, Player } from 'hytopia';
import { DreamWorldGenerator } from './DreamWorldGenerator';
import { AIPromptProcessor } from './AIPromptProcessor';
import { EffectsManager } from './EffectsManager';
import { NPCManager } from './NPCManager';

export class DreamCommandHandler {
  constructor(
    private world: World,
    private dreamGenerator: DreamWorldGenerator,
    private promptProcessor: AIPromptProcessor,
    private effectsManager: EffectsManager,
    private npcManager: NPCManager
  ) {
    this.registerCommands();
  }

  private registerCommands() {
    this.world.chatManager.registerCommand('/dream', async (player, prompt) => {
      if (!prompt) {
        this.sendHelpMessage(player);
        return;
      }

      await this.handleDreamCommand(player, prompt);
    });
  }

  private async handleDreamCommand(player: Player, prompt: string) {
    try {
      // Send processing message
      this.world.chatManager.sendPlayerMessage(player, 'Processing your dream...', '00FF00');

      // Process the prompt
      const dreamConfig = await this.promptProcessor.processPrompt(prompt);

      // Generate the dream world
      await this.dreamGenerator.generateDreamWorld(dreamConfig);

      // Apply effects
      this.effectsManager.applyDreamEffects(player, dreamConfig);

      // Generate NPCs
      this.npcManager.generateDreamNPCs(dreamConfig);

      // Success message
      this.world.chatManager.sendPlayerMessage(player, 'Your dream has been manifested!', '00FF00');
    } catch (error) {
      this.world.chatManager.sendPlayerMessage(player, 'Failed to generate dream world', 'FF0000');
    }
  }

  private sendHelpMessage(player: Player) {
    this.world.chatManager.sendPlayerMessage(player, 'Usage: /dream <description>', 'FFFF00');
    this.world.chatManager.sendPlayerMessage(player, 'Example: /dream peaceful forest with floating crystals', 'FFFF00');
  }
} 