// 射击表现的共享模型：弹簧后坐、枪口抬升与枪口坐标，不改变命中和移动规则。
export const PLAYER_SCALE = 1.05;
export const GUN_SCALE = 0.78;
export const RECOIL_PROFILES = [
  {
    kick: 6.4,
    rise: 0.29,
    maxKick: 9,
    maxRise: 0.36,
    stiffness: 420,
    damping: 28,
    angularStiffness: 260,
    angularDamping: 24,
    flash: 0.065,
    muzzle: 26,
  },
  {
    kick: 2.9,
    rise: 0.105,
    maxKick: 5.2,
    maxRise: 0.22,
    stiffness: 310,
    damping: 24,
    angularStiffness: 175,
    angularDamping: 18,
    flash: 0.045,
    muzzle: 36,
  },
  {
    kick: 2.5,
    rise: 0.07,
    maxKick: 5,
    maxRise: 0.2,
    stiffness: 410,
    damping: 30,
    angularStiffness: 250,
    angularDamping: 24,
    flash: 0.04,
    muzzle: 43,
  },
  {
    kick: 10,
    rise: 0.4,
    maxKick: 12,
    maxRise: 0.5,
    stiffness: 290,
    damping: 24,
    angularStiffness: 190,
    angularDamping: 20,
    flash: 0.09,
    muzzle: 38,
  },
  {
    kick: 5,
    rise: 0.2,
    maxKick: 8,
    maxRise: 0.3,
    stiffness: 330,
    damping: 26,
    angularStiffness: 220,
    angularDamping: 22,
    flash: 0.07,
    muzzle: 34,
  },
  {
    kick: 1.6,
    rise: 0.05,
    maxKick: 3,
    maxRise: 0.1,
    stiffness: 340,
    damping: 28,
    angularStiffness: 210,
    angularDamping: 22,
    flash: 0.06,
    muzzle: 34,
  },
  {
    kick: 7,
    rise: 0.27,
    maxKick: 10,
    maxRise: 0.4,
    stiffness: 340,
    damping: 27,
    angularStiffness: 230,
    angularDamping: 23,
    flash: 0.07,
    muzzle: 38,
  },
  {
    kick: 1.3,
    rise: 0.045,
    maxKick: 2.8,
    maxRise: 0.1,
    stiffness: 340,
    damping: 28,
    angularStiffness: 210,
    angularDamping: 22,
    flash: 0.1,
    muzzle: 39,
  },
  {
    kick: 13,
    rise: 0.43,
    maxKick: 15,
    maxRise: 0.52,
    stiffness: 235,
    damping: 22,
    angularStiffness: 150,
    angularDamping: 20,
    flash: 0.095,
    muzzle: 54,
  },
  {
    kick: 18,
    rise: 0.52,
    maxKick: 21,
    maxRise: 0.62,
    stiffness: 175,
    damping: 21,
    angularStiffness: 125,
    angularDamping: 20,
    flash: 0.16,
    muzzle: 60,
  },
];
// 电弧与冰晶使用独立枪口长度，沿用轻型能量武器的稳定回弹参数。
RECOIL_PROFILES.push(
  { ...RECOIL_PROFILES[1], muzzle: 42, kick: 4, rise: 0.12 },
  { ...RECOIL_PROFILES[5], muzzle: 40, kick: 3.5, rise: 0.13 },
  // 浮游炮独立承受更明显的短行程后坐，柔和回弹；不会给持有者施加冲量。
  {
    ...RECOIL_PROFILES[1],
    muzzle: 16,
    kick: 8,
    rise: 0.1,
    maxKick: 8,
    stiffness: 220,
    damping: 19,
    flash: 0.14,
  },
);

// 无人机使用独立配置槽，沿用阵列的短行程后坐。
RECOIL_PROFILES.push({ ...RECOIL_PROFILES[12], kick: 6 });
// 电锯短行程高频震动，无夸张枪口上扬；锯尖与实战画像一致。
RECOIL_PROFILES.push({ ...RECOIL_PROFILES[7], muzzle: 64, kick: 1.4, rise: 0.015,
  maxKick: 2, maxRise: 0.04, flash: 0.16 });

// 机械核心不发射弹丸，保留独立握持与轻微反馈的固定档位。
RECOIL_PROFILES.push({ ...RECOIL_PROFILES[12], muzzle: 23, kick: 1.2, rise: .02 });

// 蜘蛛控制器与母体主炮分离；控制器不承受脉冲炮的强后坐。
RECOIL_PROFILES.push({ ...RECOIL_PROFILES[15], muzzle: 23 });

// 固定 17–19 为载具专属炮；125炮大行程、低上扬与渐进阻尼回位。
RECOIL_PROFILES.push(
  {...RECOIL_PROFILES[2],muzzle:43,kick:3,maxKick:4,rise:.025,maxRise:.05},
  {...RECOIL_PROFILES[8],muzzle:78,kick:32,maxKick:32,rise:.04,maxRise:.06,stiffness:55,damping:17,flash:.055},
  {...RECOIL_PROFILES[2],muzzle:50,kick:1.3,maxKick:2.5,rise:.012,maxRise:.03,flash:.04},
);

// 双联水压喷口保留独立短行程后坐及固定炮口。
RECOIL_PROFILES.push({...RECOIL_PROFILES[3],muzzle:46,kick:6,maxKick:8,rise:.035,maxRise:.06});

// 256主炮使用独立长行程复进，旧炮的编号与参数保持原样。
RECOIL_PROFILES.push({...RECOIL_PROFILES[18],muzzle:96,kick:38,maxKick:38,stiffness:50,damping:17,flash:.07});

// 车载邻里猫召唤器没有枪口冲量，保留独立编号供车载时钟使用。
RECOIL_PROFILES.push({...RECOIL_PROFILES[15],muzzle:0,kick:0,maxKick:0});

// 新角色、重生和换枪使用全新的瞬时状态，不把后坐写入永久存档。
// 探索主炮使用独立后坐行程，短散射炮与长穿甲炮保持各自炮口。
RECOIL_PROFILES[23]={...RECOIL_PROFILES[18],muzzle:82,kick:20,maxKick:24};
RECOIL_PROFILES[24]={...RECOIL_PROFILES[21],muzzle:48,kick:16,maxKick:20};
// 地区炮管长度与独立弹簧后坐共用配置，不使用手持枪的默认枪口。
for(const [i,muzzle]of [49,68,90,49,58].entries())RECOIL_PROFILES[25+i]={...RECOIL_PROFILES[[17,18,18,17,21][i]],muzzle};
export function createRecoil() {
  return { kick: 0, kickVelocity: 0, rise: 0, riseVelocity: 0, flash: 0 };
}

// 开火时施加短冲量和少量即时位移，连射可以叠加但不能无限抬枪。
export function triggerRecoil(state, weapon) {
  // 重炮后坐与悬挂共用开火事件，空仓和无目标不会触发车身动作。
  if([18,21,23,24].includes(weapon))state.tankAge=0;
  const profile = RECOIL_PROFILES[weapon];
  state.kick = Math.min(profile.maxKick, state.kick + profile.kick * 0.45);
  state.kickVelocity = Math.min(profile.kick * 23, state.kickVelocity + profile.kick * 18);
  state.rise = Math.min(profile.maxRise, state.rise + profile.rise * 0.35);
  state.riseVelocity = Math.min(profile.rise * 23, state.riseVelocity + profile.rise * 17);
  state.flash = profile.flash;
}

// 以小步积分阻尼弹簧，低帧率与高帧率均能平稳回弹，并允许极轻微的回正余振。
export function updateRecoil(state, weapon, dt) {
  const profile = RECOIL_PROFILES[weapon];
  let remaining = Math.max(0, Math.min(0.1, dt));
  if([18,21,23,24].includes(weapon)&&Number.isFinite(state.tankAge))state.tankAge=Math.min(.8,state.tankAge+remaining);
  state.flash = Math.max(0, state.flash - remaining);
  while (remaining > 1e-8) {
    const step = Math.min(remaining, 1 / 240);
    remaining -= step;
    state.kickVelocity +=
      (-profile.stiffness * state.kick - profile.damping * state.kickVelocity) * step;
    state.riseVelocity +=
      (-profile.angularStiffness * state.rise - profile.angularDamping * state.riseVelocity) * step;
    state.kick += state.kickVelocity * step;
    state.rise += state.riseVelocity * step;
    if (state.kick > profile.maxKick) {
      state.kick = profile.maxKick;
      state.kickVelocity = Math.min(0, state.kickVelocity);
    }
    if (state.rise > profile.maxRise) {
      state.rise = profile.maxRise;
      state.riseVelocity = Math.min(0, state.riseVelocity);
    }
  }
  if (Math.abs(state.kick) < 0.001 && Math.abs(state.kickVelocity) < 0.01) {
    state.kick = 0;
    state.kickVelocity = 0;
  }
  if (Math.abs(state.rise) < 0.0001 && Math.abs(state.riseVelocity) < 0.001) {
    state.rise = 0;
    state.riseVelocity = 0;
  }
}

// 左右朝向共享同一持枪变换；竖直射击主要用高度偏移表达枪口抬升。
export function weaponPose(angle, weapon = 0, recoil = null, motionScale = 1) {
  const kick = (recoil?.kick || 0) * motionScale,
    rise = (recoil?.rise || 0) * motionScale;
  const flip = Math.cos(angle) >= 0 ? 1 : -1;
  const rotation =
    Math.atan2(Math.sin(angle), Math.abs(Math.cos(angle))) - rise * Math.abs(Math.cos(angle));
  const bodyX = -Math.cos(angle) * kick * 0.16,
    bodyY = -Math.sin(angle) * kick * 0.12;
  const gripX = flip * 10,
    gripY = -8 - rise * 7;
  const localX = 8 - kick + RECOIL_PROFILES[weapon].muzzle * GUN_SCALE,
    localY = -1.5 * GUN_SCALE;
  return {
    kick,
    rise,
    flip,
    rotation,
    bodyX,
    bodyY,
    gripX,
    gripY,
    muzzleX: bodyX + gripX + flip * (Math.cos(rotation) * localX - Math.sin(rotation) * localY),
    muzzleY: bodyY + gripY + Math.sin(rotation) * localX + Math.cos(rotation) * localY,
  };
}

// 弹道记录发射瞬间的枪口，包含角色缩放与行走起伏，和角色绘制使用同一公式。
export function muzzlePosition(player, weapon = 0) {
  const pose = weaponPose(player.angle, weapon, player.recoil);
  return {
    x: player.x + pose.muzzleX * PLAYER_SCALE,
    y: player.y + (pose.muzzleY + Math.sin(player.walkPhase || 0) * 1.5) * PLAYER_SCALE,
  };
}
