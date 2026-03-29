import type { IFeaturePlugin, FeatureContext } from '../IFeaturePlugin';
import type { IState } from '../../state/IState';
import type { StateTransition, GameContext } from '../../state/StateMachine';
import { Modal } from '../../ui/components/Modal';
import { Button } from '../../ui/components/Button';
import { Container, Text } from 'pixi.js';
import { Logger } from '../../utils/Logger';

class GiftSpinsActiveState implements IState {
  readonly id = 'giftSpins:active';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, unknown>;
    const remaining = (state.giftSpinsRemaining as number) ?? 0;

    if (remaining <= 0) {
      await context.transitionTo('giftSpins:summary');
      return;
    }

    context.uiManager.setSpinState('spinning');
    context.uiManager.setInteractive(false);

    try {
      const response = await context.server.spin({
        bet: state.giftSpinsBet as number,
        anteBet: false,
        featureContext: { mode: 'giftSpins', ...context.featureState },
      });

      context.lastResponse = response;
      context.balance = response.balance;
      context.eventBus.emit('balance:updated', { balance: response.balance });

      await context.reelSet.startSpin();
      await context.reelSet.stopReels(response.reelResult);

      state.giftSpinsRemaining = remaining - 1;
      state.giftSpinsTotalWin = ((state.giftSpinsTotalWin as number) ?? 0) + response.totalWin;

      // Show wins
      if (response.wins.length > 0) {
        context.uiManager.updateWin(response.totalWin, context.currency);
        context.soundManager.play('win');
        await new Promise((r) => setTimeout(r, 1000));
      }

      context.eventBus.emit('feature:spinComplete', {
        remainingSpins: state.giftSpinsRemaining as number,
        totalWin: state.giftSpinsTotalWin as number,
      });

      if ((state.giftSpinsRemaining as number) > 0) {
        await new Promise((r) => setTimeout(r, 500));
        await context.transitionTo('giftSpins:active');
      } else {
        await context.transitionTo('giftSpins:summary');
      }
    } catch (err) {
      context.eventBus.emit('error', {
        code: 'GIFT_SPIN_FAILED',
        message: 'Gift spin failed',
      });
      await context.transitionTo('giftSpins:summary');
    }
  }

  async exit(): Promise<void> {}
}

class GiftSpinsSummaryState implements IState {
  readonly id = 'giftSpins:summary';

  async enter(context: GameContext): Promise<void> {
    const state = context.featureState as Record<string, number>;
    const totalWin = state.giftSpinsTotalWin ?? 0;

    context.eventBus.emit('giftSpins:ended', { totalWin });
    context.eventBus.emit('feature:ended', { type: 'giftSpins', totalWin });
    context.uiManager.updateWin(totalWin, context.currency);

    await new Promise((r) => setTimeout(r, 3000));

    delete context.featureState.giftSpinsRemaining;
    delete context.featureState.giftSpinsTotalWin;
    delete context.featureState.giftSpinsBet;

    await context.transitionTo('idle');
  }

  async exit(): Promise<void> {}
}

export class GiftSpinsFeature implements IFeaturePlugin {
  readonly id = 'giftSpins';
  readonly name = 'Gift Spins';
  readonly priority = 50;

  private logger = new Logger('GiftSpinsFeature');
  private modal: Modal | null = null;

  install(context: FeatureContext): void {
    // Listen for gift spins offers
    context.eventBus.on('giftSpins:received', ({ spins, bet }) => {
      this.showGiftSpinsOffer(context, spins, bet);
    });

    this.logger.info('Gift Spins feature installed');
  }

  uninstall(): void {
    this.modal?.destroy();
  }

  private showGiftSpinsOffer(context: FeatureContext, spins: number, bet: number): void {
    this.modal = new Modal({
      width: 450,
      height: 300,
      title: 'GIFT SPINS!',
      closeButton: false,
    });

    const content = this.modal.contentContainer;

    const infoText = new Text({
      text: `You received ${spins} free spins\nas a gift from the operator!`,
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 20,
        fill: 0xffd700,
        align: 'center',
      },
    });
    infoText.x = 180;
    infoText.y = 40;
    infoText.anchor.set(0.5, 0);
    content.addChild(infoText);

    const acceptBtn = new Button({
      width: 200,
      height: 50,
      label: 'ACCEPT',
      fontSize: 20,
      bgColor: 0x22aa44,
      bgColorHover: 0x33bb55,
      cornerRadius: 10,
      borderWidth: 0,
    });
    acceptBtn.x = 110;
    acceptBtn.y = 140;
    acceptBtn.onClick(() => {
      this.modal?.close();
      context.eventBus.emit('giftSpins:started', { remaining: spins });
    });
    content.addChild(acceptBtn);

    context.stage.addChild(this.modal);
    this.modal.open();
  }

  getStates(): Map<string, IState> {
    const states = new Map<string, IState>();
    states.set('giftSpins:active', new GiftSpinsActiveState());
    states.set('giftSpins:summary', new GiftSpinsSummaryState());
    return states;
  }

  getTransitions(): StateTransition[] {
    return [];
  }
}
