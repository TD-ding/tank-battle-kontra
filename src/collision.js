import { collides } from 'kontra';

export function checkBulletEnemyCollisions(bulletPool, enemies, onEnemyDestroyed) {
  const bullets = bulletPool.getAliveObjects();

  bullets.forEach(bullet => {
    // Only check player bullets against enemies
    if (bullet.isEnemyBullet) return;

    enemies.forEach(enemy => {
      if (enemy.alive && collides(bullet, enemy)) {
        // Destroy bullet
        bullet.ttl = 0;

        // Hit effect on enemy
        enemy.hitEffect = 0.15;

        // Destroy enemy
        enemy.destroy();

        // Notify score system
        if (onEnemyDestroyed) {
          onEnemyDestroyed();
        }
      }
    });
  });
}

export function checkBulletPlayerCollisions(bulletPool, player) {
  const bullets = bulletPool.getAliveObjects();

  bullets.forEach(bullet => {
    // Only check enemy bullets against player
    if (!bullet.isEnemyBullet) return;

    if (collides(bullet, player)) {
      // Destroy bullet
      bullet.ttl = 0;

      // Apply damage to player
      player.takeDamage();
    }
  });
}
