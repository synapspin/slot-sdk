import { Container, Graphics, Text } from 'pixi.js';
import type { EventBus } from '../events/EventBus';
import type { SoundManager } from '../sound/SoundManager';
import { formatCurrency } from '../math/Currency';
import { Logger } from '../utils/Logger';

export type BigWinTier = 'big' | 'mega' | 'epic';

export interface BigWinConfig {
  /** Multiplier thresholds relative to bet */
  thresholds: { big: number; mega: number; epic: number };
  /** Duration for each tier (ms) */
  durations: { big: number; mega: number; epic: number };
}

const DEFAULT_CONFIG: BigWinConfig = {
  thresholds: { big: 10, mega: 25, epic: 50 },
  durations: { big: 3000, mega: 4000, epic: 5000 },
};

export class BigWinCelebration extends Container {
  private overlay: Graphics;
  private tierText: Text;
  private amountText: Text;
  private eventBus: EventBus;
  private soundManager: SoundManager;
  private config: BigWinConfig;
  private logger = new Logger('BigWinCelebration');

  constructor(
    eventBus: EventBus,
    soundManager: SoundManager,
    config?: Partial<BigWinConfig>,
  ) {
    super();
    this.eventBus = eventBus;
    this.soundManager = soundManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Overlay
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, 1920, 1080);
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.addChild(this.overlay);

    // Tier label
    this.tierText = new Text({
      text: '',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 80,
        fill: 0xffd700,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 8,
          distance: 4,
          angle: Math.PI / 4,
        },
        stroke: { color: 0x885500, width: 4 },
      },
    });
    this.tierText.anchor.set(0.5);
    this.tierText.x = 960;
    this.tierText.y = 400;
    this.addChild(this.tierText);

    // Amount
    this.amountText = new Text({
      text: '',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 60,
        fill: 0xffffff,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 6,
          distance: 3,
          angle: Math.PI / 4,
        },
      },
    });
    this.amountText.anchor.set(0.5);
    this.amountText.x = 960;
    this.amountText.y = 520;
    this.addChild(this.amountText);

    this.visible = false;
    this.eventMode = 'static';
    this.on('pointerdown', () => this.skip());
  }

  /** Determine if the win qualifies for a big win celebration */
  getTier(winAmount: number, bet: number): BigWinTier | null {
    const multiplier = winAmount / bet;
    if (multiplier >= this.config.thresholds.epic) return 'epic';
    if (multiplier >= this.config.thresholds.mega) return 'mega';
    if (multiplier >= this.config.thresholds.big) return 'big';
    return null;
  }

  /** Show big win celebration */
  async show(tier: BigWinTier, amount: number, currency: string): Promise<void> {
    this.visible = true;

    const tierLabels = {
      big: 'BIG WIN!',
      mega: 'MEGA WIN!',
      epic: 'EPIC WIN!',
    };

    const tierColors = {
      big: 0xffd700,
      mega: 0xff6600,
      epic: 0xff0066,
    };

    this.tierText.text = tierLabels[tier];
    this.tierText.style.fill = tierColors[tier];
    this.amountText.text = formatCurrency(amount, currency);

    this.soundManager.play('bigWin');
    this.eventBus.emit('win:big', { tier, amount });

    this.logger.info(`${tier} win: ${amount}`);

    // Count up animation
    const duration = this.config.durations[tier];
    const steps = 30;
    const stepTime = duration / steps;

    for (let i = 1; i <= steps; i++) {
      if (!this.visible) break;
      const current = Math.round((amount / steps) * i);
      this.amountText.text = formatCurrency(current, currency);

      // Scale pulse
      const pulse = 1 + Math.sin((i / steps) * Math.PI * 4) * 0.05;
      this.tierText.scale.set(pulse);

      await new Promise((r) => setTimeout(r, stepTime));
    }

    this.amountText.text = formatCurrency(amount, currency);

    // Wait for click or timeout
    await new Promise((r) => setTimeout(r, 1500));
    this.hide();
  }

  skip(): void {
    this.hide();
  }

  hide(): void {
    this.visible = false;
  }
}
