import { riderPosition } from '../config/vehicle-rider.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 瞄准解算独立于画布：实际射击和狙击预览共享枪口、方向与穿透目标顺序。
import { muzzlePosition } from './recoil.js';
import { hitCenter, traceTargets } from './collision.js';
import { nearest, worldDistance } from '../world/coordinates.js';
import { liveTargets } from './ballistics.js';
import { gravityPointSafe,gravityFlightRange } from './gravity-field.js';

// 锁定目标在循环世界中的最近镜像，枪口伸入目标时仍保持向前射击。
export function shotSolution(player, target, weaponIndex, lock = null) {
  const position = target ? nearest(target, player) : null;
  const angle = lock
    ? lock.angle
    : position
      ? Math.atan2(position.y - player.y, position.x - player.x)
      : player.angle;
  const muzzle = muzzlePosition({ ...player, angle }, weaponIndex);
  const forward = { x: Math.cos(angle), y: Math.sin(angle) };
  const center = target ? nearest(hitCenter(target), muzzle) : muzzle;
  const dx = center.x - muzzle.x,
    dy = center.y - muzzle.y,
    length = Math.hypot(dx, dy);
  const direction = lock
    ? { ...lock.direction }
    : target && length > 0.001 && dx * forward.x + dy * forward.y > target.radius
      ? { x: dx / length, y: dy / length }
      : forward;
  return { angle, muzzle, direction };
}

// 预览只读取当前状态，不结算伤害；去重及树木穿透上限与实际弹丸相同。
export function sniperGuide(game) {
  const index = (game.loadout || game.progress).weapon,
    weapon = game.weapon(index);
  if (!weapon.aimAssist) return null;
  const lane = game.findAttackLane();
  const target = lane?.target || null,
    turning=lane&&game.player.aimInitialized&&Math.abs(Math.atan2(Math.sin(lane.angle-game.player.angle),Math.cos(lane.angle-game.player.angle)))>GAMEPLAY_VALUES.weaponTurn.fireTolerance,
    shot = !turning&&lane || shotSolution(riderPosition(game.player, game.vehicle), null, index);
  const targets=liveTargets(game, weapon.targetTrees !== false);
  const flightRange=weapon.gravityRadius?gravityFlightRange(game,weapon,shot.muzzle,shot.direction,targets):weapon.range;
  const end = {
    x: shot.muzzle.x + shot.direction.x * flightRange,
    y: shot.muzzle.y + shot.direction.y * flightRange,
  };
  const seen = new Set(),
    hits = [],
    hitLimit = weapon.gravityRadius ? 1 : weapon.pierce;
  if (target)
    for (const hit of [
      ...traceTargets(hitCenter(game.player), shot.muzzle, targets, weapon.hitRadius || GAMEPLAY_VALUES.projectile.defaultHitRadius),
      ...traceTargets(shot.muzzle, end, targets, weapon.hitRadius || GAMEPLAY_VALUES.projectile.defaultHitRadius),
    ]) {
      if (seen.has(hit.target.id)||!gravityPointSafe(game,weapon,hit)) continue;
      seen.add(hit.target.id);
      hits.push(hit);
      if (hits.length === hitLimit) break;
    }
  // 引力枪标记远处真实触发目标，不把越过的近身怪物显示成预计落点。
  const displayTarget=weapon.gravityRadius?(hits[0]?.target||null):target;
  return {
    ...shot,
    range: weapon.range,
    // 采集射线仍正常瞄准和贯穿，但不产生镜头注视点；击杀后的只读重选也遵守此规则。
    focus:
      game.aimLock?.weapon === index && lane?.enemyLane
        ? nearest(lane.farthest, game.player)
        : null,
    kind: weapon.id,
    charge: weapon.chargeTime ? game.pulse.charge / weapon.chargeTime : 0,
    target:displayTarget,
    point: displayTarget ? nearest(displayTarget, game.player) : null,
    distance: displayTarget ? worldDistance(displayTarget, game.player) : 0,
    hits,
    end: hits.length === hitLimit ? { x: hits.at(-1).x, y: hits.at(-1).y } : end,
  };
}
