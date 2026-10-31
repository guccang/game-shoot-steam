// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly, outline } from './primitives.js';

// 新载具的分层卡通造型：后层放在驾驶员身后，前层保留猫猫与炮塔可见。

// 重坦使用加宽履带、铆钉侧裙和厚装甲，移动时只推进履带纹路。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawHeavyRear(c, phase = 0, hull = { x: 0, y: 0, compression: 0 }) {
  oval(c, 0, 19, 58, 18, '#243c3435');
  for (const x of [-53, 31]) {
    box(c, x, -29, 22, 61, 8, style.vehicleModels.drawHeavyRearColor, outline, 3);
    for (let i = 0; i < 7; i++)
      box(c, x + 3, -26 + ((i * 8 + phase * 2) % 54), 16, 4, 1, style.vehicleModels.drawHeavyRearColor2);
    box(c, x + 4, -19, 14, 39, 4, '#60775b', outline, 2);
    for (const y of [-13, 0, 13]) oval(c, x + 11, y, 2, 2, '#c3cca1');
  }
  for (const side of [-1, 1])
    for (const y of [-17, 13]) {
      const x = side * 35;
      c.strokeStyle = style.vehicleModels.drawHeavyRear_strokeStyleColor;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x + side * 7, y + 5);
      c.lineTo(x + hull.x, y - 4 + hull.compression);
      c.stroke();
      c.strokeStyle = '#d6d3a4';
      c.lineWidth = 2;
      c.stroke();
    }
  c.save();
  c.translate(hull.x, hull.y);
  poly(
    c,
    [
      [-35, -26],
      [25, -26],
      [39, -8],
      [36, 24],
      [-36, 24],
      [-40, -8],
    ],
    style.vehicleModels.drawHeavyRearColor3,
  );
  box(c, -25, -22, 50, 28, 9, '#afbd85', outline, 3);
  oval(c, 0, -16, 22, 11, '#354c3d');
  box(c, -39, -22, 10, 27, 3, '#b3bc8a', outline, 2);
  box(c, 29, -22, 10, 27, 3, '#b3bc8a', outline, 2);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawHeavyFront(c, flash) {
  poly(
    c,
    [
      [-36, -3],
      [36, -3],
      [40, 15],
      [28, 29],
      [-28, 29],
      [-40, 15],
    ],
    flash ? '#f7e6ab' : style.vehicleModels.drawHeavyFrontColor,
  );
  poly(
    c,
    [
      [-33, 0],
      [33, 0],
      [27, 9],
      [-27, 9],
    ],
    '#cbd2a0',
    outline,
    1.5,
  );
  for (const x of [-31, 22]) box(c, x, 15, 9, 6, 2, '#f1cf7c', outline, 1.5);
  poly(
    c,
    [
      [-8, 17],
      [0, 12],
      [8, 17],
      [0, 24],
    ],
    '#caa559',
    outline,
    1.5,
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawHelicopterRear(c, phase = 0) {
  oval(c, 9, 35, 43, 13, '#243c3426');
  poly(
    c,
    [
      [-20, -10],
      [-58, -22],
      [-60, -12],
      [-25, 8],
    ],
    '#78a69b',
  );
  poly(
    c,
    [
      [-61, -15],
      [-68, -35],
      [-57, -36],
      [-49, -13],
    ],
    '#b0c7aa',
  );
  c.save();
  c.translate(-59, -22);
  c.rotate(phase * 1.4);
  box(c, -12, -2, 24, 4, 2, '#dbe5c1', outline, 1.5);
  box(c, -2, -12, 4, 24, 2, '#dbe5c1', outline, 1.5);
  c.restore();
  for (const x of [-28, 28]) {
    box(c, x - 2, 1, 4, 23, 2, '#6b8876', outline, 1.5);
    box(c, x - 10, 22, 20, 5, 2, '#d4d8ac', outline, 2);
  }
  oval(c, 0, -4, 31, 28, '#71a89b', outline, 2.5);
  oval(c, 0, -16, 25, 17, '#375d53', outline, 2);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawHelicopterFront(c, flash) {
  poly(
    c,
    [
      [-29, -6],
      [-19, 2],
      [19, 2],
      [29, -6],
      [27, 13],
      [12, 22],
      [-12, 22],
      [-27, 13],
    ],
    flash ? '#f7e6ab' : '#9bc8b2',
  );
  box(c, -20, 5, 40, 5, 2, '#d6e1bb');
  for (const x of [-24, 19]) oval(c, x, 12, 3, 3, '#efce7f', outline, 1);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawHelicopterRotor(c, time, reduced = false) {
  box(c, -3, -52, 6, 18, 2, '#82998a', outline, 2);
  c.save();
  c.translate(0, -52);
  if (!reduced) {
    oval(c, 0, 0, 66, 13, '#cddab620', '#476b5940', 1.5);
  }
  c.scale(1, 0.23);
  c.rotate(reduced ? -0.22 : time * 32);
  box(c, -65, -5, 130, 10, 4, '#4d7161', outline, 2);
  for (const x of [-63, 51]) box(c, x, -4, 12, 8, 2, '#dfc78a');
  c.restore();
  oval(c, 0, -52, 7, 5, '#d7deb9', outline, 2);
}
