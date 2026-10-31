// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { drawDumplingBody, drawDumplingSprout } from './dumpling-body.js';
import { poly } from './primitives.js';

// 叶翼飞团使用圆润森林配色与叶脉翅膀；正式活体与碎裂图集共用翼根动作，不参与战斗逻辑。

// 八帧振翅围绕翼根展开，受击时翼根收拢后重新展开，不翻转整张身体。
// 共用绘制与动作输入，风格差异由配置提供。
export function paintFlyingMonster(c, zone, rank, clip, index, count, pose = null, look = null) {
  const flap = Math.sin((index / count) * Math.PI * 2),
    recover = 1 - index / Math.max(1, count - 1);
  const recoil = clip === 'roll' ? 0.42 : clip === 'recover' ? 0.42 * recover : 0;
  c.translate(0, clip === 'idle' ? flap * 2 : 0);
  for (const side of [-1, 1]) {
    c.save();
    c.scale(side, 1);
    c.translate(10, -20);
    c.rotate(recoil + flap * (clip === 'roll' ? 0.22 : 0.3) + side * recoil * 0.22 * flap);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(12, -17, 29, -20);
    c.quadraticCurveTo(34, -6, 27, 6);
    c.quadraticCurveTo(19, 2, 18, 13);
    c.quadraticCurveTo(9, 4, 0, 7);
    c.closePath();
    c.fillStyle = zone.monster;
    c.strokeStyle = style.flyingMonster.paintFlyingMonster_strokeStyleColor;
    c.lineWidth = 2;
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(1, 2);
    c.quadraticCurveTo(13, -6, 27, -15);
    c.moveTo(12, -3);
    c.lineTo(18, 7);
    c.strokeStyle = zone.accent;
    c.lineWidth = 1.5;
    c.stroke();
    c.restore();
  }
  const body = drawDumplingBody(c, {
    bottom: -2,
    width: 20,
    height: 32,
    color: zone.monster,
    accent: zone.accent,
    motion: flap,
    pose,
    // 悬停时继续局部振翅，眼神独立朝向预警对象。
    lookX:look?.x||0,lookY:look?.y||0,
  });
  drawDumplingSprout(c, 0, body.top, flap);
  if (rank > 0) {
    c.save();
    c.translate(0, body.top + 34);
    poly(
      c,
      [
        [-10, -34],
        [-7, -43],
        [0, -38],
        [7, -43],
        [10, -34],
      ],
      rank === 2 ? '#e4c879' : '#6f956b',
      style.flyingMonster.paintFlyingMonster_strokeStyleColor,
      1.5,
    );
    c.restore();
  }
}
