import { Container, Graphics, Text } from 'pixi.js';
import { SpinButton } from './SpinButton';
import { BetSelector } from './BetSelector';
import { Button } from './components/Button';
import { Label } from './components/Label';
import { formatCurrency } from '../math/Currency';
import type { EventBus } from '../events/EventBus';
import type { LayoutMode } from '../app/ResponsiveManager';

export class BottomBar extends Container {
  private bg: Graphics;
  private balanceLabel: Label;
  private balanceValue: Label;
  private winLabel: Label;
  private winValue: Label;
  private betLabel: Label;
  readonly spinButton: SpinButton;
  readonly betSelector: BetSelector;
  private menuBtn: Button;
  private autoPlayBtn: Button;
  private historyBtn: Button;
  private eventBus: EventBus;
  private barWidth: number;
  private barHeight: number;

  // Callbacks
  private onMenuCb: (() => void) | null = null;
  private onAutoPlayCb: (() => void) | null = null;
  private onHistoryCb: (() => void) | null = null;

  constructor(
    width: number,
    height: number,
    eventBus: EventBus,
  ) {
    super();
    this.eventBus = eventBus;
    this.barWidth = width;
    this.barHeight = height;

    // Background
    this.bg = new Graphics();
    this.bg.rect(0, 0, width, height);
    this.bg.fill({ color: 0x0d0d1a, alpha: 0.9 });
    this.bg.rect(0, 0, width, 1);
    this.bg.fill({ color: 0x333366, alpha: 0.5 });
    this.addChild(this.bg);

    // Balance section
    this.balanceLabel = new Label({
      text: 'BALANCE',
      fontSize: 11,
      color: 0x888888,
      fontWeight: 'bold',
      align: 'center',
    });
    this.balanceLabel.x = 100;
    this.balanceLabel.y = 15;
    this.addChild(this.balanceLabel);

    this.balanceValue = new Label({
      text: '0.00',
      fontSize: 20,
      color: 0xffffff,
      fontWeight: 'bold',
      align: 'center',
    });
    this.balanceValue.x = 100;
    this.balanceValue.y = 40;
    this.addChild(this.balanceValue);

    // Bet section
    this.betLabel = new Label({
      text: 'BET',
      fontSize: 11,
      color: 0x888888,
      fontWeight: 'bold',
      align: 'center',
    });
    this.betLabel.x = 320;
    this.betLabel.y = 15;
    this.addChild(this.betLabel);

    this.betSelector = new BetSelector(eventBus);
    this.betSelector.x = 250;
    this.betSelector.y = 25;
    this.addChild(this.betSelector);

    // Win section
    this.winLabel = new Label({
      text: 'WIN',
      fontSize: 11,
      color: 0x888888,
      fontWeight: 'bold',
      align: 'center',
    });
    this.winLabel.x = width - 300;
    this.winLabel.y = 15;
    this.addChild(this.winLabel);

    this.winValue = new Label({
      text: '',
      fontSize: 24,
      color: 0xffd700,
      fontWeight: 'bold',
      align: 'center',
    });
    this.winValue.x = width - 300;
    this.winValue.y = 42;
    this.addChild(this.winValue);

    // Menu button
    this.menuBtn = new Button({
      width: 44,
      height: 44,
      label: '\u2630',
      fontSize: 22,
      bgColor: 0x222233,
      cornerRadius: 22,
      borderWidth: 0,
    });
    this.menuBtn.x = 20;
    this.menuBtn.y = (height - 44) / 2;
    this.menuBtn.onClick(() => this.onMenuCb?.());
    this.addChild(this.menuBtn);

    // Auto play button
    this.autoPlayBtn = new Button({
      width: 44,
      height: 44,
      label: 'A',
      fontSize: 16,
      bgColor: 0x222233,
      cornerRadius: 22,
      borderWidth: 0,
    });
    this.autoPlayBtn.x = width - 150;
    this.autoPlayBtn.y = (height - 44) / 2;
    this.autoPlayBtn.onClick(() => this.onAutoPlayCb?.());
    this.addChild(this.autoPlayBtn);

    // History button
    this.historyBtn = new Button({
      width: 44,
      height: 44,
      label: 'H',
      fontSize: 16,
      bgColor: 0x222233,
      cornerRadius: 22,
      borderWidth: 0,
    });
    this.historyBtn.x = 74;
    this.historyBtn.y = (height - 44) / 2;
    this.historyBtn.onClick(() => this.onHistoryCb?.());
    this.addChild(this.historyBtn);

    // Spin button (right side)
    this.spinButton = new SpinButton(32, eventBus);
    this.spinButton.x = width - 70;
    this.spinButton.y = height / 2;
    this.addChild(this.spinButton);
  }

  onMenu(cb: () => void): this {
    this.onMenuCb = cb;
    return this;
  }

  onAutoPlay(cb: () => void): this {
    this.onAutoPlayCb = cb;
    return this;
  }

  onHistory(cb: () => void): this {
    this.onHistoryCb = cb;
    return this;
  }

  updateBalance(amount: number, currency: string): void {
    this.balanceValue.text = formatCurrency(amount, currency);
  }

  updateWin(amount: number, currency: string): void {
    if (amount > 0) {
      this.winValue.text = formatCurrency(amount, currency);
    } else {
      this.winValue.text = '';
    }
  }

  updateBet(amount: number, currency: string): void {
    this.betSelector.setCurrentBet(amount);
  }

  setBetLevels(levels: number[], currency: string): void {
    this.betSelector.setBetLevels(levels, currency);
  }

  setSpinState(state: import('./SpinButton').SpinButtonState): void {
    this.spinButton.state = state;
  }

  setInteractive(enabled: boolean): void {
    this.betSelector.setEnabled(enabled);
    this.menuBtn.enabled = enabled;
    this.autoPlayBtn.enabled = enabled;
  }

  /** Offset content to stay within safe area */
  private safeLeft = 0;
  private safeRight = 0;

  setSafeMargins(left: number, right: number): void {
    this.safeLeft = left;
    this.safeRight = right;
  }

  /** Reposition elements for layout mode */
  layoutMode(mode: LayoutMode, width: number, height: number): void {
    this.barWidth = width;
    this.barHeight = height;

    const sl = this.safeLeft;
    const sr = this.safeRight;
    const safeWidth = width - sl - sr;

    this.bg.clear();
    this.bg.rect(0, 0, width, height);
    this.bg.fill({ color: 0x0d0d1a, alpha: 0.9 });
    this.bg.rect(0, 0, width, 1);
    this.bg.fill({ color: 0x333366, alpha: 0.5 });

    if (mode === 'mobile') {
      // Portrait compact: balance left, bet center, win right, menu/auto at edges
      const third = safeWidth / 3;
      this.balanceLabel.x = sl + third * 0.5;
      this.balanceValue.x = sl + third * 0.5;
      this.betLabel.x = sl + third * 1.5;
      this.betSelector.x = sl + third * 1.5 - 80;
      this.winLabel.x = sl + third * 2.5;
      this.winValue.x = sl + third * 2.5;
      this.spinButton.x = width / 2;
      this.spinButton.y = height / 2;
      this.menuBtn.x = sl + 10;
      this.autoPlayBtn.x = width - sr - 54;
    } else {
      // Desktop layout — offset by safe margins
      this.balanceLabel.x = sl + 100;
      this.balanceValue.x = sl + 100;
      this.betLabel.x = sl + 320;
      this.betSelector.x = sl + 250;
      this.winLabel.x = width - sr - 300;
      this.winValue.x = width - sr - 300;
      this.spinButton.x = width - sr - 70;
      this.spinButton.y = height / 2;
      this.menuBtn.x = sl + 20;
      this.autoPlayBtn.x = width - sr - 150;
    }
  }
}
