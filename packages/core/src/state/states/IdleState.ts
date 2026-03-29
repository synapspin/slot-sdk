import type { IState } from '../IState';
import type { GameContext } from '../StateMachine';
import { Logger } from '../../utils/Logger';

export class IdleState implements IState {
  readonly id = 'idle';
  private logger = new Logger('IdleState');
  private spinHandler: (() => void) | null = null;
  private autoPlayHandler: ((payload: { spins: number; stopOnFeature?: boolean }) => void) | null = null;

  async enter(context: GameContext): Promise<void> {
    this.logger.debug('Entering idle state');

    // Reset win display
    context.uiManager.updateWin(0, context.currency);
    context.uiManager.setSpinState('idle');
    context.uiManager.setInteractive(true);
    context.totalWin = 0;

    // Check auto play
    if (context.autoPlayRemaining > 0) {
      context.autoPlayRemaining--;
      context.eventBus.emit('ui:autoPlaySpinDone', { remaining: context.autoPlayRemaining });

      // Check auto play stop conditions
      if (context.autoPlayConfig) {
        const cfg = context.autoPlayConfig;
        if (cfg.stopOnFeature && context.lastResponse?.feature) {
          context.autoPlayRemaining = 0;
          context.autoPlayConfig = null;
          context.eventBus.emit('ui:autoPlayStopped', undefined as never);
          return;
        }
      }

      if (context.autoPlayRemaining > 0) {
        // Auto-trigger next spin after short delay
        setTimeout(() => context.transitionTo('spinRequest'), 500);
        return;
      } else {
        context.autoPlayConfig = null;
        context.eventBus.emit('ui:autoPlayStopped', undefined as never);
        context.uiManager.setSpinState('idle');
      }
    }

    // Listen for spin button
    this.spinHandler = () => {
      context.transitionTo('spinRequest');
    };
    context.eventBus.on('ui:spinButtonPressed', this.spinHandler);

    // Listen for auto play start
    this.autoPlayHandler = ({ spins, stopOnFeature }) => {
      context.autoPlayRemaining = spins;
      context.autoPlayConfig = {
        totalSpins: spins,
        stopOnFeature,
      };
      context.uiManager.setSpinState('autoplay');
      context.transitionTo('spinRequest');
    };
    context.eventBus.on('ui:autoPlayStarted', this.autoPlayHandler);
  }

  async exit(context: GameContext): Promise<void> {
    if (this.spinHandler) {
      context.eventBus.off('ui:spinButtonPressed', this.spinHandler);
      this.spinHandler = null;
    }
    if (this.autoPlayHandler) {
      context.eventBus.off('ui:autoPlayStarted', this.autoPlayHandler);
      this.autoPlayHandler = null;
    }
  }
}
