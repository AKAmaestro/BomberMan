import { DreamConfig } from '../../types/DreamTypes';
import { NoiseGenerator } from './NoiseGenerator';

export class BiomeGenerator {
  private noiseGen: NoiseGenerator;

  constructor() {
    this.noiseGen = new NoiseGenerator();
  }

  generateTerrain(config: DreamConfig) {
    const { size } = config;
    const terrain = new Array(size.x).fill(0).map(() =>
      new Array(size.y).fill(0).map(() =>
        new Array(size.z).fill(0)
      )
    );

    // Generate base terrain using noise
    this.generateBaseTerrain(terrain, config);

    // Add biome-specific features
    this.addBiomeFeatures(terrain, config);

    return terrain;
  }

  private generateBaseTerrain(terrain: number[][][], config: DreamConfig) {
    const { size, biomeType } = config;
    
    for (let x = 0; x < size.x; x++) {
      for (let z = 0; z < size.z; z++) {
        // Generate height using multiple noise layers
        const baseHeight = this.noiseGen.get2D(x * 0.02, z * 0.02) * 20;
        const detailHeight = this.noiseGen.get2D(x * 0.1, z * 0.1) * 5;
        const height = Math.floor(baseHeight + detailHeight);

        // Fill terrain array
        for (let y = 0; y < size.y; y++) {
          if (y < height) {
            terrain[x][y][z] = this.getBiomeBlock(y, height, biomeType);
          }
        }
      }
    }
  }

  private getBiomeBlock(y: number, maxHeight: number, biomeType: string): number {
    // Return different block types based on biome and height
    switch (biomeType) {
      case 'crystal':
        return y === maxHeight ? 3 : 19; // Diamond ore for surface, stone for depth
      case 'cloud':
        return 6; // Glass blocks for cloud islands
      case 'forest':
        return y === maxHeight ? 7 : 4; // Grass for surface, dirt for depth
      default:
        return 19; // Stone as default
    }
  }

  private addBiomeFeatures(terrain: number[][][], config: DreamConfig) {
    switch (config.biomeType) {
      case 'forest':
        this.addTrees(terrain, config);
        break;
      case 'crystal':
        this.addCrystals(terrain, config);
        break;
      case 'cloud':
        this.addCloudFormations(terrain, config);
        break;
    }
  }

  private addTrees(terrain: number[][][], config: DreamConfig) {
    // Add tree structures
  }

  private addCrystals(terrain: number[][][], config: DreamConfig) {
    // Add crystal formations
  }

  private addCloudFormations(terrain: number[][][], config: DreamConfig) {
    // Add floating cloud structures
  }
} 