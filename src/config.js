// Game configuration constants
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Arena
export const ARENA_PADDING = 40;
export const WALL_THICKNESS = 10;

// Player tank
export const PLAYER_SIZE = 20;
export const PLAYER_SPEED = 150; // pixels per second
export const PLAYER_ROTATION_SPEED = 3; // radians per second
export const FIRE_COOLDOWN = 0.3; // seconds between shots
export const PLAYER_MAX_HEALTH = 3;

// Bullets
export const BULLET_SPEED = 400; // pixels per second
export const BULLET_SIZE = 4;
export const BULLET_LIFETIME = 3; // seconds
export const BULLET_POOL_SIZE = 50;

// Enemies
export const ENEMY_SIZE = 20;
export const ENEMY_COUNT = 3;
export const ENEMY_SPAWN_MARGIN = 100; // minimum distance from player spawn
export const ENEMY_SPEED = 80; // pixels per second
export const ENEMY_ROTATION_SPEED = 2; // radians per second
export const ENEMY_FIRE_COOLDOWN = 2.0; // seconds between shots
export const ENEMY_FIRE_RANGE = 300; // pixels - only shoot if player is within range
export const ENEMY_WANDER_CHANGE_INTERVAL = 2.0; // seconds - how often to change wander direction

// Enemy types with different stats and colors
export const ENEMY_TYPES = {
  SCOUT: {
    color: '#ff4444',
    turretColor: '#cc2222',
    speed: 100,
    fireCooldown: 2.5,
    fireRange: 250,
    wanderInterval: 1.5,
  },
  TANK: {
    color: '#ff8844',
    turretColor: '#cc5522',
    speed: 60,
    fireCooldown: 1.5,
    fireRange: 350,
    wanderInterval: 3.0,
  },
  HEAVY: {
    color: '#ffaa44',
    turretColor: '#cc7722',
    speed: 50,
    fireCooldown: 1.8,
    fireRange: 300,
    wanderInterval: 2.5,
  }
};

// Colors
export const COLOR_BACKGROUND = '#2a2a2a';
export const COLOR_WALL = '#666';
export const COLOR_PLAYER = '#4a9eff';
export const COLOR_PLAYER_TURRET = '#2e7acc';
export const COLOR_BULLET = '#ffcc00';
export const COLOR_MUZZLE_FLASH = '#ffee88';
export const COLOR_ENEMY = '#ff4444';
export const COLOR_ENEMY_TURRET = '#cc2222';
export const COLOR_HIT_EFFECT = '#ffaa00';
