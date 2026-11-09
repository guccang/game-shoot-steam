// 小猫主体动画只记录游戏时间和步行混合权重，不改变握枪、碰撞或角色朝向。
export function createCatMotion() {
  return { idleTime: 0, moveTime: 0, moveWeight: 0, scarfLift: 0 };
}

// 按实际位移识别步行，撞墙与乘车回到待机；指数过渡在不同帧率下保持一致。
export function updateCatMotion(state, dt, speed, walking, riding = false) {
  const moving = walking && speed > 8;
  // 驾驶员保持坐姿，布尾单独根据实际车速吃风；慢速挪车时仍垂下。
  const startSpeed = riding ? 60 : 15;
  const fullSpeed = riding ? 160 : 155;
  const targetLift = walking || riding ? Math.max(0, Math.min(1, (speed - startSpeed) / (fullSpeed - startSpeed))) : 0;
  const lift = state.scarfLift ?? 0;
  state.scarfLift = lift + (targetLift - lift) * (1 - Math.exp(-8 * dt));
  state.idleTime += dt;
  state.moveTime += dt * Math.max(0.75, Math.min(1.25, speed / 150));
  state.moveWeight += ((moving ? 1 : 0) - state.moveWeight) * (1 - Math.exp(-16 * dt));
  if (Math.abs(state.moveWeight - (moving ? 1 : 0)) < 0.001) state.moveWeight = moving ? 1 : 0;
}
