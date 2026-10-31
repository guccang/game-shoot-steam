import {traceEnergyShield,energyShieldMeleeTarget} from './energy-shield-surface.js';
import {advanceDumplingMotion} from './dumpling-motion.js';
import {hurtCampBarricade} from '../core/camp-defense.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
// 领主状态机与危险区独立于绘制；所有计时均使用有效战斗时间。
import { bossProfile } from '../config/bosses.js';
import {nextBossSkill,BOSS_SPECIAL_SKILLS} from '../config/boss-skills.js';
import {bossSkillHazards,bossSkillTouches} from './boss-skills.js';
import {beginBossSupport} from '../core/boss-reinforcements.js';
import { WORLD, nearest, worldDistance } from '../world/coordinates.js';
import { moveBody, clearWaterPath } from '../physics/motion.js';
import { groundPursuit, hoveringOverWater } from '../physics/ground-pursuit.js';
import { breakTreesAlong, breakTreesInRing } from './boss-terrain.js';
import { playerThreatRange } from './threat-range.js';
import {livingForest,livingSafePoint,livingBoltBlocked} from '../world/living-spaces.js';

const PLAYER_RADIUS = GAMEPLAY_VALUES.player.collisionRadius;
// 守护秘境领主攻击祭坛，其余场景仍锁定玩家；目标与伤害入口保持一致。
function attackTarget(game) {
  if(game.campDefense&&game.campDefense.phase!=='rescue')return game.campDefense.barrier;
  return game.boss?.realm && game.realm?.mode === 'guardian' ? game.realm.goddess : game.player;
}
// 只有守护祭坛的伤害绕过角色与载具承伤，普通领主沿用原规则。
function hurtTarget(game, amount, source=game.boss) {
  if(attackTarget(game).type==='camp-barricade')hurtCampBarricade(game,amount);
  else if (attackTarget(game).type === 'goddess') game.hurtGoddess(amount);
  else game.hurt(amount,source);
}
// 移动点对移动圆的相对扫掠，兼容高速冲锋、羽刃与循环地图接缝。
export function bossSweep(from, to, previousPlayer, player, radius) {
  const p0 = nearest(previousPlayer, from),
    p1 = nearest(player, p0);
  const ax = from.x - p0.x,
    ay = from.y - p0.y;
  const dx = to.x - p1.x - ax,
    dy = to.y - p1.y - ay;
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx, ay + t * dy) <= radius + (player.type === 'goddess' ? player.radius : PLAYER_RADIUS);
}
// 锁定危险区后不追踪玩家，预警和实际伤害共用同一份几何数据。
function beginAttack(game, b, profile) {
  const p = nearest(attackTarget(game), b),
    angle = Math.atan2(p.y - b.y, p.x - b.x);
  b.ai = { phase: 'windup', elapsed: 0, angle, hit: false };
  let skill=nextBossSkill(b);
  // 召唤额度已满时使用专属攻击，不在后台再起一套刷怪计时。
  if(skill?.id==='summon'&&!beginBossSupport(game))skill=BOSS_SPECIAL_SKILLS[profile.id];
  if(skill){
    Object.assign(b.ai,{skill:skill.id,skillName:skill.name,skillHint:skill.hint,timing:skill});
    if(skill.id==='summon')game.hazards.push({owner:b.id,kind:'summon',x:b.x,y:b.y,radius:72,age:0,warmup:skill.windup,duration:skill.active});
    else game.hazards.push(...bossSkillHazards(b,p,skill,profile.color));
    if(game.hazards.length>GAMEPLAY_VALUES.boss.hazardLimit)game.hazards.splice(0,game.hazards.length-GAMEPLAY_VALUES.boss.hazardLimit);
    return;
  }
  const base = {
    owner: b.id,
    x: b.x,
    y: b.y,
    age: 0,
    warmup: profile.windup,
    duration: profile.active,
    color: profile.color,
    damage: b.blastDamage ?? GAMEPLAY_VALUES.boss.baseBlastDamage,
    hit: false,
  };
  if(profile.id==='dumpling'){
    const distance=Math.min(profile.leap.range,worldDistance(b,p));
    let length=0;
    // 用原地形规则截断跃迁；不穿河岸、不跳出秘境，也不改变碰撞体。
    for(let d=4;d<=distance;d+=4){
      const point={x:b.x+Math.cos(angle)*d,y:b.y+Math.sin(angle)*d};
      if(b.arena?Math.hypot(point.x-b.arena.x,point.y-b.arena.y)>b.arena.radius-b.radius:!clearWaterPath(b,point))break;
      length=d;
    }
    const target={x:b.x+Math.cos(angle)*length,y:b.y+Math.sin(angle)*length};
    Object.assign(b.ai,{leapFrom:{x:b.x,y:b.y},leapTo:target});
    game.hazards.push({...base,...target,kind:'slam',family:'dumpling',radius:profile.leap.radius,
      warmup:profile.windup+profile.leap.duration,duration:profile.active-profile.leap.duration});
  } else if (profile.id === 'boar') {
    // 冲锋路径遇河岸提前截止，预警不会承诺一条实际无法通过的路线。
    const charge = profile.charge;
    let length = Math.min(charge.max, Math.max(charge.min, worldDistance(b, p) + charge.overshoot));
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    for (let d = 8; d <= length; d += 8) {
      if (b.arena ? Math.hypot(b.x + dx * d - b.arena.x, b.y + dy * d - b.arena.y) > b.arena.radius - 12 :
          !clearWaterPath(b, { x: b.x + dx * d, y: b.y + dy * d })) {
        length = d - 8;
        break;
      }
    }
    Object.assign(b.ai, { dx, dy, length });
    game.hazards.push({ ...base, kind: 'charge', dx, dy, length, radius: b.radius });
  } else if (profile.id === 'mushroom') {
    for (const [dx, dy] of GAMEPLAY_TABLES.sporeOffsets)
      game.hazards.push({ ...base, kind: 'spore', x: p.x + dx, y: p.y + dy, radius: GAMEPLAY_VALUES.boss.sporeRadius, tick: 0 });
  } else if (profile.id === 'owl') {
    for (const offset of GAMEPLAY_TABLES.featherAngles)
      game.hazards.push({
        ...base,
        kind: 'feather',
        dx: Math.cos(angle + offset),
        dy: Math.sin(angle + offset),
        speed: GAMEPLAY_VALUES.boss.featherSpeed,
        radius: GAMEPLAY_VALUES.boss.featherRadius,
        length: GAMEPLAY_VALUES.boss.featherLength,
      });
  } else if (profile.id === 'turtle') {
    game.hazards.push({ ...base, kind: 'wave', radius: GAMEPLAY_VALUES.boss.waveStartRadius, speed: GAMEPLAY_VALUES.boss.waveSpeed, width: GAMEPLAY_VALUES.boss.waveWidth });
  } else {
    game.hazards.push({ ...base, kind: 'slam', x: p.x, y: p.y, radius: GAMEPLAY_VALUES.boss.slamRadius });
  }
  // 持续危险区有寿命且数量固定，保留额外硬上限以防未来机制叠加失控。
  if (game.hazards.length > GAMEPLAY_VALUES.boss.hazardLimit) game.hazards.splice(0, game.hazards.length - GAMEPLAY_VALUES.boss.hazardLimit);
}
// 追击、前摇、施法和硬直四阶段，冲锋阶段才允许野猪造成身体撞击伤害。
export function updateBoss(game, dt, previousPlayer = game.player) {
  const b = game.boss;
  if (!b || b.hp <= 0 || game.state !== 'playing') return;
  const motionFrom={x:b.x,y:b.y};
  try {
  const profile = bossProfile(b),
    p = attackTarget(game);
  if (['goddess','camp-barricade'].includes(p.type)) previousPlayer = p;
  // 祭坛没有角色无敌帧，贴身伤害使用独立间隔，避免随帧率提高几十倍。
  b.altarContact = Math.max(0, (b.altarContact || 0) - dt);
  const pursuit = groundPursuit(b, p, dt, true, playerThreatRange(game));
  b.wet = Math.max(0, (b.wet || 0) - dt);
  b.chill = Math.max(0, (b.chill || 0) - dt);
  if (!b.chill) b.chillFactor = 1;
  b.flash = Math.max(0, b.flash - dt);
  b.heavyHit = Math.max(0, (b.heavyHit || 0) - dt);
  b.heavyFxCooldown = Math.max(0, (b.heavyFxCooldown || 0) - dt);
  // 原巨兽保持贴身伤害，新领主则依靠可躲避技能施压。
  if (profile.id === 'moss' && !pursuit.holding && pursuit.direct &&
      worldDistance(b, p===game.player?energyShieldMeleeTarget(game,b):p) < (b.radius || GAMEPLAY_VALUES.boss.radius) + GAMEPLAY_VALUES.boss.contactPadding && (p.type !== 'goddess' || b.altarContact <= 0)) {
    hurtTarget(game, b.damage ?? GAMEPLAY_VALUES.boss.baseContactDamage);
    if (p.type === 'goddess') b.altarContact = GAMEPLAY_VALUES.boss.altarContactInterval;
    if (game.state !== 'playing') return;
  }
  const a = b.ai;
  if (a && a.phase !== 'chase') {
    const timing=a.timing||profile,signature=!a.skill;
    // 冲锋预警保持实际施法起点，锁定方向不再追踪玩家。
    if (signature && profile.id === 'boar' && a.phase === 'windup') {
      const lane = game.hazards.find((h) => h.owner === b.id && h.kind === 'charge');
      if (lane) {
        lane.x = b.x;
        lane.y = b.y;
      }
    }
    let budget = dt;
    while (budget > 1e-8 && a.phase !== 'chase') {
      const duration =
        a.phase === 'windup'
          ? timing.windup
          : a.phase === 'cast'
            ? timing.active
            : timing.recovery;
      const step = Math.min(budget, Math.max(0, duration - a.elapsed));
      if(signature&&a.phase==='cast'&&profile.id==='dumpling'&&step>0){
        const t=Math.min(1,(a.elapsed+step)/profile.leap.duration);
        b.x=a.leapFrom.x+(a.leapTo.x-a.leapFrom.x)*t;
        b.y=a.leapFrom.y+(a.leapTo.y-a.leapFrom.y)*t;
      }
      if (signature && a.phase === 'cast' && profile.id === 'boar' && step > 0 && !a.shieldBlocked) {
        const from = { x: b.x, y: b.y };
        moveBody(
          b,
          ((a.dx * a.length) / profile.active) * step,
          ((a.dy * a.length) / profile.active) * step,
          WORLD,
        );
        const shieldContact=p===game.player?traceEnergyShield(game,from,b,previousPlayer,b.radius):null;
        if (!a.hit && !pursuit.holding && (b.arena || clearWaterPath(b, p)) &&
            (shieldContact||bossSweep(from, b, previousPlayer, p, b.radius))) {
          if(shieldContact){b.x=from.x+(b.x-from.x)*shieldContact.t;b.y=from.y+(b.y-from.y)*shieldContact.t;a.shieldBlocked=true;}
          hurtTarget(game, b.blastDamage ?? GAMEPLAY_VALUES.boss.baseBlastDamage,shieldContact||b);
          a.hit = true;
        }
        // 盾面截停后再记录实际位移和沿途破树，避免高步长越过屏障破坏后方树木。
        a.travel=(a.travel||0)+worldDistance(from,b);
        breakTreesAlong(game, from, b, b.radius);
        if (Math.floor((a.elapsed + step) / 0.08) > Math.floor(a.elapsed / 0.08))
          game.fx.add('smoke', from.x, from.y, 0.35, { size: 14, color: '#d6c09b' });
      }
      a.elapsed += step;
      budget -= step;
      if (a.elapsed >= duration - 1e-8) {
        if (signature && profile.id === 'boar' && a.phase === 'cast'){game.burst(b.x, b.y, '#c8b28a', 12);
          game.recordStoryEvent?.('charge-end',{hit:a.hit,travel:a.travel||0});}
        a.phase = a.phase === 'windup' ? 'cast' : a.phase === 'cast' ? 'recover' : 'chase';
        a.elapsed = 0;
        if (a.phase === 'chase') b.attack = timing.interval;
      }
    }
    return;
  }
  const d = worldDistance(b, p),
    goal = pursuit.goal;
  if (!(b.knockTime > 0) && (pursuit.holding || d > profile.stop || !pursuit.direct)) {
    const heading = Math.atan2(goal.y - b.y, goal.x - b.x);
    const speed =
      (b.speed ?? profile.speed) * Math.min(b.wet ? GAMEPLAY_VALUES.combat.wetSpeedFactor : 1, b.chill ? b.chillFactor : 1);
    const travel = Math.min(speed * dt, Math.hypot(goal.x - b.x, goal.y - b.y));
    moveBody(b, Math.cos(heading) * travel, Math.sin(heading) * travel, WORLD);
  }
  b.attack = (b.attack ?? GAMEPLAY_VALUES.boss.firstAttackDelay) - dt;
  const melee = ['boar','moss','dumpling'].includes(profile.id);
  if (b.attack <= 0 && d < GAMEPLAY_VALUES.boss.attackRange && (!melee || (!pursuit.holding && pursuit.direct))) {
    beginAttack(game, b, profile);
    b.ai.elapsed = dt;
  }
  } finally {advanceDumplingMotion(b,motionFrom,dt);}
}
// 预警期不造成伤害；羽刃与震波每次施法只命中一次，孢子按固定间隔灼伤。
export function updateBossHazards(game, dt, previousPlayer = game.player) {
  if (game.state !== 'playing') return;
  // 回到生活区立即结束追击技能；普通章节和秘境保持原技能生命周期。
  if(livingForest(game)&&livingSafePoint(game.player)){game.hazards=[];return;}
  const target = attackTarget(game), targetRadius = target.type === 'goddess' ? target.radius : PLAYER_RADIUS;
  if (['goddess','camp-barricade'].includes(target.type)) previousPlayer = target;
  for (const h of game.hazards) {
    if (h.owner != null && (!game.boss || game.boss.hp<=0 || game.boss.id !== h.owner)) {
      h.expired = true;
      continue;
    }
    const before = h.age || 0;
    h.age = before + dt;
    if (before >= h.warmup + h.duration) continue;
    if (h.age < h.warmup || h.kind === 'charge' || h.kind === 'summon') continue;
    const active = Math.min(h.duration, h.age - h.warmup),
      prev = Math.max(0, before - h.warmup);
    const point = nearest(target, h);
    let touches = false,impactSource=h;
    if (h.kind === 'feather') {
      const from = { x: h.x + h.dx * Math.min(h.length,h.speed*prev), y: h.y + h.dy * Math.min(h.length,h.speed*prev) };
      const to = { x: h.x + h.dx * Math.min(h.length,h.speed*active), y: h.y + h.dy * Math.min(h.length,h.speed*active) };
      if(livingBoltBlocked(game,{...from,vx:to.x-from.x,vy:to.y-from.y},1)){h.expired=true;continue;}
      breakTreesAlong(game, from, to, h.radius);
      const shield=target===game.player?traceEnergyShield(game,from,to,previousPlayer,h.radius):null;
      touches=!!shield||bossSweep(from,to,previousPlayer,target,h.radius);
      impactSource=shield||from;if(shield)h.expired=true;
    } else if (h.kind === 'wave') {
      const r0=h.radius+prev*h.speed,r1=h.radius+active*h.speed;
      breakTreesInRing(game, h, Math.max(0,Math.min(r0,r1)-h.width/2),Math.max(r0,r1)+h.width/2);
      const s0 = worldDistance(previousPlayer, h) - (h.radius + prev * h.speed);
      const s1 = worldDistance(point, h) - (h.radius + active * h.speed);
      touches = s0 * s1 <= 0 || Math.min(Math.abs(s0), Math.abs(s1)) <= h.width / 2 + targetRadius;
    } else if(h.kind==='cone'||h.kind==='lane'){
      touches=bossSkillTouches(h,target,targetRadius);
      if(!game.boss?.arena&&hoveringOverWater(target))touches=false;
    } else {
      breakTreesInRing(game, h, 0, h.radius);
      touches = worldDistance(point, h) <= h.radius + targetRadius;
      // 已预警的地面重砸也不能波及飞到河面上的直升机；远程孢子照常命中。
      if (h.kind === 'slam' && !game.boss?.arena && hoveringOverWater(target)) touches = false;
    }
    if (h.kind === 'spore') h.tick = Math.max(0, h.tick - dt);
    if (touches && !h.hit && !(h.tick > 0)) {
      hurtTarget(game, h.damage,impactSource);
      if (h.kind === 'spore') h.tick = GAMEPLAY_VALUES.boss.sporeTickInterval;
      else h.hit = true;
    }
    if (!h.fired) {
      h.fired = true;
      if(h.family==='dumpling')game.fx.add('gel-impact',h.x,h.y,.7,{size:h.radius,color:h.color});
      else game.burst(h.x, h.y, h.color, h.kind === 'spore' ? 7 : 12);
    }
    if (game.state !== 'playing') break;
  }
  game.hazards = game.hazards.filter((h) => !h.expired && h.age < h.warmup + h.duration);
}
