import {biomeBoltStep} from './biome-bolt-motion.js';
import {campBarricadeTarget,hurtCampBarricade} from '../core/camp/camp-defense.js';
import {surfaceTargetVisible,surfaceAttackRange} from '../world/surface-vision.js';
import {traceEnergyShield} from './energy-shield-surface.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 普通远程状态机与有界慢弹：前摇锁点、击退打断、共享发射间隔，不产生弹幕。
import { RANGED_ENEMIES, RANGED_LIMITS, rangedMuzzle } from '../config/ranged-enemies.js';
import {livingBoltBlocked} from '../world/living-spaces.js';
import { nearest, WORLD, worldDistance } from '../world/coordinates.js';
import { groundPursuit } from '../physics/ground-pursuit.js';
import { moveBody } from '../physics/motion.js';
import { segmentCircle } from './collision.js';
import { damageCompanion } from './companion-targets.js';

// 只有已经进入实际可见区域的普通远程怪才蓄力，避免手机画外偷袭。
function visibleShooter(game, enemy) {
  if(!surfaceTargetVisible(game,enemy))return false;
  const view = game.arrivalView;
  if (!view) return worldDistance(enemy, game.player) <= RANGED_ENEMIES[enemy.species].reach;
  const p = nearest(enemy, game.player), x = p.x - game.player.x, y = p.y - game.player.y;
  return x > view.left + 12 && x < view.right - 12 && y > view.top + 55 && y < view.bottom - 36;
}

// 前摇和在途弹共用容量，近战贴近时仍原地蓄力，不无限后撤风筝玩家。
export function updateRangedAttack(game, enemy, victim, dt) {
  const profile = RANGED_ENEMIES[enemy.species], a = enemy.assault;
  if (!profile || enemy.hp <= 0 || dt <= 0) return;
  if (enemy.knockTime > 0) { a.phase = 'recovery'; a.elapsed = 0; return; }
  const slow = Math.min(enemy.wet ? GAMEPLAY_VALUES.combat.wetSpeedFactor : 1, enemy.chill ? enemy.chillFactor || GAMEPLAY_VALUES.combat.defaultChillFactor : 1);
  if (a.phase === 'recovery') {
    a.elapsed += dt * slow;
    if (a.elapsed >= profile.recovery) { a.phase = 'chase'; a.elapsed = 0; }
    return;
  }
  if (a.phase === 'windup') {
    if (!visibleShooter(game, enemy) || victim.hp <= 0) { a.phase = 'recovery'; a.elapsed = 0; return; }
    a.elapsed += dt * slow;
    if (a.elapsed < profile.windup) return;
    // 已完成瞄准的怪物等待共享发射空隙，不再空耗整个恢复期；间隔避免同帧齐射。
    if (game.enemyBolts.length < (game.boss ? 1 : RANGED_LIMITS.bolts) && game.rangedShotTimer <= 0) {
      const muzzle = rangedMuzzle(enemy);
      game.enemyBolts.push({ species: enemy.species, owner: enemy.id, ...muzzle,
        dx: a.dirX, dy: a.dirY, radius: profile.radius, speed: profile.speed, remaining: profile.splash ? Math.min(profile.range, Math.max(0,(a.endX-muzzle.x)*a.dirX+(a.endY-muzzle.y)*a.dirY)) : profile.range,
        splash: profile.splash || 0, endX: a.endX, endY: a.endY,
        damage: enemy.damage, age: 0 });
      game.rangedShotTimer = game.boss ? RANGED_LIMITS.bossShotGap : RANGED_LIMITS.shotGap;
      a.phase = 'recovery'; a.elapsed = 0;
    }
    return;
  }
  const point = nearest(victim, enemy), distance = Math.hypot(point.x - enemy.x, point.y - enemy.y);
  const pursuit = enemy.arena ? { goal: point, direct: true } : groundPursuit(enemy, victim, dt, true, surfaceAttackRange(game,profile.reach));
  if (distance <= surfaceAttackRange(game,profile.reach) && pursuit.direct && visibleShooter(game, enemy)) {
    if (game.rangedShotTimer > 0 || game.enemyBolts.length >= (game.boss ? 1 : RANGED_LIMITS.bolts)) return;
    const dx = point.x - enemy.x, dy = point.y - (enemy.y - 15), aimDistance = Math.hypot(dx, dy);
    Object.assign(a, { phase: 'windup', elapsed: 0, originX: enemy.x, originY: enemy.y,
      dirX: aimDistance ? dx / aimDistance : 1, dirY: aimDistance ? dy / aimDistance : 0,
      endX: point.x, endY: point.y });
    return;
  }
  const goal = pursuit.goal, dx = goal.x - enemy.x, dy = goal.y - enemy.y, length = Math.hypot(dx, dy);
  if (length < .001) return;
  const travel = Math.min(length, enemy.speed * slow * dt), old = { x: enemy.x, y: enemy.y };
  moveBody(enemy, dx / length * travel, dy / length * travel, WORLD, enemy.radius, game.trees);
  enemy.rangedWalk = (enemy.rangedWalk || 0) + Math.hypot(enemy.x - old.x, enemy.y - old.y) / 7;
}

// 相对扫掠保留玩家/伙伴本帧移动，树干优先遮挡；一颗弹只命中一个对象。
export function updateEnemyBolts(game, dt, previousPlayer, companions = []) {
  if (game.state !== 'playing' || dt <= 0) return;
  game.rangedShotTimer = Math.max(0, game.rangedShotTimer - dt);
  // 领主刚入场时立即收紧普通弹量，旧弹不能越过本阶段预算。
  if (game.boss && game.enemyBolts.length > 1) game.enemyBolts.length = 1;
  if (!game.enemyBolts.length) return;
  const alive = new Set(game.enemies.filter(e => e.hp > 0).map(e => e.id));
  for (const b of game.enemyBolts) {
    if (!alive.has(b.owner)) { b.remaining = 0; continue; }
    const step=b.dumplingVariant?biomeBoltStep(b,dt):null,travel=step?.travel??Math.min(b.remaining,b.speed*dt),from={x:b.x,y:b.y},to=step?.to??{x:b.x+b.dx*travel,y:b.y+b.dy*travel};
    // 弧线使用本帧真实弦段检查墙体，避免以旧方向检查另一路径。
    if(livingBoltBlocked(game,{...from,vx:(to.x-from.x)/dt,vy:(to.y-from.y)/dt},dt)){b.remaining=0;continue;}
    let hit = null, fraction = Infinity;
    for (const tree of game.trees) {
      if (tree.hp <= 0) continue;
      const t = segmentCircle(from, to, nearest(tree, from), tree.radius + b.radius);
      if (t !== null && t < fraction) { fraction = t; hit = { tree }; }
    }
    const shield=traceEnergyShield(game,from,to,previousPlayer,b.radius);
    if(shield&&shield.t<fraction){fraction=shield.t;hit={node:game.player,shield};}
    const barrier=b.campBarrier?campBarricadeTarget(game,{x:b.endX,y:b.endY}):null;
    for (const target of b.splash ? [] : [{ node: game.player, previous: previousPlayer }, ...companions,...(barrier?[{node:barrier,barrier:true}]:[])]) {
      if (target.node.hp <= 0) continue;
      const p = nearest(target.node, from), previous = nearest(target.previous || target.node.previous || target.node, p);
      const t = segmentCircle({ x: from.x - previous.x, y: from.y - previous.y },
        { x: to.x - p.x, y: to.y - p.y }, { x: 0, y: 0 }, b.radius + (target.node.radius || 12));
      if (t !== null && t < fraction) { fraction = t; hit = target; }
    }
    b.x = to.x; b.y = to.y; b.age += dt; b.remaining -= travel;
    if (hit) {
      b.remaining = 0;
      if (!hit.tree) {
        if (hit.node === game.player) game.hurt(b.damage,{...(hit.shield||from),damageType:b.splash?'explosion':null});
        else if(hit.barrier)hurtCampBarricade(game,b.damage);
        else damageCompanion(hit, b.damage);
      }
      if(hit.shield&&b.splash){b.x=hit.shield.x;b.y=hit.shield.y;detonateEnemyShell(game,b,companions,true);}
      if(!hit.shield)game.fx.add('smoke', from.x + (to.x - from.x) * fraction, from.y + (to.y - from.y) * fraction,
        .22, { size: 5, color: '#d6c5a1' });
    }
    // 重炮只在预告落点引爆一次，树干提前截住则不会穿过掩体炸到玩家。
    if (b.splash && b.remaining <= 0 && !hit) detonateEnemyShell(game, b, companions);
    if (game.state !== 'playing') break;
  }
  game.enemyBolts = game.enemyBolts.filter(b => b.remaining > 0);
}

// 范围伤害与预警共用真实半径，掩体遮挡每个目标，伙伴与角色分别结算一次。
function detonateEnemyShell(game, shell, companions, skipPlayer=false) {
  const center = { x: shell.x, y: shell.y };
  const barrier=shell.campBarrier?campBarricadeTarget(game,{x:shell.endX,y:shell.endY}):null;
  for (const target of [...(skipPlayer?[]:[{ node: game.player }]), ...companions,...(barrier?[{node:barrier,barrier:true}]:[])]) {
    if (target.node.hp <= 0 || worldDistance(center, target.node) > shell.splash) continue;
    const point = nearest(target.node, center);
    if (game.trees.some(tree => tree.hp > 0 && segmentCircle(center, point, nearest(tree, center), tree.radius) !== null)) continue;
    const amount = shell.damage * (worldDistance(center, point) <= shell.splash * GAMEPLAY_VALUES.ranged.fullSplashRadiusRatio ? 1 :GAMEPLAY_VALUES.ranged.edgeSplashDamageRatio);
    if (target.node === game.player) game.hurt(amount,{...center,damageType:'explosion'}); else if(target.barrier)hurtCampBarricade(game,amount);else damageCompanion(target, amount);
  }
  game.fx.add('blast', shell.x, shell.y, .3, { size: shell.splash, color: '#e4b16d' });
  game.fx.add('ring', shell.x, shell.y, .38, { size: shell.splash, color: '#b76543' });
}
