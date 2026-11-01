import { updateSpider } from './spider.js';
import { updateMechanical } from './mechanical.js';
// 短时战斗表现独立消散，不推进攻击、弹药、刷怪或奖励结算。
import { nearest, WORLD } from '../world/coordinates.js';
import { stepBodies } from '../physics/motion.js';
import { updateRecoil } from './recoil.js';
import { updateFunnelIdle } from './funnel.js';

// 战斗与波间共用飘字、光束余辉、掉落图标和碎屑的寿命更新。
export function updateCombatTraces(game, dt) {
  for (const n of game.numbers) { n.y -= dt * 35; n.life -= dt; }
  for (const s of game.shots) s.life -= dt;
  for (const d of game.drops) {
    d.age=(d.age||0)+dt;
    const goal = nearest(d.destination||{x:game.player.x,y:game.player.y-20}, d);
    d.x += (goal.x - d.x) * dt * 5;
    d.y += (goal.y - d.y) * dt * 5;
    d.life -= dt;
  }
  for (const p of game.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
  }
  for (const key of ['numbers', 'shots', 'drops', 'particles']) game[key] = game[key].filter(item => item.life > 0);
}

// 秘境层间只完成已有视觉反馈；残影物理不挂载碰撞伤害回调。
export function updateRealmIntermissionEffects(game, dt) {
  // 表现时间与战斗时间分开，休整结束后继续累积偏移，避免旋翼相位倒退。
  game.realm.idleTime = (game.realm.idleTime || 0) + dt;
  updateFunnelIdle(game, dt);
  updateMechanical(game, dt, false);
  updateSpider(game, dt, false);
  game.fx.update(dt);
  updateCombatTraces(game, dt);
  stepBodies(game.remnants, dt, WORLD, undefined, game.trees);
  for (const corpse of game.remnants) corpse.life -= dt;
  game.remnants = game.remnants.filter(corpse => corpse.life > 0);
  updateRecoil(game.player.recoil, game.loadout.weapon, dt);
  game.player.flash = Math.max(0, game.player.flash - dt);
  game.realm.goddess.flash = Math.max(0, (game.realm.goddess.flash || 0) - dt);
  for (const vehicle of game.vehicles) {
    if (vehicle.weaponIndex !== null) updateRecoil(vehicle.recoil, vehicle.weaponIndex, dt);
    vehicle.flash = Math.max(0, vehicle.flash - dt);
  }
  for (const tower of game.realm.defenses || []) {
    const local = tower.runtime;
    if (!local) continue;
    if (tower.kind === 'weapon') { updateFunnelIdle(local, dt); updateMechanical(local, dt, false);updateSpider(local, dt, false); }
    local.vehicle.flash = Math.max(0, local.vehicle.flash - dt);
    updateRecoil(local.player.recoil, tower.weaponIndex, dt);
    if (local.vehicle.weaponIndex !== null) updateRecoil(local.vehicle.recoil, local.vehicle.weaponIndex, dt);
  }
}
