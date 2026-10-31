// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { dumplingPose } from '../combat/dumpling-motion.js';
import { drawDumplingBody, drawDumplingSprout, drawDumplingFace } from './dumpling-body.js';
import { monsterHitPose, hitFoot, applyHitTorso } from './monster-hit-reactions.js';
import { ARMORED } from '../config/armored-enemies.js';
import { box, oval, poly, outline } from './primitives.js';

// 铁甲木卫的正式分层绘制：粗靴、肩肘与重盾独立运动，原生矢量不新增缓存。

// 重盾由肩肘连接到手部，蓄力向后收、盾击向前推，不缩放整个身体。
// 共用绘制与动作输入，风格差异由配置提供。
function shieldArm(c, side, charge, strike, reduced, flash, aim, hit) {
  const offset = reduced ? (charge > 0 ? -3 : strike > 0 ? 4 : 0) : -charge * 7 + strike * 14;
  c.save();
  c.translate(hit.dx * hit.strength * 3, hit.settle * 0.5);
  c.translate(side * 24 + offset * (aim.dirX || 0), -33 + offset * (aim.dirY ?? 1));
  c.rotate(reduced ? 0 : side * (charge * 0.2 - strike * 0.15));
  box(c, side < 0 ? -9 : -3, -7, 12, 22, 5, style.armoredEnemies.shieldArmColor, outline, 2);
  oval(c, side * 4, 13, 7, 6, '#a5b786', outline, 2);
  if (side < 0) {
    poly(
      c,
      [
        [-19, -15],
        [4, -18],
        [12, -7],
        [10, 23],
        [-4, 31],
        [-20, 19],
      ],
      flash ? '#f4e9bd' : style.armoredEnemies.shieldArmColor2,
      outline,
      2.5,
    );
    poly(
      c,
      [
        [-13, -9],
        [1, -11],
        [5, 0],
        [4, 18],
        [-4, 23],
        [-13, 15],
      ],
      '#a7b68a',
      outline,
      1.7,
    );
    box(c, -7, -13, 4, 36, 1, '#d7cd98', outline, 1);
    for (const y of [-9, 14]) oval(c, -15, y, 2, 2, '#f4dca0', outline, 1);
  } else {
    box(c, -5, 5, 21, 19, 5, flash ? '#f4e9bd' : style.armoredEnemies.shieldArmColor2, outline, 2.5);
    for (const x of [0, 7]) box(c, x, 5, 4, 15, 1, '#c4cca4', outline, 1);
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function armorFragments(c, e, reduced) {
  const t = Math.max(0, ((e.duration || 0.6) - e.life) / (e.duration || 0.6));
  c.globalAlpha *= Math.min(1, e.life / 0.25);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4,
      d = reduced ? 10 : 10 + t * 32;
    c.save();
    c.translate(Math.cos(a) * d, -30 + Math.sin(a) * d * 0.7);
    c.rotate(reduced ? 0 : a + t * 0.8);
    box(
      c,
      -6,
      -4,
      12,
      8,
      2,
      i % 3 ? style.armoredEnemies.shieldArmColor2 : style.armoredEnemies.shieldArmColor,
      outline,
      1.7,
    );
    c.restore();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawArmoredMonster(c, e, time, reduced = false) {
  const a = e.assault || {},
    p = ARMORED.attack,
    phase = a.phase || 'chase',
    t = Math.min(1, (a.elapsed || 0) / (p[phase] || 1));
  const charge = phase === 'windup' ? t : 0,
    strike = phase === 'lunge' ? Math.sin(t * Math.PI) : phase === 'returning' ? (1 - t) * 0.3 : 0;
  c.save();
  c.translate(0, -(reduced ? 0 : e.z || 0));
  if (e.burst) {
    armorFragments(c, e, reduced);
    c.restore();
    return;
  }
  const flash = e.flash > 0,
    walk = e.armoredWalk || 0,
    hit = monsterHitPose(e, reduced);
  for (const side of [-1, 1]) {
    const foot = hitFoot(hit, side),
      lift =
        (reduced ? 0 : Math.max(0, Math.sin(walk + (side < 0 ? Math.PI : 0))) * 5) * (1 - hit.strength) + foot.lift;
    c.save();
    c.translate(foot.x, 0);
    box(c, side * 14 - 6, -22 - lift, 12, 20, 5, '#96754d', outline, 2);
    box(
      c,
      side * 14 - 11,
      -9 - lift,
      23,
      11,
      4,
      flash ? '#f4e9bd' : style.armoredEnemies.shieldArmColor2,
      outline,
      2.5,
    );
    box(c, side * 14 - 7, -7 - lift, 15, 3, 1, '#bfc9a0');
    c.restore();
  }
  applyHitTorso(c, hit);
  const body = drawDumplingBody(c, {
    pose: dumplingPose(e, reduced),
    bottom: -9,
    width: 30,
    height: 59,
    flash,
    motion: reduced ? 0 : Math.sin(walk) * 0.6,
    face: false,
  });
  // 盾卫警觉时仅移动眼神，不触发盾击或转动整副重甲。
  drawDumplingFace(c, (e.campLookX||0)*4, body.top + 20+(e.campLookY||0)*3, 9);
  drawDumplingSprout(c, 0, body.top - 1);
  poly(
    c,
    [
      [-29, -33],
      [-15, -27],
      [0, -30],
      [15, -27],
      [29, -33],
      [26, -10],
      [0, -5],
      [-26, -10],
    ],
    flash ? '#f4e9bd' : style.armoredEnemies.shieldArmColor2,
    outline,
    2.5,
  );
  for (const x of [-18, 0, 18]) box(c, x - 6, -25, 12, 16, 3, '#a7b68a', outline, 1.7);
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * 27, -35);
    c.rotate(reduced ? 0 : side * (charge * 0.12 - strike * 0.1));
    box(c, -11, -8, 22, 15, 6, flash ? '#f4e9bd' : '#8ea17e', outline, 2.3);
    c.restore();
  }
  shieldArm(c, 1, charge, strike, reduced, flash, a, hit);
  shieldArm(c, -1, charge, strike, reduced, flash, a, hit);
  if (e.hp < e.maxHp * 0.5) {
    c.beginPath();
    c.moveTo(5, -27);
    c.lineTo(-1, -21);
    c.lineTo(5, -17);
    c.lineTo(0, -10);
    c.strokeStyle = outline;
    c.lineWidth = 2.2;
    c.stroke();
  }
  c.restore();
}
