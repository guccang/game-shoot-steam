// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { raceFeatures } from '../config/forest-race-track.js';
import { box, oval, poly, outline } from './primitives.js';

// 赛道草捆、泥地和加速带均由正式设施轮廓绘制，复用主画布而不增加纹理缓存。

// 地面设施有明确箭头或水纹，低动态保留辨识轮廓、关闭流动动画。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRaceTrackGround(c, r, time = 0, reduced = false) {
  c.save();
  for (const f of r.features || raceFeatures(r.arena)) {
    c.save();
    c.translate(f.x, f.y);
    if (f.kind === 'bale') {
      oval(c, 3, 5, 29, 18, '#315c4328');
    } else {
      c.rotate(f.angle);
      if (f.kind === 'boost') {
        box(c, -f.rx, -f.ry, f.rx * 2, f.ry * 2, 12, '#789c67', outline, 2);
        box(c, -f.rx + 4, -f.ry + 4, f.rx * 2 - 8, f.ry * 2 - 8, 9, '#bdd29a');
        for (let i = 0; i < 3; i++) {
          const x = -25 + i * 24 + (reduced ? 0 : Math.sin(time * 3) * 2);
          poly(
            c,
            [
              [x - 8, -17],
              [x + 5, 0],
              [x - 8, 17],
              [x, 17],
              [x + 13, 0],
              [x, -17],
            ],
            '#fff0b4',
            outline,
            1.5,
          );
        }
      } else {
        c.beginPath();
        c.moveTo(-f.rx, 0);
        c.bezierCurveTo(-f.rx, -f.ry, -5, -f.ry - 3, 12, -f.ry + 2);
        c.bezierCurveTo(f.rx + 4, -f.ry + 3, f.rx + 2, 12, f.rx - 8, 19);
        c.bezierCurveTo(20, f.ry + 5, -12, f.ry, -30, 24);
        c.bezierCurveTo(-49, 24, -f.rx, 12, -f.rx, 0);
        c.fillStyle = '#967453';
        c.fill();
        c.strokeStyle = '#715e45';
        c.lineWidth = 2;
        c.stroke();
        for (const [x, y, rx, ry] of [
          [-21, -5, 21, 11],
          [15, 6, 24, 13],
          [30, -12, 10, 6],
        ]) {
          oval(c, x, y, rx, ry, '#9faa91');
          c.beginPath();
          c.ellipse(x - 2, y - 2, rx * 0.65, ry * 0.45, 0, 3.3, 5.8);
          c.strokeStyle = '#e2dec0';
          c.lineWidth = 2;
          c.stroke();
        }
        for (const [x, y] of [
          [-37, 9],
          [-8, 19],
          [38, 8],
        ])
          oval(c, x, y, 3, 2, '#705d43');
      }
    }
    c.restore();
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRaceBale(c, f) {
  c.save();
  c.translate(f.x, f.y);
  box(c, -24, -23, 48, 34, 10, style.forestRaceTrack.drawRaceBaleColor, outline, 2);
  oval(c, 0, -21, 24, 12, '#e3c679', outline, 2);
  for (const [x, y] of [
    [-13, -24],
    [-2, -27],
    [9, -24],
    [-3, -17],
    [13, -18],
  ]) {
    c.beginPath();
    c.moveTo(x - 4, y - 2);
    c.lineTo(x + 4, y + 2);
    c.strokeStyle = '#af8746';
    c.lineWidth = 1.5;
    c.stroke();
  }
  for (const x of [-16, -5, 6, 16]) {
    c.beginPath();
    c.moveTo(x, -8);
    c.lineTo(x + 2, 4);
    c.strokeStyle = '#e3c679';
    c.lineWidth = 2;
    c.stroke();
  }
  for (const x of [-11, 11]) {
    c.beginPath();
    c.moveTo(x, -30);
    c.lineTo(x, -2);
    c.lineTo(x + 2, 9);
    c.strokeStyle = '#866b42';
    c.lineWidth = 3;
    c.stroke();
  }
  box(c, -3, -10, 6, 5, 2, '#e8d498', '#866b42', 1);
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRaceTrackEffects(c, r, p, reduced = false) {
  c.save();
  for (const [body, state] of [[p, r.track], ...r.rivals.map((n) => [n, n.track])]) {
    if (!state) continue;
    if (state.boostLeft > 0) {
      c.beginPath();
      c.ellipse(body.x, body.y + 2, 23, 11, 0, 0, Math.PI * 2);
      c.strokeStyle = '#f4dca0';
      c.lineWidth = 3;
      c.stroke();
      if (!reduced) {
        for (const x of [-20, 20]) {
          c.beginPath();
          c.moveTo(body.x + x, body.y - 8);
          c.lineTo(body.x + x + 3, body.y - 24);
          c.strokeStyle = '#eff2cf';
          c.lineWidth = 2;
          c.stroke();
        }
      }
    }
    if (state.muddy) {
      for (const x of [-13, 12]) oval(c, body.x + x, body.y + 3, 5, 3, '#967453');
    }
    if (state.bump > 0) {
      c.beginPath();
      c.ellipse(body.x, body.y + 1, 22, 10, 0, 0.2, 2.9);
      c.strokeStyle = style.forestRaceTrack.drawRaceBaleColor;
      c.lineWidth = 3;
      c.stroke();
    }
  }
  c.restore();
}
