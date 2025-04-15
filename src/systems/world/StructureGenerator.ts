import { DreamFeature } from '../../types/DreamTypes';

export class StructureGenerator {
  async addFeatures(terrain: number[][][], features: string[]): Promise<void> {
    for (const feature of features) {
      await this.generateFeature(terrain, feature);
    }
  }

  private async generateFeature(terrain: number[][][], featureType: string): Promise<void> {
    const feature = this.createFeatureTemplate(featureType);
    await this.placeFeature(terrain, feature);
  }

  private createFeatureTemplate(featureType: string): DreamFeature {
    switch (featureType) {
      case 'crystal_formation':
        return {
          type: 'crystal_formation',
          position: { x: 0, y: 0, z: 0 },
          size: { x: 5, y: 8, z: 5 },
          properties: {
            crystalType: 'diamond',
            glowIntensity: 0.8
          }
        };
      case 'floating_island':
        return {
          type: 'floating_island',
          position: { x: 0, y: 20, z: 0 },
          size: { x: 15, y: 10, z: 15 },
          properties: {
            biome: 'crystal',
            hasWaterfall: true
          }
        };
      default:
        return {
          type: 'generic',
          position: { x: 0, y: 0, z: 0 },
          size: { x: 3, y: 3, z: 3 },
          properties: {}
        };
    }
  }

  private async placeFeature(terrain: number[][][], feature: DreamFeature): Promise<void> {
    // Place the feature in the terrain array
    const { position, size } = feature;
    
    for (let x = 0; x < size.x; x++) {
      for (let y = 0; y < size.y; y++) {
        for (let z = 0; z < size.z; z++) {
          const worldX = position.x + x;
          const worldY = position.y + y;
          const worldZ = position.z + z;
          
          if (this.isInBounds(terrain, worldX, worldY, worldZ)) {
            terrain[worldX][worldY][worldZ] = this.getFeatureBlock(feature, x, y, z);
          }
        }
      }
    }
  }

  private isInBounds(terrain: number[][][], x: number, y: number, z: number): boolean {
    return x >= 0 && x < terrain.length &&
           y >= 0 && y < terrain[0].length &&
           z >= 0 && z < terrain[0][0].length;
  }

  private getFeatureBlock(feature: DreamFeature, x: number, y: number, z: number): number {
    switch (feature.type) {
      case 'crystal_formation':
        return this.getCrystalBlock(x, y, z, feature.properties);
      case 'floating_island':
        return this.getFloatingIslandBlock(x, y, z, feature.properties);
      default:
        return 0;
    }
  }

  private getCrystalBlock(x: number, y: number, z: number, properties: any): number {
    // Return appropriate block ID for crystal structures
    return 3; // Diamond ore block
  }

  private getFloatingIslandBlock(x: number, y: number, z: number, properties: any): number {
    // Return appropriate block ID for floating islands
    if (y === 0) return 7; // Grass on top
    return 4; // Dirt for body
  }
} 