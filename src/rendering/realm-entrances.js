// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawWorldSign } from './world-signs.js';
import { drawFireStation } from './fire-rescue.js';
import { box, oval, poly, outline } from './primitives.js';

// 三座秘境建筑沿用森林描边、奶油石材和有限明暗面，按脚底参与场景遮挡。

// 塔楼沿用样品暖棕轮廓，其他秘境保持原接口。

// 细节开关只控制局部绘制，保留共同分层与动作输入。

const COLORS = {
  rogue: { light: '#d9c7ed', main: '#9c86bd', dark: '#655b86', glow: '#f5dbff' },
  tower: { light: '#fae4ac', main: '#c6a367', dark: '#887342', glow: '#fff0b5' },
  guardian: { light: '#c7ebd4', main: '#73b4a4', dark: '#477e72', glow: '#c4fff1' },
};
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRealmEntranceGround(c, item, night = 0) {
  c.save();
  c.translate(item.x, item.y);
  oval(c, 10, 6, item.width / 2 + 11, 22, night > 0.5 ? '#172e3445' : '#426a4433');
  for (const [x, y, w] of [
    [-7, 31, 22],
    [7, 49, 19],
    [-4, 67, 15],
  ])
    poly(
      c,
      [
        [x - w, y - 5],
        [x + 5, y - 9],
        [x + w, y],
        [x + 8, y + 7],
        [x - w + 2, y + 5],
      ],
      night > 0.5 ? '#778d81' : '#d6d6b3',
      '#81967a',
      1,
    );
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawRogue(c, color, pulse) {
  box(c, -49, -102, 98, 105, [46, 46, 5, 5], '#b4bfa9', outline, 3);
  box(c, -34, -91, 68, 92, [33, 33, 3, 3], color.dark, outline, 2);
  box(c, -27, -84, 54, 80, [26, 26, 3, 3], color.main);
  oval(c, -3, -41, 20, 35, color.light);
  oval(c, 3, -43, 12, 27, color.main);
  for (const [x, y, a] of [
    [-42, -25, -0.2],
    [-40, -64, -0.4],
    [-21, -96, -0.8],
    [20, -96, 0.8],
    [41, -64, 0.4],
    [42, -25, 0.2],
  ]) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    box(c, -4, -6, 8, 12, 2, color.light, outline, 1);
    c.restore();
  }
  poly(
    c,
    [
      [-11, -113],
      [0, -125],
      [12, -112],
      [0, -99],
    ],
    color.light,
    outline,
    2,
  );
  poly(
    c,
    [
      [-61, -2],
      [-58, -27],
      [-48, -36],
      [-42, -12],
      [-48, 0],
    ],
    color.main,
  );
  poly(
    c,
    [
      [44, 1],
      [45, -21],
      [56, -32],
      [62, -5],
    ],
    color.light,
  );
  star(c, 0, -47, 12 + pulse, color.glow);
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawTower(c, color, pulse) {
  style.realmEntrances.fineTower
    ? poly(
        c,
        [
          [-35, 0],
          [-35, -76],
          [4, -88],
          [38, -73],
          [38, 0],
        ],
        '#ddd8b8',
      )
    : poly(
        c,
        [
          [-35, 0],
          [-35, -76],
          [4, -88],
          [38, -73],
          [38, 0],
        ],
        '#f1d9a3',
        outline,
        3.5,
      );
  style.realmEntrances.fineTower
    ? poly(
        c,
        [
          [4, -88],
          [38, -73],
          [38, 0],
          [4, 8],
        ],
        '#a4ad90',
      )
    : poly(
        c,
        [
          [4, -88],
          [38, -73],
          [38, 0],
          [4, 8],
        ],
        '#c6ac7c',
        outline,
        3,
      );
  style.realmEntrances.fineTower
    ? poly(
        c,
        [
          [-45, -77],
          [0, -99],
          [46, -78],
          [5, -64],
        ],
        color.main,
      )
    : poly(
        c,
        [
          [-45, -77],
          [0, -99],
          [46, -78],
          [5, -64],
        ],
        color.main,
        outline,
        3.5,
      );
  poly(
    c,
    [
      [-45, -77],
      [0, -99],
      [5, -83],
    ],
    color.light,
    null,
  );
  box(c, -24, -122, 48, 40, 3, style.realmEntrances.drawTowerColor, outline, style.realmEntrances.drawTowerValue);
  poly(
    c,
    [
      [9, -122],
      [24, -122],
      [24, -82],
      [9, -87],
    ],
    '#acb397',
    null,
  );
  style.realmEntrances.fineTower
    ? poly(
        c,
        [
          [-34, -122],
          [0, -155],
          [34, -122],
          [0, -109],
        ],
        color.main,
      )
    : poly(
        c,
        [
          [-34, -122],
          [0, -155],
          [34, -122],
          [0, -109],
        ],
        color.main,
        outline,
        3.5,
      );
  poly(
    c,
    [
      [-34, -122],
      [0, -155],
      [0, -109],
    ],
    color.light,
    null,
  );
  box(c, -12, -101, 24, 13, 6, color.dark, outline, 1.5);
  box(c, -17, -44, 34, 46, [17, 17, 2, 2], color.dark, outline, 2);
  box(c, -10, -36, 20, 35, [10, 10, 1, 1], color.glow);
  for (const [x, y] of [
    [-22, -61],
    [20, -52],
    [-23, -22],
    [18, -16],
  ])
    box(c, x, y, 12, 5, 1, '#a9b394');
  c.strokeStyle = outline;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, -152);
  c.lineTo(0, -164);
  c.stroke();
  poly(
    c,
    [
      [2, -164],
      [26, -158],
      [2, -151],
    ],
    color.main,
    outline,
    1.5,
  );
  star(c, 0, -57, 7 + pulse * 0.3, color.glow);
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawGuardian(c, color, pulse) {
  for (const sign of [-1, 1]) {
    poly(
      c,
      [
        [sign * 9, -69],
        [sign * 43, -105],
        [sign * 37, -70],
        [sign * 18, -48],
      ],
      color.light,
    );
    box(c, sign * 50 - 7, -43, 14, 39, 3, '#b7c5ad', outline, 2);
    oval(c, sign * 50, -44, 11, 5, color.dark, outline, 1.5);
    star(c, sign * 50, -55, 7 + pulse * 0.4, color.glow);
  }
  oval(c, 0, -108, 20, 8, color.main, outline, 2);
  oval(c, 0, -108, 13, 4, color.glow);
  poly(
    c,
    [
      [-8, -76],
      [-25, -16],
      [0, -8],
      [27, -16],
      [8, -76],
    ],
    '#e7e4c7',
  );
  poly(
    c,
    [
      [5, -74],
      [27, -16],
      [0, -8],
    ],
    '#a9c1b2',
    null,
  );
  oval(c, 0, -85, 12, 15, '#f3e9c9', outline, 2);
  poly(
    c,
    [
      [-12, -85],
      [-10, -101],
      [0, -107],
      [12, -99],
      [13, -83],
      [5, -94],
    ],
    color.main,
    outline,
    2,
  );
  poly(
    c,
    [
      [-9, -70],
      [-21, -54],
      [0, -40],
      [21, -54],
      [10, -70],
      [0, -57],
    ],
    color.light,
    outline,
    2,
  );
  star(c, 0, -49, 9 + pulse * 0.4, color.glow);
  box(c, -30, -15, 60, 16, 4, '#a8b89f', outline, 2);
  oval(c, -42, 5, 15, 6, '#80a66b');
  oval(c, 43, 5, 12, 5, '#96b979');
}
// 共用绘制与动作输入，风格差异由配置提供。
function star(c, x, y, r, color) {
  poly(
    c,
    [
      [x, y - r],
      [x + r * 0.28, y - r * 0.28],
      [x + r * 0.65, y],
      [x + r * 0.28, y + r * 0.28],
      [x, y + r],
      [x - r * 0.28, y + r * 0.28],
      [x - r * 0.65, y],
      [x - r * 0.28, y - r * 0.28],
    ],
    color,
    null,
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRealmEntrance(c, item, night = 0, player = null, time = 0, reduced = false) {
  if (item.mode === 'fire')
    return drawFireStation(c, item, player, reduced ? 0 : time, item.worldLayers ? 'front' : 'all');
  c.save();
  c.translate(item.x, item.y);
  if (player && !player.flying) {
    const dx = Math.abs(player.x - item.x),
      dy = player.y - item.y;
    const overlap = Math.max(0, Math.min(1, (item.width / 2 - dx) / 20, -dy / 18, (dy + item.height) / 20));
    c.globalAlpha *= 1 - 0.48 * overlap;
  }
  const color = COLORS[item.mode],
    pulse = reduced ? 0 : Math.sin(time * 2) * 1.4;
  // 石台厚度和明暗侧面统一，三种建筑可以融入同一营地。
  oval(c, 0, 3, item.width / 2, 15, night > 0.5 ? '#6c857a' : '#929f80', outline, 2);
  oval(c, 0, -3, item.width / 2, 15, night > 0.5 ? '#a8b8a0' : '#dad9b3', outline, 2);
  if (item.mode === 'rogue') drawRogue(c, color, pulse);
  else if (item.mode === 'tower') drawTower(c, color, pulse);
  else drawGuardian(c, color, pulse);
  drawWorldSign(c, { tower: '时空之塔', rogue: '肉鸽远征', guardian: '守护女神' }[item.mode], 0, -5);
  c.restore();
}
