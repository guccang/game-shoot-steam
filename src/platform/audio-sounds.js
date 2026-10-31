// 原创程序音色库：一次合成并缓存，不在连续开火时创建随机噪声数组。
import {FIRE_SOUNDS,renderFireSound} from './audio-fire.js';
import { renderWeaponSound } from './audio-weapons.js';
import { MACHINE_SOUNDS, renderMachineSound, machineEngineSample } from './audio-machines.js';
const WEAPON_PROFILES = {
  pistol: [0.15, 230, 65, 0.65, 0.34, 0.065],
  laser: [0.2, 1350, 360, 0.08, 0.24, 0.07],
  gatling: [0.105, 155, 55, 0.8, 0.23, 0.055],
  shotgun: [0.36, 145, 35, 0.95, 0.47, 0.15],
  ricochet: [0.25, 880, 300, 0.18, 0.29, 0.09],
  water: [0.16, 460, 150, 0.6, 0.2, 0.09],
  grenade: [0.2, 185, 55, 0.6, 0.32, 0.09],
  flame: [0.23, 70, 45, 0.95, 0.24, 0.15],
  sniper: [0.65, 100, 28, 0.9, 0.55, 0.25],
  pulse: [0.85, 420, 38, 0.42, 0.49, 0.3],
  arc: [0.25, 1700, 180, 0.4, 0.25, 0.1],
  frost: [0.34, 1900, 720, 0.12, 0.23, 0.12],
  funnel: [0.26, 1100, 440, 0.15, 0.24, 0.05],
  drone: [0.2, 740, 240, 0.2, 0.24, 0.06],
  chainsaw: [0.22, 110, 85, 0.45, 0.24, 0.15],
};
export const SOUND_PROFILES = {
  ...WEAPON_PROFILES,...MACHINE_SOUNDS,...FIRE_SOUNDS,
  // 木碗、工具、纸张和虫鸣沿用有界程序音色缓存。
  'living-bowl':[.14,680,420,.12,.10,.05],
  'living-tool':[.09,1100,500,.20,.09,.04],
  'living-paper':[.26,190,130,.8,.06,.08],
  'living-cricket':[.18,2800,2700,.02,.035,.05],
  'living-step':[.07,110,70,.55,.045,.04],
  explosion: [0.75, 80, 25, 0.92, 0.5, 0.18],
  'weapon-hit': [0.095, 480, 160, 0.85, 0.28, 0.075],
  thunder: [1.8, 45, 25, 0.98, 0.38, 1],
  'slot-pull': [0.22, 180, 65, 0.65, 0.25, 0.1],
  'slot-tick': [0.045, 900, 320, 0.7, 0.19, 0.035],
  'slot-reveal': [0.65, 660, 660, 0, 0.26, 0.2],
  purchase: [0.42, 660, 990, 0, 0.24, 0.15],
  victory: [0.85, 520, 1040, 0, 0.29, 0.6],
  'vehicle-start': [0.55, 45, 115, 0.3, 0.3, 0.4],
  'vehicle-stop': [0.4, 110, 32, 0.25, 0.23, 0.3],
  'armor-hit': [0.24, 340, 80, 0.7, 0.3, 0.22],
  'meow-start': [0.52, 420, 580, 0.02, 0.3, 1.5],
  'meow-hurt': [0.32, 750, 420, 0.04, 0.29, 1],
  'meow-happy': [0.7, 440, 720, 0.01, 0.29, 2],
  'meow-down': [0.75, 510, 220, 0.02, 0.26, 2],
  'reload-start': [0.26, 270, 85, 0.8, 0.38, 0.16],
  'reload-complete': [0.24, 400, 125, 0.65, 0.4, 0.16],
  'charge-start': [0.48, 240, 950, 0.04, 0.24, 0.2],
  'charge-complete': [0.38, 1040, 1560, 0.02, 0.28, 0.2],
};
// 按音色分类收录，不依赖对象位置；规则测试核对完整装备目录，底层音频不依赖玩法配置。
export const WEAPON_SOUNDS = new Set([...Object.keys(WEAPON_PROFILES),...Object.keys(MACHINE_SOUNDS).filter(kind=>!/^vehicle-(start|stop)-/.test(kind))]);
export const RELOAD_SOUNDS = new Set(['reload-start', 'reload-complete', 'charge-start', 'charge-complete']);
const ENERGY_WEAPONS = new Set(['laser', 'pulse', 'arc', 'frost', 'funnel', 'drone', 'chainsaw', 'mechanical-core','mechanical-spider','gravity-gun']);
const TAU = Math.PI * 2;

// 挂载系统按实际枪型选择换弹或充能音色，不按持有者误判为统一能量音。
export function reloadSound(kind, complete = false) {
  return `${ENERGY_WEAPONS.has(kind) ? 'charge' : 'reload'}-${complete ? 'complete' : 'start'}`;
}

// 合成机械瞬态、能量扫频或带共振峰的猫叫；样本随机数独立于战斗随机数。
export function renderSound(context, kind) {
  const fire=renderFireSound(context,kind);if(fire)return fire;
  const machine=renderMachineSound(context,kind);if(machine)return machine;
  const weapon = renderWeaponSound(context, kind);
  if (weapon) return weapon;
  const [duration, from, to, noiseMix, volume] = SOUND_PROFILES[kind];
  const buffer = context.createBuffer(1, Math.ceil(22050 * duration), 22050);
  const samples = buffer.getChannelData(0);
  let phase = 0, low = 0, seed = 937 + kind.length * 31;
  for (let i = 0; i < samples.length; i++) {
    const t = i / 22050, p = t / duration;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    low += ((seed / 2147483648 - 1) - low) * (kind === 'thunder' ? 0.04 : 0.38);
    let frequency = from * Math.pow(to / from, p);
    if (kind.startsWith('meow')) frequency *= 1 + 0.38 * Math.sin(p * Math.PI) + 0.025 * Math.sin(t * 55);
    if (kind === 'water') frequency *= 1 + 0.22 * Math.sin(t * 65);
    phase += TAU * frequency / 22050;
    let tone = Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.2 + Math.sin(phase * 3) * 0.1;
    if (kind.startsWith('meow')) {
      // 高次谐波由“喵”的开口到收口变化，避免只听到普通提示音。
      tone = Math.sin(phase) * 0.35 + Math.sin(phase * 2) * 0.25 +
        Math.sin(phase * 3) * (0.3 - p * 0.15) + Math.sin(phase * 5) * (0.1 + p * 0.15);
    }
    if (kind === 'arc') tone *= Math.sin(t * 230);
    if (kind === 'frost') tone = tone * 0.6 + Math.sin(phase * 2.76) * 0.4;
    const vocal = kind.startsWith('meow');
    let envelope = vocal
      ? Math.sin(Math.PI * p) ** 0.7
      : Math.min(1, t / 0.004) * Math.exp(-p * (kind === 'flame' ? 2 : 5)) * Math.min(1, (duration - t) / 0.02);
    // 两段机械卡扣区分抽出弹夹与插入上膛；充能使用柔和上扬和完成双音。
    if (kind.startsWith('reload')) {
      const second = kind === 'reload-start' ? 0.13 : 0.08;
      envelope = Math.min(1, t / 0.002) * Math.exp(-t * 55) +
        (t >= second ? Math.min(1, (t - second) / 0.002) * Math.exp(-(t - second) * 65) * 0.8 : 0);
      envelope *= Math.min(1, (duration - t) / 0.02);
    } else if (kind === 'charge-start') envelope = Math.sin(Math.PI * p) * 0.8;
    else if (kind === 'charge-complete') tone = Math.sin(phase) * 0.7 + Math.sin(phase * 1.5) * 0.3;
    // 停轮揭晓使用依次进入的大三和弦，与机械滚动卡嗒形成清楚区分。
    if (kind === 'slot-reveal') {
      tone = Math.sin(TAU * 660 * t) * 0.45 + (t > 0.08 ? Math.sin(TAU * 825 * (t - 0.08)) * 0.3 : 0) +
        (t > 0.16 ? Math.sin(TAU * 990 * (t - 0.16)) * 0.25 : 0);
      envelope = Math.min(1, t / 0.008) * Math.exp(-t * 3) * Math.min(1, (duration - t) / 0.08);
    }
    samples[i] = (tone * (1 - noiseMix) + low * noiseMix * 1.8) * envelope * volume;
  }
  return buffer;
}

// 履带、重机、旋翼、气垫和消防柴油机使用不同音色，移动时平滑提高转速。
export function renderEngine(context, index) {
  const buffer = context.createBuffer(1, 44100, 22050), samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = machineEngineSample(index,i/22050);
  }
  return buffer;
}
