import type { IState } from '../IState';
import type { GameContext } from '../StateMachine';
import { Logger } from '../../utils/Logger';

export class SpinRequestState implements IState {
  readonly id = 'spinRequest';
  private logger = new Logger('SpinRequestState');

  async enter(context: GameContext): Promise<void> {
    this.logger.debug('Requesting spin');

    // Lock UI
    context.uiManager.setInteractive(false);
    if (context.autoPlayRemaining > 0) {
      context.uiManager.setSpinState('autoplay');
    } else {
      context.uiManager.setSpinState('spinning');
    }

    // Calculate actual bet
    const bet = context.anteBetEnabled
      ? Math.round(context.currentBet * context.anteBetMultiplier)
      : context.currentBet;

    // Check balance
    if (context.balance < bet) {
      this.logger.warn('Insufficient balance');
      context.eventBus.emit('error', {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Not enough balance to spin',
      });
      await context.transitionTo('idle');
      return;
    }

    try {
      // Request spin from server
      context.eventBus.emit('spin:requested', {
        bet: context.currentBet,
        anteBet: context.anteBetEnabled,
      });

      const response = await context.server.spin({
        bet: context.currentBet,
        anteBet: context.anteBetEnabled,
        featureContext: context.featureState,
      });

      context.lastResponse = response;
      context.balance = response.balance;
      context.eventBus.emit('balance:updated', { balance: response.balance });
      context.eventBus.emit('spin:responseReceived', response);

      await context.transitionTo('spinning');
    } catch (err) {
      this.logger.error('Spin request failed:', err);
      context.eventBus.emit('error', {
        code: 'SPIN_FAILED',
        message: 'Failed to process spin',
      });
      await context.transitionTo('idle');
    }
  }

  async exit(): Promise<void> {}
}
