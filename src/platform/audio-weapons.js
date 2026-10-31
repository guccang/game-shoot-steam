// 枪械音色按发声方式独立合成，缓存 PCM；音色随机源不影响战斗随机数。
const RATE = 22050, TAU = Math.PI * 2;
// 尚无合适的电锯录音，正式播放禁用合成噪声和接触提示，保留其他武器声音。
export const MUTED_WEAPON_SOUNDS = new Set(['chainsaw', 'chainsaw-contact']);
export const CONTINUOUS_WEAPONS = new Set(['chainsaw', 'flame']);
const FIREARMS = {
  // 时长、爆音衰减、枪体衰减、机械延迟、低频比重、尾响比重。
  pistol: [0.28, 0.014, 0.055, 0.038, 0.55, 0.12],
  gatling: [0.14, 0.009, 0.032, 0.022, 0.48, 0.06],
  shotgun: [0.55, 0.024, 0.13, 0.068, 0.95, 0.25],
  ricochet: [0.3, 0.012, 0.06, 0.045, 0.5, 0.12],
  grenade: [0.34, 0.018, 0.08, 0.05, 0.75, 0.17],
  sniper: [0.95, 0.019, 0.115, 0.075, 1.1, 0.4],
};

// 确定性噪声避免每次发射重新生成数组，同时便于检验与试听对比。
function noiseSource(kind) {
  let seed = [...kind].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 937);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
}

// 短攻击与指数释放构成气压瞬态，避免整段正弦下滑带来的玩具弹簧音。
function transient(t, decay, attack = 0.0008) {
  return t < 0 ? 0 : Math.min(1, t / attack) * Math.exp(-t / decay);
}

// 实弹分为高频爆裂、宽频气压、枪体低频、枪机金属卡扣与环境短回声。
function renderFirearm(context, kind) {
  const [duration, crack, body, slide, bass, tail] = FIREARMS[kind];
  const buffer = context.createBuffer(1, Math.ceil(RATE * duration), RATE);
  const samples = buffer.getChannelData(0), random = noiseSource(kind);
  let low = 0, air = 0, metal = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / RATE, n = random();
    low += (n - low) * 0.045;
    air += (n - air) * 0.28;
    metal += (n - metal) * 0.65;
    const pressure = (air * 2.3 + low * 5 * bass) * transient(t, body);
    const blast = (n - air) * transient(t, crack) * 1.15;
    const thump = Math.sin(TAU * (kind === 'sniper' ? 82 : 125) * t) *
      transient(t, body * 0.45) * bass * 0.25;
    const mechanism = ((n - metal) * 0.5 + Math.sin(TAU * 2450 * (t - slide)) * 0.12) *
      transient(t - slide, 0.009);
    const echo = (air * 1.2 + low * 2) * tail *
      (transient(t - 0.065, body * 1.8) + transient(t - 0.16, body * 1.5) * 0.45 +
        (kind === 'sniper' ? transient(t - 0.31, 0.13) * 0.3 : 0));
    samples[i] = Math.tanh((blast + pressure + thump + mechanism + echo) * 1.35) *
      0.74 * Math.min(1, (duration - t) / 0.035);
  }
  return buffer;
}

// 重型脉冲使用能量释放、电弧高频与长低频尾音，不混入枪机或实弹爆音。
function renderPulse(context) {
  const duration = 1.25, buffer = context.createBuffer(1, Math.ceil(RATE * duration), RATE);
  const samples = buffer.getChannelData(0), random = noiseSource('pulse');
  let bassPhase = 0, fieldPhase = 0, low = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / RATE, n = random();
    low += (n - low) * 0.09;
    bassPhase += TAU * (38 + 90 * Math.exp(-t * 11)) / RATE;
    fieldPhase += TAU * (240 + 1450 * Math.exp(-t * 9)) / RATE;
    const surge = (Math.sin(bassPhase) * 0.65 + Math.sin(bassPhase * 2) * 0.2) *
      transient(t, 0.32, 0.008);
    const field = (Math.sin(fieldPhase) * 0.2 + Math.sin(fieldPhase * 1.51) * 0.12) *
      (0.7 + 0.3 * Math.sin(TAU * 24 * t)) * transient(t, 0.17, 0.006);
    const arc = (n - low) * 0.3 * transient(t, 0.042, 0.003);
    const wake = low * 2.3 * transient(t - 0.04, 0.3, 0.03);
    samples[i] = Math.tanh((surge + field + arc + wake) * 1.5) *
      0.7 * Math.min(1, (duration - t) / 0.08);
  }
  return buffer;
}

// 连续喷流与锯链生成两秒循环；重叠交叉接缝避免每圈出现咔嗒或音量凹陷。
export function renderWeaponLoop(context, kind) {
  const length = RATE * 2, overlap = Math.round(RATE * 0.04);
  const raw = new Float32Array(length + overlap), random = noiseSource(kind);
  let low = 0, mid = 0;
  for (let i = 0; i < raw.length; i++) {
    const t = i / RATE, n = random();
    low += (n - low) * 0.025;
    mid += (n - mid) * 0.22;
    if (kind === 'chainsaw') {
      const phase = TAU * 110 * t + 0.16 * Math.sin(TAU * 3 * t);
      const motor = Math.sin(phase) + Math.sin(phase * 2) * 0.45 +
        Math.sin(phase * 3) * 0.3 + Math.sin(phase * 5) * 0.16;
      const teeth = (n - mid) * (0.45 + 0.55 * Math.sin(TAU * 880 * t) ** 2);
      raw[i] = Math.tanh(motor * 1.5) * 0.25 + teeth * 0.18 + mid * 0.2;
    } else {
      // 气流宽频嘶声叠加低频燃烧翻滚，不出现任何离散枪响包络。
      const turbulence = 0.8 + 0.12 * Math.sin(TAU * 7 * t) + 0.08 * Math.sin(TAU * 19 * t);
      raw[i] = Math.tanh(low * 5.2 + mid * 0.95) * 0.4 * turbulence + (n - mid) * 0.13;
    }
  }
  const buffer = context.createBuffer(1, length, RATE), samples = buffer.getChannelData(0);
  samples.set(raw.subarray(0, length));
  for (let i = 0; i < overlap; i++) {
    const mix = i / overlap;
    samples[i] = raw[length + i] * (1 - mix) + raw[i] * mix;
  }
  return buffer;
}

// 返回专用音色；提示、猫叫及轻型能量武器继续由原音色库管理。
export function renderWeaponSound(context, kind) {
  if (FIREARMS[kind]) return renderFirearm(context, kind);
  if (kind === 'pulse') return renderPulse(context);
  if (CONTINUOUS_WEAPONS.has(kind)) return renderWeaponLoop(context, kind);
  return null;
}
