import { Container, Graphics } from 'pixi.js';
import { SlotSymbol } from './Symbol';
import type { SymbolRegistry } from '../symbols/SymbolRegistry';
import type { IReelAnimation } from './animations/IReelAnimation';
import type { ReelSetConfig } from './ReelConfig';
import { Logger } from '../utils/Logger';

export class Reel extends Container {
  readonly index: number;
  readonly visibleRows: number;
  private symbols: SlotSymbol[] = [];
  private symbolWidth: number;
  private symbolHeight: number;
  private symbolGap: number;
  private cellHeight: number;
  private symbolContainer: Container;
  private reelMask: Graphics;
  private animation: IReelAnimation | null = null;
  private _spinning = false;
  private registry: SymbolRegistry;
  private logger: Logger;

  /** Extra symbols above and below for smooth scrolling */
  private static BUFFER_SYMBOLS = 2;

  constructor(
    index: number,
    rows: number,
    config: ReelSetConfig,
    registry: SymbolRegistry,
  ) {
    super();
    this.index = index;
    this.visibleRows = rows;
    this.registry = registry;
    this.symbolWidth = config.symbolSize.width;
    this.symbolHeight = config.symbolSize.height;
    this.symbolGap = config.symbolGap ?? 0;
    this.cellHeight = this.symbolHeight + this.symbolGap;
    this.logger = new Logger(`Reel[${index}]`);

    // Symbol container (will be masked)
    this.symbolContainer = new Container();
    this.addChild(this.symbolContainer);

    // Create mask for visible area
    // Symbols are positioned with anchor(0.5), so their center is at (symbolWidth/2, cellHeight/2).
    // Mask covers [0, 0] -> [symbolWidth, visibleRows * cellHeight] in reel-local coords.
    const maskPadding = config.maskPadding ?? 2;
    this.reelMask = new Graphics();
    this.reelMask.rect(
      -maskPadding,
      -maskPadding,
      this.symbolWidth + maskPadding * 2,
      this.visibleRows * this.cellHeight + maskPadding * 2,
    );
    this.reelMask.fill(0xffffff);
    this.addChild(this.reelMask);
    this.symbolContainer.mask = this.reelMask;

    // Create symbol pool (visible + buffer)
    const totalSymbols = this.visibleRows + Reel.BUFFER_SYMBOLS * 2;
    for (let i = 0; i < totalSymbols; i++) {
      const sym = new SlotSymbol(registry, this.symbolWidth, this.symbolHeight);
      // Center symbol within cell
      sym.x = this.symbolWidth / 2;
      sym.y = (i - Reel.BUFFER_SYMBOLS) * this.cellHeight + this.cellHeight / 2;
      this.symbolContainer.addChild(sym);
      this.symbols.push(sym);
    }
  }

  get spinning(): boolean {
    return this._spinning;
  }

  get totalHeight(): number {
    return this.visibleRows * this.cellHeight;
  }

  /** Set the visible symbols by ID */
  setSymbols(symbolIds: number[]): void {
    for (let row = 0; row < this.visibleRows; row++) {
      const symIndex = row + Reel.BUFFER_SYMBOLS;
      if (symIndex < this.symbols.length && row < symbolIds.length) {
        this.symbols[symIndex].setSymbol(symbolIds[row]);
      }
    }
  }

  /** Set initial random symbols for buffer zones */
  fillBuffers(allSymbolIds: number[]): void {
    for (let i = 0; i < Reel.BUFFER_SYMBOLS; i++) {
      const randomId = allSymbolIds[Math.floor(Math.random() * allSymbolIds.length)];
      this.symbols[i].setSymbol(randomId);
    }
    for (let i = this.visibleRows + Reel.BUFFER_SYMBOLS; i < this.symbols.length; i++) {
      const randomId = allSymbolIds[Math.floor(Math.random() * allSymbolIds.length)];
      this.symbols[i].setSymbol(randomId);
    }
  }

  /** Move all symbols down by delta pixels (for spinning) */
  moveSymbols(delta: number): void {
    for (const sym of this.symbols) {
      sym.y += delta;
    }

    // Recycle symbols that move out of view
    const bottomLimit = (this.visibleRows + Reel.BUFFER_SYMBOLS) * this.cellHeight + this.cellHeight / 2;
    const topStart = -Reel.BUFFER_SYMBOLS * this.cellHeight + this.cellHeight / 2;

    for (const sym of this.symbols) {
      if (sym.y > bottomLimit) {
        sym.y -= this.symbols.length * this.cellHeight;
        // Set random symbol during spin
        const defs = this.registry.getAllDefinitions();
        const randomDef = defs[Math.floor(Math.random() * defs.length)];
        sym.setSymbol(randomDef.id);
      }
    }
  }

  /** Snap symbols to grid positions */
  snapToGrid(): void {
    for (let i = 0; i < this.symbols.length; i++) {
      this.symbols[i].y = (i - Reel.BUFFER_SYMBOLS) * this.cellHeight + this.cellHeight / 2;
    }
  }

  /** Set vertical offset (for bounce animation) */
  setOffset(offset: number): void {
    this.symbolContainer.y = offset;
  }

  /** Toggle blur on symbols during spin */
  blur(enabled: boolean): void {
    for (const sym of this.symbols) {
      sym.setBlur(enabled);
    }
  }

  /** Start spinning with given animation strategy */
  startSpin(animation: IReelAnimation): void {
    this.animation = animation;
    this._spinning = true;
    animation.start(this);
  }

  /** Begin stopping with target symbols */
  stopSpin(targetSymbols: number[]): void {
    if (this.animation) {
      this.animation.beginStop(this, targetSymbols);
    }
  }

  /** Force immediate stop */
  forceStop(): void {
    if (this.animation) {
      this.animation.forceStop(this);
      this._spinning = false;
      this.animation = null;
    }
  }

  /** Frame update */
  update(delta: number): boolean {
    if (!this.animation || !this._spinning) return true;

    const done = this.animation.update(this, delta);
    if (done) {
      this._spinning = false;
      this.animation = null;
    }
    return done;
  }

  /** Get the symbol at a visible row position */
  getSymbolAt(row: number): SlotSymbol | undefined {
    return this.symbols[row + Reel.BUFFER_SYMBOLS];
  }

  /** Get all visible symbols */
  getVisibleSymbols(): SlotSymbol[] {
    return this.symbols.slice(Reel.BUFFER_SYMBOLS, Reel.BUFFER_SYMBOLS + this.visibleRows);
  }

  /** Dim all symbols except those at specified rows */
  highlightRows(rows: number[]): void {
    for (let i = 0; i < this.visibleRows; i++) {
      const sym = this.getSymbolAt(i);
      sym?.dim(!rows.includes(i));
    }
  }

  /** Reset all symbol highlights */
  resetHighlights(): void {
    for (let i = 0; i < this.visibleRows; i++) {
      this.getSymbolAt(i)?.dim(false);
      this.getSymbolAt(i)?.resetAnimation();
    }
  }
}
