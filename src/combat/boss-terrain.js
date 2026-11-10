import {sweptBox,sweptBoxTouchesCircle} from '../physics/swept-box.js';
// 领主技能与红狼碾压共用树干扫掠和破碎表现，不发放玩家采集奖励。
import { nearest, worldDistance } from '../world/coordinates.js';
import { treeGrid,markTreeDeath } from '../world/spatial-grid.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';

// 领主与武器共用增量树林索引，伐木后不再额外重建一次全图分桶。
function treeIndex(game) { return treeGrid(game.trees); }

// 死树立即退出后续碰撞，同一施法重叠区域也只产生一次碎屑与树桩。
function shatter(game, tree, origin, direction, protectSettlement = true) {
  if(protectSettlement&&livingForest(game)&&livingSafePoint(tree))return;
  tree.hp = 0;
  markTreeDeath(game.trees,tree);
  tree.hitX = direction.x;
  tree.hitY = direction.y;
  const point = nearest(tree, origin);
  game.fx.impact({ target: tree, x: point.x, y: point.y - 8 }, direction, false, false, true, false, 1.5);
  game.leaveStump(tree);
}

// 沿实际移动线段扫掠，不提前破坏预警终点；领主默认保护聚落，红狼主动碾压可破坏聚落内树木。
export function breakTreesAlong(game, from, endpoint, radius, {protectSettlement = true, footprint = null} = {}) {
  const to = nearest(endpoint, from), dx = to.x - from.x, dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy, length = Math.sqrt(lengthSquared);
  const direction = length > 1e-8 ? {x:dx/length,y:dy/length} : {x:0,y:1};
  // 正式车壳不随炮塔旋转；按实际平移生成凸扫掠区，横纵与斜向使用各自的边界。
  const sweep=footprint?sweptBox(from,to,footprint):null;
  const padding = footprint ? Math.hypot(footprint.width/2,footprint.length/2)+Math.abs(footprint.centerOffset) : radius;
  const trees = treeIndex(game).query(Math.min(from.x, to.x), Math.min(from.y, to.y),
    Math.max(from.x, to.x), Math.max(from.y, to.y), padding);
  for (const tree of trees) {
    if (tree.hp <= 0) continue;
    const point = nearest(tree, from);
    if (footprint) {
      if(!sweptBoxTouchesCircle(sweep,point,tree.radius))continue;
    } else {
      const t = Math.max(0, Math.min(1, ((point.x-from.x)*dx+(point.y-from.y)*dy)/(lengthSquared||1)));
      if (Math.hypot(point.x-from.x-dx*t,point.y-from.y-dy*t)>radius+tree.radius) continue;
    }
    shatter(game, tree, from, direction, protectSettlement);
  }
}

// 扩散波仅摧毁本帧扫过的环带；实心落点与孢子区域使用零内径。
export function breakTreesInRing(game, center, inner, outer) {
  const trees = treeIndex(game).query(center.x, center.y, center.x, center.y, outer);
  for (const tree of trees) {
    if (tree.hp <= 0) continue;
    const d = worldDistance(tree, center);
    if (d + tree.radius < inner || d - tree.radius > outer) continue;
    const point = nearest(tree, center);
    shatter(game, tree, center, d ? { x: (point.x - center.x) / d, y: (point.y - center.y) / d } : { x: 0, y: 1 });
  }
}
