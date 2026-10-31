// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { oval, poly } from './primitives.js';
import { shorePlant } from './shore-art.js';

// 营地小景物使用暖木、冷灰石与奶油色花朵，沿用树木的左上受光和简洁描边。

export const CAMP_PROP_SIZES = {
  fence: [108, 72],
  logs: [86, 72],
  stones: [74, 64],
  flowers: [62, 44],
  reeds: [64, 70],
  driftwood: [86, 54],
  bench: [88, 70],
};
// 共用绘制与动作输入，风格差异由配置提供。
function fence(c) {
  for (const y of [-28, -14]) {
    poly(
      c,
      [
        [-43, y - 3],
        [44, y + 1],
        [44, y + 8],
        [-43, y + 4],
      ],
      style.campProps.fenceColor,
      style.campProps.fenceColor2,
      style.campProps.fenceValue,
    );
    c.strokeStyle = '#e0b777';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-41, y - 1);
    c.lineTo(42, y + 3);
    c.stroke();
  }
  for (const [x, height] of [
    [-42, 43],
    [0, 39],
    [42, 41],
  ]) {
    poly(
      c,
      [
        [x - 5, 2],
        [x - 5, -height + 5],
        [x, -height],
        [x + 6, -height + 5],
        [x + 5, 3],
      ],
      style.campProps.fenceColor3,
      style.campProps.fenceColor4,
      style.campProps.fenceValue2,
    );
    c.fillStyle = '#e4bd7d';
    c.fillRect(x - 3, -height + 7, 2.5, height - 9);
    oval(c, x + 1, -24, 1.3, 1.3, '#705d41');
    oval(c, x + 1, -10, 1.3, 1.3, '#705d41');
  }
  oval(c, -38, 2, 8, 2.3, '#7e995b');
  oval(c, 39, 3, 7, 2.5, '#8ca569');
}
// 共用绘制与动作输入，风格差异由配置提供。
function logs(c) {
  for (const [x, y] of [
    [-17, -5],
    [0, 0],
    [-8, -19],
  ]) {
    poly(
      c,
      [
        [x - 12, y - 10],
        [x + 15, y - 18],
        [x + 24, y - 7],
        [x + 1, y + 4],
      ],
      '#b87e49',
      style.campProps.logsColor,
      1.8,
    );
    c.strokeStyle = '#dfab69';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - 7, y - 10);
    c.lineTo(x + 15, y - 16);
    c.stroke();
    oval(c, x - 6, y - 4, 9, 9, '#deb077', style.campProps.logsColor2, 1.8);
    oval(c, x - 6, y - 4, 4.5, 5, '#d6a16a', '#b8804b', 1.2);
    oval(c, x - 6, y - 4, 1.3, 1.7, '#b27b47');
  }
  c.strokeStyle = '#746b46';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(9, -34);
  c.quadraticCurveTo(22, -15, 17, -5);
  c.stroke();
}
// 共用绘制与动作输入，风格差异由配置提供。
function stones(c) {
  for (const [x, y, size] of [
    [-5, -3, 1],
    [16, 2, 0.55],
    [-23, 3, 0.43],
  ]) {
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    poly(
      c,
      [
        [-16, 1],
        [-14, -16],
        [0, -27],
        [15, -17],
        [20, 2],
        [4, 7],
      ],
      style.campProps.stonesColor,
      style.campProps.stonesColor2,
      style.campProps.stonesValue,
    );
    poly(
      c,
      [
        [-14, -16],
        [0, -27],
        [12, -17],
        [3, -9],
      ],
      style.campProps.stonesColor3,
      null,
    );
    poly(
      c,
      [
        [3, -9],
        [12, -17],
        [15, -17],
        [20, 2],
        [4, 7],
      ],
      style.campProps.stonesColor4,
      null,
    );
    oval(c, -7, 2, 8, 3, '#7f9f63');
    c.restore();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function flowers(c) {
  oval(c, 0, 1, 23, 5, '#90ac67');
  for (const [x, y, pink] of [
    [-17, -5, false],
    [-4, -12, false],
    [11, -8, true],
    [20, -1, false],
  ]) {
    c.strokeStyle = '#638955';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x, 2);
    c.lineTo(x, y - 3);
    c.stroke();
    oval(c, x - 3, y + 3, 4, 1.8, '#6d995b');
    for (let petal = 0; petal < 5; petal++)
      oval(
        c,
        x + Math.cos(petal * 1.256) * 3.5,
        y - 3 + Math.sin(petal * 1.256) * 3,
        2.8,
        2.4,
        pink ? '#eab19a' : '#fff0c2',
      );
    oval(c, x, y - 3, 1.8, 1.8, '#d6a44b');
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawCampProp(c, kind) {
  if (kind === 'fence') fence(c);
  else if (kind === 'logs') logs(c);
  else if (kind === 'stones') stones(c);
  else if (kind === 'flowers') flowers(c);
  else if (kind === 'reeds') reeds(c);
  else if (kind === 'driftwood') driftwood(c);
  else if (kind === 'bench') bench(c);
}
// 共用绘制与动作输入，风格差异由配置提供。
function reeds(c) {
  for (const [x, y] of [
    [-14, 1],
    [13, 3],
    [0, -3],
  ])
    shorePlant(c, x, y);
  for (const [x, h] of [
    [-10, 26],
    [1, 38],
    [12, 30],
  ]) {
    c.strokeStyle = '#698955';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, 1);
    c.quadraticCurveTo(x - 2, -h / 2, x + 2, -h);
    c.stroke();
    oval(c, x + 2, -h, 2.7, 6, '#99754a', '#746447', 1);
    oval(c, x + 1, -h - 1, 1, 4, '#c8a373');
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function driftwood(c) {
  poly(
    c,
    [
      [-30, -4],
      [-26, -12],
      [24, -19],
      [31, -12],
      [25, -5],
      [-23, 4],
    ],
    '#ad966a',
    style.campProps.driftwoodColor,
    1.8,
  );
  poly(
    c,
    [
      [-26, -12],
      [24, -19],
      [30, -13],
      [-24, -6],
    ],
    '#d4bd89',
    null,
  );
  poly(
    c,
    [
      [4, -16],
      [11, -29],
      [16, -30],
      [12, -16],
    ],
    '#b49d71',
    style.campProps.driftwoodColor,
    1.5,
  );
  oval(c, -26, -4, 5, 7, '#d9c291', '#89744f', 1.4);
  c.strokeStyle = '#8b7954';
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(-18, -2);
  c.lineTo(20, -10);
  c.moveTo(-14, -8);
  c.lineTo(3, -10);
  c.stroke();
  oval(c, 22, 1, 4, 2, '#c1b489');
  oval(c, 30, 4, 2.5, 1.4, '#f3dfad');
}
// 共用绘制与动作输入，风格差异由配置提供。
function bench(c) {
  for (const x of [-24, 23]) {
    poly(
      c,
      [
        [x - 3, -22],
        [x + 3, -22],
        [x + 3, 5],
        [x - 3, 5],
      ],
      '#8e7850',
      style.campProps.benchColor,
      1.4,
    );
    poly(
      c,
      [
        [x + 9, -13],
        [x + 14, -13],
        [x + 14, 2],
        [x + 9, 2],
      ],
      '#9a7d51',
      style.campProps.benchColor,
      1.4,
    );
  }
  poly(
    c,
    [
      [-32, -13],
      [26, -17],
      [39, -10],
      [-18, -4],
    ],
    '#d0ae72',
    style.campProps.benchColor2,
    1.8,
  );
  poly(
    c,
    [
      [-18, -4],
      [39, -10],
      [39, -6],
      [-18, 0],
    ],
    '#9f8050',
    style.campProps.benchColor2,
    1.3,
  );
  poly(
    c,
    [
      [-32, -34],
      [28, -39],
      [28, -24],
      [-32, -19],
    ],
    '#c4a16b',
    style.campProps.benchColor2,
    1.8,
  );
  c.strokeStyle = '#e4c58c';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-29, -31);
  c.lineTo(25, -36);
  c.moveTo(-22, -11);
  c.lineTo(29, -15);
  c.stroke();
}
