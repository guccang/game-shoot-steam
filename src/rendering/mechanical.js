// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly, outline } from './primitives.js';
import { mechanicalNodeWeapon, MECHANICAL_GUN_LIMIT } from '../config/mechanical-loadout.js';

// 机械核心与地面机械猫的正式分层绘制；不依赖角色位图或飞行炮体。

// 六角能源壳、握把与双耳状天线组成独立手持核心，部件替换由 drawWeapon 统一处理。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawMechanicalCore(c) {
  box(c, -10, 7, 13, 15, 4, style.mechanical.drawMechanicalCoreColor, outline, 2);
  poly(
    c,
    [
      [-23, -8],
      [-14, -17],
      [10, -17],
      [23, -6],
      [21, 10],
      [9, 16],
      [-16, 13],
    ],
    style.mechanical.drawMechanicalCoreColor2,
    outline,
    2,
  );
  poly(
    c,
    [
      [-15, -10],
      [-5, -15],
      [11, -10],
      [14, 5],
      [2, 11],
      [-13, 5],
    ],
    '#d9dfb2',
    outline,
    1.7,
  );
  oval(c, 0, -1, 7, 7, '#a8dec6', outline, 1.7);
  poly(
    c,
    [
      [-17, -12],
      [-19, -24],
      [-9, -16],
    ],
    '#f4dca0',
    outline,
    1.8,
  );
  poly(
    c,
    [
      [10, -15],
      [18, -24],
      [20, -8],
    ],
    '#f4dca0',
    outline,
    1.8,
  );
  box(c, -20, -4, 6, 10, 2, style.mechanical.drawMechanicalCoreColor, outline, 1);
  box(c, 15, -4, 8, 9, 2, style.mechanical.drawMechanicalCoreColor, outline, 1);
  for (let i = 0; i < 3; i++) oval(c, -7 + i * 6, 12, 1.4, 1.4, '#f4dca0', null);
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawLeg(c, x, y, phase, front, swing, parts, mod, armored = false) {
  const stride = Math.sin(phase) * 3.5,
    lift = Math.max(0, Math.cos(phase)) * 2;
  const reach = front ? swing * (mod === 2 ? 9 : 12) : 0,
    footX = x + stride + reach,
    footY = y + 10 - lift - swing * (front ? 7 : 0);
  c.strokeStyle = outline;
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x - 2 + stride * 0.45, y + 5 - lift);
  c.lineTo(footX, footY);
  c.stroke();
  c.strokeStyle = '#a4b59b';
  c.lineWidth = 2;
  c.stroke();
  oval(c, x, y, 2 + ((parts?.rate || 1) - 1) * 0.18, 2.2, '#f4dca0', outline, 1);
  const level = parts?.damage || 1,
    tier = Math.floor((level - 1) / 5),
    detail = (level - 1) % 5;
  box(
    c,
    footX - 3,
    footY - 2,
    6 + tier * 0.7 + (mod === 2 ? 3 : 0),
    4 + detail * 0.12,
    1.5,
    mod === 2 ? '#b8a77a' : '#d5dfbd',
    outline,
    1.2,
  );
  if (front && armored)
    poly(
      c,
      [
        [footX - 5, footY - 4],
        [footX + 5, footY - 4],
        [footX + 8, footY + 1],
        [footX + 5, footY + 5],
        [footX - 5, footY + 4],
      ],
      '#b6bd90',
      outline,
      1.6,
    );
  if (front)
    for (let i = 0; i < 2 + tier; i++) {
      c.beginPath();
      c.moveTo(footX + 2, footY - 1 + i * 0.85);
      c.lineTo(footX + 5 + detail * 0.3 + (mod === 1 ? 2 : 0), footY - 1 + i * 0.85);
      c.lineWidth = 0.8;
      c.strokeStyle = outline;
      c.stroke();
    }
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawMechanicalUpgrades(c, parts) {
  const level = (key) => (parts.omitted === key ? 1 : parts[key] || 1);
  const capacity = level('capacity'),
    rate = level('rate'),
    reload = level('reload'),
    range = level('range'),
    damage = level('damage'),
    coordination = level('coordination');
  if (capacity > 1) {
    box(c, -19, -27, 10, 9 + capacity, 3, '#476552', outline, 1.2);
    box(c, -17, -26, 6, 6 + capacity, 2, '#d8dfb4', outline, 1);
    if (capacity >= 4) box(c, -21, -23, 3, 9, 1, '#d2b578', outline, 0.8);
  }
  if (rate > 1) for (let i = 0; i < rate; i++) box(c, -14 + i * 2, -14, 1.4, 5, 1, '#a8bba4', outline, 0.5);
  if (damage > 1) {
    const tier = Math.floor((damage - 1) / 5);
    poly(
      c,
      [
        [3, -13],
        [11, -15],
        [14, -10],
        [11, -5 - tier],
        [4, -6],
      ],
      '#b8c295',
      outline,
      1.2,
    );
  }
  if (reload > 1) box(c, -17, -9, 5 + reload, 3, 1, '#d2b578', outline, 0.8);
  if (range > 1) {
    box(c, -12, -30 - range, 2, 10, 1, '#a8bba4', outline, 0.8);
    oval(c, -11, -30 - range, 2, 2, '#d8dfb4', outline, 0.8);
  }
  if (coordination > 1) {
    box(c, -7, -27, 6, 4, 1, '#476552', outline, 0.8);
    for (let i = 0; i < Math.min(4, coordination); i++) box(c, -6 + i * 1.2, -28, 1, 2, 0.3, '#d2b578', null);
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawMechanicalCat(c, node, weapon, reduced = false) {
  weapon = mechanicalNodeWeapon(weapon, node.index);
  const parts = weapon?.parts || {},
    mod = weapon?.modChoice || 0;
  const phase = reduced ? node.index : node.walkPhase || 0,
    swing = node.mode === 'windup' ? -0.45 : Math.sin(Math.min(1, (node.swing || 0) / 0.24) * Math.PI);
  c.save();
  c.translate(node.x, node.y);
  oval(c, 1, 2, 17, 6, '#344f3c30');
  if (node.hp <= 0) {
    const fade = Math.min(1, Math.max(0, (node.deadTime - 1.35) / 0.65));
    if (!fade) {
      c.restore();
      return;
    }
    c.globalAlpha = fade;
    box(c, -14, -13, 28, 12, 5, style.mechanical.drawMechanicalCoreColor, outline, 1.8);
    for (const x of [-14, 12]) box(c, x, -4, 9, 4, 2, style.mechanical.drawMechanicalCoreColor2, outline, 1);
    c.restore();
    return;
  }
  c.scale(Math.cos(node.angle || 0) < 0 ? -1 : 1, 1);
  c.strokeStyle = outline;
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-12, -13);
  c.lineTo(-21, -18 + Math.sin(phase * 0.5) * 2);
  c.lineTo(-23, -25 + Math.sin(phase * 0.5 + 1) * 2);
  c.stroke();
  c.strokeStyle = style.mechanical.drawMechanicalCoreColor2;
  c.lineWidth = 2;
  c.stroke();
  oval(c, -23, -25 + Math.sin(phase * 0.5 + 1) * 2, 2, 2, '#f4dca0', outline, 1);
  drawLeg(c, -9, -10, phase + Math.PI, false, 0, parts, mod, weapon?.armored !== false);
  drawLeg(c, 9, -10, phase, true, swing * 0.5, parts, mod, weapon?.armored !== false);
  box(
    c,
    -15,
    -21 + (node.mode === 'windup' ? 2 : 0),
    28,
    15,
    6,
    node.flash > 0 ? '#f4dca0' : style.mechanical.drawMechanicalCoreColor2,
    outline,
    1.8,
  );
  box(c, -11, -22, 14 + ((parts.capacity || 1) - 1) * 1.2, 8, 3, '#d8dfb4', outline, 1.2);
  for (let i = 0; i < (parts.capacity || 1); i++)
    box(c, -8 + i * 2.4, -20, 1.2, 4, 0.5, style.mechanical.drawMechanicalCoreColor, null);
  for (let i = 0; i < (parts.reload || 1); i++) oval(c, -12 + i * 2, -10, 0.7, 1, '#f4dca0', null);
  if (weapon?.armored !== false) {
    poly(
      c,
      [
        [-18, -25],
        [-9, -30],
        [7, -26],
        [14, -18],
        [9, -10],
        [-16, -12],
      ],
      '#a6b58a',
      outline,
      2,
    );
    box(c, -16, -23, 13, 10, 3, '#d8dfb4', outline, 1.4);
    box(c, 2, -21, 11, 10, 3, style.mechanical.drawMechanicalCoreColor, outline, 1.5);
    for (const x of [-12, 6]) oval(c, x, -17, 1.5, 1.5, '#f4dca0', outline, 0.8);
  }
  drawMechanicalUpgrades(c, parts);
  c.save();
  if (node.observation)
    c.translate(reduced ? 0 : Math.sin((node.observation.duration - node.observation.remaining) * 9) * 1.2, -1.8);
  poly(
    c,
    [
      [5, -23],
      [4, -35],
      [13, -28],
      [22, -34],
      [23, -22],
    ],
    '#d8dfb4',
    outline,
    1.7,
  );
  box(c, 3, -28, 23, 17, 6, '#e9e5c1', outline, 1.8);
  box(c, 7, -24, 16, 8, 3, style.mechanical.drawMechanicalCatColor, null);
  oval(c, 11, -20, 1.6, 2, '#bdeed4');
  oval(c, 20, -20, 1.6, 2, '#bdeed4');
  poly(
    c,
    [
      [14, -15],
      [18, -15],
      [16, -13],
    ],
    style.mechanical.drawMechanicalCoreColor,
    null,
  );
  if (weapon?.armored !== false)
    poly(
      c,
      [
        [2, -28],
        [7, -31],
        [24, -28],
        [27, -19],
        [23, -12],
        [20, -15],
        [22, -24],
        [7, -24],
        [5, -15],
        [1, -18],
      ],
      style.mechanical.drawMechanicalCoreColor,
      outline,
      1.6,
    );
  c.restore();
  const antenna = (parts.range || 1) - 1;
  c.strokeStyle = outline;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-5, -22);
  c.lineTo(-5, -27 - antenna);
  c.stroke();
  oval(c, -5, -27 - antenna, 1.8, 1.8, '#a8dec6', outline, 0.8);
  drawLeg(c, -10, -8, phase, false, 0, parts, mod, weapon?.armored !== false);
  drawLeg(c, 10, -8, phase + Math.PI, true, swing, parts, mod, weapon?.armored !== false);
  if (swing > 0.2) {
    c.strokeStyle = '#e8f0c4';
    c.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(19, -8 + i * 2, 8 + swing * 5, -0.9, 0.7);
      c.stroke();
    }
  }
  c.restore();
  if (Number.isFinite(node.hp) && node.hp < node.maxHp) {
    c.save();
    box(c, node.x - 15, node.y - (node.gun ? 59 : 43), 30, 4, 2, style.mechanical.drawMechanicalCoreColor, null);
    box(c, node.x - 15, node.y - (node.gun ? 59 : 43), (30 * node.hp) / node.maxHp, 4, 2, '#d7ebad', null);
    c.restore();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawMechanicalPack(c, state, weapon, reduced = false, drawNode = drawMechanicalCat) {
  for (const node of state?.nodes.filter((n) => n.active && n.ready).sort((a, b) => a.y - b.y) || [])
    drawNode(c, node, weapon, reduced);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawMechanicalPreview(c, weapon, time = 0, reduced = false, drawNode = drawMechanicalCat, gun = null) {
  const count = weapon.summonCount || 3;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const node = {
      index: i,
      x: Math.cos(a) * 77,
      y: Math.sin(a) * 53 + 5,
      angle: Math.cos(a) > 0 ? Math.PI : 0,
      walkPhase: time * 5 + i,
      swing: 0,
      gun: i < MECHANICAL_GUN_LIMIT ? gun : null,
    };
    c.save();
    c.translate(node.x, node.y);
    c.scale(0.75, 0.75);
    drawNode(c, { ...node, x: 0, y: 0 }, weapon, reduced);
    c.restore();
  }
}
