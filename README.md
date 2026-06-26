# Tank Battle

A top-down tank battle game built with JavaScript and Kontra.js. Destroy enemy tanks while avoiding their return fire in a walled arena.

## Features

- Player tank with WASD/arrow key movement and mouse aiming
- Three enemy types with distinct colors and behaviors:
  - **Scout** (red): Fast and cautious
  - **Tank** (orange): Aggressive with moderate speed
  - **Heavy** (yellow): Slow but steady
- Health system with brief invulnerability after taking damage
- Score tracking
- Win/lose conditions with restart capability
- Responsive canvas scaling

## Prerequisites

- Node.js (v16 or higher)
- npm

## Installation

```bash
npm install
```

## Running the Game

### Development Server

```bash
npm run dev
```

The game will be available at the local URL Vite prints in the terminal (it picks the first free port, so don't assume a fixed one).

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Run with Docker

No local Node toolchain required — the image builds the production bundle and
serves the static files with nginx.

```bash
# Build the image
docker build -t tank-battle .

# Run it and play at http://localhost:8080
docker run --rm -p 8080:80 tank-battle
```

Or with Docker Compose:

```bash
docker compose up --build
# then open http://localhost:8080
```

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and
pull request. It installs dependencies, provisions Chromium for Playwright
(`npx playwright install --with-deps chromium`), builds the production bundle,
and runs the smoke test headless — so the same assertions you run locally gate
the PR. Smoke-test screenshots are uploaded as a build artifact.

## Controls

- **WASD** or **Arrow keys**: Move tank
- **Mouse**: Aim turret
- **Space** or **Left Click**: Fire
- **R, Space, or Enter**: Restart after game over

## Running Tests

The project includes an automated smoke test using Playwright. It drives the
real game through a small read-only `window.gameDebug` hook (state getters plus
helpers that fire *real* bullets), so every assertion reflects actual game
behavior rather than a logged checkmark:

```bash
npm run test:smoke
```

The smoke test will:
- Start its own dev server on whatever port Vite picks (it parses the port from Vite's output; it does not assume 5173)
- Verify the page loads, the canvas mounts, and the game logs init
- Assert a cold boot lands on the **start screen** (`gameState === 'start'`) and that Space transitions to `playing`
- Assert the initial state is exactly health=3, score=0, enemies=3
- Assert that **hitting an enemy increases the score** and drops the alive-enemy count (fires real bullets aimed at a live enemy's current position)
- Assert that **taking a hit decreases health** (injects a real enemy bullet that must collide via the normal damage path)
- Drive the round to a real end state, then assert **restart resets** to start / health=3 / score=0 / enemies=3
- Surface **all** console / page / network errors — nothing is silently filtered, the favicon 404 is fixed rather than hidden, and the whitelist is empty so a genuine error fails the run
- Capture screenshots (`test-screenshots/`) of the start screen, gameplay, and final state

> Browser resolution: the test uses `$CHROMIUM_PATH` if set, otherwise
> Playwright's bundled Chromium if installed (what CI uses), otherwise the
> system `/usr/bin/chromium`. Override with `CHROMIUM_PATH=/path/to/chrome`.

## Project Structure

```
├── src/
│   ├── main.js          # Game loop and state management
│   ├── config.js        # Game configuration and constants
│   ├── player.js        # Player tank logic
│   ├── enemy.js         # Enemy tank AI and rendering
│   ├── bullet.js        # Bullet pooling and rendering
│   ├── arena.js         # Arena walls and collision detection
│   └── collision.js     # Collision detection helpers
├── index.html           # Game HTML entry point
├── smoke-test.js        # Automated smoke tests
├── Dockerfile           # Multi-stage build -> nginx static serve
├── docker-compose.yml   # `docker compose up` to play locally
├── docker/nginx.conf    # nginx config for the static build
├── .github/workflows/   # CI: build + headless smoke test
└── package.json         # Dependencies and scripts
```

## Technologies

- **Kontra.js**: Lightweight game engine for sprites, input, and game loop
- **Vite**: Fast build tool and dev server
- **Playwright**: Headless browser testing

## License

ISC
