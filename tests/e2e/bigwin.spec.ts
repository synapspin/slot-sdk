import { test, expect } from '@playwright/test';

test('trigger and screenshot big win celebration', async ({ page }) => {
  test.setTimeout(30000);

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[ERR] ${msg.text()}`);
  });

  await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => !!(window as any).game?.stateMachine?.currentStateId,
    { timeout: 15000 },
  );

  // Force-trigger a big win by temporarily lowering thresholds and faking a response
  await page.evaluate(async () => {
    const g = (window as any).game;

    // Override mock server to guarantee a big win
    const originalSpin = g.config.server.spin.bind(g.config.server);
    g.config.server.spin = async (req: any) => {
      const resp = await originalSpin(req);
      // Force a big payout — 15x bet
      resp.totalWin = req.bet * 15;
      resp.wins = [{
        type: 'line',
        symbolId: 0,
        positions: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
        payout: req.bet * 15,
        multiplier: 1,
        lineIndex: 0,
      }];
      return resp;
    };

    // Trigger spin
    g.eventBus.emit('ui:spinButtonPressed', undefined);
  });

  // Wait for big win state — screenshot during celebration
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/slot-bigwin-1.png', fullPage: true });

  // Wait a bit more for coin shower
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/slot-bigwin-2.png', fullPage: true });

  // Wait for it to finish
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/slot-bigwin-done.png', fullPage: true });

  // Restore and verify game returns to idle
  await page.evaluate(async () => {
    const g = (window as any).game;
    // Wait for idle
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (g.stateMachine.currentStateId === 'idle') {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 10000);
    });
  });

  const state = await page.evaluate(() => (window as any).game.stateMachine.currentStateId);
  expect(state).toBe('idle');
});
