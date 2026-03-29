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
  let bg: Sprite | null = null;
  const bgTexture = Assets.get('bg_main');
  if (bgTexture) {
    bg = new Sprite(bgTexture);
    // Set initial size immediately so it's correct when preloader fades
    bg.width = gameConfig.layout.designWidth;
    bg.height = gameConfig.layout.designHeight;
    game.layers.game.addChildAt(bg, 0);
  }

  const framePad = 35;
  const ra = gameConfig.layout.reelArea;

  // Dark reel background
  const reelBg = new Graphics();
  reelBg.roundRect(ra.x - 5, ra.y - 5, ra.width + 10, ra.height + 10, 6);
  reelBg.fill({ color: 0x050d05, alpha: 0.85 });
  game.layers.reels.addChildAt(reelBg, 0);

  // Reel frame — positioned immediately
  let frame: Sprite | null = null;
  const frameTexture = Assets.get('reel_frame');
  if (frameTexture) {
    frame = new Sprite(frameTexture);
    frame.width = ra.width + framePad * 2;
    frame.height = ra.height + framePad * 2;
    frame.x = ra.x - framePad;
    frame.y = ra.y - framePad;
    game.layers.fx.addChildAt(frame, 0);
  }

  // Title — positioned immediately
  let title: Sprite | null = null;
  const titleTexture = Assets.get('game_title');
  if (titleTexture) {
    title = new Sprite(titleTexture);
    title.anchor.set(0.5);
    const titleScale = 550 / title.texture.width;
    title.scale.set(titleScale);
    title.x = gameConfig.layout.designWidth / 2;
    title.y = ra.y - framePad - 50;
    game.layers.game.addChild(title);
  }

  // Leprechaun — positioned immediately
  let leprechaun: Sprite | null = null;
  const leprechaunTexture = Assets.get('leprechaun_full');
  if (leprechaunTexture) {
    leprechaun = new Sprite(leprechaunTexture);
    leprechaun.anchor.set(0.5, 1);
    const charHeight = ra.height * 0.85;
    const charScale = charHeight / leprechaun.texture.height;
    leprechaun.scale.set(charScale);
    leprechaun.x = ra.x - framePad - 80;
    leprechaun.y = ra.y + ra.height + 40;
    game.layers.game.addChild(leprechaun);
  }

  // ─── Layout ──────────────────────────────────────────────
  const doLayout = (viewport: ViewportInfo, mode: LayoutMode) => {
    const dw = viewport.designWidth;
    const dh = viewport.designHeight;
    const ra = viewport.reelArea;

    // Background — cover design area (crop, don't stretch)
    if (bg) {
      const bgAspect = bg.texture.width / bg.texture.height;
      const designAspect = dw / dh;

      if (designAspect > bgAspect) {
        // Design is wider — fit width, crop height
        bg.width = dw;
        bg.height = dw / bgAspect;
      } else {
        // Design is taller — fit height, crop width
        bg.height = dh;
        bg.width = dh * bgAspect;
      }
      // Center
      bg.x = (dw - bg.width) / 2;
      bg.y = (dh - bg.height) / 2;
    }

    // Dark reel background
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

    // Title
    if (title) {
      if (mode === 'desktop') {
        title.visible = true;
        const titleScale = 550 / title.texture.width;
        title.scale.set(titleScale);
        title.x = dw / 2;
        title.y = ra.y - framePad - 50;
      } else {
        title.visible = true;
        const titleScale = (dw * 0.5) / title.texture.width;
        title.scale.set(titleScale);
        title.x = dw / 2;
        title.y = ra.y - framePad - 25;
      }
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
        leprechaun.visible = false;
      }
    }
  };

  game.onLayout = doLayout;
  doLayout(game.responsiveManager.viewport, game.responsiveManager.mode);

  // Everything is built — now fade out the preloader
  await game.hidePreloader();

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).game = game;
  }
}

main().catch((err) => {
  console.error('Failed to start game:', err);
});
