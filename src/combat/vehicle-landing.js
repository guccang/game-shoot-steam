// 特殊通行载具下车使用步战碰撞，循环地图始终选择附近镜像。
import { blocked } from '../physics/motion.js';
import { WORLD, nearest } from '../world/coordinates.js';

// 先由近到远搜索落点；极密树林时再检查整张地图，确保不会落在河流或树干内。
export function landingPoint(player, trees) {
  // 落地按步行碰撞检测，保留秘境边界，不能搜索到圈外再强制下车。
  const walking = { arena: player.arena, mapId: player.mapId, livingCollision:player.livingCollision, worldBarriers:player.worldBarriers, parkingBarriers:player.parkingBarriers };
  if (!blocked(player.x, player.y, 12, trees, walking)) return { x: player.x, y: player.y };
  for (let radius = 16; radius <= 320; radius += 16) {
    const count = Math.ceil((Math.PI * 2 * radius) / 16);
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const x = player.x + Math.cos(angle) * radius,
        y = player.y + Math.sin(angle) * radius;
      if (!blocked(x, y, 12, trees, walking)) return { x, y };
    }
  }
  let best = null,
    distance = Infinity;
  for (let x = 0; x < WORLD.width; x += 32)
    for (let y = 0; y < WORLD.height; y += 32) {
      const p = nearest({ x, y }, player),
        d = Math.hypot(p.x - player.x, p.y - player.y);
      if (d < distance && !blocked(p.x, p.y, 12, trees, walking)) {
        best = p;
        distance = d;
      }
    }
  return best;
}

// 安全落地清除飞行惯性与后坐位移，不改变驾驶员生命、武器弹药或瞄准锁定。
export function landVehicle(game) {
  const point = landingPoint(game.player, game.trees);
  if (!point) return false;
  Object.assign(game.player, point, { vx: 0, vy: 0, pushX: 0, pushY: 0 });
  game.player.recoilX = 0;
  game.player.recoilY = 0;
  return true;
}
