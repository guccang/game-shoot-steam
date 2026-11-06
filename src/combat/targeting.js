import {weaponTerrainTargets} from './terrain-targets.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { riderPosition } from '../config/vehicle-rider.js';
// 穿透武器锁定密集目标组，移动时跟踪目标，目标清空后立即选择下一组。
import { shotSolution } from './aim.js';
import { traceTargets, hitCenter } from './collision.js';
import { nearest, worldDistance } from '../world/coordinates.js';
import { SpatialGrid } from '../world/spatial-grid.js';
import {attackTargetDistance,attackTargetKnown,rememberCombatTarget} from './perception.js';

// 用真实枪口与弹道宽度扫描整条射线；预览与实际弹道使用同一批可命中对象。
function scanLane(game, shot, enemyLane, context) {
  const { weapon, grid: targets } = context;
  const end = {
    x: shot.muzzle.x + shot.direction.x * weapon.range,
    y: shot.muzzle.y + shot.direction.y * weapon.range,
  };
  const seen = new Set(),
    hits = [];
  for (const h of [
    ...traceTargets(hitCenter(game.player), shot.muzzle, targets, weapon.hitRadius || GAMEPLAY_VALUES.projectile.defaultHitRadius),
    ...traceTargets(shot.muzzle, end, targets, weapon.hitRadius || GAMEPLAY_VALUES.projectile.defaultHitRadius),
  ]) {
    if (!seen.has(h.target.id)) {
      seen.add(h.target.id);
      hits.push(h);
    }
  }
  const eligible = hits.filter((h) =>
    enemyLane ? h.target.type !== 'tree' : h.target.type === 'tree',
  );
  const farthest = eligible.reduce(
    (best, hit) =>
      !best || worldDistance(hit.target, game.player) > worldDistance(best, game.player)
        ? hit.target
        : best,
    null,
  );
  return {
    targets: eligible.map((hit) => hit.target),
    target: eligible[0]?.target || null,
    farthest,
    count: hits
      .slice(0, weapon.pierce)
      .filter((h) => (enemyLane ? h.target.type !== 'tree' : h.target.type === 'tree')).length,
    total: eligible.length,
    ...shot,
  };
}

// 在指定候选组内选择密集射线，并记录跟踪锚点；不修改任何战斗状态。
function selectLane(game, candidates, enemyLane, context) {
  const { weapon } = context;
  // 补充相邻目标夹角的中线，避免并排怪物间的最佳射线被逐个瞄中心的算法漏掉。
  const angles = candidates
    .map((t) => {
      const p = nearest(t, game.player);
      return Math.atan2(p.y - game.player.y, p.x - game.player.x);
    })
    .sort((a, b) => a - b);
  const directions = [...candidates];
  for (let i = 0; i < angles.length; i++) {
    const start = angles[i],
      end = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
    if (end - start > Math.PI / 2) continue;
    const angle = (start + end) / 2;
    directions.push({
      x: game.player.x + Math.cos(angle) * weapon.range * GAMEPLAY_VALUES.combat.clusterAimRangeRatio,
      y: game.player.y + Math.sin(angle) * weapon.range * GAMEPLAY_VALUES.combat.clusterAimRangeRatio,
      radius: 0,
    });
  }
  const ids = new Set(candidates.map((t) => t.id));
  let best = null;
  for (const candidate of directions) {
    const shot = shotSolution(riderPosition(game.player, game.vehicle), candidate, (game.loadout || game.progress).weapon);
    const lane = scanLane(game, shot, enemyLane, context);
    const matched = lane.targets.filter((t) => ids.has(t.id));
    if (!matched.length) continue;
    if (
      !best ||
      lane.count > best.count ||
      (lane.count === best.count && lane.total > best.total) ||
      (lane.count === best.count &&
        lane.total === best.total &&
        worldDistance(lane.target, game.player) < worldDistance(best.target, game.player))
    ) {
      const anchor = candidates.find((t) => t.id === candidate.id) || matched.at(-1);
      const point = nearest(candidate, game.player),
        origin = nearest(anchor, game.player);
      best = {
        ...lane,
        enemyLane,
        anchorId: anchor.id,
        offset: { x: point.x - origin.x, y: point.y - origin.y },
        aimRadius: candidate.radius || 0,
        memberIds: matched.map((t) => t.id),
      };
    }
  }
  return best;
}

// 已锁定的成员仍在射程内时持续跟踪，侧面新怪不会抢走目标组。
function followLane(game, lock, targets, context) {
  const ids = new Set(lock.memberIds);
  const members = targets.filter((t) => ids.has(t.id));
  if (!members.length) return null;
  const anchor = members.find((t) => t.id === lock.anchorId);
  if (anchor) {
    const point = nearest(anchor, game.player);
    const candidate = {
      x: point.x + lock.offset.x,
      y: point.y + lock.offset.y,
      radius: lock.aimRadius,
    };
    const shot = shotSolution(riderPosition(game.player, game.vehicle), candidate, (game.loadout || game.progress).weapon);
    const lane = scanLane(game, shot, lock.enemyLane, context);
    if (lane.targets.some((t) => ids.has(t.id))) return { ...lock, ...lane };
  }
  // 锚点死亡或相对位置变化导致中线失效，只在原组存活成员中重新瞄准。
  const lane = selectLane(game, members, lock.enemyLane, context);
  return lane ? { ...lane, memberIds: members.map((t) => t.id) } : null;
}

// 统一的只读瞄准解算：击杀后查询也立即返回新目标，预览和实际开火使用同一射线。
export function piercingLane(game) {
  const weapon = game.weapon();
  // 比赛空场等待补球，不自动转向外围景观采集。
  const targets = [...(weapon.targetTrees===false||game.fireActive||game.realm?.mode==='football'?[]:weaponTerrainTargets(game,true)), ...game.enemies, ...(game.boss ? [game.boss] : [])].filter(
    // 视野检查只用于射程内实体，避免每条瞄准查询重复投影整张地图的树木。
    (t) => t.hp > 0 && attackTargetDistance(game, t, weapon.range + t.radius) < weapon.range + t.radius && attackTargetKnown(game,t),
  );
  const enemies = targets.filter((t) => t.type !== 'tree');
  // 一次寻敌的所有候选方向共享范围筛选和索引，不逐条射线重新遍历整片森林。
  const context = { weapon, grid: new SpatialGrid(targets, { offsetY: -8 }) };
  const lock = game.aimLock?.weapon === (game.loadout || game.progress).weapon ? game.aimLock : null;
  // 采集树木时有怪物进入范围，立即恢复怪物优先级。
  if (lock && (lock.enemyLane || !enemies.length)) {
    const lane = followLane(game, lock, targets, context);
    if (lane) return lane;
  }
  return selectLane(game, enemies.length ? enemies : targets, enemies.length > 0, context);
}

// 状态仅在战斗更新中提交，不再用选敌等待时间缓冲镜头；镜头缓动由渲染模块负责。
export function updateAimLock(game) {
  if (!game.weapon().aimAssist) {
    game.aimLock = null;
    return;
  }
  const lane = piercingLane(game);
  // 正式锁定提交后保留这组敌人的交战资格，屏幕边缘不再打断穿透跟踪。
  for(const target of lane?.targets||[])rememberCombatTarget(game,target);
  game.aimLock = lane
    ? {
        weapon: (game.loadout || game.progress).weapon,
        angle: lane.angle,
        direction: { ...lane.direction },
        enemyLane: lane.enemyLane,
        memberIds: [...lane.memberIds],
        anchorId: lane.anchorId,
        offset: { ...lane.offset },
        aimRadius: lane.aimRadius,
        // 树木锁定只服务于武器，不把采集目标传给镜头。
        focus: lane.enemyLane ? nearest(lane.farthest, game.player) : null,
      }
    : null;
}
