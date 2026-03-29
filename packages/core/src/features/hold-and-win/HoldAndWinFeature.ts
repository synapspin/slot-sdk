import { Container, Graphics, Text, Sprite } from 'pixi.js';
import type { IFeaturePlugin, FeatureContext } from '../IFeaturePlugin';
import type { IState } from '../../state/IState';
import type { StateTransition, GameContext } from '../../state/StateMachine';
import type { StickySymbol } from '../../server/ServerMessage';
import { Logger } from '../../utils/Logger';

export interface HoldAndWinConfig {
  /** Total respins at start */
  initialRespins: number;
  /** Grid size for the hold-and-win board (may differ from main reels) */
  cols: number;
  rows: number;
  /** Jackpot labels */
  jackpots?: { type: string; label: string; color: number }[];
}

class HoldAndWinBoard extends Container {
  private cells: (Container | null)[][] = [];
  private stickySymbols: StickySymbol[] = [];
  private cols: number;
  private rows: number;
  private cellSize = 120;
  private gap = 8;

  constructor(cols: number, rows: number) {
    super();
    this.cols = cols;
    this.rows = rows;

    for (let c = 0; c < cols; c++) {
      this.cells[c] = [];
      for (let r = 0; r < rows; r++) {
        this.cells[c][r] = null;

        // Draw empty cell
        const bg = new Graphics();
        bg.roundRect(0, 0, this.cellSize, this.cellSize, 8);
        bg.fill({ color: 0x1a1a3a, alpha: 0.8 });
        bg.stroke({ width: 1, color: 0x333366 });
        bg.x = c * (this.cellSize + this.gap);
        bg.y = r * (this.cellSize + this.gap);
        this.addChild(bg);
      }
    }
  }

  addSticky(sticky: StickySymbol): void {
    this.stickySymbols.push(sticky);

    const cell = new Container();
    cell.x = sticky.col * (this.cellSize + this.gap);
    cell.y = sticky.row * (this.cellSize + this.gap);

    const bg = new Graphics();
    bg.roundRect(0, 0, this.cellSize, this.cellSize, 8);

    // Color based on special type
    let color = 0xffd700;
    if (sticky.special === 'grand') color = 0xff0000;
    else if (sticky.special === 'major') color = 0xff6600;
    else if (sticky.special === 'minor') color = 0x00aaff;
    else if (sticky.special === 'mini') color = 0x44ff44;

    bg.fill({ color, alpha: 0.9 });
    cell.addChild(bg);

    // Value text
    if (sticky.value !== undefined) {
      const valueText = new Text({
        text: sticky.value.toString(),
        style: {
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSize: 20,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      valueText.anchor.set(0.5);
      valueText.x = this.cellSize / 2;
      valueText.y = this.cellSize / 2;
      cell.addChild(valueText);
    }

    // Special label
    if (sticky.special) {
      const label = new Text({
        text: sticky.special.toUpperCase(),
        style: {
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: 'bold',
        },
      });
      label.anchor.set(0.5);
      label.x = this.cellSize / 2;
      label.y = this.cellSize - 15;
      cell.addChild(label);
    }

    this.cells[sticky.col][sticky.row] = cell;
    this.addChild(cell);
  }

  get filledCount(): number {
    return this.stickySymbols.length;
  }

  get totalCells(): number {
    return this.cols * this.rows;
  }

  isFull(): boolean {
    return this.filledCount >= this.totalCells;
  }

  clear(): void {
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (this.cells[c][r]) {
          this.removeChild(this.cells[c][r]!);
          this.cells[c][r] = null;
        }
      }
    }
    this.stickySymbols = [];
  }
}

class HoldAndWinIntroState implements IState {
  readonly id = 'holdAndWin:intro';
  private config: HoldAndWinConfig;

  constructor(config: HoldAndWinConfig) {
    this.config = config;
  }

  async enter(context: GameContext): Promise<void> {
    const feature = context.lastResponse?.feature;
    context.featureState = {
      ...context.featureState,
      hawRespinsRemaining: feature?.totalRespins ?? this.config.initialRespins,
      hawTotalWin: 0,
      hawStickySymbols: feature?.stickyPositions ?? [],
    };

    context.soundManager.play('freeSpinsTrigger');
    await new Promise((r) => setTimeout(r, 2000));
    await context.transitionTo('holdAndWin:respin');
  }

  async exit(): Promise<void> {}
}

class HoldAndWinRespinState implements IState {
  readonly id = 'holdAndWin:respin';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, unknown>;

    context.uiManager.setSpinState('spinning');
    context.uiManager.setInteractive(false);

    try {
      const response = await context.server.spin({
        bet: context.currentBet,
        anteBet: false,
        featureContext: { mode: 'holdAndWin', ...context.featureState },
      });

      context.lastResponse = response;
      context.balance = response.balance;

      // Animate reels
      await context.reelSet.startSpin();
      await context.reelSet.stopReels(response.reelResult);

      // Update sticky symbols
      if (response.feature?.stickyPositions) {
        const existing = (state.hawStickySymbols as StickySymbol[]) ?? [];
        state.hawStickySymbols = [...existing, ...response.feature.stickyPositions];
      }

      state.hawTotalWin = ((state.hawTotalWin as number) ?? 0) + response.totalWin;

      await context.transitionTo('holdAndWin:eval');
    } catch (err) {
      context.eventBus.emit('error', {
        code: 'HAW_SPIN_FAILED',
        message: 'Hold and Win respin failed',
      });
      await context.transitionTo('holdAndWin:summary');
    }
  }

  async exit(): Promise<void> {}
}

class HoldAndWinEvalState implements IState {
  readonly id = 'holdAndWin:eval';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, unknown>;
    const response = context.lastResponse;

    // Check for new sticky symbols
    const newStickies = response?.feature?.stickyPositions ?? [];
    if (newStickies.length > 0) {
      // Reset respins on new sticky
      state.hawRespinsRemaining = 3; // Reset to 3 on new symbol
    } else {
      state.hawRespinsRemaining = ((state.hawRespinsRemaining as number) ?? 0) - 1;
    }

    // Check for jackpot
    if (response?.feature?.jackpot) {
      context.soundManager.play('bigWin');
      await new Promise((r) => setTimeout(r, 3000));
    }

    context.eventBus.emit('feature:spinComplete', {
      remainingSpins: state.hawRespinsRemaining as number,
      totalWin: state.hawTotalWin as number,
    });

    const remaining = state.hawRespinsRemaining as number;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, 500));
      await context.transitionTo('holdAndWin:respin');
    } else {
      await context.transitionTo('holdAndWin:summary');
    }
  }

  async exit(): Promise<void> {}
}

class HoldAndWinSummaryState implements IState {
  readonly id = 'holdAndWin:summary';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, number>;
    const totalWin = state.hawTotalWin ?? 0;

    context.eventBus.emit('feature:ended', { type: 'holdAndWin', totalWin });
    context.uiManager.updateWin(totalWin, context.currency);

    await new Promise((r) => setTimeout(r, 3000));

    delete context.featureState.hawRespinsRemaining;
    delete context.featureState.hawTotalWin;
    delete context.featureState.hawStickySymbols;

    await context.transitionTo('idle');
  }

  async exit(): Promise<void> {}
}

export class HoldAndWinFeature implements IFeaturePlugin {
  readonly id = 'holdAndWin';
  readonly name = 'Hold & Win';
  readonly priority = 20;

  private config: HoldAndWinConfig;
  private logger = new Logger('HoldAndWinFeature');

  constructor(config: HoldAndWinConfig) {
    this.config = config;
  }

  install(context: FeatureContext): void {
    this.logger.info('Hold & Win feature installed');
  }

  uninstall(): void {}

  getStates(): Map<string, IState> {
    const states = new Map<string, IState>();
    states.set('holdAndWin:intro', new HoldAndWinIntroState(this.config));
    states.set('holdAndWin:respin', new HoldAndWinRespinState());
    states.set('holdAndWin:eval', new HoldAndWinEvalState());
    states.set('holdAndWin:summary', new HoldAndWinSummaryState());
    return states;
  }

  getTransitions(): StateTransition[] {
    return [];
  }
}
