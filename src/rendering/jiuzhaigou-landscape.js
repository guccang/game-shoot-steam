// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { JIUZHAIGOU_SLOPES, JIUZHAIGOU_UNDERSTORY } from '../world/jiuzhaigou.js';
import { oval, poly } from './primitives.js';

// 九寨沟林坡与林下层：复用有限平涂和森林绿描边，低矮地被不增加碰撞。

// 弧形等高带表现可通行缓坡，坡脊不画成阻挡角色的竖直山墙。
// 共用绘制与动作输入，风格差异由配置提供。
function drawSlope(c, s) {
  c.save();
  c.translate(s.x, s.y);
  const colors = s.alpine ? style.jiuzhaigouLandscape.drawSlopeValue : style.jiuzhaigouLandscape.drawSlopeValue2;
  for (let i = 0; i < 3; i++) {
    const rx = s.rx * (1 - i * 0.22),
      ry = s.ry * (1 - i * 0.17),
      bend = Math.sin(s.phase) * rx * 0.24;
    c.beginPath();
    c.moveTo(-rx * 0.84, ry * 0.32);
    c.bezierCurveTo(-rx * 1.08, -ry * 0.2, -rx * 0.55 + bend, -ry, bend, -ry * 0.88);
    c.bezierCurveTo(rx * 0.64, -ry * 0.98, rx * 1.02, -ry * 0.21, rx * 0.8, ry * 0.4);
    c.bezierCurveTo(rx * 0.43, ry * 0.82, -rx * 0.31, ry * 0.6, -rx * 0.84, ry * 0.32);
    c.fillStyle = colors[i];
    c.fill();
    c.beginPath();
    c.moveTo(-rx * 0.78, ry * 0.35);
    c.bezierCurveTo(-rx * 0.32, ry * 0.62, rx * 0.4, ry * 0.76, rx * 0.78, ry * 0.41);
    c.strokeStyle = s.alpine ? '#859f7c' : '#8ca775';
    c.lineWidth = 3;
    c.stroke();
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawUnderstory(c, p) {
  c.save();
  c.translate(p.x, p.y);
  c.lineCap = 'round';
  oval(c, 1, 2, 24, 8, '#6f906b26');
  if (p.kind === 'stone') {
    poly(
      c,
      [
        [-22, 2],
        [-17, -9],
        [-5, -15],
        [13, -11],
        [24, 0],
        [14, 9],
        [-11, 8],
      ],
      style.jiuzhaigouLandscape.drawUnderstoryColor,
      style.jiuzhaigouLandscape.drawUnderstoryColor2,
      style.jiuzhaigouLandscape.drawUnderstoryValue,
    );
    poly(
      c,
      [
        [-17, -9],
        [-5, -15],
        [13, -11],
        [7, -2],
        [-9, -1],
      ],
      '#c4c8a8',
      null,
    );
    oval(c, -13, 4, 12, 4, '#829c70');
    oval(c, 19, 11, 8, 3, '#b6bf9c');
  } else if (p.kind === 'shrub') {
    for (const [x, y, r] of [
      [-14, -2, 11],
      [0, -8, 14],
      [17, -1, 10],
    ]) {
      oval(
        c,
        x,
        y,
        r,
        r * 0.7,
        style.jiuzhaigouLandscape.drawUnderstoryColor3,
        style.jiuzhaigouLandscape.drawUnderstoryColor4,
        style.jiuzhaigouLandscape.drawUnderstoryValue2,
      );
      oval(c, x - 3, y - 3, r * 0.6, r * 0.35, '#a3b97d');
    }
    if (p.n > 0.41) for (let i = 0; i < 3; i++) oval(c, i * 10 - 12, -7 - (i % 2) * 5, 2.5, 2, '#e0d49a');
  } else if (p.kind === 'fern') {
    for (let i = -2; i <= 2; i++) {
      const dx = i * 10,
        dy = -25 + Math.abs(i) * 5;
      c.strokeStyle = '#5e825e';
      c.lineWidth = 1.7;
      c.beginPath();
      c.moveTo(0, 3);
      c.quadraticCurveTo(dx * 0.3, dy, dx, dy);
      c.stroke();
      for (let j = 1; j <= 3; j++) {
        const x = (dx * j) / 4,
          y = 3 + ((dy - 3) * j) / 4;
        poly(
          c,
          [
            [x, y],
            [x - 9, y - 6],
            [x - 6, y + 1],
          ],
          '#789865',
          null,
        );
        poly(
          c,
          [
            [x, y],
            [x + 8, y - 7],
            [x + 5, y + 1],
          ],
          '#8eab72',
          null,
        );
      }
    }
  } else {
    c.strokeStyle = '#789460';
    c.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(i * 5, 2);
      c.quadraticCurveTo(i * 7, -8, i * 9, -13 - (2 - Math.abs(i)) * 4);
      c.stroke();
    }
    oval(c, 24, 8, 5, 2, '#d0c58d');
    oval(c, -25, 4, 4, 2, '#adb982');
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function paintJiuzhaigouLand(c, view) {
  for (const slope of JIUZHAIGOU_SLOPES) {
    if (
      slope.x + slope.rx < view.x ||
      slope.x - slope.rx > view.x + view.w ||
      slope.y + slope.ry < view.y ||
      slope.y - slope.ry > view.y + view.h
    )
      continue;
    drawSlope(c, slope);
  }
  for (const p of JIUZHAIGOU_UNDERSTORY) {
    if (p.x < view.x - 40 || p.x > view.x + view.w + 40 || p.y < view.y - 35 || p.y > view.y + view.h + 35) continue;
    drawUnderstory(c, p);
  }
}
