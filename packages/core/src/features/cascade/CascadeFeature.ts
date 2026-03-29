import type { IFeaturePlugin, FeatureContext } from '../IFeaturePlugin';
import type { IState } from '../../state/IState';
import type { StateTransition, GameContext } from '../../state/StateMachine';
import type { CascadeStep } from '../../server/ServerMessage';
import { Logger } from '../../utils/Logger';

export interface CascadeConfig {
  /** Multiplier progression per cascade step (e.g. [1, 2, 3, 5]) */
  multiplierProgression?: number[];
  /** Animation speed for symbol removal (ms) */
  removeAnimDuration?: number;
  /** Animation speed for symbols dropping (ms) */
  dropAnimDuration?: number;
}

class CascadeProcessState implements IState {
  readonly id = 'cascade:process';
  private config: CascadeConfig;

  constructor(config: CascadeConfig) {
    this.config = config;
  }

  async enter(context: GameContext): Promise<void> {
    const response = context.lastResponse;
    const cascadeChain = response?.cascadeChain ?? [];

    if (cascadeChain.length === 0) {
      await context.transitionTo('featureCheck');
      return;
    }

    let cascadeWin = 0;
    const removeTime = this.config.removeAnimDuration ?? 400;
    const dropTime = this.config.dropAnimDuration ?? 300;

    for (let step = 0; step < cascadeChain.length; step++) {
      const cascade = cascadeChain[step];

      // Highlight winning positions
      const allPositions = cascade.wins.flatMap((w) => w.positions);
      context.reelSet.highlightPositions(allPositions);
      context.soundManager.play('win');
      await new Promise((r) => setTimeout(r, removeTime));

      // Dim/remove winning symbols
      for (const [col, row] of cascade.removedPositions) {
        const sym = context.reelSet.getSymbolAt(col, row);
        if (sym) sym.alpha = 0;
      }
      await new Promise((r) => setTimeout(r, dropTime));

      // Apply new symbols
      context.reelSet.resetHighlights();

      cascadeWin += cascade.wins.reduce((sum, w) => sum + w.payout, 0);

      // Show multiplier if applicable
      if (cascade.multiplier > 1) {
        context.uiManager.updateWin(cascadeWin * cascade.multiplier, context.currency);
      }
    }

    context.totalWin += cascadeWin;
    await context.transitionTo('featureCheck');
  }

  async exit(): Promise<void> {}
}

export class CascadeFeature implements IFeaturePlugin {
  readonly id = 'cascade';
  readonly name = 'Cascade / Tumble';
  readonly priority = 5;

  private config: CascadeConfig;
  private logger = new Logger('CascadeFeature');

  constructor(config: CascadeConfig = {}) {
    this.config = config;
  }

  install(context: FeatureContext): void {
    this.logger.info('Cascade feature installed');
  }

  uninstall(): void {}

  getStates(): Map<string, IState> {
    return new Map([
      ['cascade:process', new CascadeProcessState(this.config)],
    ]);
  }

  getTransitions(): StateTransition[] {
    return [];
  }
}
