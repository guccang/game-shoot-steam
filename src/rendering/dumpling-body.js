// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { oval, poly, outline } from './primitives.js';

// 团子家族共用胶质轮廓、豆眼和叶芽；兵种装备独立绘制，锚点不受外观影响。

// 左右轮廓分别轻微起伏，保留扁脚底和左上亮面，不整体缩放代替动作。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawDumplingBody(
  c,
  {
    x = 0,
    bottom = 0,
    width = 22,
    height = 38,
    color = '#a9c879',
    accent = '#d4e3a6',
    motion = 0,
    flash = false,
    face = true,
    // 只偏移面部表达注视方向，身体和脚底保持原姿态。
    lookX = 0,
    lookY = 0,
    pose = null,
  } = {},
) {
  const squash = pose?.squash || 0;
  bottom -= pose?.lift || 0;
  width *= 1 + squash * 0.65;
  height *= 1 - squash;
  motion += pose?.sway || 0;
  c.save();
  c.translate(x, bottom);
  c.beginPath();
  c.moveTo(-width, -4);
  c.bezierCurveTo(-width - 3, -height * 0.35, -width + motion, -height * 0.91, -5, -height);
  c.bezierCurveTo(width * 0.6 + motion, -height - 3, width + 3, -height * 0.63, width, -5);
  c.bezierCurveTo(width * 0.75, 4, -width * 0.7, 4, -width, -4);
  c.closePath();
  c.fillStyle = flash ? '#f1edc3' : color;
  c.fill();
  c.strokeStyle = outline;
  c.lineWidth = style.dumplingBody.drawDumplingBody_lineWidthValue;
  c.stroke();
  oval(c, -width * 0.31, -height * 0.69, width * 0.28, height * 0.12, accent);
  c.beginPath();
  c.moveTo(-width * 0.72, -3);
  c.quadraticCurveTo(1, 3, width * 0.72, -4);
  c.strokeStyle = '#71965b';
  c.lineWidth = 2;
  c.stroke();
  if (face) drawDumplingFace(c, Math.max(-1,Math.min(1,lookX))*4, -height * 0.48+Math.max(-1,Math.min(1,lookY))*3, width * 0.32);
  c.restore();
  return { top: bottom - height, bottom, face: bottom - height * 0.48, width, height };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawDumplingFace(c, x, y, gap = 7) {
  for (const side of [-1, 1]) {
    oval(c, x + side * gap, y, 2.2, 3.3, outline);
    oval(c, x + side * (gap + 4), y + 6, 3, 1.7, '#d9bf86');
  }
  c.beginPath();
  c.moveTo(x - 3, y + 6);
  c.quadraticCurveTo(x, y + 10, x + 4, y + 6);
  c.strokeStyle = outline;
  c.lineWidth = 1.5;
  c.stroke();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawDumplingSprout(c, x, y, motion = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(motion * 0.06);
  poly(
    c,
    [
      [0, 3],
      [-10, -2],
      [-12, -9],
      [-4, -8],
      [1, -2],
      [6, -12],
      [13, -13],
      [11, -5],
      [3, 2],
    ],
    '#90a875',
    outline,
    1.6,
  );
  c.beginPath();
  c.moveTo(0, 5);
  c.lineTo(1, -3);
  c.strokeStyle = outline;
  c.lineWidth = 2;
  c.stroke();
  c.restore();
}
