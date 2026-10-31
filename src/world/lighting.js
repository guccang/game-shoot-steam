// 固定环境灯位与光照采样：独立于战斗、存档和随机数，循环地图共用同一布局。
import {TOWN_SHIFT_X} from '../config/town-layout.js';
import { PATHS } from './biomes.js';
import { visibleBodies } from './coordinates.js';

// 稀疏布灯：桥头一对、两处道路标记，其余林地保持幽暗；火把集中于营地和路口。
export const LIGHT_FIXTURES = [
  // 灯移到营地田区东侧，灯杆与灯头都避开可播种地块。
  { kind: 'lamp', x: 1020+TOWN_SHIFT_X, y: 780 },
  { kind: 'lamp', x: PATHS[1][7].x - 34, y: 140 },
  { kind: 'lamp', x: 1170, y: 690 },
  { kind: 'lamp', x: 1420, y: 690 },
  { kind: 'torch', x: 510+TOWN_SHIFT_X, y: 1050 },
  { kind: 'torch', x: 895+TOWN_SHIFT_X, y: 1020 },
  { kind: 'torch', x: 875+TOWN_SHIFT_X, y: 1320 },
].map((item, i) =>
  Object.freeze({
    ...item,
    id: `light-${i}`,
    type: 'fixture',
    phase: i * 2.39996,
    height: item.kind === 'lamp' ? 86 : 58,
    offset: item.kind === 'lamp' ? 18 : 0,
    radius: item.kind === 'lamp' ? 145 : 112,
  }),
);

// 沿现有昼夜过渡缓慢点亮；火把小幅抖动，雨天减弱，低动态保持恒定。
export function fixturePower(fixture, time, environment, reduced = false) {
  const darkness = Math.max(0, Math.min(1, environment.night + environment.dusk * 0.6));
  const torch = fixture.kind === 'torch';
  const flicker =
    torch && !reduced
      ? 0.91 +
        Math.sin(time * 7 + fixture.phase) * 0.055 +
        Math.sin(time * 11.3 + fixture.phase) * 0.035
      : 1;
  return darkness * flicker * (1 - (environment.rain || 0) * (torch ? 0.18 : 0.04));
}

// 可见镜像包含视口外照进来的光源，不创建额外实体或改变碰撞。
export function visibleLights(view, time, environment, reduced = false) {
  return visibleBodies(LIGHT_FIXTURES, view, 190).map((fixture) => ({
    ...fixture,
    power: fixturePower(fixture, time, environment, reduced),
  }));
}

// 同一局部衰减用于树木受光与背光投影，距离衰减在边缘连续归零。
export function localIllumination(point, lights) {
  let power = 0,
    strongest = 0,
    source = null;
  for (const light of lights) {
    const distance = Math.hypot(point.x - light.x - light.offset, point.y - light.y);
    const falloff = Math.max(0, 1 - distance / light.radius);
    const value = light.power * falloff * falloff;
    power += value;
    if (value > strongest) {
      strongest = value;
      source = light;
    }
  }
  return { power: Math.min(1, power), source };
}
