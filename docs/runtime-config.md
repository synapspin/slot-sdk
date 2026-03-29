# Runtime Config Reference

The runtime config (`config.json`) is an external JSON file loaded at game startup via `fetch()`. It provides operator-configurable settings that can be overridden per deployment without rebuilding the game.

## How It Works

1. The game calls `loadRuntimeConfig('/config.json')` before booting.
2. The config is fetched from the server (relative to the game's public root).
3. The loaded config is applied via `game.applyRuntimeConfig(runtimeConfig)`.
4. The config is available throughout the game via `GameContext.runtimeConfig`.

```ts
import { GameApp, loadRuntimeConfig } from '@lab9191/slot-core';

const runtimeConfig = await loadRuntimeConfig('/config.json');
const game = new GameApp(gameConfig);
game.applyRuntimeConfig(runtimeConfig);
await game.boot(container);
```

Operators can replace `config.json` on their deployment to customize bet levels, big win thresholds, server endpoints, and other runtime parameters without touching the game code.

---

## RuntimeConfig Interface

```ts
export interface RuntimeConfig {
  game: {
    id: string;
    name: string;
    version: string;
  };

  rtp?: number;
  volatility?: string;
  maxWin?: number;

  bet: {
    levels: number[];
    default: number;
    currency: string;
  };

  bigWin?: {
    thresholds?: { big?: number; mega?: number; epic?: number };
    durations?: { big?: number; mega?: number; epic?: number };
  };

  autoPlay?: {
    presets?: number[];
    maxSpins?: number;
    stopOnFeature?: boolean;
  };

  anteBet?: {
    enabled?: boolean;
    multiplier?: number;
    description?: string;
  };

  buyBonus?: Array<{
    id: string;
    label: string;
    costMultiplier: number;
    featureType: string;
  }>;

  features?: Record<string, unknown>;

  preloader?: {
    brandText?: string;
    tagline?: string;
    bgColor?: string;
    brandColor?: string;
    accentColor?: string;
    minDisplayTime?: number;
  };

  server?: {
    type: 'mock' | 'remote';
    url?: string;
    initialBalance?: number;
    rtp?: number;
  };

  // Any game-specific custom fields
  [key: string]: unknown;
}
```

---

## Section Reference

### `game`

Required. Identifies the game.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique game identifier |
| `name` | `string` | Display name |
| `version` | `string` | Semantic version |

### `bet`

Required. Configures bet levels and currency.

| Field | Type | Description |
|---|---|---|
| `levels` | `number[]` | Available bet amounts in minor units (cents) |
| `default` | `number` | Default bet level |
| `currency` | `string` | ISO 4217 currency code (e.g. `"USD"`, `"EUR"`) |

### `bigWin`

Optional. Controls big win celebration triggers and animation durations.

| Field | Type | Default | Description |
|---|---|---|---|
| `thresholds.big` | `number` | `1` | Win multiplier to trigger "Big Win" |
| `thresholds.mega` | `number` | `5` | Win multiplier to trigger "Mega Win" |
| `thresholds.epic` | `number` | `15` | Win multiplier to trigger "Epic Win" |
| `durations.big` | `number` | `3000` | Big win animation duration (ms) |
| `durations.mega` | `number` | `4500` | Mega win animation duration (ms) |
| `durations.epic` | `number` | `6000` | Epic win animation duration (ms) |

Thresholds are multipliers of the current bet. A win of 5x the bet triggers "Mega Win" if `thresholds.mega` is `5`.

### `autoPlay`

Optional. Configures the auto play feature.

| Field | Type | Default | Description |
|---|---|---|---|
| `presets` | `number[]` | `[10,25,50,100,250,500]` | Preset spin counts shown in the panel |
| `maxSpins` | `number` | `1000` | Maximum auto play spins allowed |
| `stopOnFeature` | `boolean` | `true` | Stop auto play when a bonus feature triggers |

### `anteBet`

Optional. Configures the ante bet (increased cost for better bonus odds).

| Field | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Whether ante bet is available |
| `multiplier` | `number` | Bet cost multiplier (e.g. `1.25` = 25% extra) |
| `description` | `string` | Tooltip description |

### `buyBonus`

Optional. Array of buy bonus options.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique option ID |
| `label` | `string` | Button label |
| `costMultiplier` | `number` | Cost as multiplier of current bet |
| `featureType` | `string` | Feature type triggered |

### `features`

Optional. Game-specific feature configuration. This is a freeform `Record<string, unknown>` that feature plugins can read.

```json
{
  "features": {
    "freeSpins": {
      "triggerSymbolId": 9,
      "triggerCount": 3,
      "spinsAwarded": 10,
      "retriggerable": true
    },
    "holdAndWin": {
      "initialRespins": 3,
      "cols": 5,
      "rows": 3,
      "jackpots": [
        { "type": "mini", "label": "MINI", "value": 15 },
        { "type": "minor", "label": "MINOR", "value": 30 },
        { "type": "major", "label": "MAJOR", "value": 100 },
        { "type": "grand", "label": "GRAND", "value": 3000 }
      ]
    }
  }
}
```

### `preloader`

Optional. Overrides preloader appearance.

| Field | Type | Description |
|---|---|---|
| `brandText` | `string` | Large brand text |
| `tagline` | `string` | Smaller text below brand |
| `bgColor` | `string` | CSS background color |
| `brandColor` | `string` | CSS text color |
| `accentColor` | `string` | CSS progress bar color |
| `minDisplayTime` | `number` | Minimum display time (ms) |

### `server`

Optional. Server connection settings.

| Field | Type | Description |
|---|---|---|
| `type` | `'mock' \| 'remote'` | Server adapter type |
| `url` | `string` | Remote server endpoint URL |
| `initialBalance` | `number` | Starting balance for mock server |
| `rtp` | `number` | Target RTP for mock server (0-1) |

---

## Accessing at Runtime

The runtime config is available in `GameContext` and on the `GameApp` instance:

```ts
// Inside a feature plugin or state handler:
const maxWin = context.runtimeConfig?.maxWin;
const jackpots = (context.runtimeConfig?.features as any)?.holdAndWin?.jackpots;

// From the GameApp instance (e.g. in main.ts):
const currency = game.runtimeConfig?.bet.currency;
```

The `RuntimeConfig` interface allows arbitrary additional keys via `[key: string]: unknown`, so games can define custom sections for game-specific settings.

---

## Complete Example

```json
{
  "game": {
    "id": "4-pots-of-luck",
    "name": "4 Pots of Luck",
    "version": "1.0.0"
  },

  "rtp": 95.7,
  "volatility": "high",
  "maxWin": 15000,

  "bet": {
    "levels": [20, 40, 60, 100, 200, 400, 600, 1000, 2000, 5000],
    "default": 100,
    "currency": "USD"
  },

  "bigWin": {
    "thresholds": { "big": 1, "mega": 5, "epic": 15 },
    "durations": { "big": 3000, "mega": 4500, "epic": 6000 }
  },

  "autoPlay": {
    "presets": [10, 25, 50, 100, 250, 500],
    "maxSpins": 1000,
    "stopOnFeature": true
  },

  "anteBet": {
    "enabled": true,
    "multiplier": 1.25,
    "description": "Increase bet by 25% for better Hold & Win odds"
  },

  "buyBonus": [
    { "id": "random", "label": "Random Bonus", "costMultiplier": 70, "featureType": "holdAndWin" },
    { "id": "super", "label": "Super Pot", "costMultiplier": 150, "featureType": "holdAndWin" }
  ],

  "features": {
    "freeSpins": {
      "triggerSymbolId": 9,
      "triggerCount": 3,
      "spinsAwarded": 10,
      "retriggerable": true
    },
    "holdAndWin": {
      "initialRespins": 3,
      "cols": 5,
      "rows": 3,
      "jackpots": [
        { "type": "mini", "label": "MINI", "value": 15 },
        { "type": "minor", "label": "MINOR", "value": 30 },
        { "type": "major", "label": "MAJOR", "value": 100 },
        { "type": "grand", "label": "GRAND", "value": 3000 }
      ]
    }
  },

  "preloader": {
    "brandText": "LAB9191",
    "tagline": "G A M E S",
    "bgColor": "#0a0a14",
    "brandColor": "#ffffff",
    "accentColor": "#22cc66",
    "minDisplayTime": 2500
  },

  "server": {
    "type": "mock",
    "initialBalance": 100000,
    "rtp": 0.96
  }
}
```
