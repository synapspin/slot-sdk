import type { IState } from '../IState';
import type { GameContext } from '../StateMachine';
import { WinPresenter } from '../../wins/WinPresenter';
import { BigWinCelebration } from '../../wins/BigWinCelebration';
import { Logger } from '../../utils/Logger';

export class WinPresentationState implements IState {
  readonly id = 'winPresentation';
  private logger = new Logger('WinPresentationState');
  private winPresenter: WinPresenter | null = null;
  private bigWinCelebration: BigWinCelebration | null = null;
  private skipClickHandler: (() => void) | null = null;
  private skipKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private skipPointerHandler: (() => void) | null = null;

  async enter(context: GameContext): Promise<void> {
    const response = context.lastResponse;
    if (!response || response.wins.length === 0) {
      await context.transitionTo('featureCheck');
      return;
    }

    this.logger.debug(`Presenting ${response.wins.length} wins, total: ${response.totalWin}`);

    // Update win display
    context.uiManager.updateWin(response.totalWin, context.currency);

    // Create win presenter if needed
    if (!this.winPresenter) {
      this.winPresenter = new WinPresenter(
        context.reelSet,
        context.eventBus,
        context.soundManager,
        context.reelSet.parent ?? context.reelSet,
      );
    }

    // Check for big win celebration
    if (!this.bigWinCelebration) {
      this.bigWinCelebration = new BigWinCelebration(context.eventBus, context.soundManager);
    }

    const tier = this.bigWinCelebration.getTier(response.totalWin, context.currentBet);
    if (tier && !context.quickSpinEnabled && !context.turboSpinEnabled) {
      await this.bigWinCelebration.show(tier, response.totalWin, context.currency);
    }

    // Register skip handlers — click, tap or space skips win presentation
    this.registerSkipHandlers();

    // Present individual wins (skip entirely in turbo mode)
    if (!context.turboSpinEnabled) {
      await this.winPresenter.presentWins(response.wins, response.totalWin);
    }

    this.unregisterSkipHandlers();
    await context.transitionTo('featureCheck');
  }

  async exit(context: GameContext): Promise<void> {
    this.unregisterSkipHandlers();
    this.winPresenter?.abort();
    context.reelSet.resetHighlights();
  }

  private registerSkipHandlers(): void {
    // Keyboard: space or enter to skip
    this.skipKeyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.skipPresentation();
      }
    };
    window.addEventListener('keydown', this.skipKeyHandler);

    // Mouse click anywhere on canvas to skip
    this.skipClickHandler = () => {
      this.skipPresentation();
    };
    // Small delay so the spin button release doesn't immediately skip
    setTimeout(() => {
      window.addEventListener('pointerdown', this.skipClickHandler!);
    }, 200);
  }

  private unregisterSkipHandlers(): void {
    if (this.skipKeyHandler) {
      window.removeEventListener('keydown', this.skipKeyHandler);
      this.skipKeyHandler = null;
    }
    if (this.skipClickHandler) {
      window.removeEventListener('pointerdown', this.skipClickHandler);
      this.skipClickHandler = null;
    }
  }

  private skipPresentation(): void {
    this.winPresenter?.abort();
  }
}
