// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, poly } from './primitives.js';
import { canvasFont } from './text-style.js';

// 建筑上的短名称木牌：挂绳、亮边和侧厚度随原实体排序，不单独叠加UI标签。

// 以建筑局部坐标挂牌；功能图案沿用原建筑，名称只作辅助识别。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWorldSign(c, label, x = 0, y = 0) {
  c.save();
  c.translate(x, y);
  const w = Math.max(62, label.length * 11 + 14),
    ink = style.worldSigns.drawWorldSignColor;
  c.strokeStyle = ink;
  c.lineWidth = 1.5;
  c.beginPath();
  for (const dx of [-w * 0.32, w * 0.32]) {
    c.moveTo(dx, -19);
    c.lineTo(dx, -9);
  }
  c.stroke();
  poly(
    c,
    [
      [-w / 2, -9],
      [w / 2, -9],
      [w / 2 + 3, -6],
      [w / 2 + 3, 10],
      [-w / 2 + 3, 10],
      [-w / 2, 7],
    ],
    '#9e8056',
    ink,
    style.worldSigns.drawWorldSignValue,
  );
  box(c, -w / 2, -10, w, 17, 2, style.worldSigns.drawWorldSignColor2, ink, style.worldSigns.drawWorldSignValue);
  c.strokeStyle = '#f8e9bd';
  c.beginPath();
  c.moveTo(-w / 2 + 4, -7);
  c.lineTo(w / 2 - 4, -7);
  c.stroke();
  c.fillStyle = ink;
  c.font = canvasFont(11, 700);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, 0, -0.5);
  c.restore();
}
