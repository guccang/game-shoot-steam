// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { canvasFont } from './text-style.js';
import { i18nText } from '../i18n/index.js';
import { box, oval, poly, outline } from './primitives.js';
import { nearest, worldDistance } from '../world/coordinates.js';
import { fireObjective } from '../core/activities/fire-rescue.js';

// 原树燃烧、河岸取水设备和世界救援路径；全部按正式世界坐标绘制。

// 火舌只改变自身曲线，不拉伸树干或树冠，也不替换原树图集。
// 共用绘制与动作输入，风格差异由配置提供。
function flame(c, x, y, height, time, seed) {
  const s = Math.sin(time * 5 + seed) * 5;
  c.beginPath();
  c.moveTo(x - 11, y);
  c.bezierCurveTo(x - 23, y - 22, x + s + 3, y - height + 12, x + s, y - height);
  c.bezierCurveTo(x + 21, y - height + 20, x + 20, y - 14, x + 11, y);
  c.closePath();
  c.fillStyle = '#d77b4d';
  c.strokeStyle = '#76573c';
  c.lineWidth = 1.6;
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(x - 6, y - 2);
  c.quadraticCurveTo(x - 8, y - 16, x + s / 2, y - height * 0.62);
  c.quadraticCurveTo(x + 12, y - 19, x + 6, y - 2);
  c.fillStyle = '#ffdfa0';
  c.fill();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawBurningTree(c, tree, time, reduced = false) {
  const f = tree.fireRescue;
  if (!f || !f.ever) return;
  c.save();
  c.translate(tree.x, tree.y);
  c.scale(tree.size || 1, tree.size || 1);
  if (!f.lit || f.hp <= 0) {
    oval(c, 0, 3, 31, 9, '#81b8b063');
    c.strokeStyle = '#afdcd4';
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(i * 10 - 12, -12);
      c.quadraticCurveTo(i * 10 - 17, -21, i * 10 - 10, -30);
      c.stroke();
    }
    c.restore();
    return;
  }
  const t = reduced ? 0 : time,
    heat = 0.5 + f.hp / 132;
  oval(c, 0, 0, 37, 13, '#dc8a4e42');
  for (let i = 0; i < 3; i++) {
    const phase = (t * 0.35 + i / 3) % 1;
    c.globalAlpha = (1 - phase) * 0.3;
    oval(c, Math.sin(t + i) * 10 + (i - 1) * 12, -115 - phase * 62, 12 + phase * 12, 8 + phase * 13, '#697367');
  }
  c.globalAlpha = 1;
  flame(c, -20, -32, 48 * heat, t, 1);
  flame(c, 20, -65, 43 * heat, t, 3);
  flame(c, 0, -8, 58 * heat, t, 5);
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.7 + i * 0.31) % 1;
    oval(c, Math.sin(t * 2 + i) * 22, -25 - p * 90, 1.8, 3, '#f5d98b');
  }
  box(c, -26, -142, 52, 5, 2, style.fireWorld.drawBurningTreeColor);
  box(c, -25, -141, 50 * Math.max(0, f.hp / 66), 3, 1, '#e5b06b');
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWaterPump(c, p, time, filling = false, reduced = false) {
  const waterX = p.x + (p.waterDx ?? p.waterX - p.x);
  c.save();
  c.strokeStyle = '#506e63';
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(p.x, p.y - 5);
  c.quadraticCurveTo((p.x + waterX) / 2, p.y + 18, waterX, p.y);
  c.stroke();
  c.strokeStyle = '#a3c7b1';
  c.lineWidth = 3;
  c.stroke();
  c.translate(p.x, p.y);
  oval(c, 3, 6, 29, 11, '#315c4335');
  box(c, -23, -4, 46, 13, 5, '#9aab91', outline, 2);
  box(c, -17, -30, 34, 30, 5, '#719d99', outline, 2);
  box(c, -19, -32, 38, 7, 3, '#c8d9b3', outline, 2);
  c.save();
  c.translate(0, -14);
  c.rotate(filling && !reduced ? time * 4 : 0);
  oval(c, 0, 0, 10, 10, '#e5d69e', outline, 2);
  for (let i = 0; i < 4; i++) {
    c.rotate(Math.PI / 2);
    box(c, 0, -1, 9, 2, 1, outline);
  }
  c.restore();
  poly(
    c,
    [
      [23, -4],
      [23, -44],
      [39, -44],
      [39, -25],
    ],
    '#a8d7cf',
    outline,
    2,
  );
  c.fillStyle = outline;
  c.font = canvasFont(12);
  c.textAlign = 'center';
  c.fillText(i18nText('rendering.fire-world.d2227d4844'), 7, 27);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawFireRoute(c, game, view, reduced = false) {
  if (!game.fireActive || (game.fireTransit && game.fireRescue.phase !== 'approaching')) return;
  const r = game.fireRescue,
    o = fireObjective(game);
  if (!o?.point) return;
  const color = o.water ? '#a4e0dc' : '#f0c481',
    route = r.route || [];
  c.save();
  c.strokeStyle = '#315c4399';
  c.lineWidth = 6;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(game.player.x, game.player.y + 6);
  for (const raw of route) {
    const p = nearest(raw, game.player);
    c.lineTo(p.x, p.y);
  }
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = 3;
  c.setLineDash([7, 10]);
  c.lineDashOffset = reduced ? 0 : -game.time * 15;
  c.stroke();
  c.setLineDash([]);
  const p = nearest(o.point, game.player);
  oval(c, p.x, p.y, 28, 15, color + '55', color, 2);
  c.restore();
  // 屏内方向箭头同时指向下一个路口；不会穿越山水给出直线误导。
  const next = route.find((p) => worldDistance(p, game.player) > 50) || p,
    near = nearest(next, game.player),
    a = Math.atan2(near.y - game.player.y, near.x - game.player.x),
    d = Math.min(85, worldDistance(near, game.player));
  c.save();
  c.translate(game.player.x + Math.cos(a) * d, game.player.y + Math.sin(a) * d);
  c.rotate(a);
  poly(
    c,
    [
      [11, 0],
      [-5, -7],
      [-1, 0],
      [-5, 7],
    ],
    color,
    outline,
    1.5,
  );
  c.restore();
}
