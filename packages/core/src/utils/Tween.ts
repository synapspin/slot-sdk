import { Ticker } from 'pixi.js';

export type EasingFunction = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
} as const;

interface TweenConfig<T extends Record<string, number>> {
  target: T;
  to: Partial<T>;
  duration: number;
  easing?: EasingFunction;
  onUpdate?: (target: T) => void;
  onComplete?: () => void;
  delay?: number;
}

class TweenInstance<T extends Record<string, number>> {
  private startValues: Partial<T> = {};
  private elapsed = 0;
  private delayRemaining: number;
  private _resolve!: () => void;
  readonly promise: Promise<void>;
  private _killed = false;

  constructor(private config: TweenConfig<T>) {
    this.delayRemaining = config.delay ?? 0;
    for (const key of Object.keys(config.to) as (keyof T)[]) {
      (this.startValues as Record<string, number>)[key as string] = config.target[key] as number;
    }
    this.promise = new Promise((resolve) => {
      this._resolve = resolve;
    });
  }

  update(dt: number): boolean {
    if (this._killed) return true;

    if (this.delayRemaining > 0) {
      this.delayRemaining -= dt;
      return false;
    }

    this.elapsed += dt;
    const progress = Math.min(this.elapsed / this.config.duration, 1);
    const easedProgress = (this.config.easing ?? Easing.linear)(progress);

    for (const key of Object.keys(this.config.to) as (keyof T)[]) {
      const start = (this.startValues as Record<string, number>)[key as string];
      const end = this.config.to[key] as number;
      (this.config.target as Record<string, number>)[key as string] =
        start + (end - start) * easedProgress;
    }

    this.config.onUpdate?.(this.config.target);

    if (progress >= 1) {
      this.config.onComplete?.();
      this._resolve();
      return true;
    }

    return false;
  }

  kill(): void {
    this._killed = true;
    this._resolve();
  }
}

export class TweenManager {
  private static tweens: TweenInstance<never>[] = [];
  private static initialized = false;

  static init(ticker: Ticker): void {
    if (this.initialized) return;
    this.initialized = true;
    ticker.add(() => {
      const dt = ticker.deltaMS;
      this.tweens = this.tweens.filter((tween) => !tween.update(dt));
    });
  }

  static to<T extends Record<string, number>>(config: TweenConfig<T>): TweenInstance<T> {
    const tween = new TweenInstance(config);
    this.tweens.push(tween as unknown as TweenInstance<never>);
    return tween;
  }

  static killAll(): void {
    for (const tween of this.tweens) {
      tween.kill();
    }
    this.tweens = [];
  }
}
