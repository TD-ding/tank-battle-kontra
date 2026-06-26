import { init, initKeys, keyPressed, initPointer, pointerPressed, GameLoop } from 'kontra';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BACKGROUND, ENEMY_COUNT, ARENA_PADDING, PLAYER_MAX_HEALTH } from './config.js';
import { createPlayer } from './player.js';
import { Arena } from './arena.js';
import { createBulletPool, fireBullet } from './bullet.js';
import { createEnemy } from './enemy.js';
import { checkBulletEnemyCollisions, checkBulletPlayerCollisions } from './collision.js';

// Initialize Kontra
const { canvas, context } = init('game');
initKeys();
initPointer();

// Scale canvas to fit window while maintaining aspect ratio
function resizeCanvas() {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const scale = Math.min(
    windowWidth / GAME_WIDTH,
    windowHeight / GAME_HEIGHT
  );

  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let gameState = 'start'; // 'start', 'playing', 'won', 'lost'
let arena, player, bulletPool, enemies, score;

function initGame() {
  // Create game entities
  arena = new Arena(context);
  player = createPlayer(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  bulletPool = createBulletPool();
  enemies = [];
  score = 0;
  // Don't set gameState here - let caller control it

  // Set up player callbacks
  player.onFire = (x, y, angle) => {
    fireBullet(bulletPool, x, y, angle);
  };

  player.onDeath = () => {
    gameState = 'lost';
  };

  // Spawn enemies
  spawnEnemies();
}

function spawnEnemies() {
  const spawnPositions = [
    { x: ARENA_PADDING + 60, y: ARENA_PADDING + 60, type: 'SCOUT' }, // Top-left - fast, cautious
    { x: GAME_WIDTH - ARENA_PADDING - 60, y: ARENA_PADDING + 60, type: 'TANK' }, // Top-right - aggressive
    { x: GAME_WIDTH / 2, y: GAME_HEIGHT - ARENA_PADDING - 60, type: 'HEAVY' } // Bottom-center - slow, steady
  ];

  for (let i = 0; i < ENEMY_COUNT; i++) {
    const spawn = spawnPositions[i];
    const enemy = createEnemy(spawn.x, spawn.y, spawn.type);

    // Give enemy a reference to player for AI
    enemy.playerRef = player;

    // Set up enemy firing callback
    enemy.onFire = (x, y, angle) => {
      fireBullet(bulletPool, x, y, angle, true); // true = enemy bullet
    };

    enemies.push(enemy);
  }
}

// Mouse tracking for turret rotation
let mouseX = GAME_WIDTH / 2;
let mouseY = GAME_HEIGHT / 2;

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = (e.clientY - rect.top) * scaleY;
});

// Initialize game on first transition to 'playing', not on boot
// This ensures the start screen shows first

// Game loop
const loop = GameLoop({
  update: (dt) => {
    if (gameState === 'start') {
      // Initialize game entities on first transition to playing
      if (!player) {
        initGame();
      }
      // Wait for player to start
      if (keyPressed('space') || keyPressed('enter') || pointerPressed('left')) {
        gameState = 'playing';
      }
    } else if (gameState === 'playing') {
      // Update player movement state based on keys
      player.moveUp = keyPressed('w') || keyPressed('arrowup');
      player.moveDown = keyPressed('s') || keyPressed('arrowdown');
      player.moveLeft = keyPressed('a') || keyPressed('arrowleft');
      player.moveRight = keyPressed('d') || keyPressed('arrowright');

      // Fire on space or mouse click
      if (keyPressed('space') || pointerPressed('left')) {
        player.fire();
      }

      // Update turret rotation to point at mouse
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      player.turretRotation = Math.atan2(dy, dx);

      // Update player
      player.update(dt);

      // Check and resolve wall collisions
      arena.constrainSprite(player);

      // Update enemies
      enemies.forEach(enemy => {
        if (enemy.alive) {
          enemy.update(dt);
          // Constrain enemies to arena
          arena.constrainSprite(enemy);
        }
      });

      // Update bullets
      bulletPool.update(dt);

      // Check bullet-wall collisions
      bulletPool.getAliveObjects().forEach(bullet => {
        if (arena.checkCollision(bullet)) {
          bullet.ttl = 0; // Despawn bullet
        }
      });

      // Check bullet-enemy collisions
      checkBulletEnemyCollisions(bulletPool, enemies, () => {
        score += 10;
      });

      // Check bullet-player collisions
      checkBulletPlayerCollisions(bulletPool, player);

      // Check win condition
      const aliveEnemies = enemies.filter(e => e.alive).length;
      if (aliveEnemies === 0) {
        gameState = 'won';
      }
    } else {
      // Game over state - check for restart
      if (keyPressed('r') || keyPressed('enter') || keyPressed('space')) {
        initGame();
        gameState = 'start'; // Go to start screen, not directly to playing
      }
    }
  },
  render: () => {
    // Clear canvas
    context.fillStyle = COLOR_BACKGROUND;
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Only render game entities if they exist (after first init)
    if (arena && player) {
      // Render arena
      arena.render();

      // Render bullets
      if (bulletPool) bulletPool.render();

      // Render enemies
      if (enemies) {
        enemies.forEach(enemy => {
          if (enemy.alive) {
            enemy.render();
          }
        });
      }

      // Render player
      if (player.health > 0) {
        player.render();
      }
    }

    // Render HUD (only during gameplay)
    if (gameState === 'playing') {
      context.fillStyle = '#ffffff';
      context.font = '20px monospace';
      context.textAlign = 'left';
      context.fillText(`Score: ${score}`, 10, 25);
      context.fillText(`Health: ${player.health}`, 10, 50);
    }

    // Render start screen
    if (gameState === 'start') {
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      context.fillStyle = '#4a9eff';
      context.font = 'bold 56px monospace';
      context.textAlign = 'center';
      context.fillText('TANK BATTLE', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80);

      context.fillStyle = '#ffffff';
      context.font = '20px monospace';
      context.fillText('WASD or Arrow keys to move', GAME_WIDTH / 2, GAME_HEIGHT / 2);
      context.fillText('Mouse to aim', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
      context.fillText('Space or Click to fire', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);

      context.font = 'bold 24px monospace';
      context.fillStyle = '#4aff4a';
      context.fillText('Press SPACE or ENTER to start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110);
    }

    // Render game over overlay
    if (gameState === 'won' || gameState === 'lost') {
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      context.fillStyle = '#ffffff';
      context.font = 'bold 48px monospace';
      context.textAlign = 'center';

      if (gameState === 'won') {
        context.fillStyle = '#4aff4a';
        context.fillText('VICTORY!', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
      } else {
        context.fillStyle = '#ff4444';
        context.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);
      }

      context.fillStyle = '#ffffff';
      context.font = '24px monospace';
      context.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
      context.font = '20px monospace';
      context.fillText('Press R, SPACE, or ENTER to restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
    }
  }
});

loop.start();

// Expose debug API for testing.
//
// These hooks let the smoke test READ real state and DRIVE the real game
// pipelines. They never set score/health directly: firePlayer() fires a real
// bullet that must actually collide with an enemy for the score to move, and
// fireEnemyBulletAtPlayer() injects a real enemy bullet that must actually
// collide with the player for health to drop (damage is applied by the normal
// collision -> takeDamage path in the game loop).
window.gameDebug = {
  getState: () => gameState,
  getScore: () => score,
  getPlayerHealth: () => (player ? player.health : 0),
  getEnemyCount: () => (enemies ? enemies.filter(e => e.alive).length : 0),
  getPlayer: () => (player ? { x: player.x, y: player.y, health: player.health } : null),
  getAliveEnemies: () =>
    (enemies
      ? enemies.filter(e => e.alive).map(e => ({ x: e.x, y: e.y, type: e.typeName }))
      : []),

  // Point the player's turret at a world coordinate (the same turretRotation
  // that fire() uses to launch the bullet).
  aimAt: (x, y) => {
    if (player) player.turretRotation = Math.atan2(y - player.y, x - player.x);
  },

  // Fire a real player bullet through the normal fire path. Clearing the
  // cooldown only lets us fire on demand; the shot still has to travel and hit.
  firePlayer: () => {
    if (player) {
      player.fireCooldown = 0;
      player.fire();
    }
  },

  // Inject a real enemy bullet just off the player, aimed straight at it. The
  // bullet enters the live pool and damage is applied only if the normal
  // bullet->player collision actually connects.
  fireEnemyBulletAtPlayer: () => {
    if (player && bulletPool) {
      fireBullet(bulletPool, player.x - 60, player.y, 0, true);
    }
  }
};

console.log('Tank Battle game initialized');
console.log(`Canvas: ${GAME_WIDTH}x${GAME_HEIGHT}`);
console.log('Controls: WASD or Arrow keys to move, mouse to aim, Space or Click to fire');
