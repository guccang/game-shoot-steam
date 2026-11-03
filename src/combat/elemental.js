import {statisticsSource} from './statistics-source.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 电弧首击遵循真实遮挡，后续只在附近怪物之间跳跃，不重复结算同一目标。
import { traceTargets, hitCenter } from './collision.js';
import { nearest, worldDistance } from '../world/coordinates.js';

// 所有链路在一次发射中结算；每条闪电单独记录起终点，跨地图边缘使用最近镜像。
export function fireArc(game, weapon, muzzle, direction, amount, critical, targets, nearHits) {
  const end = {
    x: muzzle.x + direction.x * weapon.range,
    y: muzzle.y + direction.y * weapon.range,
  };
  if(game.clipCombatLine)Object.assign(end,game.clipCombatLine(muzzle,end));
  let hit = nearHits[0] || traceTargets(muzzle, end, targets, GAMEPLAY_VALUES.arc.hitRadius)[0];
  let origin = muzzle;
  const seen = new Set();
  for (let hop = 0; hit && hop < weapon.chain; hop++) {
    const target = hit.target,
      point = nearest(hitCenter(target), origin);
    seen.add(target.id);
    const d = Math.hypot(point.x - origin.x, point.y - origin.y) || 1;
    game.shots.push({
      kind: 'arc-link',
      x: origin.x,
      y: origin.y,
      ex: point.x,
      ey: point.y,
      life: 0.18,
      lifetime: 0.18,
      seed: hop + target.id,
    });
    game.hit(
      target,
      Math.max(1, Math.round(amount * GAMEPLAY_VALUES.arc.hopDamageFactor ** hop * (target.wet > 0 ? GAMEPLAY_VALUES.arc.wetDamageMultiplier : 1))),
      critical,
      {
        x: point.x,
        y: point.y,
        direction: { x: (point.x - origin.x) / d, y: (point.y - origin.y) / d },
        impulse: weapon.impulse, pushLimit: weapon.pushLimit, groundedPush: weapon.groundedPush,
        weaponIndex: weapon.weaponIndex,
        masteryOwnerIndex: weapon.masteryOwnerIndex,
        statisticsSource:statisticsSource(game,weapon),
        audioSource:weapon.audioSource||'primary',
      },
    );
    if (target.type === 'tree') break;
    origin = point;
    const next = targets
      .filter(
        (t) =>
          t.hp > 0 &&
          t.type !== 'tree' &&
          !seen.has(t.id) && (!game.combatLineClear||game.combatLineClear(origin,hitCenter(t))) &&
          worldDistance(hitCenter(t), origin) < weapon.chainRange,
      )
      .sort((a, b) => worldDistance(hitCenter(a), origin) - worldDistance(hitCenter(b), origin))[0];
    hit = next ? { target: next } : null;
  }
}
