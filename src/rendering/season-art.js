// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';

// 四季只重映射树叶色阶，不染白树干、改变树种或给角色套全屏滤镜。

const LEAF_RAMPS = [
  ['#315c43', '#387b54', '#67a85e', '#a5cb72', '#d1e597'],
  ['#285b4b', '#28725a', '#46976b', '#82bb7c', '#b4d790'],
  ['#82572f', '#b37938', '#dfaa4d', '#f2cc6b', '#ffe5a0'],
  ['#244e45', '#286951', '#418d66', '#75ad7c', '#afd199'],
  ['#456844', '#598653', '#9cbb68', '#d0db89'],
  ['#37644b', '#3b7d5b', '#77a96a', '#b2ca7b'],
  ['#745a3b', '#ad713d', '#dca051', '#f4cb78'],
  ['#315b4c', '#326c54', '#66976c', '#a1bc80'],
];
// 共用绘制与动作输入，风格差异由配置提供。
export function seasonalLeafColor(hex, species, season) {
  if (season === 'original' || season === 'winter') return hex;

  // 细节开关只控制局部绘制，保留共同分层与动作输入。
  if (!style.seasonArt.legacyLeafPalette) {
    const cartoon = style.referenceMaterials.leafRamps.find((ramp) => ramp.includes(hex));
    if (cartoon) {
      const level = cartoon.indexOf(hex);
      if (level === 0) return hex;
      if (season === 'autumn' && !['pine', 'cypress'].includes(species))
        return ['#69492f', '#bd914e', '#dfb562', '#edcc7c', '#edcc7c'][level];
      if (season === 'spring') return ['#594b32', '#83a568', '#a7c57e', '#c6d993', '#c6d993'][level];
      if (season === 'summer' && cartoon === style.referenceMaterials.leafRamps[2])
        return ['#594b32', '#75975a', '#98b968', '#b3ca78', '#b3ca78'][level];
      return hex;
    }
  }
  const ramp = LEAF_RAMPS.find((values) => values.includes(hex));
  if (!ramp) return hex;
  const index = ramp.indexOf(hex),
    level = Math.round((index / (ramp.length - 1)) * 4);
  if (season === 'autumn' && !['pine', 'cypress'].includes(species))
    return ['#765431', '#ae7131', '#e5a241', '#f5c768', '#ffe4a0'][level];
  if (season === 'spring') return ['#315f3e', '#4b8d46', '#7dbb52', '#b8df79', '#e1f2aa'][level];
  if (season === 'summer' && species === 'maple') return ['#28583d', '#327546', '#469449', '#72b651', '#add46f'][level];
  if (season === 'summer') return ['#24573a', '#307c43', '#4c9f4d', '#8bc55c', '#cce58e'][level];
  return hex;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSeasonCanopy(c, species, variant, season, color) {
  if (!['spring', 'summer'].includes(season)) return;
  c.save();
  c.globalCompositeOperation = 'source-atop';
  const conifer = ['pine', 'cypress'].includes(species);
  if (season === 'spring' && !conifer && variant % 2 === 0) {
    for (const [x, y] of [
      [-19, -87],
      [14, -104],
    ]) {
      for (let p = 0; p < 5; p++) {
        c.fillStyle = color('#f3d7c6');
        c.beginPath();
        c.ellipse(x + Math.cos(p * 1.256) * 3, y + Math.sin(p * 1.256) * 2.5, 2.7, 2, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = color('#d8b16e');
      c.beginPath();
      c.arc(x, y, 1.5, 0, Math.PI * 2);
      c.fill();
    }
  }
  if (season === 'summer') {
    for (const [x, y] of conifer
      ? [
          [-5, -102],
          [-9, -78],
          [-12, -52],
        ]
      : [
          [-24, -87],
          [8, -102],
          [25, -75],
        ]) {
      for (let n = 0; n < 3; n++) {
        c.fillStyle = color(n === 1 ? '#a8ce7b' : '#82b868');
        c.beginPath();
        c.ellipse(x + n * 5 - 5, y + (n % 2) * 4, 7, 3.5, -0.45 + n * 0.4, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  c.restore();
}
