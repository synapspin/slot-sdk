import type { IState } from '../IState';
import type { GameContext } from '../StateMachine';
import { Logger } from '../../utils/Logger';

export class SpinningState implements IState {
  readonly id = 'spinning';
  private logger = new Logger('SpinningState');
  private stopHandler: (() => void) | null = null;

  /** Minimum spin duration before reels can stop (ms) */
  private static MIN_SPIN_TIME = 600;
  private static MIN_SPIN_TIME_QUICK = 300;

  async enter(context: GameContext): Promise<void> {
    this.logger.debug('Reels spinning');

    const response = context.lastResponse;
    if (!response) {
      this.logger.error('No spin response available');
      await context.transitionTo('idle');
      return;
    }

    // Start reel animation
    await context.reelSet.startSpin();

    // Play spin sound
    context.soundManager.play('reelSpin');

    // Listen for stop button (quick stop)
    this.stopHandler = () => {
      context.eventBus.emit('reels:quickStop', undefined as never);
    };
    context.eventBus.on('ui:stopButtonPressed', this.stopHandler);

    // Wait minimum spin time so the player sees reels spinning
    if (!context.turboSpinEnabled) {
      const minTime = context.quickSpinEnabled
        ? SpinningState.MIN_SPIN_TIME_QUICK
        : SpinningState.MIN_SPIN_TIME;
      await new Promise((r) => setTimeout(r, minTime));
    }

    // Stop reels with server result
    await context.reelSet.stopReels(response.reelResult);

    // Play stop sound
    context.soundManager.play('reelStop');
    context.eventBus.emit('spin:completed', undefined as never);

    await context.transitionTo('evaluate');
  }

  async exit(context: GameContext): Promise<void> {
    if (this.stopHandler) {
      context.eventBus.off('ui:stopButtonPressed', this.stopHandler);
      this.stopHandler = null;
    }
  }
}
