import { Texture, Assets } from 'pixi.js';
import type { SymbolDefinition } from './SymbolDefinition';
import { Logger } from '../utils/Logger';

export class SymbolRegistry {
  private definitions = new Map<number, SymbolDefinition>();
  private textures = new Map<number, Texture>();
  private logger = new Logger('SymbolRegistry');

  constructor(symbols: SymbolDefinition[]) {
    for (const sym of symbols) {
      this.definitions.set(sym.id, sym);
    }
  }

  /** Load textures from already-loaded assets */
  resolveTextures(): void {
    for (const [id, def] of this.definitions) {
      const texture = Assets.get<Texture>(def.texture);
      if (texture) {
        this.textures.set(id, texture);
      } else {
        this.logger.warn(`Texture not found for symbol ${id} (${def.name}): ${def.texture}`);
      }
    }
    this.logger.info(`Resolved ${this.textures.size}/${this.definitions.size} symbol textures`);
  }

  getDefinition(id: number): SymbolDefinition | undefined {
    return this.definitions.get(id);
  }

  getTexture(id: number): Texture {
    return this.textures.get(id) ?? Texture.EMPTY;
  }

  getAllDefinitions(): SymbolDefinition[] {
    return [...this.definitions.values()];
  }

  getByType(type: string): SymbolDefinition[] {
    return [...this.definitions.values()].filter((d) => d.type === type);
  }

  get count(): number {
    return this.definitions.size;
  }
}
