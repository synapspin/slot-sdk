export interface ReelSetConfig {
  /** Number of reel columns */
  cols: number;
  /** Number of visible rows */
  rows: number;
  /** Per-column row overrides for irregular grids (e.g., [3, 4, 5, 4, 3]) */
  rowsPerCol?: number[];
  /** Symbol display size in pixels */
  symbolSize: { width: number; height: number };
  /** Gap between symbols in pixels */
  symbolGap?: number;
  /** Spin speed (symbols per second) */
  spinSpeed: number;
  /** Delay between each reel stopping (ms) */
  stopDelay: number;
  /** Extra delay for scatter anticipation (ms) */
  anticipationDelay: number;
  /** Bounce overshoot amount in pixels */
  overshoot: number;
  /** Reel strips: [col][strip symbol IDs] */
  reelStrips?: number[][];
  /** Mask padding around visible area */
  maskPadding?: number;
}
