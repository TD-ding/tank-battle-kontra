# Tank Battle — Project Status & Handoff

Status: **shipped.** The game, smoke test, CI, and Docker path are all merged to
`main` and CI is green. This note is for the next person picking it up.

## What this is

A small top-down tank battle game (Kontra.js + Vite, shapes-only rendering).
Drive a tank around a walled arena and clear out three enemy archetypes
(Scout / Tank / Heavy) before their return fire wears down your 3 health.
Boots to a title screen; SPACE starts a round; win by clearing all enemies,
lose at 0 health, restart with R/SPACE/ENTER.

## How to run

```bash
npm install
npm run dev      # play at the URL Vite prints (port is not fixed)
npm run build    # production bundle -> dist/
npm run preview  # serve the built bundle locally
npm run test:smoke   # headless Playwright smoke test (starts its own dev server)
```

### Docker (no local Node toolchain)

```bash
docker build -t tank-battle .
docker run --rm -p 8080:80 tank-battle      # http://localhost:8080
# or:
docker compose up --build                   # http://localhost:8080
```

Multi-stage build: stage 1 builds the Vite bundle on `node:20-alpine`,
stage 2 serves the static `dist/` with nginx (`docker/nginx.conf`).

## CI & merge gating

- **Workflow:** `.github/workflows/ci.yml`, job `build-and-smoke`, on every push
  and pull request. Steps: `npm ci` → `npx playwright install --with-deps
  chromium` → `npm run build` → `npm run test:smoke`. Smoke-test screenshots are
  uploaded as a build artifact (`smoke-test-screenshots`).
- **What it gates:** `main` has branch protection requiring the `build-and-smoke`
  check to pass, with **strict** mode (branch must be up to date before merge)
  and **enforce_admins enabled** — so the required check cannot be bypassed, even
  by admins. (PR #1 merged before its check finished because protection wasn't in
  place yet; it is now.)
- **Auto-merge:** the repo has `allow_auto_merge` and `delete_branch_on_merge`
  enabled. Open a PR, then `gh pr merge <n> --auto --squash`; GitHub merges it
  automatically once `build-and-smoke` is green and deletes the branch. Proven on
  PR #2.

### Standard change flow

```bash
git checkout -b fix/your-change
# ...edit, then verify locally...
npm run test:smoke
git push -u origin fix/your-change
gh pr create --base main --fill
gh pr merge <n> --auto --squash      # merges itself when CI is green
```

## The smoke test (what it actually proves)

`smoke-test.js` starts its own Vite server and drives the **real** game through a
small read-only `window.gameDebug` hook (state getters + helpers that fire *real*
bullets — it never pokes score/health directly). It asserts:

1. page loads, canvas mounts, game logs init
2. cold boot lands on the start screen (`gameState === 'start'`)
3. SPACE transitions to `playing`
4. initial round state is exactly health=3 / score=0 / enemies=3 (sampled on the
   start screen, before combat, to avoid a CI race)
5. hitting an enemy **raises** the score and drops the alive count
6. taking a hit **lowers** health
7. restart from a real game-over **resets** to initial state
8. all console / page / network errors are surfaced (favicon 404 is fixed, not
   filtered; the whitelist is empty)

Browser resolution: `$CHROMIUM_PATH` → Playwright's bundled Chromium (CI) →
system `/usr/bin/chromium` (local).

## Known deferred items (backlog)

These are intentionally **not** done — captured here so they aren't lost:

1. **Frame-rate coupling.** `arena.js` `constrainSprite()` rewinds movement with a
   hard-coded `1/60` (`src/arena.js:56-57`), and bullet lifetime is counted in
   frames (`BULLET_LIFETIME * 60`, `src/bullet.js`). Movement/aim use real `dt`,
   but these two spots assume 60fps. On a non-60Hz display, wall pushback distance
   and bullet range drift. Fix: thread the real `dt` into `constrainSprite` and
   express bullet TTL in seconds.
2. **Axis-separated wall slide.** `constrainSprite()` zeroes *both* `dx` and `dy`
   on any wall contact, so sliding along a wall dead-stops instead of gliding.
   Fix: resolve X and Y collisions independently (test each axis separately and
   only cancel the blocked component).
3. **Win/loss same-frame tie-break.** In the loop, the lose path
   (`player.onDeath` → `gameState='lost'`) and the win check (all enemies cleared
   → `'won'`) can both be reachable on the frame where the final enemy and the
   player die together; current ordering lets one silently win. Fix: decide an
   explicit precedence (e.g. survival/last-hit wins) and assert it.

None block play or CI; they're feel/correctness polish for a future pass.

## Repo map

```
src/             game source (main loop, config, player, enemy, bullet, arena, collision)
index.html       canvas shell + scale-to-fit CSS
public/favicon.svg
smoke-test.js    Playwright smoke test
.github/workflows/ci.yml
Dockerfile, docker-compose.yml, docker/nginx.conf
README.md, HANDOFF.md
```
