import { GAME_WIDTH, GAME_HEIGHT, ARENA_PADDING, WALL_THICKNESS, COLOR_WALL } from './config.js';

export class Arena {
  constructor(context) {
    this.context = context;
    this.walls = this.createWalls();
  }

  createWalls() {
    const left = ARENA_PADDING;
    const right = GAME_WIDTH - ARENA_PADDING;
    const top = ARENA_PADDING;
    const bottom = GAME_HEIGHT - ARENA_PADDING;

    return [
      // Top wall
      { x: left, y: top, width: right - left, height: WALL_THICKNESS },
      // Bottom wall
      { x: left, y: bottom - WALL_THICKNESS, width: right - left, height: WALL_THICKNESS },
      // Left wall
      { x: left, y: top, width: WALL_THICKNESS, height: bottom - top },
      // Right wall
      { x: right - WALL_THICKNESS, y: top, width: WALL_THICKNESS, height: bottom - top }
    ];
  }

  checkCollision(sprite) {
    const spriteLeft = sprite.x - sprite.width / 2;
    const spriteRight = sprite.x + sprite.width / 2;
    const spriteTop = sprite.y - sprite.height / 2;
    const spriteBottom = sprite.y + sprite.height / 2;

    for (let wall of this.walls) {
      const wallLeft = wall.x;
      const wallRight = wall.x + wall.width;
      const wallTop = wall.y;
      const wallBottom = wall.y + wall.height;

      if (spriteRight > wallLeft &&
          spriteLeft < wallRight &&
          spriteBottom > wallTop &&
          spriteTop < wallBottom) {
        return wall;
      }
    }

    return null;
  }

  constrainSprite(sprite) {
    const oldX = sprite.x;
    const oldY = sprite.y;

    const wall = this.checkCollision(sprite);
    if (wall) {
      sprite.x = oldX - sprite.dx * (1 / 60); // Reverse one frame of movement
      sprite.y = oldY - sprite.dy * (1 / 60);

      // Stop movement
      sprite.dx = 0;
      sprite.dy = 0;
    }
  }

  render() {
    this.context.fillStyle = COLOR_WALL;
    for (let wall of this.walls) {
      this.context.fillRect(wall.x, wall.y, wall.width, wall.height);
    }
  }
}
