/** Request to initialize game session */
export interface InitRequest {
  gameId: string;
  sessionToken?: string;
  language?: string;
}

/** Response from game init */
export interface InitResponse {
  balance: number;
  betLevels: number[];
  defaultBet: number;
  currency: string;
  /** Ante bet cost multiplier (e.g. 1.25 = 25% more) */
  anteBetMultiplier?: number;
  /** Buy bonus costs per bet level */
  buyBonusCosts?: Record<string, number>;
  /** Restored state if session was interrupted */
  restoredState?: SpinResponse;
  /** Pending gift spins */
  giftSpins?: GiftSpinsOffer;
}

/** Spin request sent to server */
export interface SpinRequest {
  bet: number;
  anteBet: boolean;
  /** For feature continuation (free spins, hold-and-win) */
  featureContext?: Record<string, unknown>;
}

/** Buy bonus request */
export interface BuyBonusRequest {
  bet: number;
  bonusType: string;
}

/** Server response for a spin */
export interface SpinResponse {
  /** Final reel grid, [col][row] */
  reelResult: number[][];
  totalWin: number;
  balance: number;
  wins: WinResult[];
  feature?: FeatureResult;
  /** Cascade chain results */
  cascadeChain?: CascadeStep[];
  /** Multiplier applied to total win */
  multiplier?: number;
}

/** A single win line/way */
export interface WinResult {
  type: 'line' | 'scatter' | 'ways' | 'collect';
  symbolId: number;
  /** [col, row] positions involved */
  positions: [number, number][];
  payout: number;
  multiplier: number;
  /** Payline index if type is 'line' */
  lineIndex?: number;
}

/** Feature/bonus result from server */
export interface FeatureResult {
  type: 'freeSpins' | 'holdAndWin' | 'collect' | 'cascade' | 'custom';
  /** Free spins awarded */
  totalSpins?: number;
  remainingSpins?: number;
  /** For hold-and-win: initial sticky positions */
  stickyPositions?: StickySymbol[];
  /** Total respins for hold-and-win */
  totalRespins?: number;
  remainingRespins?: number;
  /** Jackpot won */
  jackpot?: 'grand' | 'major' | 'minor' | 'mini';
  /** Total feature win so far */
  featureWin?: number;
  /** Special expanding symbol for book-style games */
  expandingSymbol?: number;
  /** Custom feature data for game-specific mechanics */
  custom?: Record<string, unknown>;
}

/** Sticky symbol for Hold & Win */
export interface StickySymbol {
  col: number;
  row: number;
  symbolId: number;
  value?: number;
  special?: 'grand' | 'major' | 'minor' | 'mini' | 'collect' | 'multiplier' | 'expand';
}

/** Cascade step in tumble mechanics */
export interface CascadeStep {
  /** Positions removed */
  removedPositions: [number, number][];
  /** New symbols that fell in [col][row] */
  newSymbols: number[][];
  /** Wins from this cascade step */
  wins: WinResult[];
  /** Cumulative multiplier */
  multiplier: number;
}

/** Gift spins offer from operator */
export interface GiftSpinsOffer {
  id: string;
  spins: number;
  bet: number;
  /** Expiration timestamp */
  expiresAt?: number;
}
