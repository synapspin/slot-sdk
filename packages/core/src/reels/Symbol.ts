import { Container, Sprite, Texture } from 'pixi.js';
import type { SymbolRegistry } from '../symbols/SymbolRegistry';

export class SlotSymbol extends Container {
  private sprite: Sprite;
  private _symbolId: number = -1;
  private registry: SymbolRegistry;
  private symbolWidth: number;
  private symbolHeight: number;
  /** Base scale when sprite fits the cell — set after each texture change */
  private baseScaleX = 1;
  private baseScaleY = 1;

  constructor(registry: SymbolRegistry, width: number, height: number) {
    super();
    this.registry = registry;
    this.symbolWidth = width;
    this.symbolHeight = height;

    this.sprite = new Sprite(Texture.EMPTY);
    this.sprite.anchor.set(0.5);
    this.sprite.width = width;
    this.sprite.height = height;
    this.addChild(this.sprite);
  }

  get symbolId(): number {
    return this._symbolId;
  }

  setSymbol(symbolId: number): void {
    this._symbolId = symbolId;
    const texture = this.registry.getTexture(symbolId);
    this.sprite.texture = texture;
    this.sprite.width = this.symbolWidth;
    this.sprite.height = this.symbolHeight;
    // Store the base scale so animations work relative to it
    this.baseScaleX = this.sprite.scale.x;
    this.baseScaleY = this.sprite.scale.y;
  }

  /** Play win animation (scale pulse — 15% larger than base) */
  playWinAnimation(): void {
    this.sprite.scale.set(
      this.baseScaleX * 1.15,
      this.baseScaleY * 1.15,
    );
  }

  /** Reset to idle state */
  resetAnimation(): void {
    this.sprite.scale.set(this.baseScaleX, this.baseScaleY);
    this.sprite.alpha = 1;
  }

  /** Dim symbol (for non-winning symbols) */
  dim(dimmed: boolean): void {
    this.sprite.alpha = dimmed ? 0.3 : 1;
  }

  /** Set blur effect during spinning */
  setBlur(enabled: boolean): void {
    this.sprite.alpha = enabled ? 0.7 : 1;
  }
}
