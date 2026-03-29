import { Sprite, Assets, Graphics } from 'pixi.js';
import { GameApp, LogLevel, Logger } from '@lab9191/slot-core';
import type { ViewportInfo, LayoutMode } from '@lab9191/slot-core';
import { gameConfig } from './GameDefinition';

if (import.meta.env.DEV) {
  Logger.setLevel(LogLevel.DEBUG);
}

async function main() {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('Game container not found');
  }

  const game = new GameApp(gameConfig);
  await game.boot(container);

  // ─── Decorative elements ─────────────────────────────────
  // Background
  let bg: Sprite | null = null;
  const bgTexture = Assets.get('bg_main');
  if (bgTexture) {
    bg = new Sprite(bgTexture);
    game.layers.game.addChildAt(bg, 0);
  }

  // Dark reel background
  const reelBg = new Graphics();
  game.layers.reels.addChildAt(reelBg, 0);

  // Reel frame (on fx layer — above symbols)
  let frame: Sprite | null = null;
  const frameTexture = Assets.get('reel_frame');
  if (frameTexture) {
    frame = new Sprite(frameTexture);
    game.layers.fx.addChildAt(frame, 0);
  }

  // Game title
  let title: Sprite | null = null;
  const titleTexture = Assets.get('game_title');
  if (titleTexture) {
    title = new Sprite(titleTexture);
    title.anchor.set(0.5);
    game.layers.game.addChild(title);
  }

  // Leprechaun character
  let leprechaun: Sprite | null = null;
  const leprechaunTexture = Assets.get('leprechaun_full');
  if (leprechaunTexture) {
    leprechaun = new Sprite(leprechaunTexture);
    leprechaun.anchor.set(0.5, 1);
    game.layers.game.addChild(leprechaun);
  }

  // ─── Layout callback — repositions everything on resize/orientation ─
  const framePad = 35;

  game.onLayout = (viewport: ViewportInfo, mode: LayoutMode) => {
    const dw = viewport.designWidth;
    const dh = viewport.designHeight;
    const ra = viewport.reelArea;

    // Background — always fill design area
    if (bg) {
      bg.width = dw;
      bg.height = dh;
    }

    // Reel background
    reelBg.clear();
    reelBg.roundRect(ra.x - 5, ra.y - 5, ra.width + 10, ra.height + 10, 6);
    reelBg.fill({ color: 0x050d05, alpha: 0.85 });

    // Frame
    if (frame) {
      frame.width = ra.width + framePad * 2;
      frame.height = ra.height + framePad * 2;
      frame.x = ra.x - framePad;
      frame.y = ra.y - framePad;
    }

    // Title — centered above reels
    if (title) {
      const titleW = mode === 'desktop' ? 550 : dw * 0.55;
      const titleScale = titleW / title.texture.width;
      title.scale.set(titleScale);
      title.x = dw / 2;
      title.y = ra.y - framePad - (mode === 'desktop' ? 50 : 30);
    }

    // Leprechaun
    if (leprechaun) {
      if (mode === 'desktop') {
        leprechaun.visible = true;
        const charHeight = ra.height * 0.85;
        const charScale = charHeight / leprechaun.texture.height;
        leprechaun.scale.set(charScale);
        leprechaun.x = ra.x - framePad - 80;
        leprechaun.y = ra.y + ra.height + 40;
      } else {
        // Portrait: hide leprechaun (or make small above title)
        leprechaun.visible = false;
      }
    }
  };

  // Expose for debugging
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).game = game;
  }
}

main().catch((err) => {
  console.error('Failed to start game:', err);
});
