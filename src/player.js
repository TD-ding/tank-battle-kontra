import { Sprite } from 'kontra';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SIZE,
  PLAYER_SPEED,
  FIRE_COOLDOWN,
  PLAYER_MAX_HEALTH,
  COLOR_PLAYER,
  COLOR_PLAYER_TURRET,
  COLOR_MUZZLE_FLASH,
  COLOR_HIT_EFFECT
} from './config.js';

export function createPlayer(x, y) {
  const player = Sprite({
    x: x,
    y: y,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    anchor: { x: 0.5, y: 0.5 },
    rotation: 0,
    dx: 0,
    dy: 0,

    // Custom properties
    turretRotation: 0,
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
    fireCooldown: 0,
    muzzleFlash: 0,
    health: PLAYER_MAX_HEALTH,
    hitEffect: 0,
    invulnerable: 0, // Brief invulnerability after hit
    onFire: null, // Callback for firing bullets
    onDeath: null, // Callback for player death

    update(dt) {
      // Update cooldowns
      if (this.fireCooldown > 0) {
        this.fireCooldown -= dt;
      }
      if (this.muzzleFlash > 0) {
        this.muzzleFlash -= dt;
      }
      if (this.hitEffect > 0) {
        this.hitEffect -= dt;
      }
      if (this.invulnerable > 0) {
        this.invulnerable -= dt;
      }

      // Movement based on key states
      let moveX = 0;
      let moveY = 0;

      if (this.moveUp) moveY -= 1;
      if (this.moveDown) moveY += 1;
      if (this.moveLeft) moveX -= 1;
      if (this.moveRight) moveX += 1;

      // Normalize diagonal movement
      if (moveX !== 0 && moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;
      }

      this.dx = moveX * PLAYER_SPEED;
      this.dy = moveY * PLAYER_SPEED;

      // Apply movement
      this.advance(dt);

      // Body rotation follows movement direction
      if (moveX !== 0 || moveY !== 0) {
        this.rotation = Math.atan2(moveY, moveX);
      }
    },

    takeDamage() {
      if (this.invulnerable > 0) return;

      this.health -= 1;
      this.hitEffect = 0.2;
      this.invulnerable = 1.0; // 1 second invulnerability

      if (this.health <= 0 && this.onDeath) {
        this.onDeath();
      }
    },

    fire() {
      if (this.fireCooldown <= 0 && this.onFire) {
        // Calculate bullet spawn position at turret tip
        const turretLength = this.width * 0.7;
        const spawnX = this.x + Math.cos(this.turretRotation) * turretLength;
        const spawnY = this.y + Math.sin(this.turretRotation) * turretLength;

        this.onFire(spawnX, spawnY, this.turretRotation);
        this.fireCooldown = FIRE_COOLDOWN;
        this.muzzleFlash = 0.1; // 100ms flash
      }
    },

    render() {
      const ctx = this.context;
      ctx.save();

      // Hit effect - flash
      if (this.hitEffect > 0) {
        ctx.fillStyle = COLOR_HIT_EFFECT;
        ctx.fillRect(-this.width / 2 - 2, -this.height / 2 - 2, this.width + 4, this.height + 4);
      }

      // Invulnerability flicker
      if (this.invulnerable > 0 && Math.floor(this.invulnerable * 20) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      // Draw tank body (rectangle)
      ctx.fillStyle = COLOR_PLAYER;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

      // Draw turret (smaller rectangle pointing toward mouse)
      ctx.save();
      ctx.rotate(this.turretRotation - this.rotation);
      ctx.fillStyle = COLOR_PLAYER_TURRET;
      ctx.fillRect(0, -this.height / 4, this.width * 0.7, this.height / 2);

      // Draw muzzle flash
      if (this.muzzleFlash > 0) {
        ctx.fillStyle = COLOR_MUZZLE_FLASH;
        ctx.fillRect(this.width * 0.7, -this.height / 6, this.width * 0.3, this.height / 3);
      }

      ctx.restore();

      ctx.restore();
    }
  });

  return player;
}
