import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let devServer = null;
let devServerPort = null;

async function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting dev server...');

    // Run Vite directly via node so we don't depend on the bin shim's +x bit
    // or a shell resolving `vite` on PATH. --host keeps the banner format
    // predictable and binds reliably in CI containers.
    devServer = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: false,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
    });

    let output = '';
    let settled = false;
    // Strip ANSI color codes so the URL regex matches in CI too.
    const stripAnsi = (s) => s.replace(/\[[0-9;]*m/g, '');

    const tryMatch = () => {
      const clean = stripAnsi(output);
      const match = clean.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
      if (match && !settled) {
        settled = true;
        devServerPort = match[1];
        console.log(`Dev server started on port ${devServerPort}`);
        setTimeout(() => resolve(devServerPort), 1500);
      }
    };

    devServer.stdout.on('data', (data) => {
      output += data.toString();
      tryMatch();
    });

    // Vite prints the URL to stdout, but capture stderr too: it's where any
    // startup failure shows up, and we want it surfaced rather than swallowed.
    devServer.stderr.on('data', (data) => {
      const msg = data.toString();
      output += msg;
      if (!msg.includes('DeprecationWarning')) {
        console.error('Dev server stderr:', msg.trim());
      }
      tryMatch();
    });

    devServer.on('exit', (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Dev server exited early (code ${code}). Output:\n${stripAnsi(output)}`));
      }
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Dev server failed to start within 60 seconds. Output so far:\n${stripAnsi(output)}`));
      }
    }, 60000);
  });
}

function stopDevServer() {
  if (devServer) {
    console.log('Stopping dev server...');
    devServer.kill('SIGTERM');
    setTimeout(() => {
      if (devServer) devServer.kill('SIGKILL');
    }, 2000);
    devServer = null;
  }
}

async function smokeTest() {
  console.log('Starting comprehensive smoke test...');
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const port = await startDevServer();
    const baseURL = `http://127.0.0.1:${port}`;

    // Browser resolution order:
    //   1. CHROMIUM_PATH env var (explicit override)
    //   2. Playwright's own bundled Chromium if installed (this is what CI uses
    //      after `npx playwright install chromium`)
    //   3. the system Chromium at /usr/bin/chromium (local sandbox default)
    // Leaving executablePath undefined makes Playwright use its bundled browser.
    let executablePath = process.env.CHROMIUM_PATH;
    if (!executablePath) {
      let bundled;
      try { bundled = chromium.executablePath(); } catch { bundled = null; }
      if (bundled && existsSync(bundled)) {
        executablePath = undefined; // let Playwright resolve its bundled browser
      } else if (existsSync('/usr/bin/chromium')) {
        executablePath = '/usr/bin/chromium';
      }
    }

    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    console.log(`Chromium launched (${executablePath || 'playwright bundled'})`);
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleMessages = [];
    const consoleErrors = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
      console.log(`[${msg.type()}] ${text}`);
    });

    const pageErrors = [];
    page.on('pageerror', err => {
      pageErrors.push(err.message);
      console.error('Page error:', err.message);
    });

    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - ${request.failure().errorText}`);
    });

    console.log('\n=== Test 1: Page loads ===');
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    console.log('\n=== Test 2: Canvas mounted ===');
    const canvas = await page.locator('#game');
    const canvasExists = await canvas.count() > 0;
    if (canvasExists) {
      console.log('✓ Canvas mounted');
      testsPassed++;
    } else {
      console.log('✗ Canvas not found');
      testsFailed++;
    }

    console.log('\n=== Test 3: Game initialization ===');
    const hasInitMessage = consoleMessages.some(m => m.text.includes('Tank Battle game initialized'));
    if (hasInitMessage) {
      console.log('✓ Game initialized');
      testsPassed++;
    } else {
      console.log('✗ Game initialization message not found');
      testsFailed++;
    }

    console.log('\n=== Test 4: Start screen displays on boot ===');
    const initialGameState = await page.evaluate(() => window.gameDebug.getState());
    if (initialGameState === 'start') {
      console.log('✓ Start screen displayed on boot');
      testsPassed++;
    } else {
      console.log(`✗ Expected 'start' state, got '${initialGameState}'`);
      testsFailed++;
    }

    const startScreenshot = join(__dirname, 'test-screenshots', 'start-screen.png');
    await page.screenshot({ path: startScreenshot, fullPage: true });
    console.log(`Screenshot: ${startScreenshot}`);

    console.log('\n=== Test 5: Start button transitions to playing ===');
    await page.keyboard.down('Space');
    await page.waitForTimeout(100);
    await page.keyboard.up('Space');
    await page.waitForTimeout(500);
    const gameStateAfterStart = await page.evaluate(() => window.gameDebug.getState());
    if (gameStateAfterStart === 'playing') {
      console.log('✓ Game transitioned to playing state');
      testsPassed++;
    } else {
      console.log(`✗ Expected 'playing' state, got '${gameStateAfterStart}'`);
      testsFailed++;
    }

    console.log('\n=== Test 6: Initial game state is correct ===');
    const initialHealth = await page.evaluate(() => window.gameDebug.getPlayerHealth());
    const initialScore = await page.evaluate(() => window.gameDebug.getScore());
    const initialEnemies = await page.evaluate(() => window.gameDebug.getEnemyCount());

    if (initialHealth === 3 && initialScore === 0 && initialEnemies === 3) {
      console.log(`✓ Initial state (health=3, score=0, enemies=3)`);
      testsPassed++;
    } else {
      console.log(`✗ State mismatch (health=${initialHealth}, score=${initialScore}, enemies=${initialEnemies})`);
      testsFailed++;
    }

    console.log('\n=== Test 7: Killing an enemy increases score ===');
    // Drive the REAL fire pipeline: aim the turret at a live enemy's current
    // position and fire a real bullet. The bullet must actually travel and
    // collide for the score to move - we never poke the score directly.
    const scoreBeforeKill = await page.evaluate(() => window.gameDebug.getScore());
    const enemiesBeforeKill = await page.evaluate(() => window.gameDebug.getEnemyCount());

    let scoreAfter = scoreBeforeKill;
    let enemiesAfter = enemiesBeforeKill;
    for (let i = 0; i < 80; i++) {
      const result = await page.evaluate(() => {
        const live = window.gameDebug.getAliveEnemies();
        if (live.length === 0) return { score: window.gameDebug.getScore(), enemies: 0 };
        const p = window.gameDebug.getPlayer();
        // Aim at the nearest live enemy's CURRENT position, then fire for real.
        let target = live[0];
        let best = Infinity;
        for (const e of live) {
          const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
          if (d < best) { best = d; target = e; }
        }
        window.gameDebug.aimAt(target.x, target.y);
        window.gameDebug.firePlayer();
        return { score: window.gameDebug.getScore(), enemies: window.gameDebug.getEnemyCount() };
      });
      scoreAfter = result.score;
      enemiesAfter = result.enemies;
      if (scoreAfter > scoreBeforeKill) break;
      await page.waitForTimeout(60);
    }

    if (scoreAfter > scoreBeforeKill && enemiesAfter < enemiesBeforeKill) {
      console.log(`✓ Kill registered: score ${scoreBeforeKill}→${scoreAfter}, enemies ${enemiesBeforeKill}→${enemiesAfter}`);
      testsPassed++;
    } else {
      console.log(`✗ No kill registered: score ${scoreBeforeKill}→${scoreAfter}, enemies ${enemiesBeforeKill}→${enemiesAfter}`);
      testsFailed++;
    }

    const gameplayScreenshot = join(__dirname, 'test-screenshots', 'gameplay.png');
    await page.screenshot({ path: gameplayScreenshot, fullPage: true });
    console.log(`Screenshot: ${gameplayScreenshot}`);

    console.log('\n=== Test 8: Taking a hit decreases health ===');
    const healthBefore = await page.evaluate(() => window.gameDebug.getPlayerHealth());

    // Inject a real enemy bullet aimed at the player and let the normal
    // bullet->player collision apply damage via takeDamage(). The player has
    // ~1s invulnerability after a hit, so one connecting bullet is enough.
    let healthAfterHit = healthBefore;
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => window.gameDebug.fireEnemyBulletAtPlayer());
      await page.waitForTimeout(80);
      healthAfterHit = await page.evaluate(() => window.gameDebug.getPlayerHealth());
      if (healthAfterHit < healthBefore) break;
    }

    if (healthAfterHit < healthBefore) {
      console.log(`✓ Player took damage: health ${healthBefore}→${healthAfterHit}`);
      testsPassed++;
    } else {
      console.log(`✗ Health unchanged: ${healthBefore}`);
      testsFailed++;
    }

    console.log('\n=== Test 9: Restart from game-over resets all state ===');
    // Restart is only offered from a terminal state, so reach one for real:
    // keep firing at live enemies through the normal pipeline until the round
    // ends (win by clearing them, or loss if return fire gets there first).
    let endState = await page.evaluate(() => window.gameDebug.getState());
    for (let i = 0; i < 250 && endState === 'playing'; i++) {
      endState = await page.evaluate(() => {
        const live = window.gameDebug.getAliveEnemies();
        if (live.length > 0) {
          const p = window.gameDebug.getPlayer();
          let target = live[0];
          let best = Infinity;
          for (const e of live) {
            const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
            if (d < best) { best = d; target = e; }
          }
          window.gameDebug.aimAt(target.x, target.y);
          window.gameDebug.firePlayer();
        }
        return window.gameDebug.getState();
      });
      if (endState !== 'playing') break;
      await page.waitForTimeout(50);
    }
    console.log(`Reached terminal state: ${endState}`);

    // Now restart from the game-over overlay and confirm a clean reset.
    await page.keyboard.down('KeyR');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyR');
    await page.waitForTimeout(1000);

    const stateAfterRestart = await page.evaluate(() => window.gameDebug.getState());
    const healthAfterRestart = await page.evaluate(() => window.gameDebug.getPlayerHealth());
    const scoreAfterRestart = await page.evaluate(() => window.gameDebug.getScore());
    const enemiesAfterRestart = await page.evaluate(() => window.gameDebug.getEnemyCount());

    if (stateAfterRestart === 'start' && healthAfterRestart === 3 && scoreAfterRestart === 0 && enemiesAfterRestart === 3) {
      console.log(`✓ Full reset confirmed (state=start, health=3, score=0, enemies=3)`);
      testsPassed++;
    } else {
      console.log(`✗ Reset incomplete (state=${stateAfterRestart}, health=${healthAfterRestart}, score=${scoreAfterRestart}, enemies=${enemiesAfterRestart})`);
      testsFailed++;
    }

    console.log('\n=== Test 10: No unexpected console / page / network errors ===');
    // We do NOT silently drop errors. The favicon 404 is fixed (a real favicon
    // is now served from public/), so nothing needs whitelisting. If a known-
    // benign error ever must be ignored, add it here EXPLICITLY - it is still
    // printed below either way.
    const ERROR_WHITELIST = [
      // intentionally empty - the favicon 404 is fixed, not hidden
    ];
    const isWhitelisted = (text) => ERROR_WHITELIST.some(rx => rx.test(text));

    // Report everything we observed, transparently.
    if (consoleErrors.length > 0) {
      console.log(`Console errors observed (${consoleErrors.length}):`);
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    if (networkErrors.length > 0) {
      console.log(`Network failures observed (${networkErrors.length}):`);
      networkErrors.forEach(err => console.log(`  - ${err}`));
    }

    const realPageErrors = pageErrors.filter(e => !isWhitelisted(e));
    const realConsoleErrors = consoleErrors.filter(e => !isWhitelisted(e));
    const realNetworkErrors = networkErrors.filter(e => !isWhitelisted(e));

    if (realPageErrors.length === 0 && realConsoleErrors.length === 0 && realNetworkErrors.length === 0) {
      console.log('✓ No unexpected errors (nothing whitelisted away)');
      testsPassed++;
    } else {
      console.log(`✗ Unexpected errors: ${realPageErrors.length} page, ${realConsoleErrors.length} console, ${realNetworkErrors.length} network`);
      realPageErrors.forEach(err => console.error(`  page: ${err}`));
      realConsoleErrors.forEach(err => console.error(`  console: ${err}`));
      realNetworkErrors.forEach(err => console.error(`  network: ${err}`));
      testsFailed++;
    }

    const finalScreenshot = join(__dirname, 'test-screenshots', 'final-state.png');
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    console.log(`Screenshot: ${finalScreenshot}`);

    await browser.close();
    stopDevServer();

    const totalTests = testsPassed + testsFailed;
    console.log('\n' + '='.repeat(60));
    console.log('SMOKE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Tests passed: ${testsPassed}/${totalTests}`);
    console.log(`Tests failed: ${testsFailed}/${totalTests}`);
    console.log(`Console messages: ${consoleMessages.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    console.log('='.repeat(60));

    if (testsFailed > 0) {
      console.error('\n✗ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✓ All tests passed');
    }
  } catch (error) {
    console.error('\nSmoke test failed:', error.message);
    stopDevServer();
    process.exit(1);
  }
}

smokeTest().catch(err => {
  console.error('Fatal error:', err.message);
  stopDevServer();
  process.exit(1);
});
