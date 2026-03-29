import { Container, Graphics } from 'pixi.js';

interface Coin {
  gfx: Graphics;
  vx: number;
  vy: number;
  gravity: number;
  rotation: number;
  rotSpeed: number;
  scalePhase: number;
  life: number;
  maxLife: number;
}

export interface CoinShowerConfig {
  /** Number of coins per burst */
  count: number;
  /** Coin radius range */
  radiusMin: number;
  radiusMax: number;
  /** Colors to pick from */
  colors: number[];
  /** Horizontal spread (pixels from center) */
  spreadX: number;
  /** Initial upward velocity range */
  velocityYMin: number;
  velocityYMax: number;
  /** Horizontal velocity range */
  velocityXRange: number;
  /** Gravity (pixels/frame²) */
  gravity: number;
  /** Lifetime in frames */
  lifetime: number;
}

const DEFAULT_CONFIG: CoinShowerConfig = {
  count: 80,
  radiusMin: 6,
  radiusMax: 14,
  colors: [0xffd700, 0xffaa00, 0xffcc33, 0xffe066, 0xdaa520],
  spreadX: 400,
  velocityYMin: -18,
  velocityYMax: -8,
  velocityXRange: 6,
  gravity: 0.35,
  lifetime: 120,
};

/**
 * Coin fountain / shower effect for Big Win celebrations.
 * Lightweight particle system using Graphics objects + object pool.
 */
export class CoinShower extends Container {
  private coins: Coin[] = [];
  private pool: Graphics[] = [];
  private config: CoinShowerConfig;
  private _active = false;

  constructor(config?: Partial<CoinShowerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Emit a burst of coins from a position */
  burst(x: number, y: number, multiplier: number = 1): void {
    const count = Math.round(this.config.count * multiplier);
    this._active = true;

    for (let i = 0; i < count; i++) {
      const gfx = this.acquireCoin();
      const radius = this.config.radiusMin +
        Math.random() * (this.config.radiusMax - this.config.radiusMin);
      const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];

      // Draw coin
      gfx.clear();
      // Outer circle
      gfx.circle(0, 0, radius);
      gfx.fill(color);
      // Inner highlight
      gfx.circle(-radius * 0.2, -radius * 0.2, radius * 0.4);
      gfx.fill({ color: 0xffffff, alpha: 0.35 });
      // Edge ring
      gfx.circle(0, 0, radius - 1.5);
      gfx.stroke({ width: 1.5, color: darken(color, 0.3) });

      gfx.x = x + (Math.random() - 0.5) * this.config.spreadX * 0.3;
      gfx.y = y;
      gfx.alpha = 1;
      gfx.visible = true;

      const life = this.config.lifetime + Math.random() * 40;

      this.coins.push({
        gfx,
        vx: (Math.random() - 0.5) * this.config.velocityXRange * 2,
        vy: this.config.velocityYMin + Math.random() * (this.config.velocityYMax - this.config.velocityYMin),
        gravity: this.config.gravity + (Math.random() - 0.5) * 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        scalePhase: Math.random() * Math.PI * 2,
        life: 0,
        maxLife: life,
      });
    }
  }

  /** Continuous fountain (call burst repeatedly on interval) */
  startFountain(x: number, y: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const burstInterval = 100;
      let elapsed = 0;

      const timer = setInterval(() => {
        elapsed += burstInterval;
        if (elapsed >= duration) {
          clearInterval(timer);
          // Wait for remaining coins to fall
          setTimeout(resolve, 2000);
          return;
        }
        // Smaller bursts for continuous effect
        this.burst(x, y, 0.15);
      }, burstInterval);

      // Initial big burst
      this.burst(x, y, 0.5);
    });
  }

  /** Call every frame */
  update(): void {
    if (!this._active) return;

    let aliveCount = 0;

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.life++;

      if (coin.life >= coin.maxLife) {
        // Return to pool
        coin.gfx.visible = false;
        this.pool.push(coin.gfx);
        this.coins.splice(i, 1);
        continue;
      }

      aliveCount++;

      // Physics
      coin.vy += coin.gravity;
      coin.gfx.x += coin.vx;
      coin.gfx.y += coin.vy;

      // Rotation (simulates 3D coin flip)
      coin.rotation += coin.rotSpeed;
      coin.gfx.rotation = coin.rotation;

      // Scale oscillation (simulates coin turning in 3D)
      coin.scalePhase += 0.12;
      const scaleX = Math.abs(Math.cos(coin.scalePhase));
      coin.gfx.scale.set(Math.max(scaleX, 0.15), 1);

      // Fade out near end of life
      const lifeRatio = coin.life / coin.maxLife;
      if (lifeRatio > 0.75) {
        coin.gfx.alpha = 1 - (lifeRatio - 0.75) / 0.25;
      }

      // Slight horizontal drag
      coin.vx *= 0.995;
    }

    if (aliveCount === 0 && this.coins.length === 0) {
      this._active = false;
    }
  }

  get active(): boolean {
    return this._active;
  }

  private acquireCoin(): Graphics {
    if (this.pool.length > 0) {
      const gfx = this.pool.pop()!;
      gfx.visible = true;
      gfx.alpha = 1;
      gfx.scale.set(1);
      gfx.rotation = 0;
      return gfx;
    }
    const gfx = new Graphics();
    this.addChild(gfx);
    return gfx;
  }

  /** Remove all coins */
  clear(): void {
    for (const coin of this.coins) {
      coin.gfx.visible = false;
      this.pool.push(coin.gfx);
    }
    this.coins = [];
    this._active = false;
  }
}

function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (color & 0xff) * (1 - amount));
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
