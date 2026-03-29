export type SymbolType = 'regular' | 'wild' | 'scatter' | 'bonus' | 'collect' | 'money' | 'jackpot';

export interface SymbolDefinition {
  id: number;
  name: string;
  type: SymbolType;
  /** Texture key in asset manifest */
  texture: string;
  /** Optional Spine animation asset key for win animations */
  spineAsset?: string;
  /** Wild behavior config */
  wildConfig?: WildConfig;
  /** For money/jackpot symbols: static value or range */
  value?: number | { min: number; max: number };
}

export interface WildConfig {
  /** Can substitute for these symbol types */
  substitutes?: SymbolType[];
  /** Cannot substitute for these specific symbol IDs */
  excludeSymbols?: number[];
  /** Expanding wild fills the entire reel */
  expanding?: boolean;
  /** Multiplier applied when wild is part of a win */
  multiplier?: number;
  /** Sticky across respins */
  sticky?: boolean;
}

export interface PaytableEntry {
  symbolId: number;
  /** Number of matching symbols required */
  count: number;
  /** Payout as multiplier of bet (e.g., 500 = 500x bet) */
  payout: number;
}

export interface PaylineDefinition {
  /** Payline index */
  index: number;
  /** Row position for each column, e.g. [1, 0, 0, 0, 1] for a V-shape on 5 reels */
  pattern: number[];
  /** Color for visual display */
  color: number;
}
