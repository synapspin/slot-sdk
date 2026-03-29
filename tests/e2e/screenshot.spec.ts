import { test } from '@playwright/test';

test('take screenshots for debugging', async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[ERR] ${msg.text()}`);
    if (msg.type() === 'info') console.log(`[INFO] ${msg.text()}`);
  });

  await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(3000);

  // Screenshot idle state
  await page.screenshot({ path: '/tmp/slot-idle.png', fullPage: true });

  // Trigger a spin and wait for it to complete, then screenshot
  await page.evaluate(async () => {
    const g = (window as any).game;
    g.eventBus.emit('ui:spinButtonPressed', undefined);
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (g.stateMachine.currentStateId === 'idle') {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 15000);
    });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/slot-after-spin.png', fullPage: true });

  // Also dump some debug info
  const debugInfo = await page.evaluate(() => {
    const g = (window as any).game;
    const rs = g.reelSet;
    return {
      reelSetPos: { x: rs.x, y: rs.y },
      reelSetSize: { w: rs.totalWidth, h: rs.totalHeight },
      gameContainerScale: { x: g.layers.game.scale.x, y: g.layers.game.scale.y },
      gameContainerPos: { x: g.layers.game.x, y: g.layers.game.y },
      canvasSize: { w: g.app.canvas.width, h: g.app.canvas.height },
      reelCount: rs.cols,
      rowCount: rs.rows,
      reel0: {
        x: rs.getReel(0).x,
        y: rs.getReel(0).y,
        visibleRows: rs.getReel(0).visibleRows,
      },
      reel0SymPositions: Array.from({ length: 3 }, (_, i) => {
        const sym = rs.getReel(0).getSymbolAt(i);
        return sym ? { x: sym.x, y: sym.y, gx: sym.getGlobalPosition().x, gy: sym.getGlobalPosition().y } : null;
      }),
    };
  });
  console.log('DEBUG:', JSON.stringify(debugInfo, null, 2));
});
