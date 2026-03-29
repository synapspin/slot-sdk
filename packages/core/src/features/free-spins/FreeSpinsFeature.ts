import { Container, Text } from 'pixi.js';
import type { IFeaturePlugin, FeatureContext } from '../IFeaturePlugin';
import type { IState } from '../../state/IState';
import type { StateTransition, GameContext } from '../../state/StateMachine';
import { Logger } from '../../utils/Logger';

export interface FreeSpinsConfig {
  triggerSymbolId: number;
  triggerCount: number;
  spinsAwarded: number;
  retriggerable: boolean;
  /** Multiplier progression per retrigger */
  multiplierProgression?: number[];
}

class FreeSpinsIntroState implements IState {
  readonly id = 'freeSpins:intro';
  private config: FreeSpinsConfig;

  constructor(config: FreeSpinsConfig) {
    this.config = config;
  }

  async enter(context: GameContext): Promise<void> {
    const feature = context.lastResponse?.feature;
    context.featureState = {
      ...context.featureState,
      freeSpinsRemaining: feature?.totalSpins ?? this.config.spinsAwarded,
      freeSpinsTotalWin: 0,
      freeSpinsPlayed: 0,
    };

    context.soundManager.play('freeSpinsTrigger');

    // Brief intro delay
    await new Promise((r) => setTimeout(r, 2000));
    await context.transitionTo('freeSpins:spin');
  }

  async exit(): Promise<void> {}
}

class FreeSpinsSpinState implements IState {
  readonly id = 'freeSpins:spin';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, number>;

    context.uiManager.setSpinState('spinning');
    context.uiManager.setInteractive(false);

    try {
      const response = await context.server.spin({
        bet: context.currentBet,
        anteBet: false,
        featureContext: { mode: 'freeSpins', ...context.featureState },
      });

      context.lastResponse = response;
      context.balance = response.balance;
      context.eventBus.emit('balance:updated', { balance: response.balance });

      // Animate reels
      await context.reelSet.startSpin();
      await context.reelSet.stopReels(response.reelResult);

      context.soundManager.play('reelStop');

      state.freeSpinsPlayed = (state.freeSpinsPlayed ?? 0) + 1;
      state.freeSpinsTotalWin = (state.freeSpinsTotalWin ?? 0) + response.totalWin;

      // Handle retrigger
      if (response.feature?.type === 'freeSpins' && response.feature.totalSpins) {
        state.freeSpinsRemaining = (state.freeSpinsRemaining ?? 0) + response.feature.totalSpins;
      }

      await context.transitionTo('freeSpins:eval');
    } catch (err) {
      context.eventBus.emit('error', {
        code: 'FREE_SPIN_FAILED',
        message: 'Free spin failed',
      });
      await context.transitionTo('freeSpins:summary');
    }
  }

  async exit(): Promise<void> {}
}

class FreeSpinsEvalState implements IState {
  readonly id = 'freeSpins:eval';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, number>;
    const response = context.lastResponse;

    // Show wins if any
    if (response && response.wins.length > 0) {
      context.uiManager.updateWin(response.totalWin, context.currency);
      // Brief win display
      context.reelSet.highlightPositions(
        response.wins.flatMap((w) => w.positions),
      );
      context.soundManager.play('win');
      await new Promise((r) => setTimeout(r, 1000));
      context.reelSet.resetHighlights();
    }

    state.freeSpinsRemaining = (state.freeSpinsRemaining ?? 0) - 1;

    context.eventBus.emit('feature:spinComplete', {
      remainingSpins: state.freeSpinsRemaining,
      totalWin: state.freeSpinsTotalWin,
    });

    if (state.freeSpinsRemaining > 0) {
      await new Promise((r) => setTimeout(r, 500));
      await context.transitionTo('freeSpins:spin');
    } else {
      await context.transitionTo('freeSpins:summary');
    }
  }

  async exit(): Promise<void> {}
}

class FreeSpinsSummaryState implements IState {
  readonly id = 'freeSpins:summary';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, number>;
    const totalWin = state.freeSpinsTotalWin ?? 0;

    context.eventBus.emit('feature:ended', { type: 'freeSpins', totalWin });
    context.uiManager.updateWin(totalWin, context.currency);

    // Display summary
    await new Promise((r) => setTimeout(r, 3000));

    // Clean up feature state
    delete context.featureState.freeSpinsRemaining;
    delete context.featureState.freeSpinsTotalWin;
    delete context.featureState.freeSpinsPlayed;

    await context.transitionTo('idle');
  }

  async exit(): Promise<void> {}
}

export class FreeSpinsFeature implements IFeaturePlugin {
  readonly id = 'freeSpins';
  readonly name = 'Free Spins';
  readonly priority = 10;

  private config: FreeSpinsConfig;
  private logger = new Logger('FreeSpinsFeature');

  constructor(config: FreeSpinsConfig) {
    this.config = config;
  }

  install(context: FeatureContext): void {
    this.logger.info('Free Spins feature installed');
  }

  uninstall(): void {}

  getStates(): Map<string, IState> {
    const states = new Map<string, IState>();
    states.set('freeSpins:intro', new FreeSpinsIntroState(this.config));
    states.set('freeSpins:spin', new FreeSpinsSpinState());
    states.set('freeSpins:eval', new FreeSpinsEvalState());
    states.set('freeSpins:summary', new FreeSpinsSummaryState());
    return states;
  }

  getTransitions(): StateTransition[] {
    return [];
  }
}
