import { onArtStyleChange } from '../art-styles/state.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';

// 可复用 Canvas 基础图元，不依赖游戏实例。

// 装备、怪物和场景共用清楚的暖棕外轮廓，不改变各图元的锚点或运动参数。
export let outline = style.primitives.outline;
// 共用绘制与动作输入，风格差异由配置提供。
export function box(c, x, y, w, h, r, fill, stroke, line = 2) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.stroke();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function oval(c, x, y, rx, ry, color, stroke, line = 2) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.stroke();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function poly(c, points, color, stroke = outline, line = style.primitives.polygonStrokeWidth) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = color;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.lineJoin = 'round';
    c.stroke();
  }
}

// 同步共享模块顶层的材质常量，后续绘制立即使用新配置。
onArtStyleChange(() => {
  outline = style.primitives.outline;
});
