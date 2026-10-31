// 重型脉冲的蓄能周期与持有者反冲：瞬时状态不进入永久存档。
import { moveBody } from '../physics/motion.js';
import { WORLD } from '../world/coordinates.js';

// 重生和换装备时清空蓄能，避免带着上一把枪的能量立即开火。
export function createPulseState() {
  return { charge: 0, cooldown: 0 };
}

// 有目标才蓄能，丢失目标立即散能；冷却结束后的剩余时间可继续充能。
export function advancePulse(state, weapon, dt, hasTarget) {
  const active = Math.max(0, dt - state.cooldown);
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.charge = hasTarget ? Math.min(weapon.chargeTime, state.charge + active) : 0;
  return hasTarget && state.charge >= weapon.chargeTime - 1e-8;
}

// 发射方向的反向冲量独立于摇杆速度，玩家持续推杆也不会取消真实后退。
export function kickHolder(player, direction, speed) {
  player.recoilX = -direction.x * speed;
  player.recoilY = -direction.y * speed;
}

// 指数阻尼积分让不同帧率的退步距离一致，小步扫掠仍受树干与河岸限制。
export function updateHolderKick(player, dt, trees) {
  const decay = Math.exp(-6 * dt),
    travel = (1 - decay) / 6;
  moveBody(
    player,
    (player.recoilX || 0) * travel,
    (player.recoilY || 0) * travel,
    WORLD,
    12,
    trees,
  );
  player.recoilX = (player.recoilX || 0) * decay;
  player.recoilY = (player.recoilY || 0) * decay;
  if (Math.hypot(player.recoilX, player.recoilY) < 0.1) player.recoilX = player.recoilY = 0;
}
