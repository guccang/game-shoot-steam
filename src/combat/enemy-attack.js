import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import { GAMEPLAY_TABLES } from '../config/gameplay-tables.js';
import { ARMORED } from '../config/armored-enemies.js';
import { RANGED_ENEMIES } from '../config/ranged-enemies.js';
// 参考 TopDownShoot 的停止追踪、锁定落点、扑击后回位，改为可走位躲避的二维攻击。
import { nearest } from '../world/coordinates.js';
import { segmentCircle } from './collision.js';
import { clearWaterPath, moveBody } from '../physics/motion.js';
import { groundPursuit } from '../physics/ground-pursuit.js';
import { FLYING_ATTACK } from '../config/enemies.js';
export const PLAYER_RADIUS = GAMEPLAY_VALUES.player.collisionRadius;
export const ATTACK_PROFILES = GAMEPLAY_TABLES.enemyAttacks;
// 重新生成怪物时初始化攻击状态；瞬态攻击不会写入存档。
export function createEnemyAttack() {
  return { phase: 'chase', elapsed: 0, hit: false };
}
// 普通怪与精英怪分别使用轻快和偏重的攻击节奏。
export function attackProfile(enemy) {
  const base = (enemy.species===ARMORED.id ? ARMORED.attack : null) || RANGED_ENEMIES[enemy.species] || (enemy.flying ? FLYING_ATTACK : ATTACK_PROFILES[enemy.tough ? 'tough' : 'normal']);
  return { ...base, damage: enemy.damage ?? base.damage };
}
// 开始前摇即锁定位置和方向；之后玩家移动不会改变本次扑击路线。
function beginAttack(enemy, player, bounds, targetRadius=PLAYER_RADIUS) {
  const a = enemy.assault,
    dx = player.x - enemy.x,
    dy = player.y - enemy.y,
    distance = Math.hypot(dx, dy);
  a.phase = 'windup';
  a.elapsed = 0;
  a.hit = false;
  a.originX = enemy.x;
  a.originY = enemy.y;
  a.dirX = distance > 0.001 ? dx / distance : 1;
  a.dirY = distance > 0.001 ? dy / distance : 0;
  const travel = Math.max(0, distance - (enemy.radius + targetRadius) * GAMEPLAY_VALUES.enemy.lungeOverlapRatio);
  a.endX = enemy.x + a.dirX * travel;
  a.endY = enemy.y + a.dirY * travel;
}
// 更新追击或攻击；只有去程扫中玩家才返回伤害，每次扑击最多触发一次。
export function updateEnemyAttack(enemy, player, previousPlayer, dt, bounds, dangerRange = GAMEPLAY_VALUES.enemy.defaultDangerRange) {
  if (enemy.hp <= 0 || dt <= 0 || enemy.knockTime > 0) return 0;
  // 固定任务目标显式声明受击半径；普通角色和既有目标保留原碰撞尺寸。
  const shieldSurface=player.shieldSurface;
  const targetRadius=player.attackRadius??PLAYER_RADIUS;
  // 在最近镜像只保留坐标之前读取飞行状态，岸边站位不能替代真实攻击目标。
  const pursuit = enemy.flying || enemy.arena
    ? { goal: nearest(player, enemy), direct: true, holding: false }
    : groundPursuit(enemy, player, dt, !enemy.assault || enemy.assault.phase === 'chase', dangerRange);
  player = nearest(player, enemy);
  previousPlayer = nearest(previousPlayer, player);
  const a = (enemy.assault ||= createEnemyAttack()),
    profile = attackProfile(enemy);
  if (a.phase === 'chase') {
    // 导航与前摇共享本帧通路结果，避免同一条河道逐点检查两次。
    const { direct, goal } = pursuit,
      dx = goal.x - enemy.x,
      dy = goal.y - enemy.y,
      distance = Math.hypot(dx, dy);
    if (direct && distance <= profile.reach) beginAttack(enemy, player, bounds,targetRadius);
    else if (distance > 0.001) {
      const travel = Math.min(
        enemy.speed * Math.min(enemy.wet ? GAMEPLAY_VALUES.combat.wetSpeedFactor : 1, enemy.chill ? enemy.chillFactor : 1) * dt,
        direct ? Math.max(0, distance - profile.reach) : distance,
      );
      const before={x:enemy.x,y:enemy.y};
      moveBody(enemy, (dx / distance) * travel, (dy / distance) * travel, bounds, enemy.species===ARMORED.id?enemy.radius:12);
      // 重装双腿由实际移动距离驱动，撞墙或停止时不原地滑步。
      if(enemy.species===ARMORED.id)enemy.armoredWalk=(enemy.armoredWalk||0)+Math.hypot(enemy.x-before.x,enemy.y-before.y)/9;
      if (direct && Math.hypot(player.x - enemy.x, player.y - enemy.y) <= profile.reach + 0.001)
        beginAttack(enemy, player, bounds,targetRadius);
    }
    return 0;
  }
  // 冰冻放慢攻击时钟而不改变已走过的轨迹，途中受冻或解冻不会倒退瞬移。
  if (enemy.chill > 0) dt *= enemy.chillFactor || GAMEPLAY_VALUES.combat.defaultChillFactor;
  let remaining = dt,
    processed = 0,
    damage = 0;
  while (remaining > 1e-8 && a.phase !== 'chase') {
    const duration = profile[a.phase],
      step = Math.min(remaining, Math.max(0, duration - a.elapsed));
    const oldX = enemy.x,
      oldY = enemy.y;
    a.elapsed += step;
    const t = Math.min(1, a.elapsed / duration);
    if (a.phase === 'lunge' || a.phase === 'returning') {
      // 去程先快后慢，回程柔和收回；位置真实变化，受击检测始终跟随怪物。
      const fraction = a.phase === 'lunge' ? 1 - (1 - t) ** 2 : 1 - t * t * (3 - 2 * t);
      moveBody(
        enemy,
        a.originX + (a.endX - a.originX) * fraction - enemy.x,
        a.originY + (a.endY - a.originY) * fraction - enemy.y,
        bounds,
        enemy.species===ARMORED.id?enemy.radius:12,
      );
    }
    if (a.phase === 'lunge' && !a.hit && !pursuit.holding &&
        (enemy.flying || enemy.arena || clearWaterPath(enemy, player))) {
      // 相对运动扫掠同时考虑玩家本帧的走位，低帧率也不会漏掉交叉接触。
      const startRatio = processed / dt,
        endRatio = (processed + step) / dt;
      const px = player.x - previousPlayer.x,
        py = player.y - previousPlayer.y;
      const start = {
        x: oldX - previousPlayer.x - px * startRatio,
        y: oldY - previousPlayer.y - py * startRatio,
      };
      const end = {
        x: enemy.x - previousPlayer.x - px * endRatio,
        y: enemy.y - previousPlayer.y - py * endRatio,
      };
      const contact=segmentCircle(start,end,{x:0,y:0},enemy.radius+targetRadius);
      if(contact!==null){
        // 撞到盾面即收回扑击；剩余去程不能继续穿入猫猫身体。
        if(shieldSurface){
          moveBody(enemy,oldX+(enemy.x-oldX)*contact-enemy.x,oldY+(enemy.y-oldY)*contact-enemy.y,bounds,enemy.species===ARMORED.id?enemy.radius:12);
          a.endX=enemy.x;a.endY=enemy.y;a.phase='returning';a.elapsed=0;
        }
        a.hit = true;
        damage = enemy.damage ?? profile.damage;
      }
    }
    remaining -= step;
    processed += step;
    if (a.elapsed >= duration - 1e-8) {
      a.phase = { windup: 'lunge', lunge: 'returning', returning: 'recovery', recovery: 'chase' }[
        a.phase
      ];
      a.elapsed = 0;
      if (a.phase === 'recovery') moveBody(enemy, a.originX - enemy.x, a.originY - enemy.y, bounds, enemy.species===ARMORED.id?enemy.radius:12);
    }
  }
  return damage;
}
