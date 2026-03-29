import { Assets } from 'pixi.js';
import type { AssetBundleConfig } from '../app/GameConfig';
import { Logger } from '../utils/Logger';

export class AssetLoader {
  private static logger = new Logger('AssetLoader');

  /** Initialize the asset manifest with all bundles */
  static async init(bundles: AssetBundleConfig[]): Promise<void> {
    const manifest = {
      bundles: bundles.map((b) => ({
        name: b.name,
        assets: b.assets.map((a) => ({
          alias: a.alias,
          src: a.src,
        })),
      })),
    };

    await Assets.init({ manifest });
    this.logger.info('Asset manifest initialized');
  }

  /** Load a bundle by name, with optional progress callback */
  static async loadBundle(
    name: string,
    onProgress?: (progress: number) => void,
  ): Promise<Record<string, unknown>> {
    this.logger.info(`Loading bundle: ${name}`);
    const result = await Assets.loadBundle(name, onProgress);
    this.logger.info(`Bundle loaded: ${name}`);
    return result as Record<string, unknown>;
  }

  /** Load multiple bundles */
  static async loadBundles(
    names: string[],
    onProgress?: (progress: number) => void,
  ): Promise<Record<string, unknown>> {
    this.logger.info(`Loading bundles: ${names.join(', ')}`);
    const result = await Assets.loadBundle(names, onProgress);
    return result as Record<string, unknown>;
  }

  /** Background-load a bundle for later use */
  static async backgroundLoad(name: string): Promise<void> {
    await Assets.backgroundLoadBundle(name);
  }

  /** Get a loaded asset by alias */
  static get<T = unknown>(alias: string): T {
    return Assets.get<T>(alias);
  }
}
