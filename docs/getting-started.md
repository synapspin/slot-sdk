# Getting Started

Step-by-step guide to creating a new slot game on the SDK.

## Prerequisites

- **Node.js** 22 or later
- **pnpm** (install with `npm install -g pnpm`)
- A code editor with TypeScript support (VS Code recommended)

## 1. Clone and Install

```bash
git clone <repo-url> slot-sdk
cd slot-sdk
pnpm install
```

## 2. Build the Core Library

The core library (`@lab9191/slot-core`) must be built before any game can reference it:

```bash
pnpm build:core
```

This compiles `packages/core/` and makes it available as a workspace dependency.

## 3. Create a New Game Folder

Every game lives under `games/`. Create a new directory:

```bash
mkdir -p games/my-game/src
mkdir -p games/my-game/public/assets/images
```

Add a `package.json` for the game:

```json
{
  "name": "my-game",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "@lab9191/slot-core": "workspace:*",
    "pixi.js": "^8.0.0"
  }
}
```

Add a `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Add a `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
});
```

Add an `index.html` in the game root:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>My Game</title>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #game-container { width: 100%; height: 100%; overflow: hidden; background: #000; }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

Run `pnpm install` from the repo root to link the workspace dependency.

## 4. Define Symbols, Paytable, and Paylines

Create `src/GameDefinition.ts`. This file exports the full `GameConfig` that the SDK uses.

### Symbol Definitions

Each symbol needs a unique numeric `id`, a `name`, a `type`, and a `texture` alias matching an asset:

```ts
import type { SymbolDefinition } from '@lab9191/slot-core';

const symbols: SymbolDefinition[] = [
  { id: 0, name: 'Pot of Gold', type: 'regular', texture: 'sym_pot' },
  { id: 1, name: 'Horseshoe',   type: 'regular', texture: 'sym_horseshoe' },
  { id: 2, name: 'Tankard',     type: 'regular', texture: 'sym_tankard' },
  // Card symbols
  { id: 4, name: 'A', type: 'regular', texture: 'sym_a' },
  { id: 5, name: 'K', type: 'regular', texture: 'sym_k' },
  // Special
  { id: 8,  name: 'Clover Coin', type: 'bonus',   texture: 'sym_coin', value: { min: 1, max: 50 } },
  { id: 9,  name: 'Rainbow',     type: 'scatter',  texture: 'sym_rainbow' },
  { id: 10, name: 'Leprechaun',  type: 'wild',     texture: 'sym_wild', wildConfig: { expanding: false } },
];
```

Symbol types: `'regular'`, `'wild'`, `'scatter'`, `'bonus'`, `'collect'`, `'money'`, `'jackpot'`.

### Paytable

Define payouts as multipliers of the total bet:

```ts
import type { PaytableEntry } from '@lab9191/slot-core';

const paytable: PaytableEntry[] = [
  { symbolId: 0, count: 5, payout: 500 },
  { symbolId: 0, count: 4, payout: 100 },
  { symbolId: 0, count: 3, payout: 30 },
  // ...more entries
];
```

### Paylines

Each payline maps a row index per column. For a 5x3 grid, row indices are 0 (top), 1 (middle), 2 (bottom):

```ts
import type { PaylineDefinition } from '@lab9191/slot-core';

const paylines: PaylineDefinition[] = [
  { index: 0, pattern: [1, 1, 1, 1, 1], color: 0xff0000 },  // straight middle
  { index: 1, pattern: [0, 0, 0, 0, 0], color: 0x00ff00 },  // straight top
  { index: 2, pattern: [2, 2, 2, 2, 2], color: 0x0000ff },  // straight bottom
  { index: 3, pattern: [0, 1, 2, 1, 0], color: 0xffff00 },  // V-shape
  // ...up to 25 paylines
];
```

## 5. Create GameDefinition.ts with GameConfig

Assemble everything into a `GameConfig` object:

```ts
import type { GameConfig } from '@lab9191/slot-core';
import { MockServerAdapter } from '@lab9191/slot-core';

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
});

export const gameConfig: GameConfig = {
  id: 'my-game',
  name: 'My Game',
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
      { title: 'Paytable', type: 'text', content: 'Symbol payouts here...' },
      { title: 'Game Rules', type: 'text', content: 'Rules here...' },
    ],
  },

  features: [],
  server,

  assetBundles: [
    {
      name: 'game',
      assets: [
        { alias: 'bg_main', src: '/assets/images/bg_main.png' },
        { alias: 'sym_pot', src: '/assets/images/sym_pot.png' },
        // ...all symbol and UI textures
      ],
    },
  ],

  autoPlayPresets: [10, 25, 50, 100, 250, 500],
};
```

## 6. Create config.json for Runtime Settings

Create `public/config.json`. This file is loaded at startup via `fetch()` and can be overridden per deployment by the operator:

```json
{
  "game": {
    "id": "my-game",
    "name": "My Game",
    "version": "1.0.0"
  },
  "bet": {
    "levels": [20, 40, 60, 100, 200],
    "default": 100,
    "currency": "USD"
  },
  "bigWin": {
    "thresholds": { "big": 1, "mega": 5, "epic": 15 },
    "durations": { "big": 3000, "mega": 4500, "epic": 6000 }
  },
  "autoPlay": {
    "presets": [10, 25, 50, 100],
    "maxSpins": 1000,
    "stopOnFeature": true
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
    "initialBalance": 100000
  }
}
```

See [Runtime Config Reference](./runtime-config.md) for full documentation.

## 7. Create main.ts

The entry point boots the game, creates decorative elements, wires up layout, and hides the preloader:

```ts
import { Sprite, Assets, Graphics } from 'pixi.js';
import { GameApp, LogLevel, Logger, loadRuntimeConfig } from '@lab9191/slot-core';
import type { ViewportInfo, LayoutMode } from '@lab9191/slot-core';
import { gameConfig } from './GameDefinition';

if (import.meta.env.DEV) {
  Logger.setLevel(LogLevel.DEBUG);
}

async function main() {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');

  // 1. Load external runtime config
  const runtimeConfig = await loadRuntimeConfig('/config.json');

  // 2. Create and boot the game
  const game = new GameApp(gameConfig);
  game.applyRuntimeConfig(runtimeConfig);
  await game.boot(container);

  // 3. Add decorative elements (background, frame, etc.)
  let bg: Sprite | null = null;
  const bgTexture = Assets.get('bg_main');
  if (bgTexture) {
    bg = new Sprite(bgTexture);
    bg.width = gameConfig.layout.designWidth;
    bg.height = gameConfig.layout.designHeight;
    game.layers.game.addChildAt(bg, 0);
  }

  // 4. Register layout callback for responsive repositioning
  const doLayout = (viewport: ViewportInfo, mode: LayoutMode) => {
    const dw = viewport.designWidth;
    const dh = viewport.designHeight;

    if (bg) {
      const bgAspect = bg.texture.width / bg.texture.height;
      const designAspect = dw / dh;
      if (designAspect > bgAspect) {
        bg.width = dw;
        bg.height = dw / bgAspect;
      } else {
        bg.height = dh;
        bg.width = dh * bgAspect;
      }
      bg.x = (dw - bg.width) / 2;
      bg.y = (dh - bg.height) / 2;
    }
  };

  game.onLayout = doLayout;
  doLayout(game.responsiveManager.viewport, game.responsiveManager.mode);

  // 5. Fade out the preloader (scene is ready underneath)
  await game.hidePreloader();
}

main().catch((err) => console.error('Failed to start game:', err));
```

### Key points

- **`game.layers`** provides four Container layers: `game` (background), `reels`, `fx` (effects, frame), `ui` (managed by UIManager).
- **`game.onLayout`** is called on every resize/orientation change. Use it to reposition decorative sprites.
- **`game.hidePreloader()`** must be called after all decorative elements are created, so the scene is fully visible when the preloader fades out.

## 8. Run the Game

From the repository root:

```bash
pnpm dev
```

This starts Vite dev servers for all games. Open the URL printed in the terminal (typically `http://localhost:5173`) to see your game running.

To run only your game:

```bash
pnpm --filter my-game dev
```

## Project Structure

```
slot-sdk/
  packages/
    core/                  # @lab9191/slot-core library
  games/
    book-of-gold/          # Example game
    my-game/               # Your new game
      public/
        config.json        # Runtime config
        assets/images/     # Game textures
      src/
        GameDefinition.ts  # Symbols, paytable, GameConfig
        main.ts            # Entry point
      index.html
      package.json
      tsconfig.json
      vite.config.ts
```

## Next Steps

- [GameConfig Reference](./game-config.md) -- full documentation of all config options
- [Runtime Config Reference](./runtime-config.md) -- operator-configurable settings
- [UI System](./ui-system.md) -- bottom bar, spin button, panels
- [Responsive Layout](./responsive.md) -- desktop/mobile, safe areas
- [Telemetry & Debugging](./telemetry.md) -- event logging and crash reports
