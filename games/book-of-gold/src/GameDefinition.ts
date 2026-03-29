import type { GameConfig } from '@lab9191/slot-core';
import {
  FreeSpinsFeature,
  HoldAndWinFeature,
  AnteBetFeature,
  GiftSpinsFeature,
  MockServerAdapter,
} from '@lab9191/slot-core';
import type { SymbolDefinition, PaytableEntry, PaylineDefinition } from '@lab9191/slot-core';

// ─── Symbol Definitions ───────────────────────────────────────
// High pay: Pot of Gold, Horseshoe, Tankard, Medallion
// Medium pay: A, K, Q, J
// Special: Wild (Leprechaun), Scatter (Rainbow), Bonus (Clover coin)
const symbols: SymbolDefinition[] = [
  // High pay symbols
  { id: 0, name: 'Pot of Gold', type: 'regular', texture: 'sym_pot' },
  { id: 1, name: 'Horseshoe', type: 'regular', texture: 'sym_horseshoe' },
  { id: 2, name: 'Tankard', type: 'regular', texture: 'sym_tankard' },
  { id: 3, name: 'Medallion', type: 'regular', texture: 'sym_medallion' },
  // Medium pay (card) symbols
  { id: 4, name: 'A', type: 'regular', texture: 'sym_a' },
  { id: 5, name: 'K', type: 'regular', texture: 'sym_k' },
  { id: 6, name: 'Q', type: 'regular', texture: 'sym_q' },
  { id: 7, name: 'J', type: 'regular', texture: 'sym_j' },
  // Special symbols
  { id: 8, name: 'Clover Coin', type: 'bonus', texture: 'sym_coin', value: { min: 1, max: 50 } },
  { id: 9, name: 'Rainbow', type: 'scatter', texture: 'sym_rainbow' },
  { id: 10, name: 'Leprechaun', type: 'wild', texture: 'sym_wild', wildConfig: { expanding: false } },
];

// ─── Paytable ─────────────────────────────────────────────────
const paytable: PaytableEntry[] = [
  // Pot of Gold (highest)
  { symbolId: 0, count: 5, payout: 500 },
  { symbolId: 0, count: 4, payout: 100 },
  { symbolId: 0, count: 3, payout: 30 },
  // Horseshoe
  { symbolId: 1, count: 5, payout: 300 },
  { symbolId: 1, count: 4, payout: 75 },
  { symbolId: 1, count: 3, payout: 20 },
  // Tankard
  { symbolId: 2, count: 5, payout: 200 },
  { symbolId: 2, count: 4, payout: 50 },
  { symbolId: 2, count: 3, payout: 15 },
  // Medallion
  { symbolId: 3, count: 5, payout: 150 },
  { symbolId: 3, count: 4, payout: 40 },
  { symbolId: 3, count: 3, payout: 10 },
  // A
  { symbolId: 4, count: 5, payout: 100 },
  { symbolId: 4, count: 4, payout: 25 },
  { symbolId: 4, count: 3, payout: 5 },
  // K
  { symbolId: 5, count: 5, payout: 100 },
  { symbolId: 5, count: 4, payout: 25 },
  { symbolId: 5, count: 3, payout: 5 },
  // Q
  { symbolId: 6, count: 5, payout: 75 },
  { symbolId: 6, count: 4, payout: 20 },
  { symbolId: 6, count: 3, payout: 4 },
  // J
  { symbolId: 7, count: 5, payout: 75 },
  { symbolId: 7, count: 4, payout: 20 },
  { symbolId: 7, count: 3, payout: 4 },
  // Rainbow (scatter) — pays anywhere
  { symbolId: 9, count: 5, payout: 2500 },
  { symbolId: 9, count: 4, payout: 250 },
  { symbolId: 9, count: 3, payout: 25 },
];

// ─── 25 Paylines (5x3 grid) ──────────────────────────────────
const paylines: PaylineDefinition[] = [
  { index: 0,  pattern: [1, 1, 1, 1, 1], color: 0xff0000 },
  { index: 1,  pattern: [0, 0, 0, 0, 0], color: 0x00ff00 },
  { index: 2,  pattern: [2, 2, 2, 2, 2], color: 0x0000ff },
  { index: 3,  pattern: [0, 1, 2, 1, 0], color: 0xffff00 },
  { index: 4,  pattern: [2, 1, 0, 1, 2], color: 0xff00ff },
  { index: 5,  pattern: [0, 0, 1, 2, 2], color: 0x00ffff },
  { index: 6,  pattern: [2, 2, 1, 0, 0], color: 0xff8800 },
  { index: 7,  pattern: [1, 0, 0, 0, 1], color: 0x8800ff },
  { index: 8,  pattern: [1, 2, 2, 2, 1], color: 0x88ff00 },
  { index: 9,  pattern: [0, 1, 1, 1, 0], color: 0xff0088 },
  { index: 10, pattern: [2, 1, 1, 1, 2], color: 0x00ff88 },
  { index: 11, pattern: [1, 0, 1, 0, 1], color: 0xffaa00 },
  { index: 12, pattern: [1, 2, 1, 2, 1], color: 0x00aaff },
  { index: 13, pattern: [0, 1, 0, 1, 0], color: 0xff44aa },
  { index: 14, pattern: [2, 1, 2, 1, 2], color: 0xaa44ff },
  { index: 15, pattern: [1, 0, 1, 2, 1], color: 0x44ffaa },
  { index: 16, pattern: [1, 2, 1, 0, 1], color: 0xaaff44 },
  { index: 17, pattern: [0, 0, 1, 0, 0], color: 0xff6644 },
  { index: 18, pattern: [2, 2, 1, 2, 2], color: 0x4466ff },
  { index: 19, pattern: [0, 2, 0, 2, 0], color: 0x66ff44 },
  { index: 20, pattern: [2, 0, 2, 0, 2], color: 0xff4466 },
  { index: 21, pattern: [0, 2, 2, 2, 0], color: 0x44ff66 },
  { index: 22, pattern: [2, 0, 0, 0, 2], color: 0x6644ff },
  { index: 23, pattern: [1, 1, 0, 1, 1], color: 0xddaa00 },
  { index: 24, pattern: [1, 1, 2, 1, 1], color: 0x00aadd },
];

// ─── Mock Server ──────────────────────────────────────────────
const server = new MockServerAdapter({
  symbols,
  cols: 5,
  rows: 3,
  paytable,
  paylines,
  initialBalance: 100000,
  betLevels: [20, 40, 60, 100, 200, 400, 600, 1000, 2000, 5000],
  defaultBet: 100,
  currency: 'USD',
  freeSpinsTrigger: {
    scatterSymbolId: 9,
    minCount: 3,
    spinsAwarded: 10,
  },
  holdAndWinTrigger: {
    bonusSymbolId: 8,
    minCount: 6,
    initialRespins: 3,
  },
});

// ─── Game Config ──────────────────────────────────────────────
export const gameConfig: GameConfig = {
  id: '4-pots-of-luck',
  name: '4 Pots of Luck',
  version: '1.0.0',
  backgroundColor: 0x0a2e0a,

  layout: {
    designWidth: 1920,
    designHeight: 1080,
    orientation: 'both',
    /** Safe area — all interactive UI stays within this rect. */
    safeArea: { x: 40, y: 10, width: 1840, height: 1060 },
    /** Landscape reel area */
    reelArea: { x: 480, y: 165, width: 1000, height: 590 },
    /** Portrait mode overrides */
    portrait: {
      designWidth: 1080,
      designHeight: 1920,
      reelArea: { x: 25, y: 240, width: 1030, height: 700 },
      safeArea: { x: 20, y: 50, width: 1040, height: 1820 },
    },
  },

  reels: {
    cols: 5,
    rows: 3,
    symbolSize: { width: 175, height: 175 },
    symbolGap: 10,
    spinSpeed: 28,
    stopDelay: 180,
    anticipationDelay: 1500,
    overshoot: 22,
    maskPadding: 4,
  },

  symbols,
  paytable,
  paylines,

  sounds: {
    sounds: {},
    defaultVolume: 0.8,
  },

  ui: {
    fontFamily: 'Roboto, Arial, sans-serif',
    primaryColor: 0x2ecc40,
    panelColor: 0x0a1a0a,
    textColor: 0xffffff,
    winColor: 0xffd700,
    bottomBarHeight: 70,
    infoPages: [
      {
        title: 'Paytable - High Symbols',
        type: 'text',
        content: `POT OF GOLD: 5x = 500, 4x = 100, 3x = 30
HORSESHOE: 5x = 300, 4x = 75, 3x = 20
TANKARD: 5x = 200, 4x = 50, 3x = 15
MEDALLION: 5x = 150, 4x = 40, 3x = 10

All payouts are multiplied by the total bet.
Leprechaun WILD substitutes for all symbols except Scatter and Bonus.`,
      },
      {
        title: 'Paytable - Low Symbols',
        type: 'text',
        content: `A, K: 5x = 100, 4x = 25, 3x = 5
Q, J: 5x = 75, 4x = 20, 3x = 4

Wins are evaluated on 25 paylines from left to right.
Only the highest win per payline is paid.`,
      },
      {
        title: 'Hold & Win - 4 Pots Feature',
        type: 'text',
        content: `Land 6 or more Clover Coin bonus symbols to trigger the Hold & Win feature!

You start with 3 respins. Each new Clover Coin that lands resets respins to 3.

JACKPOTS:
- Mini: 15x bet
- Minor: 30x bet
- Major: 100x bet
- Grand: 3,000x bet (fill all 15 positions!)

Special clover symbols may appear with multipliers or collect features.`,
      },
      {
        title: 'Free Spins',
        type: 'text',
        content: `3 or more Rainbow Scatter symbols trigger Free Spins:
- 3 Rainbows = 10 Free Spins
- 4 Rainbows = 10 Free Spins + 250x bet
- 5 Rainbows = 10 Free Spins + 2500x bet

Free Spins can be retriggered during the bonus.`,
      },
      {
        title: 'Game Rules',
        type: 'text',
        content: `- 25 paylines, 5 reels, 3 rows
- Wins pay left to right on adjacent reels
- Scatter wins pay in any position
- Wild substitutes for all except Scatter & Bonus
- Ante Bet increases bet by 25% for better bonus odds
- Bet range: $0.20 - $50.00
- RTP: 95.7%
- Volatility: High
- Maximum win: 15,000x`,
      },
    ],
  },

  features: [
    new FreeSpinsFeature({
      triggerSymbolId: 9,
      triggerCount: 3,
      spinsAwarded: 10,
      retriggerable: true,
    }),
    new HoldAndWinFeature({
      initialRespins: 3,
      cols: 5,
      rows: 3,
      jackpots: [
        { type: 'mini', label: 'MINI', color: 0x44ff44 },
        { type: 'minor', label: 'MINOR', color: 0x00aaff },
        { type: 'major', label: 'MAJOR', color: 0xff6600 },
        { type: 'grand', label: 'GRAND', color: 0xff0000 },
      ],
    }),
    new AnteBetFeature({
      multiplier: 1.25,
      description: 'Increase bet by 25% for better Hold & Win odds',
    }),
    new GiftSpinsFeature(),
  ],

  server,

  assetBundles: [
    {
      name: 'game',
      assets: [
        // Background & UI
        { alias: 'bg_main', src: '/assets/images/bg_main.png' },
        { alias: 'reel_frame', src: '/assets/images/reel_frame.png' },
        { alias: 'game_title', src: '/assets/images/game_title.png' },
        { alias: 'btn_spin', src: '/assets/images/btn_spin.png' },
        { alias: 'btn_spin_hover', src: '/assets/images/btn_spin_hover.png' },
        { alias: 'sym_frame', src: '/assets/images/sym_frame.png' },
        // High pay symbols
        { alias: 'sym_pot', src: '/assets/images/sym_pot.png' },
        { alias: 'sym_horseshoe', src: '/assets/images/sym_horseshoe.png' },
        { alias: 'sym_tankard', src: '/assets/images/sym_tankard.png' },
        { alias: 'sym_medallion', src: '/assets/images/sym_medallion.png' },
        // Card symbols
        { alias: 'sym_a', src: '/assets/images/sym_a.png' },
        { alias: 'sym_k', src: '/assets/images/sym_k.png' },
        { alias: 'sym_q', src: '/assets/images/sym_q.png' },
        { alias: 'sym_j', src: '/assets/images/sym_j.png' },
        // Special symbols
        { alias: 'sym_coin', src: '/assets/images/sym_coin.png' },
        { alias: 'sym_rainbow', src: '/assets/images/sym_rainbow.png' },
        { alias: 'sym_wild', src: '/assets/images/sym_wild.png' },
        // Character
        { alias: 'leprechaun_full', src: '/assets/images/leprechaun_full.png' },
      ],
    },
  ],

  anteBetMultiplier: 1.25,
  buyBonusOptions: [
    { id: 'random', label: 'Random Bonus', costMultiplier: 70, featureType: 'holdAndWin' },
    { id: 'super', label: 'Super Pot', costMultiplier: 150, featureType: 'holdAndWin' },
  ],
  autoPlayPresets: [10, 25, 50, 100, 250, 500],
};
