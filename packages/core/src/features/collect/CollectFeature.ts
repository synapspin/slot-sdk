import type { IFeaturePlugin, FeatureContext } from '../IFeaturePlugin';
import type { IState } from '../../state/IState';
import type { StateTransition, GameContext } from '../../state/StateMachine';
import { Logger } from '../../utils/Logger';

export interface CollectConfig {
  /** Symbol ID that triggers collection */
  collectSymbolId: number;
  /** Symbol IDs that can be collected (money symbols) */
  collectableSymbolIds: number[];
}

class CollectProcessState implements IState {
  readonly id = 'collect:process';

  async enter(context: GameContext): Promise<void> {
    const response = context.lastResponse;
    if (!response) {
      await context.transitionTo('featureCheck');
      return;
    }

    const collectWins = response.wins.filter((w) => w.type === 'collect');
    if (collectWins.length === 0) {
      await context.transitionTo('featureCheck');
      return;
    }

    // Animate collect: highlight collect symbols, then animate values flying to total
    for (const win of collectWins) {
      context.reelSet.highlightPositions(win.positions);
      context.soundManager.play('win');
      await new Promise((r) => setTimeout(r, 800));
    }

    context.reelSet.resetHighlights();
    await context.transitionTo('featureCheck');
  }

  async exit(): Promise<void> {}
}

export class CollectFeature implements IFeaturePlugin {
  readonly id = 'collect';
  readonly name = 'Collect';
  readonly priority = 15;

  private config: CollectConfig;
  private logger = new Logger('CollectFeature');

  constructor(config: CollectConfig) {
    this.config = config;
  }

  install(context: FeatureContext): void {
    this.logger.info('Collect feature installed');
  }

  uninstall(): void {}

  getStates(): Map<string, IState> {
    return new Map([
      ['collect:process', new CollectProcessState()],
    ]);
  }

  getTransitions(): StateTransition[] {
    return [];
  }
}
