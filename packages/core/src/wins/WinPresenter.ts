import { Container } from 'pixi.js';
import type { WinResult } from '../server/ServerMessage';
import type { ReelSet } from '../reels/ReelSet';
import type { EventBus } from '../events/EventBus';
import type { SoundManager } from '../sound/SoundManager';
import { WinLine } from './WinLine';
import { Logger } from '../utils/Logger';

export interface WinPresentationConfig {
  /** Time to show each win line (ms) */
  winLineDisplayTime: number;
  /** Total win count-up duration (ms) */
  countUpDuration: number;
}

const DEFAULT_CONFIG: WinPresentationConfig = {
  winLineDisplayTime: 1500,
  countUpDuration: 1000,
};

export class WinPresenter {
  private reelSet: ReelSet;
  private eventBus: EventBus;
  private soundManager: SoundManager;
  private config: WinPresentationConfig;
  private winLine: WinLine;
  private winLineContainer: Container;
  private logger = new Logger('WinPresenter');
  private presenting = false;
  private aborted = false;
  private abortResolve: (() => void) | null = null;

  constructor(
    reelSet: ReelSet,
    eventBus: EventBus,
    soundManager: SoundManager,
    parentContainer: Container,
    config?: Partial<WinPresentationConfig>,
  ) {
    this.reelSet = reelSet;
    this.eventBus = eventBus;
    this.soundManager = soundManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.winLineContainer = new Container();
    parentContainer.addChild(this.winLineContainer);

    this.winLine = new WinLine();
    this.winLineContainer.addChild(this.winLine);
  }

  /** Present all wins sequentially. Resolves when done or skipped. */
  async presentWins(wins: WinResult[], totalWin: number): Promise<void> {
    this.presenting = true;
    this.aborted = false;

    // Count up total win
    this.countUpWin(totalWin);

    // Show each win line
    for (const win of wins) {
      if (this.aborted) break;

      // Highlight winning positions
      this.reelSet.highlightPositions(win.positions);
      this.winLine.draw(
        win.positions,
        this.reelSet,
        this.getWinColor(win),
        5,
        win.payout,
      );

      // Play win animation on symbols
      for (const [col, row] of win.positions) {
        const sym = this.reelSet.getSymbolAt(col, row);
        sym?.playWinAnimation();
      }

      this.soundManager.play('win');
      this.eventBus.emit('win:linePresented', { win });

      // Wait for display time — but can be interrupted by abort
      await this.waitOrAbort(this.config.winLineDisplayTime);

      if (this.aborted) break;

      // Clear line before next
      this.winLine.clear();
      this.reelSet.resetHighlights();
    }

    // Final cleanup
    this.winLine.clear();
    this.reelSet.resetHighlights();
    this.presenting = false;
    this.eventBus.emit('win:presentationComplete', undefined as never);
  }

  /** Skip/abort current presentation immediately */
  abort(): void {
    this.aborted = true;
    this.winLine.clear();
    this.reelSet.resetHighlights();
    // Resolve any pending wait
    if (this.abortResolve) {
      this.abortResolve();
      this.abortResolve = null;
    }
  }

  private async countUpWin(total: number): Promise<void> {
    const steps = 20;
    const interval = this.config.countUpDuration / steps;

    for (let i = 1; i <= steps; i++) {
      if (this.aborted) break;
      const current = Math.round((total / steps) * i);
      this.eventBus.emit('win:countUp', { current, total });
      await this.wait(interval);
    }

    this.eventBus.emit('win:countUp', { current: total, total });
  }

  private getWinColor(win: WinResult): number {
    switch (win.type) {
      case 'scatter':
        return 0xff44ff;
      case 'collect':
        return 0x44ffff;
      default:
        return 0xffd700;
    }
  }

  /** Wait that can be interrupted by abort() */
  private waitOrAbort(ms: number): Promise<void> {
    if (this.aborted) return Promise.resolve();
    return new Promise((resolve) => {
      this.abortResolve = resolve;
      setTimeout(() => {
        this.abortResolve = null;
        resolve();
      }, ms);
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  get isPresenting(): boolean {
    return this.presenting;
  }
}
