import { test, expect } from '@playwright/test';

test.describe('Book of Gold - Slot Game', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[BROWSER ERROR] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err) => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });

    await page.goto('http://127.0.0.1:3333/', { waitUntil: 'networkidle' });
  });

  test('game loads and creates a canvas', async ({ page }) => {
    // Wait for canvas to appear
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Canvas should have non-zero dimensions
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('game initializes and reaches idle state', async ({ page }) => {
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Wait for game to be ready
    const stateId = await page.evaluate(async () => {
      // Wait for game.ready
      const game = (window as any).game;
      if (!game) {
        // Wait a bit more
        await new Promise((r) => setTimeout(r, 2000));
      }
      const g = (window as any).game;
      return g?.stateMachine?.currentStateId ?? 'not-found';
    });

    expect(stateId).toBe('idle');
  });

  test('game has correct initial balance and bet', async ({ page }) => {
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const state = await page.evaluate(() => {
      const g = (window as any).game;
      if (!g) return null;
      return {
        balance: g['_balance'],
        bet: g['_currentBet'],
        currency: g['_currency'],
        betLevels: g['_betLevels'],
      };
    });

    expect(state).toBeTruthy();
    expect(state!.balance).toBe(100000); // $1000.00
    expect(state!.bet).toBe(100); // $1.00
    expect(state!.currency).toBe('USD');
    expect(state!.betLevels).toHaveLength(10);
  });

  test('spin button click triggers a spin and returns to idle', async ({ page }) => {
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Trigger spin via event bus (more reliable than clicking canvas coordinates)
    const result = await page.evaluate(async () => {
      const g = (window as any).game;
      if (!g) return { error: 'game not found' };

      const prevBalance = g['_balance'];

      // Trigger spin
      g.eventBus.emit('ui:spinButtonPressed', undefined);

      // Wait for spin to complete and return to idle
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (g.stateMachine.currentStateId === 'idle') {
            clearInterval(check);
            resolve();
          }
        }, 100);
        // Safety timeout
        setTimeout(() => {
          clearInterval(check);
          resolve();
        }, 10000);
      });

      return {
        finalState: g.stateMachine.currentStateId,
        balanceChanged: g['_balance'] !== prevBalance,
        hasLastResponse: g['_lastResponse'] !== null,
      };
    });

    expect(result.finalState).toBe('idle');
    expect(result.hasLastResponse).toBe(true);
  });

  test('auto play starts and runs multiple spins', async ({ page }) => {
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const result = await page.evaluate(async () => {
      const g = (window as any).game;
      if (!g) return { error: 'game not found' };

      // Start auto play with 3 spins
      g.eventBus.emit('ui:autoPlayStarted', {
        spins: 3,
        stopOnFeature: true,
      });

      // Wait for auto play to finish
      await new Promise<void>((resolve) => {
        let checks = 0;
        const check = setInterval(() => {
          checks++;
          if (g['_autoPlayRemaining'] === 0 && g.stateMachine.currentStateId === 'idle' && checks > 10) {
            clearInterval(check);
            resolve();
          }
          if (checks > 200) { // 20 second safety
            clearInterval(check);
            resolve();
          }
        }, 100);
      });

      return {
        finalState: g.stateMachine.currentStateId,
        autoPlayRemaining: g['_autoPlayRemaining'],
      };
    });

    expect(result.finalState).toBe('idle');
    expect(result.autoPlayRemaining).toBe(0);
  });

  test('no uncaught errors in console during full game cycle', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Run 2 spins
    await page.evaluate(async () => {
      const g = (window as any).game;
      for (let i = 0; i < 2; i++) {
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
      }
    });

    // Filter out sound loading errors (expected since no MP3 files)
    const realErrors = errors.filter(
      (e) => !e.includes('sound') && !e.includes('Howler') && !e.includes('audio'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
