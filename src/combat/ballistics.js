import {statisticsSource} from './statistics-source.js';
import {landGravityField,explodeHeavyShell,gravityPointSafe,gravityFlightRange} from './gravity-field.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
// 弹道模块：射线、飞行弹、散射、水弹与链式弹射共用扫掠命中，表现跟随真实位置。
import { hitCenter, traceTargets } from './collision.js';
import { nearest, worldDistance } from '../world/coordinates.js';
import { stepGrenade } from './grenades.js';
import { fireArc } from './elemental.js';
import { SpatialGrid } from '../world/spatial-grid.js';

// 获取本帧有效碰撞目标；AI 选择怪物优先，实际子弹仍会撞上挡路树木。
export function liveTargets(game) {
  return [...game.trees, ...game.enemies, ...(game.boss ? [game.boss] : [])].filter(
    (t) => t.hp > 0,
  );
}
// 统一命中入口，把弹道冲量和水弹减速交给游戏规则层。
function impact(game, hit, bullet) {
  // 浮游炮命中仅添加碎光，不扩大伤害或重复施加冲量。
  if (['funnel', 'drone'].includes(bullet.kind)) game.fx.funnelImpact(hit, bullet);
  game.hit(hit.target, bullet.amount, bullet.critical, {
    ...hit,
    direction: { x: bullet.dx, y: bullet.dy },
    laser: bullet.kind === 'laser',
    impulse:
      (bullet.impulse || 0) *
      (bullet.speed && bullet.launchSpeed ? Math.max(GAMEPLAY_VALUES.projectile.minImpulseRatio, bullet.speed / bullet.launchSpeed) : 1),
    pushLimit: bullet.pushLimit, groundedPush: bullet.groundedPush,
    water: bullet.kind === 'water',
    power: bullet.impactScale || 1,
    weaponIndex: bullet.weaponIndex,
    statisticsSource:bullet.statisticsSource,
    masteryOwnerIndex: bullet.masteryOwnerIndex,
    audioSource:bullet.audioSource,
    damageGroup:bullet.damageGroup,
    kind: bullet.effectKind || bullet.kind,
    chillFactor: bullet.chillFactor,
    chillDuration: bullet.chillDuration,
  });
}
// 发射时快照武器参数，之后装备和升级不会改变已经飞出的子弹。
export function fireBallistics(
  game,
  weapon,
  muzzle,
  direction,
  amount,
  critical,
  independentMuzzle = false,
) {
  if(game.combatLineClear&&!game.combatLineClear(independentMuzzle?muzzle:hitCenter(game.player),muzzle))return;
  const profile = GAMEPLAY_TABLES.projectileProfiles[weapon.id] || GAMEPLAY_TABLES.projectileProfiles.default;
  const all = liveTargets(game).filter(t=>weapon.targetTrees!==false||t.type!=='tree'),
    // 独立炮口只检查自身重叠，不能误伤角色身体与浮游炮之间的实体。
    nearHits = traceTargets(
      independentMuzzle ? muzzle : hitCenter(game.player),
      muzzle,
      all,
      weapon.hitRadius || GAMEPLAY_VALUES.projectile.defaultHitRadius,
    );
  if (weapon.id === 'arc') {
    fireArc(game, weapon, muzzle, direction, amount, critical, all, nearHits);
    return;
  }
  if (weapon.id === 'laser') {
    const end = {
      x: muzzle.x + direction.x * weapon.range,
      y: muzzle.y + direction.y * weapon.range,
    };
    if(game.clipCombatLine)Object.assign(end,game.clipCombatLine(muzzle,end));
    const shot = {
      x: muzzle.x,
      y: muzzle.y,
      ex: end.x,
      ey: end.y,
      life: 0.095,
      lifetime: 0.095,
      laser: true,
    };
    game.shots.push(shot);
    const seen = new Set();
    let remainingDamage = amount,enemyHits=0;
    for (const hit of [...nearHits, ...traceTargets(muzzle, end, all, GAMEPLAY_VALUES.projectile.laserHitRadius)]) {
      if (seen.has(hit.target.id) || hit.target.hp <= 0) continue;
      // 激光按实际命中顺序逐次减半；保留小数累计，避免取整后永远造成 1 点伤害。
      const hitDamage = Math.round(remainingDamage);
      if (hitDamage < 1) break;
      seen.add(hit.target.id);if(hit.target.type!=='tree')enemyHits++;
      impact(game, hit, {
        amount: hitDamage,
        critical,
        dx: direction.x,
        dy: direction.y,
        kind: 'laser',
        impulse: weapon.impulse, pushLimit: weapon.pushLimit, groundedPush: weapon.groundedPush,
        weaponIndex: weapon.weaponIndex,
        masteryOwnerIndex: weapon.masteryOwnerIndex,
        statisticsSource:statisticsSource(game,weapon),
        audioSource:weapon.audioSource||'primary',
      });
      remainingDamage *= weapon.pierceDecay;
      // 第三个有效目标耗尽穿透能力，光束也停在该命中点，避免显示穿透但没有伤害。
      if (seen.size >= weapon.pierce) {
        shot.ex = hit.x;
        shot.ey = hit.y;
        break;
      }
    }
    // 同一束真实光线的非树木命中数，不能把跨发射命中拼成贯穿。
    game.recordStoryEvent?.('laser-pierce',{count:enemyHits});
    return;
  }
  // 同次散射共享一个表现标识，穿透与不同目标仍独立累计。
  const damageGroup=weapon.pellets>1?{}:null;
  for (let i = 0; i < weapon.pellets; i++) {
    const spread =
      weapon.pellets > 1
        ? (i / (weapon.pellets - 1) - 0.5) * weapon.spread
        : (game.random() - 0.5) * weapon.spread;
    const angle = Math.atan2(direction.y, direction.x) + spread;
    const b = {
      x: muzzle.x,
      y: muzzle.y,
      originX: muzzle.x,
      originY: muzzle.y,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      speed: weapon.speed,
      launchSpeed: weapon.speed,
      drag: profile.drag,
      z: GAMEPLAY_VALUES.projectile.launchHeight,
      vz: weapon.aimAssist ? 0 : profile.lift,
      gravity: ['funnel','drone'].includes(weapon.id) ? profile.gravity : weapon.aimAssist ? GAMEPLAY_VALUES.projectile.assistedGravity : profile.gravity,
      groundBounces: profile.groundBounces,
      age: 0,
      remaining: weapon.range,
      travelled: 0,
      gravityRadius:weapon.gravityRadius,gravityDuration:weapon.gravityDuration,gravityPull:weapon.gravityPull,gravityMinDistance:weapon.gravityMinDistance,targetTrees:weapon.targetTrees,blastRadius:weapon.blastRadius,blastRatio:weapon.blastRatio,
      amount,
      weaponIndex: weapon.weaponIndex,
      masteryOwnerIndex: weapon.masteryOwnerIndex,
      statisticsSource:statisticsSource(game,weapon),
      audioSource:weapon.audioSource||'primary',
      chillFactor: weapon.chillFactor,
      chillDuration: weapon.chillDuration,
      initialAmount: amount,
      damageGroup,
      pierce: weapon.pierce || 1,
      pierceDecay: weapon.pierceDecay || 1,
      impactScale: weapon.impactScale || 1,
      hitRadius: weapon.hitRadius || GAMEPLAY_VALUES.projectile.defaultHitRadius,
      wakeAt: 0,
      critical,
      kind: weapon.id,
      effectKind: weapon.effectKind,
      color: weapon.color,
      impulse: weapon.impulse,
      pushLimit: weapon.pushLimit, groundedPush: weapon.groundedPush, // 推力上限随弹丸快照，切换炮塔不改变在途命中。
      bounces: weapon.bounces || 0,
      hitIds: [],
      trail: [],
    };
    // 引力弹近敌就近展开，不能因跳过近身碰撞而一直飞到射程尽头。
    if(b.gravityRadius){b.gravityMaxTravel=weapon.range;b.remaining=gravityFlightRange(game,weapon,muzzle,{x:b.dx,y:b.dy},all,independentMuzzle);}
    // 余辉记录发射原点并只延伸到真实弹头；释放后保留短暂能量通道，不再次结算伤害。
    if (weapon.id === 'pulse') {
      b.beam = {
        kind: 'pulse-beam',
        x: muzzle.x,
        y: muzzle.y,
        ex: muzzle.x,
        ey: muzzle.y,
        life: 0.26,
        lifetime: 0.26,
        phase: 0,
      };
      game.shots.push(b.beam);
    }
    // 弹射弹也从贴身命中点继续处理，不会因枪口伸进碰撞体而漏伤害。
    for (const near of nearHits) {
      if (near.target.hp <= 0||!gravityPointSafe(game,b,near)) continue;
      resolveHit(game, b, near);
      // 仅直线穿甲弹继续处理枪口内的重叠目标，其他武器保留原有规则。
      if (!weapon.pierce || b.remaining <= 0) break;
    }
    if (weapon.pierce && b.remaining > 0) {
      b.x = muzzle.x;
      b.y = muzzle.y;
    }
    if (b.beam) {
      b.beam.ex = b.x;
      b.beam.ey = b.y;
    }
    if (b.remaining > 0) game.projectiles.push(b);
    else landGravityField(game,b);
  }
}
// 弹射选定下一目标时优先怪物，已命中单位不会被同一颗弹重复伤害。
function resolveHit(game, b, hit) {
  b.x = hit.x;
  b.y = hit.y;
  impact(game, hit, b);
  landGravityField(game,b);explodeHeavyShell(game,b,hit.target);
  b.hitIds.push(hit.target.id);
  // 穿甲弹保留原方向与帧内剩余行程，树干也消耗一次穿透；去重表跨帧保留。
  if (b.pierce > 1) {
    b.pierce--;
    b.amount = Math.max(Math.round(b.initialAmount * GAMEPLAY_VALUES.projectile.pierceDamageFloor), Math.round(b.amount * b.pierceDecay));
    return;
  }
  // 同一束火焰穿过怪物但不会重复灼烧同一目标，树干会挡住后方火流。
  if (b.kind === 'flame' && hit.target.type !== 'tree') return;
  if (b.bounces <= 0) {
    b.remaining = 0;
    return;
  }
  const candidates = liveTargets(game).filter(
    (t) => (!game.combatLineClear||game.combatLineClear(b,hitCenter(t))) && !b.hitIds.includes(t.id) && worldDistance(hitCenter(t), b) < GAMEPLAY_VALUES.projectile.bounceRange,
  );
  candidates.sort(
    (a, d) =>
      Number(a.type === 'tree') - Number(d.type === 'tree') ||
      worldDistance(hitCenter(a), b) - worldDistance(hitCenter(d), b),
  );
  const next = candidates[0];
  if (!next) {
    b.remaining = 0;
    return;
  }
  const center = nearest(hitCenter(next), b),
    dx = center.x - b.x,
    dy = center.y - b.y,
    length = Math.hypot(dx, dy);
  b.dx = dx / Math.max(0.001, length);
  b.dy = dy / Math.max(0.001, length);
  b.bounces--;
  b.speed *= GAMEPLAY_VALUES.projectile.bounceSpeedRatio;
  b.z = GAMEPLAY_VALUES.projectile.launchHeight;
  b.vz = GAMEPLAY_VALUES.projectile.bounceLift;
  b.remaining = GAMEPLAY_VALUES.projectile.bounceRange;
  game.fx.add('ring', b.x, b.y, 0.2, { size: 17, color: b.color });
  b.travelled = 0;
}
// 每帧扫过完整线段，弹射保留帧内剩余距离，低帧率也不穿透或拖慢。
export function updateBallistics(game, dt) {
  let remaining = Math.max(0, dt);
  if (!game.projectiles.length || remaining <= 0) return;
  // 弹道阶段实体尚未移动；所有弹丸和 120Hz 小步共用索引，死亡即时读取原对象。
  const targets = new SpatialGrid(liveTargets(game), { offsetY: -8 });
  while (remaining > 1e-8 && game.projectiles.length) {
    const step = Math.min(remaining, 1 / 120);
    remaining -= step;
    stepBallistics(game, step, targets);
  }
}
// 分步处理下坠与扫掠，避免大帧先判落地而漏掉途中目标。
function stepBallistics(game, dt, targets) {
  for (const b of game.projectiles) {
    if (b.kind === 'grenade-bomb') {
      stepGrenade(game, b, dt);
      continue;
    }
    const initial = b.speed || GAMEPLAY_VALUES.projectile.defaultSpeed,
      drag = b.drag || 0,
      decay = Math.exp(-drag * dt);
    let budget = drag ? (initial * (1 - decay)) / drag : initial * dt,
      attempts = 0;
    b.speed = initial * decay;
    b.age = (b.age || 0) + dt;
    b.z = (b.z ?? GAMEPLAY_VALUES.projectile.launchHeight) + (b.vz || 0) * dt - 0.5 * (b.gravity || 0) * dt * dt;
    b.vz = (b.vz || 0) - (b.gravity || 0) * dt;
    if (b.z < 0) {
      if (b.groundBounces > 0) {
        b.z = -b.z * GAMEPLAY_VALUES.projectile.groundHeightRatio;
        b.vz = -b.vz * GAMEPLAY_VALUES.projectile.groundLiftRatio;
        b.speed *= GAMEPLAY_VALUES.projectile.groundSpeedRatio;
        b.groundBounces--;
        game.fx.add('spark', b.x, b.y, 0.16, { size: 6, color: b.color });
      } else {
        game.fx.add(b.kind === 'water' ? 'ring' : 'smoke', b.x, b.y, 0.3, {
          size: b.kind === 'water' ? 22 : 5,
          color: b.color,
        });
        b.remaining = 0;
      }
    }
    b.hitIds ||= [];
    b.trail ||= [];
    while (budget > 0.001 && b.remaining > 0.001 && attempts++ < 64) {
      const travel = Math.min(budget, b.remaining),
        end = { x: b.x + b.dx * travel, y: b.y + b.dy * travel };
      const clipped=game.clipCombatLine?.(b,end);if(clipped)Object.assign(end,clipped);
      const actualTravel=Math.hypot(end.x-b.x,end.y-b.y);
      const hit = traceTargets(
        b,
        end,
        targets,
        b.kind === 'flame' ? GAMEPLAY_VALUES.projectile.flameStartRadius + b.travelled * GAMEPLAY_VALUES.projectile.flameRadiusPerDistance : b.kind === 'water' ? GAMEPLAY_VALUES.projectile.waterHitRadius : b.hitRadius || GAMEPLAY_VALUES.projectile.defaultHitRadius,
        b.hitIds,
      ).find(hit=>(b.targetTrees!==false||hit.target.type!=='tree')&&gravityPointSafe(game,b,hit));
      b.trail.push({ x: b.x, y: b.y, z: b.z });
      if (b.trail.length > 8) b.trail.shift();
      const used = hit ? actualTravel * hit.t : actualTravel;
      // 按实际经过的距离发射地表余波，碰撞前方不会凭空出现破坏或伤害。
      if (b.kind === 'pulse') {
        while (b.wakeAt <= b.travelled + used) {
          const offset = Math.max(0, b.wakeAt - b.travelled);
          game.fx.pulseWake(b.x + b.dx * offset, b.y + b.dy * offset, b);
          b.wakeAt += 42;
        }
      }
      budget -= used;
      b.remaining -= used;
      b.travelled += used;
      if (hit) resolveHit(game, b, hit);
      else {
        b.x = end.x;
        b.y = end.y;
        if(clipped?.blocked){b.remaining=0;b.terrainStopped=true;}
      }
      if (b.beam) {
        b.beam.ex = b.x;
        b.beam.ey = b.y;
        b.beam.life = b.beam.lifetime;
        b.beam.phase = b.age;
      }
    }
  }
  // 玩家向前移动时允许弹丸继续飞出离身圈，仍受原射程与落地约束，不能贴身展开或无限追逐。
  for(const b of game.projectiles)if(b.gravityRadius&&!b.terrainStopped&&b.remaining<=.001&&b.z>=0&&!gravityPointSafe(game,b)&&b.travelled<b.gravityMaxTravel){
    b.remaining=gravityFlightRange(game,{...b,range:b.gravityMaxTravel-b.travelled},b,{x:b.dx,y:b.dy},[]);
  }
  for(const b of game.projectiles)if(b.remaining<=.001){landGravityField(game,b);if(b.kind==='wolf-256')explodeHeavyShell(game,b,null);}
  game.projectiles = game.projectiles.filter((b) => b.remaining > 0.001);
}
