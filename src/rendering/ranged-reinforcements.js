// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { dumplingPose } from '../combat/dumpling-motion.js';
import { drawDumplingBody, drawDumplingSprout } from './dumpling-body.js';
import { monsterHitPose, hitFoot, applyHitTorso } from './monster-hit-reactions.js';
import { box, oval, poly, outline } from './primitives.js';

// 新远程三族的正式部件绘制：轮胎、炮管和弩弦使用独立局部动作，无位图缓存。

// 四轮各自按行驶路程滚动，车体不旋转或拉伸代替运动。
// 共用绘制与动作输入，风格差异由配置提供。
function wheel(c, x, y, phase, reduced) {
  oval(c, x, y, 9, 12, '#526951', outline, 2);
  oval(c, x, y, 4, 6, '#b7c499', outline, 1.5);
  c.save();
  c.translate(x, y);
  c.rotate(reduced ? 0 : phase);
  c.strokeStyle = '#f4dca0';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-4, 0);
  c.lineTo(4, 0);
  c.moveTo(0, -5);
  c.lineTo(0, 5);
  c.stroke();
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function rootFeet(c, phase, reduced, wide, hit) {
  for (const side of [-1, 1]) {
    const foot = hitFoot(hit, side),
      lift =
        (reduced ? 0 : Math.max(0, Math.sin(phase + (side < 0 ? Math.PI : 0))) * 5) * (1 - hit.strength) + foot.lift;
    c.save();
    c.translate(foot.x, 0);
    poly(
      c,
      [
        [side * 8, -15],
        [side * wide, -8 - lift],
        [side * (wide + 4), -lift],
        [side * (wide - 8), -lift],
      ],
      '#9aab7a',
      outline,
      2,
    );
    c.restore();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function cannon(c, angle, recoil, charge, reduced, heavy) {
  c.save();
  c.translate(0, -15);
  c.rotate(angle);
  c.translate(-(reduced ? 0 : recoil * (heavy ? 9 : 5)), 0);
  oval(c, 0, 0, 14, 13, style.rangedReinforcements.cannonColor, outline, 2);
  box(
    c,
    3,
    -(heavy ? 9 : 6),
    31,
    heavy ? 18 : 12,
    4,
    heavy ? style.rangedReinforcements.cannonColor2 : style.rangedReinforcements.cannonColor3,
    outline,
    2.3,
  );
  for (const x of [13, 25])
    box(c, x, heavy ? -11 : -8, 4, heavy ? 22 : 16, 2, style.rangedReinforcements.cannonColor, outline, 1.5);
  oval(c, 34, 0, 3, heavy ? 9 : 6, charge > 0 ? '#f4dca0' : '#3b5444', outline, 1.7);
  if (recoil > 0.55)
    poly(
      c,
      [
        [36, -4],
        [44, 0],
        [36, 4],
      ],
      '#f4dca0',
    );
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRangedReinforcement(c, e, charge, recoil, reduced) {
  const pose = dumplingPose(e, reduced);
  const hit = monsterHitPose(e, reduced),
    phase = e.rangedWalk || 0,
    angle = Math.atan2(e.assault?.dirY || 0, e.assault?.dirX ?? 1),
    flash = e.flash > 0;
  if (e.species === 'bramble-buggy') {
    for (const x of [-28, 28]) for (const y of [-24, 0]) wheel(c, x, y, phase + (e.hitWheel || 0), reduced);
    applyHitTorso(c, hit);
    box(c, -27, -32, 54, 40, 9, flash ? '#f4e9bd' : style.rangedReinforcements.cannonColor, outline, 2.5);
    poly(
      c,
      [
        [-25, -25],
        [-15, -38],
        [14, -38],
        [25, -25],
        [20, 3],
        [-20, 3],
      ],
      style.rangedReinforcements.cannonColor3,
      outline,
      2,
    );
    const body = drawDumplingBody(c, {
      pose,
      // 预警只让面部注视来客，车体和武器保持独立。
      lookX:e.campLookX||0,lookY:e.campLookY||0,
      bottom: -28,
      width: 20,
      height: 29,
      flash,
      motion: reduced ? 0 : Math.sin(phase) * 0.6,
    });
    drawDumplingSprout(c, 0, body.top);
    box(c, -22, -31, 44, 6, 3, '#c4cf8e', outline, 1.7);
    for (const x of [-19, 12]) box(c, x, 1, 8, 5, 2, '#f4dca0', outline, 1.5);
    cannon(c, angle, recoil, charge, reduced, false);
    return true;
  }
  if (e.species === 'stump-bombard') {
    rootFeet(c, phase, reduced, 23, hit);
    applyHitTorso(c, hit);
    for (const x of [-27, 19]) box(c, x, -36, 9, 29, 4, style.rangedReinforcements.cannonColor2, outline, 2);
    const body = drawDumplingBody(c, {
      pose,
      // 预警只让面部注视来客，车体和武器保持独立。
      lookX:e.campLookX||0,lookY:e.campLookY||0,
      bottom: -5,
      width: 26,
      height: 47,
      flash,
      motion: reduced ? 0 : Math.sin(phase) * 0.8,
    });
    drawDumplingSprout(c, -6, body.top);
    box(c, -24, -10, 48, 9, 4, style.rangedReinforcements.cannonColor, outline, 2);
    cannon(c, angle, recoil, charge, reduced, true);
    return true;
  }
  if (e.species === 'reed-archer') {
    rootFeet(c, phase, reduced, 16, hit);
    applyHitTorso(c, hit);
    box(c, -27, -36, 10, 27, 3, style.rangedReinforcements.cannonColor2, outline, 1.8);
    for (const x of [-25, -21])
      poly(
        c,
        [
          [x, -28],
          [x, -50],
          [x + 3, -54],
          [x + 5, -48],
          [x + 2, -28],
        ],
        '#d3dfad',
        outline,
        1,
      );
    const body = drawDumplingBody(c, {
      pose,
      // 预警只让面部注视来客，车体和武器保持独立。
      lookX:e.campLookX||0,lookY:e.campLookY||0,
      bottom: -3,
      width: 22,
      height: 38,
      flash,
      motion: reduced ? 0 : Math.sin(phase) * 0.7,
    });
    c.save();
    c.translate(0, body.top + 41);
    poly(
      c,
      [
        [-23, -34],
        [-12, -46],
        [6, -45],
        [20, -34],
        [1, -39],
      ],
      style.rangedReinforcements.cannonColor,
      outline,
      2,
    );
    drawDumplingSprout(c, 3, -45);
    c.restore();
    c.save();
    c.translate(0, -15);
    c.rotate(angle);
    c.translate(-(reduced ? 0 : recoil * 4), 0);
    box(c, 0, -4, 28, 8, 3, style.rangedReinforcements.cannonColor2, outline, 2);
    c.beginPath();
    c.moveTo(23, -18);
    c.quadraticCurveTo(35, 0, 23, 18);
    c.strokeStyle = outline;
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    c.moveTo(23, -18);
    c.lineTo(20 - charge * 10, 0);
    c.lineTo(23, 18);
    c.strokeStyle = '#f4dca0';
    c.lineWidth = 2;
    c.stroke();
    box(c, 15 - charge * 9, -2, 14, 4, 1, '#eee2b2', outline, 1);
    oval(c, 7, 6, 5, 3, '#b8c68d', outline, 1.5);
    c.restore();
    return true;
  }
  return false;
}
