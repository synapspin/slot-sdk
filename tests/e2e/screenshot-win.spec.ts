import { test } from '@playwright/test';

test('screenshot during win presentation', async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[ERR] ${msg.text()}`);
  });

  await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Keep spinning until we get a win
  let attempt = 0;
  let gotWin = false;
  while (attempt < 30 && !gotWin) {
    attempt++;
    const result = await page.evaluate(async () => {
      const g = (window as any).game;
      g.eventBus.emit('ui:spinButtonPressed', undefined);

      // Wait for evaluate state or idle
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          const state = g.stateMachine.currentStateId;
          if (state === 'idle') {
            clearInterval(check);
            resolve();
          }
        }, 50);
        setTimeout(() => { clearInterval(check); resolve(); }, 10000);
      });

      return {
        totalWin: g['_lastResponse']?.totalWin ?? 0,
        winsCount: g['_lastResponse']?.wins?.length ?? 0,
        state: g.stateMachine.currentStateId,
      };
    });

    if (result.totalWin > 0) {
      gotWin = true;
      console.log(`Win found on attempt ${attempt}: totalWin=${result.totalWin}, wins=${result.winsCount}`);
    }
  }

  // Take screenshot of the final state showing the win
  await page.screenshot({ path: '/tmp/slot-win.png', fullPage: true });

  // Now also check the win line is drawn correctly by triggering a spin
  // and taking screenshot during win presentation
  await page.evaluate(async () => {
    const g = (window as any).game;

    // Force a win by manipulating mock response
    // Spin and capture during winPresentation state
    return new Promise<void>((resolve) => {
      g.eventBus.once('state:entered', (payload: any) => {
        if (payload.state === 'winPresentation') {
          setTimeout(resolve, 500); // capture mid-presentation
        }
      });
      g.eventBus.once('state:entered', (payload: any) => {
        if (payload.state === 'evaluate') {
          // If goes straight to featureCheck, resolve
        }
      });
      g.eventBus.emit('ui:spinButtonPressed', undefined);

      // Safety timeout
      setTimeout(resolve, 8000);
    });
  });

  await page.screenshot({ path: '/tmp/slot-win-presentation.png', fullPage: true });

  // Dump win info
  const winInfo = await page.evaluate(() => {
    const g = (window as any).game;
    const resp = g['_lastResponse'];
    return {
      totalWin: resp?.totalWin,
      wins: resp?.wins?.map((w: any) => ({
        type: w.type,
        symbolId: w.symbolId,
        positions: w.positions,
        payout: w.payout,
      })),
      state: g.stateMachine.currentStateId,
    };
  });
  console.log('WIN INFO:', JSON.stringify(winInfo, null, 2));
});
