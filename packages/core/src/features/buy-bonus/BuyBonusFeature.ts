import { Container, Text } from 'pixi.js';
import type { IFeaturePlugin, FeatureContext } from '../IFeaturePlugin';
import type { IState } from '../../state/IState';
import type { StateTransition, GameContext } from '../../state/StateMachine';
import { Button } from '../../ui/components/Button';
import { Modal } from '../../ui/components/Modal';
import type { BuyBonusOption } from '../../app/GameConfig';
import { formatCurrency } from '../../math/Currency';
import { Logger } from '../../utils/Logger';

class BuyBonusState implements IState {
  readonly id = 'buyBonus:process';

  async enter(context: GameContext): Promise<void> {
    const buyRequest = context.featureState.buyBonusRequest as {
      bonusType: string;
      cost: number;
    } | undefined;

    if (!buyRequest) {
      await context.transitionTo('idle');
      return;
    }

    context.uiManager.setSpinState('spinning');
    context.uiManager.setInteractive(false);

    try {
      const response = await context.server.buyBonus({
        bet: context.currentBet,
        bonusType: buyRequest.bonusType,
      });

      context.lastResponse = response;
      context.balance = response.balance;
      context.eventBus.emit('balance:updated', { balance: response.balance });

      delete context.featureState.buyBonusRequest;

      // Start spin animation, then go to evaluate
      await context.reelSet.startSpin();
      await context.reelSet.stopReels(response.reelResult);

      await context.transitionTo('evaluate');
    } catch (err) {
      context.eventBus.emit('error', {
        code: 'BUY_BONUS_FAILED',
        message: 'Failed to buy bonus',
      });
      delete context.featureState.buyBonusRequest;
      await context.transitionTo('idle');
    }
  }

  async exit(): Promise<void> {}
}

export class BuyBonusFeature implements IFeaturePlugin {
  readonly id = 'buyBonus';
  readonly name = 'Buy Bonus';
  readonly priority = 30;

  private options: BuyBonusOption[];
  private modal: Modal | null = null;
  private logger = new Logger('BuyBonusFeature');
  private context: FeatureContext | null = null;

  constructor(options: BuyBonusOption[]) {
    this.options = options;
  }

  install(context: FeatureContext): void {
    this.context = context;

    // Listen for buy bonus request from UI
    context.eventBus.on('ui:buyBonusRequested', ({ cost }) => {
      this.logger.info(`Buy bonus requested, cost: ${cost}`);
    });

    this.logger.info('Buy Bonus feature installed');
  }

  uninstall(): void {
    this.modal?.destroy();
  }

  /** Create the buy bonus selection modal */
  createModal(currentBet: number, currency: string, onSelect: (option: BuyBonusOption) => void): Modal {
    const modal = new Modal({
      width: 500,
      height: 400,
      title: 'BUY BONUS',
      closeButton: true,
    });

    const content = modal.contentContainer;
    let y = 10;

    for (const option of this.options) {
      const cost = Math.round(currentBet * option.costMultiplier);

      const btn = new Button({
        width: 440,
        height: 60,
        label: `${option.label} - ${formatCurrency(cost, currency)}`,
        fontSize: 18,
        bgColor: 0x2a2a4a,
        bgColorHover: 0x3a3a6a,
        cornerRadius: 10,
        borderWidth: 0,
      });
      btn.y = y;
      btn.onClick(() => {
        onSelect(option);
        modal.close();
      });
      content.addChild(btn);
      y += 70;
    }

    return modal;
  }

  getStates(): Map<string, IState> {
    return new Map([
      ['buyBonus:process', new BuyBonusState()],
    ]);
  }

  getTransitions(): StateTransition[] {
    return [];
  }
}
