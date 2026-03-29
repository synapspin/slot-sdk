import { Container } from 'pixi.js';
import { Reel } from './Reel';
import type { ReelSetConfig } from './ReelConfig';
import type { SymbolRegistry } from '../symbols/SymbolRegistry';
import type { EventBus } from '../events/EventBus';
import { StandardSpinAnimation } from './animations/StandardSpinAnimation';
import type { IReelAnimation } from './animations/IReelAnimation';
import { Logger } from '../utils/Logger';

export class ReelSet extends Container {
  private reels: Reel[] = [];
  private config: ReelSetConfig;
  private eventBus: EventBus;
  private registry: SymbolRegistry;
  private logger = new Logger('ReelSet');
  private stopCallbacks: (() => void)[] = [];
  private pendingStops = 0;
  private _animationFactory: () => IReelAnimation;
  private _quickSpin = false;
  private _turboSpin = false;

  constructor(
    config: ReelSetConfig,
    registry: SymbolRegistry,
    eventBus: EventBus,
  ) {
    super();
    this.config = config;
    this.registry = registry;
    this.eventBus = eventBus;
    this._animationFactory = () => new StandardSpinAnimation({
      maxSpeed: config.spinSpeed / 10,
      overshoot: config.overshoot,
    });

    this.createReels();
    this.setupListeners();
  }

  private createReels(): void {
    const { cols, rows, rowsPerCol, symbolSize, symbolGap = 0 } = this.config;
    const cellWidth = symbolSize.width + symbolGap;

    for (let col = 0; col < cols; col++) {
      const reelRows = rowsPerCol?.[col] ?? rows;
      const reel = new Reel(col, reelRows, this.config, this.registry);
      reel.x = col * cellWidth;

      // Center vertically if different row counts
      if (rowsPerCol && reelRows !== rows) {
        reel.y = ((rows - reelRows) * (symbolSize.height + symbolGap)) / 2;
      }

      this.addChild(reel);
      this.reels.push(reel);
    }

    this.logger.info(`Created ${cols} reels, ${rows} rows`);
  }

  private setupListeners(): void {
    this.eventBus.on('ui:quickSpinToggled', ({ enabled }) => {
      this._quickSpin = enabled;
    });
    this.eventBus.on('ui:turboSpinToggled', ({ enabled }) => {
      this._turboSpin = enabled;
    });
    this.eventBus.on('reels:quickStop', () => {
      this.forceStopAll();
    });
  }

  /** Set a custom animation factory */
  setAnimationFactory(factory: () => IReelAnimation): void {
    this._animationFactory = factory;
  }

  /** Set initial symbols on all reels */
  setInitialSymbols(grid: number[][]): void {
    for (let col = 0; col < this.reels.length; col++) {
      if (grid[col]) {
        this.reels[col].setSymbols(grid[col]);
        this.reels[col].fillBuffers(
          this.registry.getAllDefinitions().map((d) => d.id),
        );
      }
    }
  }

  /** Start all reels spinning */
  async startSpin(): Promise<void> {
    this.logger.info('Starting spin');
    this.eventBus.emit('reels:startSpin', undefined as never);

    for (const reel of this.reels) {
      reel.resetHighlights();
      const animation = this._animationFactory();
      reel.startSpin(animation);
    }
  }

  /** Stop reels with target result from server */
  async stopReels(result: number[][]): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this._turboSpin) {
        // Instant stop
        for (let col = 0; col < this.reels.length; col++) {
          this.reels[col].forceStop();
          if (result[col]) {
            this.reels[col].setSymbols(result[col]);
            this.reels[col].snapToGrid();
          }
          this.eventBus.emit('reel:stopped', { reelIndex: col });
        }
        this.eventBus.emit('reels:stopped', { grid: result });
        resolve();
        return;
      }

      const stopDelay = this._quickSpin
        ? this.config.stopDelay * 0.5
        : this.config.stopDelay;

      this.pendingStops = this.reels.length;

      for (let col = 0; col < this.reels.length; col++) {
        const delay = col * stopDelay;

        setTimeout(() => {
          if (result[col]) {
            this.reels[col].stopSpin(result[col]);
          }
        }, delay);
      }

      // Monitor for all reels stopped
      const maxWait = stopDelay * this.reels.length + 3000; // safety timeout
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const allStopped = this.reels.every((r) => !r.spinning);
        if (allStopped || Date.now() - startTime > maxWait) {
          clearInterval(checkInterval);
          // Force stop any remaining
          if (!allStopped) {
            this.forceStopAll();
            for (let col = 0; col < this.reels.length; col++) {
              if (result[col]) {
                this.reels[col].setSymbols(result[col]);
                this.reels[col].snapToGrid();
              }
            }
          }
          this.eventBus.emit('reels:stopped', { grid: result });
          resolve();
        }
      }, 16);
    });
  }

  /** Force stop all reels immediately */
  forceStopAll(): void {
    for (const reel of this.reels) {
      reel.forceStop();
    }
  }

  /** Frame update — called from GameApp ticker */
  update(delta: number): void {
    for (const reel of this.reels) {
      if (reel.spinning) {
        const done = reel.update(delta);
        if (done) {
          this.eventBus.emit('reel:stopped', { reelIndex: reel.index });
        }
      }
    }
  }

  /** Get reel by index */
  getReel(index: number): Reel | undefined {
    return this.reels[index];
  }

  /** Get all reels */
  getAllReels(): Reel[] {
    return [...this.reels];
  }

  /** Get symbol at grid position */
  getSymbolAt(col: number, row: number): import('./Symbol').SlotSymbol | undefined {
    return this.reels[col]?.getSymbolAt(row);
  }

  /** Highlight specific positions */
  highlightPositions(positions: [number, number][]): void {
    // Group by column
    const byCol = new Map<number, number[]>();
    for (const [col, row] of positions) {
      if (!byCol.has(col)) byCol.set(col, []);
      byCol.get(col)!.push(row);
    }

    for (const reel of this.reels) {
      const rows = byCol.get(reel.index);
      if (rows) {
        reel.highlightRows(rows);
      } else {
        reel.highlightRows([]); // dim all
      }
    }
  }

  /** Reset all highlights */
  resetHighlights(): void {
    for (const reel of this.reels) {
      reel.resetHighlights();
    }
  }

  get totalWidth(): number {
    const gap = this.config.symbolGap ?? 0;
    return this.config.cols * (this.config.symbolSize.width + gap) - gap;
  }

  get totalHeight(): number {
    return this.config.rows * (this.config.symbolSize.height + (this.config.symbolGap ?? 0));
  }

  get cols(): number {
    return this.config.cols;
  }

  get rows(): number {
    return this.config.rows;
  }
}
