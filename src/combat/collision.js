// 将 TopDownShoot 的逐帧射线碰撞思路适配为二维线段扫圆，避免高速子弹穿过目标。
import { nearest } from '../world/coordinates.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
export const BULLET_SPEED = GAMEPLAY_VALUES.projectile.defaultSpeed;
// 战斗碰撞中心略高于脚底，与弹道及命中特效使用相同坐标。
export function hitCenter(target) {
  return { x: target.x, y: target.y - 8 };
}
// 返回线段首次进入圆形碰撞体的比例；起点已在体内时立即命中。
export function segmentCircle(start, end, center, radius) {
  const dx = end.x - start.x,
    dy = end.y - start.y,
    ox = start.x - center.x,
    oy = start.y - center.y;
  const c = ox * ox + oy * oy - radius * radius,
    a = dx * dx + dy * dy;
  if (c <= 0) return 0;
  if (a < 1e-10) return null;
  const b = ox * dx + oy * dy,
    discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
}
// 按弹道先后排序；普通子弹只取首个命中，激光可逐一穿透。
export function traceTargets(start, end, targets, width = GAMEPLAY_VALUES.projectile.defaultHitRadius, excludedIds = null) {
  const hits = [];
  // 宽阶段只查询弹道包围盒；精确扫圆、穿透排序和跨边界镜像规则保持一致。
  const candidates = targets.query
    ? targets.query(Math.min(start.x, end.x), Math.min(start.y, end.y),
      Math.max(start.x, end.x), Math.max(start.y, end.y), width)
    : targets;
  for (const target of candidates) {
    if (target.hp <= 0 || excludedIds?.includes(target.id)) continue;
    const t = segmentCircle(start, end, nearest(hitCenter(target), start), target.radius + width);
    if (t !== null)
      hits.push({
        target,
        t,
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      });
  }
  return hits.sort((a, b) => a.t - b.t || a.target.id - b.target.id);
}
