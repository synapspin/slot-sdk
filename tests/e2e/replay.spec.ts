import { test, expect } from '@playwright/test';

test('record rounds then replay in-game', async ({ page }) => {
  test.setTimeout(60000);

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[ERR] ${msg.text()}`);
  });

  await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => !!(window as any).game?.stateMachine?.currentStateId,
    { timeout: 15000 },
  );

  // Play 3 spins to build history
  for (let i = 0; i < 3; i++) {
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
        setTimeout(() => { clearInterval(check); resolve(); }, 10000);
      });
    });
  }

  // Verify rounds were recorded
  const roundCount = await page.evaluate(() => {
    return (window as any).game.roundRecorder.getRounds().length;
  });
  expect(roundCount).toBe(3);
  console.log(`Recorded ${roundCount} rounds`);

  // Get the first round's data for comparison
  const firstRound = await page.evaluate(() => {
    const rounds = (window as any).game.roundRecorder.getRounds();
    const r = rounds[0];
    return {
      roundId: r.roundId,
      bet: r.player.bet,
      totalWin: r.outcome.totalWin,
      reelResult: r.spinResponse.reelResult,
    };
  });
  console.log(`First round: bet=${firstRound.bet}, win=${firstRound.totalWin}`);

  // Now replay the first round in-game
  const balanceBefore = await page.evaluate(() => (window as any).game['_balance']);

  await page.evaluate(async () => {
    const g = (window as any).game;
    const rounds = g.roundRecorder.getRounds();
    // Play replay of first round
    await g.playReplay(rounds[0]);
  });

  // After replay, balance should be restored to what it was before replay
  const balanceAfter = await page.evaluate(() => (window as any).game['_balance']);
  expect(balanceAfter).toBe(balanceBefore);

  // Game should be back in idle
  const state = await page.evaluate(() => (window as any).game.stateMachine.currentStateId);
  expect(state).toBe('idle');

  // Replay mode should be off
  const replayMode = await page.evaluate(() => (window as any).game.replayMode);
  expect(replayMode).toBe(false);

  console.log('Replay completed successfully, balance restored');

  // Screenshot after replay
  await page.screenshot({ path: '/tmp/slot-after-replay.png', fullPage: true });
});

test('share replay URL and open it', async ({ page, context }) => {
  test.setTimeout(60000);

  await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => !!(window as any).game?.stateMachine?.currentStateId,
    { timeout: 15000 },
  );

  // Play one spin
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
      setTimeout(() => { clearInterval(check); resolve(); }, 10000);
    });
  });

  // Generate replay URL
  const replayUrl = await page.evaluate(() => {
    const g = (window as any).game;
    const rounds = g.roundRecorder.getRounds();
    const { RoundRecorder } = g.constructor; // won't work — use import
    // Use the static method directly
    const record = rounds[0];
    const json = JSON.stringify(record);
    const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
      (_: string, p1: string) => String.fromCharCode(parseInt('0x' + p1, 16)),
    ));
    return window.location.origin + window.location.pathname + '?replay=' + encoded;
  });

  expect(replayUrl).toContain('?replay=');
  console.log(`Replay URL length: ${replayUrl.length} chars`);

  // Open replay URL in new tab
  const replayPage = await context.newPage();
  await replayPage.goto(replayUrl, { waitUntil: 'networkidle' });
  await replayPage.waitForFunction(
    () => !!(window as any).game?.stateMachine?.currentStateId,
    { timeout: 15000 },
  );

  // Verify replay mode is active
  const isReplay = await replayPage.evaluate(() => (window as any).game.replayMode);
  expect(isReplay).toBe(true);

  // Wait for it to reach idle (replay auto-plays)
  await replayPage.waitForFunction(
    () => (window as any).game?.stateMachine?.currentStateId === 'idle',
    { timeout: 15000 },
  );

  await replayPage.screenshot({ path: '/tmp/slot-replay-url.png', fullPage: true });
  await replayPage.close();
});
