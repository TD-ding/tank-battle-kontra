import { Sprite } from 'kontra';
import {
  ENEMY_SIZE,
  ENEMY_TYPES,
  COLOR_HIT_EFFECT,
  COLOR_MUZZLE_FLASH
} from './config.js';

export function createEnemy(x, y, type = 'SCOUT') {
  const enemyType = ENEMY_TYPES[type];

  const enemy = Sprite({
    x: x,
    y: y,
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    anchor: { x: 0.5, y: 0.5 },
    rotation: Math.random() * Math.PI * 2,
    turretRotation: 0,
    alive: true,
    hitEffect: 0,
    muzzleFlash: 0,
    fireCooldown: Math.random() * enemyType.fireCooldown, // Stagger initial shots
    wanderTimer: 0,
    wanderDirection: Math.random() * Math.PI * 2,
    playerRef: null,
    onFire: null,

    // Type-specific properties
    enemyType: enemyType,
    typeName: type,

    update(dt) {
      if (!this.alive) return;

      // Update timers
      if (this.hitEffect > 0) this.hitEffect -= dt;
      if (this.muzzleFlash > 0) this.muzzleFlash -= dt;
      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      this.wanderTimer -= dt;

      // Change wander direction periodically
      if (this.wanderTimer <= 0) {
        this.wanderTimer = this.enemyType.wanderInterval;
        this.wanderDirection = Math.random() * Math.PI * 2;
      }

      if (this.playerRef && this.playerRef.health > 0) {
        // Calculate direction to player
        const dx = this.playerRef.x - this.x;
        const dy = this.playerRef.y - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dy, dx);

        // Point turret at player
        this.turretRotation = angleToPlayer;

        // Move in wander direction but bias slightly toward player
        const moveAngle = this.wanderDirection * 0.7 + angleToPlayer * 0.3;
        this.dx = Math.cos(moveAngle) * this.enemyType.speed;
        this.dy = Math.sin(moveAngle) * this.enemyType.speed;

        // Rotate body toward movement direction
        this.rotation = moveAngle;

        // Fire at player if in range and cooldown ready
        if (distanceToPlayer < this.enemyType.fireRange && this.fireCooldown <= 0 && this.onFire) {
          this.fire();
        }
      } else {
        // No player reference - just wander
        this.dx = Math.cos(this.wanderDirection) * this.enemyType.speed * 0.5;
        this.dy = Math.sin(this.wanderDirection) * this.enemyType.speed * 0.5;
        this.rotation = this.wanderDirection;
      }

      // Apply movement
      this.advance(dt);
    },

    fire() {
      if (this.fireCooldown <= 0 && this.onFire) {
        const turretLength = this.width * 0.7;
        const spawnX = this.x + Math.cos(this.turretRotation) * turretLength;
        const spawnY = this.y + Math.sin(this.turretRotation) * turretLength;

        this.onFire(spawnX, spawnY, this.turretRotation);
        this.fireCooldown = this.enemyType.fireCooldown;
        this.muzzleFlash = 0.1;
      }
    },

    destroy() {
      this.alive = false;
      this.ttl = 0;
    },

    render() {
      if (!this.alive) return;

      const ctx = this.context;
      ctx.save();

      // Hit effect - flash white
      if (this.hitEffect > 0) {
        ctx.fillStyle = COLOR_HIT_EFFECT;
        ctx.fillRect(-this.width / 2 - 2, -this.height / 2 - 2, this.width + 4, this.height + 4);
      }

      // Draw tank body
      ctx.fillStyle = this.enemyType.color;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

      // Draw turret
      ctx.save();
      ctx.rotate(this.turretRotation - this.rotation);
      ctx.fillStyle = this.enemyType.turretColor;
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

  return enemy;
}
