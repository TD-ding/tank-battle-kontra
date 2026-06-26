import { Pool, Sprite } from 'kontra';
import {
  BULLET_SPEED,
  BULLET_SIZE,
  BULLET_LIFETIME,
  BULLET_POOL_SIZE,
  COLOR_BULLET
} from './config.js';

export function createBulletPool() {
  return Pool({
    create: Sprite,
    maxSize: BULLET_POOL_SIZE
  });
}

export function fireBullet(pool, x, y, angle, isEnemyBullet = false) {
  const bullet = pool.get({
    x: x,
    y: y,
    width: BULLET_SIZE,
    height: BULLET_SIZE,
    anchor: { x: 0.5, y: 0.5 },
    dx: Math.cos(angle) * BULLET_SPEED,
    dy: Math.sin(angle) * BULLET_SPEED,
    ttl: BULLET_LIFETIME * 60, // convert seconds to frames (assuming 60fps)
    isEnemyBullet: isEnemyBullet,

    render() {
      // Enemy bullets are slightly different color
      this.context.fillStyle = this.isEnemyBullet ? '#ff8800' : COLOR_BULLET;
      this.context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    }
  });

  return bullet;
}
