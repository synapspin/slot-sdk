import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('landscape mode (1280x720)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/slot-landscape.png', fullPage: true });

    const mode = await page.evaluate(() => {
      return (window as any).game?.responsiveManager?.mode;
    });
    expect(mode).toBe('desktop');
  });

  test('portrait mode (414x896 - iPhone XR)', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/slot-portrait.png', fullPage: true });

    const info = await page.evaluate(() => {
      const g = (window as any).game;
      return {
        mode: g?.responsiveManager?.mode,
        designW: g?.responsiveManager?.viewport?.designWidth,
        designH: g?.responsiveManager?.viewport?.designHeight,
        state: g?.stateMachine?.currentStateId,
      };
    });
    expect(info.mode).toBe('mobile');
    expect(info.designW).toBe(1080);
    expect(info.designH).toBe(1920);
    expect(info.state).toBe('idle');
  });

  test('portrait spin works', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(async () => {
      const g = (window as any).game;
      const prevBalance = g['_balance'];
      g.eventBus.emit('ui:spinButtonPressed', undefined);
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (g.stateMachine.currentStateId === 'idle') {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 10000);
      });
      return {
        state: g.stateMachine.currentStateId,
        balanceChanged: g['_balance'] !== prevBalance,
      };
    });
    expect(result.state).toBe('idle');
    expect(result.balanceChanged).toBe(true);

    await page.screenshot({ path: '/tmp/slot-portrait-after-spin.png', fullPage: true });
  });
});
