import { test, expect } from '@playwright/test';

test('preloader shows brand animation then fades to game', async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[ERR] ${msg.text()}`);
  });

  await page.goto('http://127.0.0.1:3333/', { waitUntil: 'commit' });
  await page.waitForSelector('canvas', { timeout: 10000 });

  // Screenshot early — should show preloader
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/slot-preloader-1.png', fullPage: true });

  // Screenshot mid-animation — letters should be visible
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/slot-preloader-2.png', fullPage: true });

  // Wait for game to be fully loaded
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/slot-preloader-done.png', fullPage: true });

  // Verify game is in idle state
  const state = await page.evaluate(() => {
    return (window as any).game?.stateMachine?.currentStateId;
  });
  expect(state).toBe('idle');
});
