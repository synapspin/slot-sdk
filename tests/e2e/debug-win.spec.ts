import { test } from '@playwright/test';

test('screenshot during win animation', async ({ page }) => {
  test.setTimeout(60000);

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[ERR] ${msg.text()}`);
  });

  await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(3000);

  // Keep spinning until we catch a win presentation
  let captured = false;
  for (let attempt = 0; attempt < 40 && !captured; attempt++) {
    // Set up a flag that win presentation will set
    await page.evaluate(() => {
      const g = (window as any).game;
      (window as any).__winCaptured = false;
      (window as any).__winSymbolState = null;
      g.eventBus.on('win:linePresented', () => {
        (window as any).__winCaptured = true;
        // Capture symbol debug info
        const rs = g.reelSet;
        const syms: any[] = [];
        for (let c = 0; c < 5; c++) {
          for (let r = 0; r < 3; r++) {
            const sym = rs.getSymbolAt(c, r);
            if (sym) {
              const sprite = sym.children?.[0];
              syms.push({
                col: c, row: r,
                symX: sym.x, symY: sym.y,
                symScaleX: sym.scale?.x, symScaleY: sym.scale?.y,
                alpha: sym.alpha,
                spriteScaleX: sprite?.scale?.x, spriteScaleY: sprite?.scale?.y,
                spriteW: sprite?.width, spriteH: sprite?.height,
              });
            }
          }
        }
        (window as any).__winSymbolState = syms;
      });
    });

    // Fire spin
    await page.evaluate(() => {
      (window as any).game.eventBus.emit('ui:spinButtonPressed', undefined);
    });

    // Poll for win or idle
    for (let i = 0; i < 80; i++) {
      await page.waitForTimeout(100);
      const state = await page.evaluate(() => ({
        winCaptured: (window as any).__winCaptured,
        currentState: (window as any).game.stateMachine.currentStateId,
      }));

      if (state.winCaptured) {
        await page.screenshot({ path: '/tmp/slot-win-active.png', fullPage: true });
        const debug = await page.evaluate(() => (window as any).__winSymbolState);
        console.log(`Win captured on attempt ${attempt + 1}!`);
        console.log('Symbol states:', JSON.stringify(debug, null, 2));
        captured = true;
        break;
      }
      if (state.currentState === 'idle') {
        break; // No win this spin
      }
    }

    if (!captured) {
      // Wait for idle before next attempt
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if ((window as any).game.stateMachine.currentStateId === 'idle') {
              clearInterval(check);
              resolve();
            }
          }, 100);
          setTimeout(() => { clearInterval(check); resolve(); }, 5000);
        });
      });
    }
  }

  // Wait for everything to settle and take final screenshot
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if ((window as any).game.stateMachine.currentStateId === 'idle') {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 10000);
    });
  });
  await page.screenshot({ path: '/tmp/slot-after-win.png', fullPage: true });
});
