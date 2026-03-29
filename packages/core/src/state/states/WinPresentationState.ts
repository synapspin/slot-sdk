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
  private bigWinTickerFn: (() => void) | null = null;

  async enter(context: GameContext): Promise<void> {
    const response = context.lastResponse;
    if (!response || response.wins.length === 0) {
      await context.transitionTo('featureCheck');
      return;
    }

    this.logger.debug(`Presenting ${response.wins.length} wins, total: ${response.totalWin}`);
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

    // Big win celebration
    const tier = this.getBigWinCelebration(context).getTier(response.totalWin, context.currentBet);
    if (tier && !context.quickSpinEnabled && !context.turboSpinEnabled) {
      await this.bigWinCelebration!.show(tier, response.totalWin, context.currency);
    }

    // Register skip handlers
    this.registerSkipHandlers();

    // Present individual wins (skip in turbo)
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
    this.removeBigWinTicker(context);
  }

  private getBigWinCelebration(context: GameContext): BigWinCelebration {
    if (!this.bigWinCelebration) {
      this.bigWinCelebration = new BigWinCelebration(context.eventBus, context.soundManager);
      // Add to the reelSet's parent (reel layer) so it overlays the game
      const parent = context.reelSet.parent?.parent ?? context.reelSet.parent ?? context.reelSet;
      parent.addChild(this.bigWinCelebration);

      // Register ticker for coin animation — need access to app ticker
      // Use eventBus to proxy the update (GameApp ticker calls reelSet.update which is already per-frame)
      this.bigWinTickerFn = () => this.bigWinCelebration!.update();
      // Attach to requestAnimationFrame since we don't have direct ticker access
      const animate = () => {
        if (this.bigWinCelebration?.visible) {
          this.bigWinCelebration.update();
          requestAnimationFrame(animate);
        }
      };
      context.eventBus.on('win:big', () => {
        requestAnimationFrame(animate);
      });
    }
    return this.bigWinCelebration;
  }

  private removeBigWinTicker(_context: GameContext): void {
    // Cleanup handled by BigWinCelebration.hide
  }

  private registerSkipHandlers(): void {
    this.skipKeyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.skipPresentation();
      }
    };
    window.addEventListener('keydown', this.skipKeyHandler);

    setTimeout(() => {
      this.skipClickHandler = () => this.skipPresentation();
      window.addEventListener('pointerdown', this.skipClickHandler);
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
    this.bigWinCelebration?.skip();
    this.winPresenter?.abort();
  }
}
