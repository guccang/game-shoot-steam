// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly, outline } from './primitives.js';
import { equipmentParts } from '../config/equipment-parts.js';
import { drawEquipmentPart } from './equipment-parts.js';

// 机械蜘蛛的八足、腹舱与控制器独立绘制；不依赖角色或整车缩放模拟动作。

// 八条腿分别计算肩、膝和足端，真实位移驱动相位，前足单独挥击。
// 共用绘制与动作输入，风格差异由配置提供。
function spiderLeg(c, side, row, phase, small, strike, angle, unfold) {
  const stride = Math.sin(phase) * (small ? 12 : 10),
    lift = Math.max(0, Math.cos(phase)) * (small ? 13 : 10),
    y = -23 + row * 12;
  const attack = row > 1 ? strike * 30 : 0;
  const footX = side * (29 + (22 + Math.abs(row - 1.5) * 3) * unfold) + Math.cos(angle) * (stride + attack),
    footY = y + 14 + Math.sin(angle) * (stride * 0.6 + attack) - lift;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(side * 18, y);
  const kneeX = side * (34 + unfold * 3) + Math.cos(angle) * stride * 0.4,
    kneeY = y - 8 - lift * 0.7;
  c.lineTo(kneeX, kneeY);
  c.lineTo(footX, footY);
  c.strokeStyle = outline;
  c.lineWidth = small ? 6 : 7;
  c.stroke();
  c.strokeStyle = '#91a783';
  c.lineWidth = small ? 3 : 4;
  c.stroke();
  oval(c, kneeX, kneeY, 3.5, 3.5, '#f4dca0', outline, 1.4);
  poly(
    c,
    [
      [footX - 3, footY - 2],
      [footX + 3, footY - 2],
      [footX + side * 6, footY + 4],
      [footX - 2, footY + 3],
    ],
    style.spider.spiderLegColor,
    outline,
    1.2,
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSpiderBody(c, node, weapon, reduced = false) {
  const small = !node.mother,
    scale = small ? 0.34 : 1,
    parts = weapon.parts || {};
  c.save();
  c.translate(node.x, node.y);
  c.scale(scale, scale);
  oval(c, 3, 8, small ? 42 : 47, 18, '#344f3c30');
  if (node.hp <= 0) {
    c.globalAlpha = Math.min(1, Math.max(0, node.deadTime / 2));
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = outline;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(side * 18, -16 + i * 10);
        c.lineTo(side * 33, -7 + i * 9);
        c.lineTo(side * 30, 9 + i * 4);
        c.stroke();
      }
    oval(c, 0, 0, 25, 17, style.spider.spiderLegColor, outline, 2);
    c.restore();
    return;
  }
  const phase = reduced ? node.index : node.walkPhase || 0,
    strike = node.mode === 'windup' ? -0.65 : Math.sin(Math.min(1, (node.swing || 0) / 0.32) * Math.PI);
  const unfold = reduced ? 1 : 1 - Math.min(1, (node.emerge || 0) / 0.85) * 0.65;
  for (const side of [-1, 1])
    for (let row = 0; row < 4; row++)
      spiderLeg(
        c,
        side,
        row,
        phase + row * Math.PI + (side === 1 ? Math.PI : 0),
        small,
        strike,
        node.angle || 0,
        unfold,
      );
  oval(c, 0, -10, 27, 31, node.flash > 0 ? '#f4dca0' : style.spider.spiderLegColor, outline, 2.3);
  poly(
    c,
    [
      [-24, -22],
      [-12, -38],
      [13, -38],
      [25, -22],
      [20, 2],
      [-20, 2],
    ],
    style.spider.drawSpiderBodyColor,
    outline,
    2,
  );
  poly(
    c,
    [
      [-18, -24],
      [-7, -33],
      [11, -32],
      [17, -22],
      [12, -7],
      [-14, -7],
    ],
    '#d8dfb4',
    outline,
    1.5,
  );
  box(c, -18, 3, 36, 19, 7, style.spider.drawSpiderBodyColor2, outline, 1.8);
  for (const side of [-1, 1]) {
    oval(c, side * 9, 10, 4.5, 3.5, '#bdeed4', null);
    poly(
      c,
      [
        [side * 10, 18],
        [side * 17, 24 + strike * 6],
        [side * 9, 28 + strike * 9],
        [side * 6, 19],
      ],
      '#f4dca0',
      outline,
      1.5,
    );
  }
  if (!small) {
    const hatch = node.hatch > 0 ? (reduced ? 1 : Math.min(1, node.hatch / 0.25, (1.2 - node.hatch) / 0.16)) : 0;
    for (const side of [-1, 1]) {
      const opening = side === (node.hatchSide || -1) ? Math.max(0, hatch) : 0,
        x = side < 0 ? -30 : 18;
      box(c, x, -3, 12, 23, 4, style.spider.drawSpiderBodyColor2, outline, 1.7);
      for (const half of [-1, 1])
        box(c, x + (half < 0 ? 0 : 6) + half * opening * 7, -3, 6, 23, 2, '#b6c696', outline, 1.5);
      if (opening > 0.3) for (let i = 0; i < 2; i++) box(c, x + 4 + i * 3, 5, 2, 8, 1, '#f4dca0', null);
    }
    for (const side of [-1, 1]) box(c, side < 0 ? -17 : 1, -5, 16, 10, 3, '#b6c696', outline, 1.3);
    const n = parts.omitted === 'coordination' ? 0 : parts.coordination || 1;
    for (let i = 0; i < n; i++) box(c, -14 + (i % 7) * 4, -4 + Math.floor(i / 7) * 6, 2, 5, 1, '#f4dca0', outline, 0.6);
    if (n > 1)
      for (const side of [-1, 1]) {
        box(c, side * 19 - 2, -21, 4, 10, 1, '#476552', outline, 1);
        box(c, side * 19 - 1, -24 - Math.floor(n / 3), 2, 10, 1, '#a8bba4', outline, 0.8);
        oval(c, side * 19, -24 - Math.floor(n / 3), 2.2, 2.2, '#d2b578', outline, 0.8);
      }
    for (const part of equipmentParts('weapons', 16))
      if (part.key !== 'coordination' && parts.omitted !== part.key)
        drawEquipmentPart(c, 16, part, parts[part.key] || 1);
  }
  if (small && strike > 0.15 && !reduced) {
    c.save();
    c.rotate(node.angle || 0);
    c.strokeStyle = '#f4dca0';
    c.lineWidth = 4;
    c.lineCap = 'round';
    for (const y of [-9, 9]) {
      c.beginPath();
      c.arc(28, y, 28 + strike * 15, -0.8, 0.65);
      c.stroke();
    }
    c.restore();
  }
  c.restore();
  if (Number.isFinite(node.hp) && node.hp < node.maxHp) {
    const width = small ? 26 : 58,
      y = node.y - (small ? 23 : 54);
    box(c, node.x - width / 2, y, width, 4, 2, style.spider.spiderLegColor, null);
    box(c, node.x - width / 2, y, (width * node.hp) / node.maxHp, 4, 2, '#d7ebad', null);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawSpiderController(c) {
  box(c, -8, 6, 13, 15, 4, style.spider.spiderLegColor, outline, 2);
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = outline;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(side * 14, -12 + i * 6);
      c.lineTo(side * 24, -15 + i * 7);
      c.lineTo(side * 26, -11 + i * 7);
      c.stroke();
    }
  box(c, -18, -17, 36, 30, 8, style.spider.drawSpiderBodyColor, outline, 2);
  box(c, -12, -12, 24, 19, 5, '#d8dfb4', outline, 1.4);
  oval(c, -5, -2, 3, 3, style.spider.drawSpiderBodyColor2);
  oval(c, 5, -2, 3, 3, style.spider.drawSpiderBodyColor2);
}
