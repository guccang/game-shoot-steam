import {weaponTerrainTargets} from './terrain-targets.js';
import {statisticsSource} from './statistics-source.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 榴弹的交火计时、抛物线与范围伤害，独立于界面与 Canvas。
import { hitCenter } from './collision.js';
import { nearest, worldDistance } from '../world/coordinates.js';

// 每次出发或换枪创建新的充能状态，不写入永久成长档。
export function createWeaponCycle() {
  return { charge: 0, firing: false };
}

// 从首次有效射击开始累计；失去目标会中断，暂停由调用方冻结。
export function advanceGrenadeCharge(cycle, weapon, dt, hasTarget) {
  if (!weapon.grenade || !hasTarget) {
    cycle.charge = 0;
    cycle.firing = false;
    return false;
  }
  if (!cycle.firing) return false;
  cycle.charge += Math.max(0, dt);
  if (cycle.charge + 1e-8 < weapon.grenade.charge) return false;
  cycle.charge = Math.max(0, cycle.charge - weapon.grenade.charge);
  return true;
}

// 锁定发射时的落点与伤害，换枪、升级或目标移动都不会追踪修改在途榴弹。
export function launchGrenade(game, weapon, muzzle, target, amount, handheld = false) {
  const end = nearest(hitCenter(target), muzzle);
  if(game.clipCombatLine)Object.assign(end,game.clipCombatLine(muzzle,end));
  const distance = Math.hypot(end.x - muzzle.x, end.y - muzzle.y);
  const duration = Math.max(GAMEPLAY_VALUES.grenade.minFlightSeconds, distance / weapon.grenade.speed);
  game.projectiles.push({
    kind: 'grenade-bomb',
    allowWood: handheld && weapon.targetTrees !== false,
    x: muzzle.x,
    y: muzzle.y,
    originX: muzzle.x,
    originY: muzzle.y,
    endX: end.x,
    endY: end.y,
    dx: (end.x - muzzle.x) / Math.max(1, distance),
    dy: (end.y - muzzle.y) / Math.max(1, distance),
    age: 0,
    duration,
    remaining: 1,
    travelled: 0,
    z: 9,
    amount: Math.round(amount * weapon.grenade.damage),
    weaponIndex: weapon.weaponIndex,
    masteryOwnerIndex: weapon.masteryOwnerIndex,
    statisticsSource:statisticsSource(game,weapon),
    audioSource:weapon.audioSource||'primary',
    radius: weapon.grenade.radius,
    impulse: weapon.grenade.impulse, pushLimit: weapon.grenade.pushLimit, groundedPush: weapon.grenade.groundedPush,
    color: '#ffd78c',
    trail: [],
  });
  game.onEvent('grenade-launch',{source:weapon.audioSource});
}

// 落地爆炸对每个目标只结算一次，使用循环地图的最近镜像并沿爆心向外施力。
export function explodeGrenade(game, grenade) {
  if (grenade.exploded) return;
  grenade.exploded = true;
  grenade.remaining = 0;
  const targets = [...weaponTerrainTargets(game, grenade.allowWood), ...game.enemies, ...(game.boss ? [game.boss] : [])];
  for (const target of targets) {
    if (target.hp <= 0) continue;
    const center = nearest(hitCenter(target), grenade);
    const distance = worldDistance(center, grenade);
    if (distance > grenade.radius + target.radius || game.combatLineClear&&!game.combatLineClear(grenade,center)) continue;
    const strength = 1 - GAMEPLAY_VALUES.grenade.edgeFalloff * Math.min(1, distance / grenade.radius);
    const direction =
      distance > 0.001
        ? { x: (center.x - grenade.x) / distance, y: (center.y - grenade.y) / distance }
        : { x: grenade.dx || 1, y: grenade.dy || 0 };
    game.hit(target, Math.max(1, Math.round(grenade.amount * strength)), false, {
      x: center.x,
      y: center.y,
      direction,
      impulse: grenade.impulse * strength, pushLimit: grenade.pushLimit, groundedPush: grenade.groundedPush,
      weaponIndex: grenade.weaponIndex,
      masteryOwnerIndex: grenade.masteryOwnerIndex,
      statisticsSource:grenade.statisticsSource,
      audioSource:grenade.audioSource,
    });
  }
  game.fx.add('blast', grenade.x, grenade.y, 0.5, { size: grenade.radius, color: '#ffbc63' });
  for (let i = 0; i < 14; i++) {
    const angle = (i * Math.PI * 2) / 14;
    game.fx.add('spark', grenade.x, grenade.y, 0.4, {
      vx: Math.cos(angle) * 190,
      vy: Math.sin(angle) * 190,
      angle,
      size: 8,
      color: i % 2 ? '#ffe9a4' : '#f18b47',
    });
  }
  game.onEvent('explosion',{source:grenade.audioSource});
}

// 以飞行时间解算抛物线，越过树冠后在固定落点爆炸，不按帧数提前结算。
export function stepGrenade(game, grenade, dt) {
  grenade.age = Math.min(grenade.duration, grenade.age + dt);
  const t = grenade.age / grenade.duration;
  grenade.x = grenade.originX + (grenade.endX - grenade.originX) * t;
  grenade.y = grenade.originY + (grenade.endY - grenade.originY) * t;
  grenade.z = 9 * (1 - t) + 280 * t * (1 - t);
  grenade.travelled = Math.hypot(grenade.x - grenade.originX, grenade.y - grenade.originY);
  if (t >= 1 - 1e-8) explodeGrenade(game, grenade);
}
