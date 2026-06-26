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

> Note: the test launches Chromium from `/usr/bin/chromium`. If your Playwright
> browser lives elsewhere, adjust `executablePath` in `smoke-test.js` (or remove
> it to use Playwright's bundled download).

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
└── package.json         # Dependencies and scripts
```

## Technologies

- **Kontra.js**: Lightweight game engine for sprites, input, and game loop
- **Vite**: Fast build tool and dev server
- **Playwright**: Headless browser testing

## License

ISC
