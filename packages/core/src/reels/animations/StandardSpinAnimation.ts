import type { IReelAnimation } from './IReelAnimation';
import { ReelPhase } from './IReelAnimation';
import type { Reel } from '../Reel';

export interface StandardSpinConfig {
  /** Time to reach full speed (ms) */
  accelerationTime: number;
  /** Maximum speed in pixels per ms */
  maxSpeed: number;
  /** Time to decelerate to target position (ms) */
  decelerationTime: number;
  /** Bounce overshoot distance in pixels */
  overshoot: number;
  /** Bounce settle duration (ms) */
  bounceTime: number;
  /** Extra symbols to scroll past during deceleration for "landing" effect */
  landingSymbols: number;
}

const DEFAULT_CONFIG: StandardSpinConfig = {
  accelerationTime: 180,
  maxSpeed: 3.0,
  decelerationTime: 350,
  overshoot: 18,
  bounceTime: 250,
  landingSymbols: 2,
};

export class StandardSpinAnimation implements IReelAnimation {
  private config: StandardSpinConfig;
  private phase: ReelPhase = ReelPhase.IDLE;
  private elapsed = 0;
  private targetSymbols: number[] = [];
  private currentSpeed = 0;

  constructor(config?: Partial<StandardSpinConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(reel: Reel): void {
    this.phase = ReelPhase.ACCELERATING;
    this.elapsed = 0;
    this.currentSpeed = 0;
    reel.blur(true);
  }

  beginStop(_reel: Reel, targetSymbols: number[]): void {
    this.targetSymbols = targetSymbols;
    this.phase = ReelPhase.DECELERATING;
    this.elapsed = 0;
  }

  forceStop(reel: Reel): void {
    if (this.targetSymbols.length > 0) {
      reel.setSymbols(this.targetSymbols);
    }
    reel.snapToGrid();
    reel.setOffset(0);
    reel.blur(false);
    this.phase = ReelPhase.STOPPED;
  }

  update(reel: Reel, delta: number): boolean {
    this.elapsed += delta;

    switch (this.phase) {
      case ReelPhase.ACCELERATING: {
        // Smooth ease-in: cubic
        const t = Math.min(this.elapsed / this.config.accelerationTime, 1);
        this.currentSpeed = this.config.maxSpeed * (t * t * t);
        reel.moveSymbols(this.currentSpeed * delta);

        if (t >= 1) {
          this.phase = ReelPhase.SPINNING;
          this.elapsed = 0;
        }
        break;
      }

      case ReelPhase.SPINNING: {
        reel.moveSymbols(this.config.maxSpeed * delta);
        break;
      }

      case ReelPhase.DECELERATING: {
        // Smooth ease-out: starts fast, slows gradually
        const t = Math.min(this.elapsed / this.config.decelerationTime, 1);
        // Ease-out cubic: fast start → gentle stop
        const eased = 1 - Math.pow(1 - t, 3);
        this.currentSpeed = this.config.maxSpeed * (1 - eased);
        reel.moveSymbols(this.currentSpeed * delta);

        if (t >= 1) {
          // Snap to final symbols
          reel.setSymbols(this.targetSymbols);
          reel.blur(false);
          // Set overshoot offset (symbols land slightly below then bounce up)
          reel.setOffset(this.config.overshoot);
          this.phase = ReelPhase.BOUNCING;
          this.elapsed = 0;
        }
        break;
      }

      case ReelPhase.BOUNCING: {
        const t = Math.min(this.elapsed / this.config.bounceTime, 1);
        // Damped spring: overshoot → settle at 0
        // Goes: overshoot → slight undershoot → settle
        const spring = Math.exp(-4 * t) * Math.cos(t * Math.PI * 2);
        reel.setOffset(this.config.overshoot * spring);

        if (t >= 1) {
          reel.setOffset(0);
          reel.snapToGrid();
          this.phase = ReelPhase.STOPPED;
          return true;
        }
        break;
      }

      case ReelPhase.STOPPED:
        return true;

      case ReelPhase.IDLE:
        break;
    }

    return false;
  }
}
