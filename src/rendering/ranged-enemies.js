// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { dumplingPose } from '../combat/dumpling-motion.js';
import { drawDumplingBody, drawDumplingSprout } from './dumpling-body.js';
import { monsterHitPose, hitFoot, applyHitTorso } from './monster-hit-reactions.js';
import { drawRangedReinforcement } from './ranged-reinforcements.js';
import { RANGED_ENEMIES, rangedMuzzle } from '../config/ranged-enemies.js';
import { nearest } from '../world/coordinates.js';
import { box, oval, poly, outline } from './primitives.js';

// 五种远程怪共用正式攻击时钟，轮廓、脚步、喷嘴和弹弓分别绘制，不新增图集。

// 相邻根足交替抬落，停步保留行走相位；怪物倒地与恢复仍由外层物理变换承接。
// 共用绘制与动作输入，风格差异由配置提供。
function feet(c, phase, reduced, hit) {
  for (const side of [-1, 1]) {
    const foot = hitFoot(hit, side),
      lift =
        (reduced ? 0 : Math.max(0, Math.sin(phase + (side < 0 ? Math.PI : 0))) * 4) * (1 - hit.strength) + foot.lift;
    c.save();
    c.translate(foot.x, 0);
    oval(c, side * 13, -lift, 9, 5, style.rangedEnemies.feetColor, outline, 2);
    poly(
      c,
      [
        [side * 9, -12],
        [side * 15, -5 - lift],
        [side * 19, -3 - lift],
        [side * 10, -4 - lift],
      ],
      style.rangedEnemies.feetColor2,
      outline,
      1.5,
    );
    c.restore();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function fragments(c, e, reduced) {
  const t = Math.min(1, ((e.duration || 0.6) - e.life) / (e.duration || 0.6));
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      distance = reduced ? 10 : 7 + t * 30;
    c.save();
    c.translate(Math.cos(a) * distance, -18 + Math.sin(a) * distance * 0.7);
    c.rotate(reduced ? 0 : a + t);
    box(c, -4, -3, 8, 6, 2, i % 2 ? style.rangedEnemies.feetColor2 : '#f4dca0', outline, 1);
    c.restore();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRangedMonster(c, e, time, reduced = false) {
  const profile = RANGED_ENEMIES[e.species],
    a = e.assault || {},
    charging = a.phase === 'windup';
  const charge = charging ? Math.min(1, a.elapsed / profile.windup) : 0;
  const recoil = a.phase === 'recovery' ? Math.max(0, 1 - a.elapsed / 0.28) : 0;
  const pose = dumplingPose(e, reduced);
  const motion = reduced ? 0 : Math.sin(time * 3 + (e.phase || 0));
  c.save();
  c.translate(0, -(reduced ? 0 : e.z || 0));
  if (e.burst) {
    c.globalAlpha *= Math.min(1, e.life / 0.25);
    fragments(c, e, reduced);
    c.restore();
    return;
  }
  if (drawRangedReinforcement(c, e, charge, recoil, reduced)) {
    c.restore();
    return;
  }
  const hit = monsterHitPose(e, reduced);
  feet(c, e.rangedWalk || 0, reduced, hit);
  applyHitTorso(c, hit);
  if (e.species === 'spore-spitter') {
    // 喷团露出完整胶质脸与叶芽，两侧储孢囊连接独立短喷口。
    for (const side of [-1, 1]) oval(c, side * 20, -17, 8, 13, style.rangedEnemies.feetColor, outline, 2);
    const body = drawDumplingBody(c, { width: 23, height: 43, flash: e.flash, motion, pose, lookX:e.campLookX||0, lookY:e.campLookY||0 });
    drawDumplingSprout(c, -3, body.top - 1, motion);
    const angle = Math.atan2(a.dirY || 0, a.dirX ?? 1),
      extension = reduced ? 0 : charge * 4 - recoil * 4;
    c.save();
    c.translate(0, -15);
    c.rotate(angle);
    c.translate(extension, 0);
    box(c, 6, -5, 18, 10, 4, style.rangedEnemies.feetColor, outline, 2);
    oval(c, 24, 0, 4 + charge * 2, 6 + charge * 2, charging ? '#f4dca0' : '#b9c793', outline, 2);
    oval(c, 25, 0, 2, 3, outline);
    c.restore();
  } else {
    // 圆团顶着橡果半盔；叶芽、软腹和果袋让弹弓手属于营地同族。
    const body = drawDumplingBody(c, { width: 23, height: 39, flash: e.flash, motion, pose, lookX:e.campLookX||0, lookY:e.campLookY||0 });
    oval(c, 0, body.top, 22, 6, style.rangedEnemies.drawRangedMonsterColor, outline, 2);
    drawDumplingSprout(c, 0, body.top - 5, motion);
    oval(c, -18, -11, 9, 10, style.rangedEnemies.drawRangedMonsterColor, outline, 2);
    for (const [x, y] of [
      [-21, -15],
      [-15, -13],
      [-18, -7],
    ])
      oval(c, x, y, 3, 4, '#f4dca0', outline, 1);
    const angle = Math.atan2(a.dirY || 0, a.dirX ?? 1),
      pull = reduced ? charge * 3 : charge * 10;
    c.save();
    c.translate(0, -15);
    c.rotate(angle);
    c.translate(21 - (reduced ? 0 : recoil * 4), 0);
    c.beginPath();
    c.moveTo(0, 12);
    c.lineTo(0, -3);
    c.lineTo(-7, -13);
    c.moveTo(0, -3);
    c.lineTo(8, -14);
    c.strokeStyle = outline;
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.stroke();
    c.strokeStyle = style.rangedEnemies.drawRangedMonsterColor;
    c.lineWidth = 3;
    c.stroke();
    c.beginPath();
    c.moveTo(-7, -13);
    c.lineTo(-pull, -5);
    c.lineTo(8, -14);
    c.strokeStyle = '#f4dca0';
    c.lineWidth = 2;
    c.stroke();
    oval(c, -pull, -5, 4, 4, charging ? '#f4dca0' : style.rangedEnemies.feetColor, outline, 1);
    oval(c, -pull - 4, 2, 4, 3, '#d7b779', outline, 1.5);
    c.restore();
  }
  if (e.rank > 0) for (const x of [-7, 7]) oval(c, x, -7, 2, 2, e.rank === 2 ? '#f4dca0' : '#d9e4b9');
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRangedWarning(c, e) {
  const a = e.assault,
    p = RANGED_ENEMIES[e.species];
  if (e.hp <= 0 || a?.phase !== 'windup') return;
  c.save();
  c.lineWidth = 2;
  c.strokeStyle = '#c06a47';
  c.setLineDash([5, 7]);
  c.beginPath();
  c.moveTo(rangedMuzzle(e).x, rangedMuzzle(e).y);
  c.lineTo(a.endX, a.endY);
  c.stroke();
  c.setLineDash([]);
  oval(c, a.endX, a.endY, p.splash || 12, p.splash || 8, '#f4dca02a', '#b75d42', p.splash ? 2.5 : 1.5);
  c.beginPath();
  c.arc(e.x, e.y, e.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.min(1, a.elapsed / p.windup) * Math.PI * 2);
  c.strokeStyle = '#f4dca0';
  c.lineWidth = 3;
  c.stroke();
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawEnemyBolts(c, bolts, reduced = false) {
  for (const b of bolts) {
    c.save();
    if (b.splash) {
      const end = nearest({ x: b.endX, y: b.endY }, b);
      oval(c, end.x, end.y, b.splash, b.splash, '#f4dca016', '#c06a47', 2);
    }
    oval(c, b.x, b.y + 8, 7, 3, '#315c4328');
    c.translate(b.x, b.y);
    if (['reed-archer', 'bramble-buggy', 'stump-bombard'].includes(b.species)) {
      c.rotate(Math.atan2(b.dy, b.dx));
      if (b.splash) {
        oval(c, 0, 0, 11, 8, '#bd8752', outline, 2);
        box(c, -6, -6, 9, 12, 3, '#f4dca0', outline, 1.5);
      } else {
        box(c, -10, -3, 17, 6, 2, '#f4dca0', outline, 1.7);
        poly(
          c,
          [
            [7, -4],
            [13, 0],
            [7, 4],
          ],
          '#c4d4aa',
          outline,
          1.5,
        );
      }
    } else if (b.species === 'acorn-slinger') {
      c.rotate(reduced ? 0 : b.age * 7);
      oval(c, 0, 0, 6, 8, '#e2b971', outline, 2);
      box(c, -7, -7, 14, 5, 2, style.rangedEnemies.feetColor2, outline, 1.5);
    } else {
      oval(c, 0, 0, 7, 7, '#f4dca0', '#715837', 2);
      for (const [x, y] of [
        [-3, -2],
        [3, 1],
        [-1, 4],
      ])
        oval(c, x, y, 1.5, 1.5, style.rangedEnemies.feetColor2);
    }
    c.restore();
  }
}
