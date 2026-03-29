import { Container, Graphics, Text, Application } from 'pixi.js';

export interface PreloaderConfig {
  /** Brand text to animate (e.g. "LAB9191") */
  brandText: string;
  /** Tagline below brand */
  tagline?: string;
  /** Background color */
  bgColor: number;
  /** Brand text color */
  brandColor: number;
  /** Brand glow color */
  glowColor: number;
  /** Accent color for progress bar */
  accentColor: number;
  /** Font family */
  fontFamily: string;
  /** Duration of brand reveal animation (ms) */
  revealDuration: number;
  /** Minimum display time even if assets load faster (ms) */
  minDisplayTime: number;
}

const DEFAULT_CONFIG: PreloaderConfig = {
  brandText: 'LAB9191',
  tagline: 'G A M E S',
  bgColor: 0x0a0a14,
  brandColor: 0xffffff,
  glowColor: 0x4488ff,
  accentColor: 0x4488ff,
  fontFamily: 'Roboto, Arial, sans-serif',
  revealDuration: 1800,
  minDisplayTime: 2500,
};

interface LetterObj {
  text: Text;
  targetX: number;
  targetY: number;
  delay: number;
}

export class Preloader extends Container {
  private config: PreloaderConfig;
  private bg: Graphics;
  private letters: LetterObj[] = [];
  private taglineText: Text | null = null;
  private progressBg: Graphics;
  private progressFill: Graphics;
  private progressText: Text;
  private _progress = 0;
  private startTime = 0;
  private animFrame = 0;
  private centerX: number;
  private centerY: number;

  constructor(
    app: Application,
    config?: Partial<PreloaderConfig>,
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    const w = app.canvas.width / (app.renderer.resolution || 1);
    const h = app.canvas.height / (app.renderer.resolution || 1);
    this.centerX = w / 2;
    this.centerY = h / 2;

    // Full-screen background
    this.bg = new Graphics();
    this.bg.rect(0, 0, w, h);
    this.bg.fill(this.config.bgColor);
    this.addChild(this.bg);

    // Create letters for brand animation
    this.createBrandLetters();

    // Tagline
    if (this.config.tagline) {
      this.taglineText = new Text({
        text: this.config.tagline,
        style: {
          fontFamily: this.config.fontFamily,
          fontSize: 18,
          fill: this.config.brandColor,
          letterSpacing: 8,
          fontWeight: '300',
        },
      });
      this.taglineText.anchor.set(0.5);
      this.taglineText.x = this.centerX;
      this.taglineText.y = this.centerY + 50;
      this.taglineText.alpha = 0;
      this.addChild(this.taglineText);
    }

    // Progress bar
    const barWidth = 260;
    const barHeight = 4;
    const barX = this.centerX - barWidth / 2;
    const barY = this.centerY + 90;

    this.progressBg = new Graphics();
    this.progressBg.roundRect(barX, barY, barWidth, barHeight, 2);
    this.progressBg.fill({ color: 0xffffff, alpha: 0.15 });
    this.addChild(this.progressBg);

    this.progressFill = new Graphics();
    this.addChild(this.progressFill);

    this.progressText = new Text({
      text: '0%',
      style: {
        fontFamily: this.config.fontFamily,
        fontSize: 12,
        fill: 0x888888,
      },
    });
    this.progressText.anchor.set(0.5);
    this.progressText.x = this.centerX;
    this.progressText.y = barY + 20;
    this.addChild(this.progressText);

    this.startTime = performance.now();

    // Start animation loop
    app.ticker.add(this.animate, this);
    this._tickerRef = app.ticker;
    this._animateFn = this.animate;
  }

  private _tickerRef: any;
  private _animateFn: any;

  private createBrandLetters(): void {
    const chars = this.config.brandText.split('');
    const fontSize = 72;
    const gap = 6; // fixed gap between letters

    // Measure each letter width individually
    const letterWidths: number[] = [];
    for (const char of chars) {
      const t = new Text({ text: char, style: { fontFamily: this.config.fontFamily, fontSize, fontWeight: '900' } });
      letterWidths.push(t.width);
      t.destroy();
    }
    const totalWidth = letterWidths.reduce((s, w) => s + w, 0) + gap * (chars.length - 1);
    let xOffset = this.centerX - totalWidth / 2;

    chars.forEach((char, i) => {
      const text = new Text({
        text: char,
        style: {
          fontFamily: this.config.fontFamily,
          fontSize,
          fontWeight: '900',
          fill: this.config.brandColor,
        },
      });
      text.anchor.set(0.5);

      const targetX = xOffset + letterWidths[i] / 2;
      const targetY = this.centerY - 15;

      // Start position: spread out randomly, invisible
      text.x = targetX + (Math.random() - 0.5) * 200;
      text.y = targetY + (Math.random() - 0.5) * 100 + 40;
      text.alpha = 0;
      text.scale.set(0.3 + Math.random() * 0.5);
      text.rotation = (Math.random() - 0.5) * 0.4;

      xOffset += letterWidths[i] + gap;

      this.addChild(text);
      this.letters.push({
        text,
        targetX,
        targetY,
        delay: i * 120, // stagger each letter
      });
    });
  }

  private animate = (): void => {
    const elapsed = performance.now() - this.startTime;
    this.animFrame++;

    // Animate each letter
    for (const letter of this.letters) {
      const t = Math.max(0, elapsed - letter.delay) / 600; // 600ms per letter
      if (t <= 0) continue;

      const p = Math.min(t, 1);
      // Ease out elastic for that Pixar-style pop
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI / 3));

      letter.text.x = letter.text.x + (letter.targetX - letter.text.x) * 0.12;
      letter.text.y = letter.text.y + (letter.targetY - letter.text.y) * 0.12;
      letter.text.alpha = Math.min(p * 2, 1);
      letter.text.scale.set(0.5 + eased * 0.5);
      letter.text.rotation *= 0.92; // dampen rotation

      // Glow shimmer after landing
      if (p >= 1) {
        const shimmer = Math.sin(elapsed * 0.003 + letter.delay * 0.01) * 0.15 + 0.85;
        letter.text.alpha = shimmer + 0.15;
      }
    }

    // Tagline fade in after letters
    if (this.taglineText) {
      const tagDelay = this.letters.length * 120 + 400;
      const tagProgress = Math.max(0, (elapsed - tagDelay) / 500);
      this.taglineText.alpha = Math.min(tagProgress, 1);
      if (tagProgress > 0 && tagProgress < 1) {
        this.taglineText.y = this.centerY + 50 - (1 - tagProgress) * 10;
      }
    }

    // Update progress bar
    this.drawProgress();
  };

  private drawProgress(): void {
    const barWidth = 260;
    const barHeight = 4;
    const barX = this.centerX - barWidth / 2;
    const barY = this.centerY + 90;

    this.progressFill.clear();
    if (this._progress > 0) {
      this.progressFill.roundRect(barX, barY, barWidth * this._progress, barHeight, 2);
      this.progressFill.fill(this.config.accentColor);
    }

    this.progressText.text = `${Math.round(this._progress * 100)}%`;
  }

  /** Update loading progress (0 to 1) */
  set progress(value: number) {
    this._progress = Math.max(0, Math.min(1, value));
  }

  get progress(): number {
    return this._progress;
  }

  /** Wait for minimum display time then fade out */
  async finish(): Promise<void> {
    this._progress = 1;
    this.drawProgress();

    // Ensure minimum display time
    const elapsed = performance.now() - this.startTime;
    const remaining = this.config.minDisplayTime - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }

    // Fade out
    const fadeDuration = 400;
    const fadeStart = performance.now();
    await new Promise<void>((resolve) => {
      const fadeStep = () => {
        const t = (performance.now() - fadeStart) / fadeDuration;
        this.alpha = 1 - Math.min(t, 1);
        if (t >= 1) {
          resolve();
        } else {
          requestAnimationFrame(fadeStep);
        }
      };
      requestAnimationFrame(fadeStep);
    });

    // Cleanup
    if (this._tickerRef) {
      this._tickerRef.remove(this._animateFn);
    }
    this.destroy({ children: true });
  }
}
