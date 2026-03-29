import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import type { EventBus } from '../events/EventBus';
import type { SoundManager } from '../sound/SoundManager';
import { CoinShower } from '../fx/CoinShower';
import { formatCurrency } from '../math/Currency';
import { Logger } from '../utils/Logger';

export type BigWinTier = 'big' | 'mega' | 'epic';

export interface BigWinConfig {
  thresholds: { big: number; mega: number; epic: number };
  durations: { big: number; mega: number; epic: number };
}

const DEFAULT_CONFIG: BigWinConfig = {
  thresholds: { big: 10, mega: 25, epic: 50 },
  durations: { big: 3000, mega: 4500, epic: 6000 },
};

const TIER_STYLES: Record<BigWinTier, { label: string; color: number; glowColor: string; fontSize: number }> = {
  big: { label: 'BIG WIN!', color: 0xffd700, glowColor: '#ffd700', fontSize: 72 },
  mega: { label: 'MEGA WIN!', color: 0xff6600, glowColor: '#ff6600', fontSize: 84 },
  epic: { label: 'EPIC WIN!', color: 0xff0066, glowColor: '#ff0066', fontSize: 96 },
};

export class BigWinCelebration extends Container {
  private overlay: Graphics;
  private tierText: Text;
  private amountText: Text;
  private coinShower: CoinShower;
  private eventBus: EventBus;
  private soundManager: SoundManager;
  private config: BigWinConfig;
  private logger = new Logger('BigWinCelebration');
  private timeline: gsap.core.Timeline | null = null;
  private skipResolve: (() => void) | null = null;

  constructor(
    eventBus: EventBus,
    soundManager: SoundManager,
    config?: Partial<BigWinConfig>,
  ) {
    super();
    this.eventBus = eventBus;
    this.soundManager = soundManager;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Dark overlay
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
          blur: 12,
          distance: 4,
          angle: Math.PI / 4,
        },
        stroke: { color: 0x885500, width: 4 },
      },
    });
    this.tierText.anchor.set(0.5);
    this.tierText.x = 960;
    this.tierText.y = 380;
    this.addChild(this.tierText);

    // Amount counter
    this.amountText = new Text({
      text: '',
      style: {
        fontFamily: 'Roboto, Arial, sans-serif',
        fontSize: 56,
        fill: 0xffffff,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 8,
          distance: 3,
          angle: Math.PI / 4,
        },
      },
    });
    this.amountText.anchor.set(0.5);
    this.amountText.x = 960;
    this.amountText.y = 500;
    this.addChild(this.amountText);

    // Coin shower
    this.coinShower = new CoinShower();
    this.addChild(this.coinShower);

    this.visible = false;
    this.eventMode = 'static';
    this.on('pointerdown', () => this.skip());
  }

  getTier(winAmount: number, bet: number): BigWinTier | null {
    const multiplier = winAmount / bet;
    if (multiplier >= this.config.thresholds.epic) return 'epic';
    if (multiplier >= this.config.thresholds.mega) return 'mega';
    if (multiplier >= this.config.thresholds.big) return 'big';
    return null;
  }

  async show(tier: BigWinTier, amount: number, currency: string): Promise<void> {
    this.visible = true;
    const style = TIER_STYLES[tier];
    const duration = this.config.durations[tier] / 1000; // seconds for GSAP

    // Setup initial state
    this.tierText.text = style.label;
    this.tierText.style.fill = style.color;
    this.tierText.style.fontSize = style.fontSize;
    this.tierText.scale.set(0);
    this.tierText.alpha = 0;

    this.amountText.text = formatCurrency(0, currency);
    this.amountText.scale.set(0.5);
    this.amountText.alpha = 0;

    this.overlay.alpha = 0;

    this.soundManager.play('bigWin');
    this.eventBus.emit('win:big', { tier, amount });
    this.logger.info(`${tier} win: ${amount}`);

    // Start coin fountain
    this.coinShower.burst(960, 350, tier === 'epic' ? 1.5 : tier === 'mega' ? 1.2 : 0.8);

    // GSAP timeline
    this.timeline = gsap.timeline();

    // Overlay fade in
    this.timeline.to(this.overlay, {
      alpha: 0.7,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Tier text — dramatic entrance
    this.timeline.to(this.tierText, {
      alpha: 1,
      duration: 0.1,
    }, '<');
    this.timeline.to(this.tierText.scale, {
      x: 1.2,
      y: 1.2,
      duration: 0.5,
      ease: 'elastic.out(1.2, 0.5)',
    }, '<');
    this.timeline.to(this.tierText.scale, {
      x: 1,
      y: 1,
      duration: 0.3,
      ease: 'power2.inOut',
    });

    // Amount text fade in
    this.timeline.to(this.amountText, {
      alpha: 1,
      duration: 0.3,
    }, '-=0.2');
    this.timeline.to(this.amountText.scale, {
      x: 1,
      y: 1,
      duration: 0.4,
      ease: 'back.out(2)',
    }, '<');

    // Count up the amount
    const counter = { value: 0 };
    this.timeline.to(counter, {
      value: amount,
      duration: duration * 0.6,
      ease: 'power2.out',
      onUpdate: () => {
        this.amountText.text = formatCurrency(Math.round(counter.value), currency);
      },
    }, '-=0.2');

    // Pulsating tier text during count
    this.timeline.to(this.tierText.scale, {
      x: 1.05,
      y: 1.05,
      duration: 0.4,
      repeat: Math.floor(duration / 0.8),
      yoyo: true,
      ease: 'sine.inOut',
    }, '<');

    // More coin bursts during count-up
    const burstCount = tier === 'epic' ? 4 : tier === 'mega' ? 3 : 2;
    for (let i = 1; i <= burstCount; i++) {
      this.timeline.call(() => {
        this.coinShower.burst(
          960 + (Math.random() - 0.5) * 600,
          300 + Math.random() * 100,
          0.3,
        );
      }, [], `<+=${(duration * 0.5) / burstCount * i}`);
    }

    // Hold at final amount
    this.timeline.to({}, { duration: 1.0 });

    // Wait for timeline or skip
    await new Promise<void>((resolve) => {
      this.skipResolve = resolve;
      this.timeline!.then(() => {
        this.skipResolve = null;
        resolve();
      });
    });

    // Fade out
    await this.hideAnimation();
  }

  skip(): void {
    if (this.timeline) {
      this.timeline.progress(1); // jump to end
      this.timeline.kill();
      this.timeline = null;
    }
    if (this.skipResolve) {
      this.skipResolve();
      this.skipResolve = null;
    }
  }

  private async hideAnimation(): Promise<void> {
    await new Promise<void>((resolve) => {
      gsap.to(this, {
        alpha: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => {
          this.visible = false;
          this.alpha = 1;
          this.coinShower.clear();
          resolve();
        },
      });
    });
  }

  /** Must be called every frame to animate coins */
  update(): void {
    this.coinShower.update();
  }
}
