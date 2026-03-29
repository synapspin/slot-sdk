import { Sprite, Assets, Graphics } from 'pixi.js';
import { GameApp, LogLevel, Logger } from '@lab9191/slot-core';
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

  const reelArea = gameConfig.layout.reelArea;
  const framePad = 35;

  // ─── Background (bottom of game layer) ──────────────────
  const bgTexture = Assets.get('bg_main');
  if (bgTexture) {
    const bg = new Sprite(bgTexture);
    bg.width = 1920;
    bg.height = 1080;
    game.layers.game.addChildAt(bg, 0);
  }

  // ─── Dark reel background (under reelSet) ────────────────
  const reelBg = new Graphics();
  reelBg.roundRect(reelArea.x - 5, reelArea.y - 5, reelArea.width + 10, reelArea.height + 10, 6);
  reelBg.fill({ color: 0x050d05, alpha: 0.85 });
  game.layers.reels.addChildAt(reelBg, 0);

  // ─── Reel Frame OVER symbols (on fx layer, above reelSet) ─
  const frameTexture = Assets.get('reel_frame');
  if (frameTexture) {
    const frame = new Sprite(frameTexture);
    frame.width = reelArea.width + framePad * 2;
    frame.height = reelArea.height + framePad * 2;
    frame.x = reelArea.x - framePad;
    frame.y = reelArea.y - framePad;
    // fx layer renders ABOVE reel layer, so frame overlaps symbol edges
    game.layers.fx.addChildAt(frame, 0);
  }

  // ─── Game Title (above frame, larger) ───────────────────
  const titleTexture = Assets.get('game_title');
  if (titleTexture) {
    const title = new Sprite(titleTexture);
    title.anchor.set(0.5);
    const titleScale = 550 / title.width;
    title.scale.set(titleScale);
    title.x = reelArea.x + reelArea.width / 2;
    // Position above the frame top edge with clear gap
    title.y = reelArea.y - framePad - 50;
    game.layers.game.addChild(title);
  }

  // ─── Leprechaun character left of reels ─────────────────
  const leprechaunTexture = Assets.get('leprechaun_full');
  if (leprechaunTexture) {
    const leprechaun = new Sprite(leprechaunTexture);
    leprechaun.anchor.set(0.5, 1);
    const charHeight = reelArea.height * 0.88;
    const charScale = charHeight / leprechaun.height;
    leprechaun.scale.set(charScale);
    // Position well clear of frame left edge
    const frameLeft = reelArea.x - framePad;
    const charHalfWidth = (leprechaun.width * charScale) / 2;
    leprechaun.x = frameLeft - 80;
    // Feet on the grass, aligned with bottom of reel area
    leprechaun.y = reelArea.y + reelArea.height + 40;
    game.layers.game.addChild(leprechaun);
  }

  // Expose for debugging
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).game = game;
  }
}

main().catch((err) => {
  console.error('Failed to start game:', err);
});
