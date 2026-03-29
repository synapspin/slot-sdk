import type { Reel } from '../Reel';

export interface IReelAnimation {
  /** Start the spinning animation */
  start(reel: Reel): void;
  /** Update animation each frame. Returns true when animation is complete */
  update(reel: Reel, delta: number): boolean;
  /** Force-stop the reel immediately */
  forceStop(reel: Reel): void;
  /** Begin the stop sequence with target symbols */
  beginStop(reel: Reel, targetSymbols: number[]): void;
}

export enum ReelPhase {
  IDLE = 'idle',
  ACCELERATING = 'accelerating',
  SPINNING = 'spinning',
  DECELERATING = 'decelerating',
  BOUNCING = 'bouncing',
  STOPPED = 'stopped',
}
