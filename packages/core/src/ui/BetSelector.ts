import { Container, Graphics, Text } from 'pixi.js';
import { Button } from './components/Button';
import { formatCurrency } from '../math/Currency';
import type { EventBus } from '../events/EventBus';

export class BetSelector extends Container {
  private betLevels: number[] = [];
  private currentIndex = 0;
  private currency = 'USD';
  private betLabel: Text;
  private decreaseBtn: Button;
  private increaseBtn: Button;
  private eventBus: EventBus;
  private panel: Container | null = null;

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;

    // Decrease button
    this.decreaseBtn = new Button({
      width: 36,
      height: 36,
      label: '-',
      fontSize: 22,
      bgColor: 0x2a2a3a,
      cornerRadius: 18,
      borderWidth: 0,
    });
    this.decreaseBtn.onClick(() => this.changeBet(-1));
    this.addChild(this.decreaseBtn);

    // Bet display
    this.betLabel = new Text({
      text: '0.00',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.betLabel.anchor.set(0.5);
    this.betLabel.x = 80;
    this.betLabel.y = 18;
    this.addChild(this.betLabel);

    // Increase button
    this.increaseBtn = new Button({
      width: 36,
      height: 36,
      label: '+',
      fontSize: 22,
      bgColor: 0x2a2a3a,
      cornerRadius: 18,
      borderWidth: 0,
    });
    this.increaseBtn.x = 124;
    this.increaseBtn.onClick(() => this.changeBet(1));
    this.addChild(this.increaseBtn);

    // Bet label tap opens full panel
    const hitArea = new Graphics();
    hitArea.rect(36, 0, 88, 36);
    hitArea.fill({ color: 0, alpha: 0.001 });
    hitArea.eventMode = 'static';
    hitArea.cursor = 'pointer';
    hitArea.on('pointerdown', () => this.togglePanel());
    this.addChild(hitArea);
  }

  setBetLevels(levels: number[], currency: string): void {
    this.betLevels = levels;
    this.currency = currency;
    this.updateDisplay();
  }

  setCurrentBet(bet: number): void {
    const index = this.betLevels.indexOf(bet);
    if (index >= 0) {
      this.currentIndex = index;
      this.updateDisplay();
    }
  }

  private changeBet(direction: number): void {
    const newIndex = this.currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.betLevels.length) {
      this.currentIndex = newIndex;
      this.updateDisplay();
      this.eventBus.emit('bet:changed', { bet: this.betLevels[this.currentIndex] });
    }
  }

  private updateDisplay(): void {
    if (this.betLevels.length === 0) return;
    const bet = this.betLevels[this.currentIndex];
    this.betLabel.text = formatCurrency(bet, this.currency);
    this.decreaseBtn.enabled = this.currentIndex > 0;
    this.increaseBtn.enabled = this.currentIndex < this.betLevels.length - 1;
  }

  private togglePanel(): void {
    if (this.panel) {
      this.removeChild(this.panel);
      this.panel.destroy();
      this.panel = null;
      return;
    }

    this.panel = new Container();
    const bg = new Graphics();
    const itemHeight = 40;
    const panelWidth = 160;
    const panelHeight = this.betLevels.length * itemHeight + 10;

    bg.roundRect(0, 0, panelWidth, panelHeight, 8);
    bg.fill({ color: 0x1a1a2e, alpha: 0.95 });
    bg.stroke({ width: 1, color: 0x333366 });
    this.panel.addChild(bg);

    this.betLevels.forEach((bet, i) => {
      const item = new Button({
        width: panelWidth - 10,
        height: itemHeight - 4,
        label: formatCurrency(bet, this.currency),
        fontSize: 16,
        bgColor: i === this.currentIndex ? 0x333366 : 0x222244,
        cornerRadius: 4,
        borderWidth: 0,
      });
      item.x = 5;
      item.y = 5 + i * itemHeight;
      item.onClick(() => {
        this.currentIndex = i;
        this.updateDisplay();
        this.eventBus.emit('bet:changed', { bet });
        if (this.panel) {
          this.removeChild(this.panel);
          this.panel.destroy();
          this.panel = null;
        }
      });
      this.panel!.addChild(item);
    });

    this.panel.y = -panelHeight - 5;
    this.addChild(this.panel);
  }

  get currentBet(): number {
    return this.betLevels[this.currentIndex] ?? 0;
  }

  setEnabled(enabled: boolean): void {
    this.decreaseBtn.enabled = enabled && this.currentIndex > 0;
    this.increaseBtn.enabled = enabled && this.currentIndex < this.betLevels.length - 1;
  }
}
