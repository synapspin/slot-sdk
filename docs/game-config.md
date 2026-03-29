# GameConfig Reference

`GameConfig` is the central interface that defines everything about a game: layout, reels, symbols, paytable, UI theming, features, assets, and server connection. It is passed to `new GameApp(gameConfig)`.

```ts
import type { GameConfig } from '@lab9191/slot-core';
```

## Top-Level Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique game identifier (e.g. `'4-pots-of-luck'`) |
| `name` | `string` | Yes | Display name |
| `version` | `string` | Yes | Semantic version |
| `backgroundColor` | `number` | No | Canvas background color (hex, default `0x000000`) |
| `layout` | `LayoutConfig` | Yes | Responsive layout dimensions |
| `reels` | `ReelSetConfig` | Yes | Reel grid configuration |
| `symbols` | `SymbolDefinition[]` | Yes | All symbol definitions |
| `paytable` | `PaytableEntry[]` | Yes | Payout table |
| `paylines` | `PaylineDefinition[]` | No | Payline definitions (for line-based games) |
| `sounds` | `SoundConfig` | Yes | Sound configuration |
| `ui` | `UIConfig` | Yes | UI theme and content |
| `features` | `IFeaturePlugin[]` | Yes | Feature plugins (free spins, hold & win, etc.) |
| `server` | `IServerAdapter` | Yes | Server adapter (mock or remote) |
| `assetBundles` | `AssetBundleConfig[]` | Yes | Asset manifest |
| `preloader` | `Partial<PreloaderConfig>` | No | Preloader overlay settings |
| `telemetry` | `Partial<TelemetryConfig>` | No | Telemetry buffer settings |
| `bigWin` | `object` | No | Big win celebration thresholds and durations |
| `anteBetMultiplier` | `number` | No | Ante bet cost multiplier (e.g. `1.25`) |
| `buyBonusOptions` | `BuyBonusOption[]` | No | Buy bonus menu options |
| `autoPlayPresets` | `number[]` | No | Auto play spin count presets |

---

## LayoutConfig

Controls how the game scales and positions content across screen sizes and orientations.

```ts
export interface LayoutConfig {
  designWidth: number;       // Landscape design width (e.g. 1920)
  designHeight: number;      // Landscape design height (e.g. 1080)
  orientation: 'landscape' | 'portrait' | 'both';
  safeArea?: { x: number; y: number; width: number; height: number };
  reelArea: { x: number; y: number; width: number; height: number };
  portrait?: {
    designWidth?: number;    // Portrait design width (default: swap landscape)
    designHeight?: number;   // Portrait design height
    reelArea?: { x: number; y: number; width: number; height: number };
    safeArea?: { x: number; y: number; width: number; height: number };
  };
}
```

### Fields

| Field | Description |
|---|---|
| `designWidth` / `designHeight` | The logical pixel dimensions the game is designed for in landscape. The SDK scales the canvas uniformly to fit the actual screen. |
| `safeArea` | Rectangle within the design space where interactive UI elements must stay. Merged with device `env(safe-area-inset-*)` at runtime. |
| `reelArea` | Rectangle defining where the reel grid is placed in landscape coordinates. |
| `portrait` | Optional overrides for portrait mode. If omitted, portrait dimensions are auto-calculated by swapping width/height and scaling the reel area to 90% width. |

### Example

```ts
layout: {
  designWidth: 1920,
  designHeight: 1080,
  orientation: 'both',
  safeArea: { x: 40, y: 10, width: 1840, height: 1060 },
  reelArea: { x: 480, y: 165, width: 1000, height: 590 },
  portrait: {
    designWidth: 1080,
    designHeight: 1920,
    reelArea: { x: 25, y: 240, width: 1030, height: 700 },
    safeArea: { x: 20, y: 50, width: 1040, height: 1820 },
  },
}
```

---

## ReelSetConfig

Configures the reel grid dimensions and spin behavior.

```ts
export interface ReelSetConfig {
  cols: number;                          // Number of reel columns
  rows: number;                          // Number of visible rows
  rowsPerCol?: number[];                 // Per-column row overrides (e.g. [3, 4, 5, 4, 3])
  symbolSize: { width: number; height: number };
  symbolGap?: number;                    // Gap between symbols (px)
  spinSpeed: number;                     // Symbols per second
  stopDelay: number;                     // Delay between each reel stop (ms)
  anticipationDelay: number;             // Extra delay for scatter anticipation (ms)
  overshoot: number;                     // Bounce overshoot (px)
  reelStrips?: number[][];               // Custom reel strips per column
  maskPadding?: number;                  // Mask padding around visible area (px)
}
```

### Example

```ts
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
}
```

---

## SymbolDefinition

```ts
export type SymbolType = 'regular' | 'wild' | 'scatter' | 'bonus' | 'collect' | 'money' | 'jackpot';

export interface SymbolDefinition {
  id: number;                // Unique numeric ID
  name: string;              // Display name
  type: SymbolType;          // Symbol category
  texture: string;           // Asset alias (must match an assetBundle entry)
  spineAsset?: string;       // Optional Spine animation for win animations
  wildConfig?: WildConfig;   // Wild-specific behavior
  value?: number | { min: number; max: number };  // For money/bonus symbols
}

export interface WildConfig {
  substitutes?: SymbolType[];    // Types this wild can replace
  excludeSymbols?: number[];     // Specific symbol IDs it cannot replace
  expanding?: boolean;           // Fills entire reel on win
  multiplier?: number;           // Win multiplier when wild participates
  sticky?: boolean;              // Stays on grid across respins
}
```

---

## PaytableEntry

```ts
export interface PaytableEntry {
  symbolId: number;   // References SymbolDefinition.id
  count: number;      // Number of matching symbols required (e.g. 3, 4, 5)
  payout: number;     // Payout multiplier relative to bet
}
```

---

## PaylineDefinition

```ts
export interface PaylineDefinition {
  index: number;        // Payline number (0-based)
  pattern: number[];    // Row index per column (e.g. [1,1,1,1,1] = middle row)
  color: number;        // Hex color for visual display
}
```

For a 5-reel, 3-row grid, row indices are `0` (top), `1` (middle), `2` (bottom).

---

## UIConfig

Controls UI theming and info page content.

```ts
export interface UIConfig {
  fontFamily: string;        // Font for all text elements
  primaryColor: number;      // Buttons and accents
  panelColor: number;        // UI panel backgrounds
  textColor: number;         // Default text color
  winColor: number;          // Win amount text color
  spinButtonTextures?: {     // Optional custom spin button textures
    idle: string;
    hover: string;
    pressed: string;
    disabled: string;
    stop: string;
  };
  bottomBarHeight?: number;  // Height in design pixels (default: 70)
  infoPages?: InfoPageConfig[];
}
```

---

## InfoPageConfig

Each info page appears in the paginated Info Menu accessible from the bottom bar.

```ts
export interface InfoPageConfig {
  title: string;
  type: 'image' | 'text';   // 'image' loads a texture by alias; 'text' renders wrapped text
  content: string;           // Texture alias or text content
}
```

---

## AssetBundleConfig

Groups assets for loading. The SDK loads bundles named `'preload'` first (30% of progress bar), then `'game'` (next 60%).

```ts
export interface AssetBundleConfig {
  name: string;
  assets: { alias: string; src: string }[];
}
```

### Example

```ts
assetBundles: [
  {
    name: 'game',
    assets: [
      { alias: 'bg_main', src: '/assets/images/bg_main.png' },
      { alias: 'sym_pot', src: '/assets/images/sym_pot.png' },
      { alias: 'sym_wild', src: '/assets/images/sym_wild.png' },
    ],
  },
]
```

---

## BuyBonusOption

```ts
export interface BuyBonusOption {
  id: string;               // Unique ID (e.g. 'random', 'super')
  label: string;            // Display label
  costMultiplier: number;   // Cost as multiplier of current bet
  featureType: string;      // Feature triggered (e.g. 'holdAndWin', 'freeSpins')
}
```

---

## PreloaderConfig

Controls the HTML preloader overlay shown while assets load.

```ts
export interface PreloaderConfig {
  brandText: string;         // Large brand text (e.g. 'LAB9191')
  tagline?: string;          // Smaller text below brand
  bgColor: string;           // CSS background color
  brandColor: string;        // CSS text color for brand
  accentColor: string;       // CSS color for progress bar
  fontFamily: string;        // CSS font family
  minDisplayTime: number;    // Minimum display time in ms
}
```

---

## Complete Example

```ts
import type { GameConfig } from '@lab9191/slot-core';
import {
  FreeSpinsFeature,
  HoldAndWinFeature,
  AnteBetFeature,
  MockServerAdapter,
} from '@lab9191/slot-core';

const symbols = [ /* ...see SymbolDefinition */ ];
const paytable = [ /* ...see PaytableEntry */ ];
const paylines = [ /* ...see PaylineDefinition */ ];

const server = new MockServerAdapter({
  symbols, cols: 5, rows: 3, paytable, paylines,
  initialBalance: 100000,
  betLevels: [20, 40, 60, 100, 200, 400, 600, 1000, 2000, 5000],
  defaultBet: 100, currency: 'USD',
  freeSpinsTrigger: { scatterSymbolId: 9, minCount: 3, spinsAwarded: 10 },
  holdAndWinTrigger: { bonusSymbolId: 8, minCount: 6, initialRespins: 3 },
});

export const gameConfig: GameConfig = {
  id: '4-pots-of-luck',
  name: '4 Pots of Luck',
  version: '1.0.0',
  backgroundColor: 0x0a0a14,

  preloader: {
    brandText: 'LAB9191',
    tagline: 'G A M E S',
    bgColor: '#0a0a14',
    brandColor: '#ffffff',
    accentColor: '#22cc66',
    minDisplayTime: 2500,
  },

  layout: {
    designWidth: 1920,
    designHeight: 1080,
    orientation: 'both',
    safeArea: { x: 40, y: 10, width: 1840, height: 1060 },
    reelArea: { x: 480, y: 165, width: 1000, height: 590 },
    portrait: {
      designWidth: 1080,
      designHeight: 1920,
      reelArea: { x: 25, y: 240, width: 1030, height: 700 },
      safeArea: { x: 20, y: 50, width: 1040, height: 1820 },
    },
  },

  reels: {
    cols: 5, rows: 3,
    symbolSize: { width: 175, height: 175 },
    symbolGap: 10, spinSpeed: 28, stopDelay: 180,
    anticipationDelay: 1500, overshoot: 22, maskPadding: 4,
  },

  symbols, paytable, paylines,

  sounds: { sounds: {}, defaultVolume: 0.8 },

  ui: {
    fontFamily: 'Roboto, Arial, sans-serif',
    primaryColor: 0x2ecc40,
    panelColor: 0x0a1a0a,
    textColor: 0xffffff,
    winColor: 0xffd700,
    bottomBarHeight: 70,
    infoPages: [
      { title: 'Paytable', type: 'text', content: 'Payout details...' },
      { title: 'Game Rules', type: 'text', content: 'Rules...' },
    ],
  },

  features: [
    new FreeSpinsFeature({ triggerSymbolId: 9, triggerCount: 3, spinsAwarded: 10, retriggerable: true }),
    new HoldAndWinFeature({
      initialRespins: 3, cols: 5, rows: 3,
      jackpots: [
        { type: 'mini', label: 'MINI', color: 0x44ff44 },
        { type: 'minor', label: 'MINOR', color: 0x00aaff },
        { type: 'major', label: 'MAJOR', color: 0xff6600 },
        { type: 'grand', label: 'GRAND', color: 0xff0000 },
      ],
    }),
    new AnteBetFeature({ multiplier: 1.25, description: 'Increase bet by 25%' }),
  ],

  server,

  assetBundles: [
    {
      name: 'game',
      assets: [
        { alias: 'bg_main', src: '/assets/images/bg_main.png' },
        { alias: 'reel_frame', src: '/assets/images/reel_frame.png' },
        // ...symbols, characters, UI elements
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
```
