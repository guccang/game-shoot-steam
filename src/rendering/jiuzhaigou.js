import { gustStrength } from '../world/gust.js';
import { drawWindRipple } from './wind-ripple.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { consumeDrawSteps } from './draw-steps.js';
import { WORLD } from '../world/coordinates.js';
import {
  JIUZHAIGOU_LAKES,
  JIUZHAIGOU_WATER,
  JIUZHAIGOU_FALL_SURFACES,
  JIUZHAIGOU_PATHS,
  valleyNoise,
  valleyBlocked,
} from '../world/jiuzhaigou.js';
import { paintJiuzhaigouLand } from './jiuzhaigou-landscape.js';
import { oval } from './primitives.js';
import { nightColor } from './river.js';

// 九寨沟正式绘制器：柔和草木、青碧透明水层与奶油色钙华；不引入独立美术引擎。

// 水面轮廓与碰撞共用顶点，绘制内部色斑时保持边界不变。
// 共用绘制与动作输入，风格差异由配置提供。
function waterPath(c, item) {
  c.beginPath();
  item.outline.forEach((p, i) => (i ? c.lineTo(item.x + p.x, item.y + p.y) : c.moveTo(item.x + p.x, item.y + p.y)));
  c.closePath();
}
// 共用绘制与动作输入，风格差异由配置提供。
function softPatch(c, x, y, rx, ry, phase, fill) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6,
      r = 1 + 0.15 * Math.sin(a * 3 + phase);
    return { x: x + Math.cos(a) * rx * r, y: y + Math.sin(a) * ry * r };
  });
  c.beginPath();
  c.moveTo((points[11].x + points[0].x) / 2, (points[11].y + points[0].y) / 2);
  points.forEach((p, i) => {
    const q = points[(i + 1) % 12];
    c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  });
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}
// 共用绘制与动作输入，风格差异由配置提供。
function paintLake(c, lake) {
  waterPath(c, lake);
  c.save();
  c.clip();
  const colors =
    lake.id === 'five-flower' || lake.id === 'five-colour'
      ? style.jiuzhaigou.paintLakeValue
      : style.jiuzhaigou.paintLakeValue2;
  for (let i = 0; i < 3; i++) {
    const points = lake.outline.map((p, j) => {
      const a = (j / lake.outline.length) * Math.PI * 2;
      const scale = 0.86 - i * 0.17 + Math.sin(a * 2 + lake.phase) * (0.025 + i * 0.018);
      return { x: lake.x + p.x * scale + lake.rx * i * 0.07, y: lake.y + p.y * scale - lake.ry * i * 0.045 };
    });
    c.beginPath();
    const last = points[points.length - 1],
      first = points[0];
    c.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
    points.forEach((p, j) => {
      const next = points[(j + 1) % points.length];
      c.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    });
    c.closePath();
    c.fillStyle = colors[i];
    c.fill();
  }
  for (let i = 0; i < style.jiuzhaigou.paintLakeValue3; i++) {
    const x = lake.x + (valleyNoise(i, lake.x) - 0.5) * lake.rx * 1.8;
    const y = lake.y + (valleyNoise(i + 9, lake.y) - 0.5) * lake.ry * 1.7;
    if (lake.kind === 'shoal') {
      oval(c, x, y, 18 + (i % 4) * 8, 7 + (i % 3) * 3, '#d5d4a7');
      oval(c, x - 3, y - 2, 14, 4, '#eff0c8');
    } else if (i < 5) {
      c.strokeStyle = '#447e7170';
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 24, y + 18);
      c.lineTo(x + 23, y - 16);
      c.moveTo(x + 3, y - 1);
      c.lineTo(x - 6, y - 25);
      c.stroke();
      c.strokeStyle = '#bed1a956';
      c.lineWidth = 2;
      c.stroke();
    } else oval(c, x, y, 8 + (i % 5), 3, '#9ccdaf35');
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function paintBank(c, water, width, fill) {
  waterPath(c, water);
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = fill;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const points = water.outline;
  // 短弧圆帽叠合形成可变宽岸带；不直接偏移凹角法线，避免岸带自身再次折叠。
  for (let i = 0; i < points.length; i += 8) {
    const p = points[i];
    const amount = width * (0.72 + 0.2 * Math.sin(p.x * 0.012 + p.y * 0.006) + 0.16 * Math.cos(p.y * 0.019));
    c.beginPath();
    c.moveTo(p.x, p.y);
    for (let j = 1; j <= 8; j++) {
      const q = points[(i + j) % points.length];
      c.lineTo(q.x, q.y);
    }
    c.lineWidth = amount * 2;
    c.stroke();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function paintJiuzhaigou(c, view = { x: 0, y: 0, w: WORLD.width, h: WORLD.height }) {
  consumeDrawSteps(paintJiuzhaigouSteps(c, view)); // 同步预览与分帧生成复用全部原图元。
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* paintJiuzhaigouSteps(c, view = { x: 0, y: 0, w: WORLD.width, h: WORLD.height }) {
  c.fillStyle = style.jiuzhaigou.paintJiuzhaigouSteps_fillStyleColor;
  c.fillRect(view.x, view.y, view.w, view.h);
  for (let y = 450; y < WORLD.height - 250; y += 650)
    for (let x = 600; x < WORLD.width - 350; x += 820) {
      if (x < view.x - 850 || x > view.x + view.w + 850 || y < view.y - 450 || y > view.y + view.h + 450) continue;
      const n = valleyNoise(x, y);
      softPatch(
        c,
        x + 60 * n,
        y + 50 * n,
        320 + n * 80,
        190,
        n * 7,
        n > 0.45 ? style.jiuzhaigou.paintJiuzhaigouStepsColor : style.jiuzhaigou.paintJiuzhaigouStepsColor2,
      );
    }
  paintJiuzhaigouLand(c, view);
  yield;
  c.strokeStyle = style.jiuzhaigou.paintJiuzhaigouSteps_strokeStyleColor;
  c.lineWidth = 30;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const points of JIUZHAIGOU_PATHS) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  for (const item of JIUZHAIGOU_WATER) {
    paintBank(c, item, 27, '#9eb38b');
    yield;
    paintBank(c, item, 11, '#b9c59f');
    yield;
    waterPath(c, item);
    c.fillStyle = style.jiuzhaigou.paintJiuzhaigouSteps_fillStyleColor2;
    c.fill();
    c.save();
    c.clip();
    for (const lake of JIUZHAIGOU_LAKES) {
      paintLake(c, lake);
      yield;
    }
    waterPath(c, item);
    c.strokeStyle = style.jiuzhaigou.paintJiuzhaigouSteps_strokeStyleColor2;
    c.lineWidth = 12;
    c.stroke();
    c.restore();
  }
  for (const lake of JIUZHAIGOU_LAKES)
    for (let i = 0; i < lake.outline.length; i += 3) {
      if (i % 48 === 0) yield;
      const p = lake.outline[i],
        x = lake.x + p.x * 1.12,
        y = lake.y + p.y * 1.16;
      if (
        x < view.x - 35 ||
        x > view.x + view.w + 35 ||
        y < view.y - 35 ||
        y > view.y + view.h + 35 ||
        valleyBlocked(x, y, 6)
      )
        continue;
      const n = valleyNoise(x, y);
      if (n < 0.24) continue;
      oval(c, x, y + 3, 16, 7, '#769775');
      oval(
        c,
        x - 4,
        y - 2,
        12,
        7,
        n < 0.4 ? '#c4c497' : '#8bab78',
        style.jiuzhaigou.paintJiuzhaigouStepsColor3,
        style.jiuzhaigou.paintJiuzhaigouStepsValue,
      );
      c.strokeStyle = '#527c61';
      c.lineWidth = 2;
      for (let stem = -2; stem <= 2; stem++) {
        c.beginPath();
        c.moveTo(x + stem * 3, y);
        c.quadraticCurveTo(x + stem * 5, y - 10, x + stem * 7, y - 17 - n * 10);
        c.stroke();
      }
      if (n > 0.72) for (let j = 0; j < 3; j++) oval(c, x + j * 6 - 6, y - 8 - (j % 2) * 5, 2.5, 2, '#f3e3ac');
    }
  for (const f of JIUZHAIGOU_FALL_SURFACES) {
    waterPath(c, f);
    c.fillStyle = '#b6d0b5';
    c.fill();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawJiuzhaigouWater(c, view, time, night = 0, reduced = false, wind = 0, windTime = time) {
  const color = (hex) => (night > 0 ? nightColor(hex, night) : hex);
  const t = reduced ? 0 : time;
  for (let wy = Math.floor(view.y / WORLD.height); wy <= Math.floor((view.y + view.h) / WORLD.height); wy++)
    for (let wx = Math.floor(view.x / WORLD.width); wx <= Math.floor((view.x + view.w) / WORLD.width); wx++) {
      c.save();
      c.translate(wx * WORLD.width, wy * WORLD.height);
      for (const lake of JIUZHAIGOU_LAKES) {
        const x = lake.x + wx * WORLD.width,
          y = lake.y + wy * WORLD.height;
        if (
          x + lake.rx < view.x ||
          x - lake.rx > view.x + view.w ||
          y + lake.ry < view.y ||
          y - lake.ry > view.y + view.h
        )
          continue;
        c.save();
        waterPath(c, lake);
        c.clip();
        c.lineWidth = 1.5;
        c.strokeStyle = color('#c6e4ce');
        c.globalAlpha = 0.34;
        for (let i = 0; i < 13; i++) {
          const px = lake.x + (valleyNoise(i + 2, lake.x) - 0.5) * lake.rx * 1.7;
          const py = lake.y + (valleyNoise(i + 7, lake.y) - 0.5) * lake.ry * 1.7;
          if (wind && !reduced) drawWindRipple(c, px, py, windTime, gustStrength(windTime - .32, px, wind), i);
          const drift = Math.sin(t * 0.65 + i) * 5;
          c.beginPath();
          c.ellipse(px + drift, py, 12 + (i % 4) * 5, 2, 0, 0.15, 2.8);
          c.stroke();
        }
        c.restore();
      }
      for (const f of JIUZHAIGOU_FALL_SURFACES) {
        const x = f.x + wx * WORLD.width,
          y = f.y + wy * WORLD.height;
        if (
          x + f.width / 2 < view.x ||
          x - f.width / 2 > view.x + view.w ||
          y + f.height + 28 < view.y ||
          y - 25 > view.y + view.h
        )
          continue;
        c.save();
        waterPath(c, f);
        c.clip();
        for (let step = 0; step < f.steps; step++) {
          const levels = f.steps === 3 ? [0, 0.16, 0.83, 1] : [0, 0.24, 0.5, 0.77, 1];
          const top = f.y + levels[step] * f.height,
            h = (levels[step + 1] - levels[step]) * f.height;
          const left = f.x - f.width / 2,
            right = f.x + f.width / 2;
          // 连续的青白水幕覆盖岩壁，主跌水比上下游浅台阶更高，轮廓保持柔和。
          c.fillStyle = color('#a1cfc0');
          c.fillRect(left, top, f.width, h + 2);
          c.lineCap = 'round';
          for (let i = 0; i < f.width / 14; i++) {
            const px = left + 5 + i * 14,
              n = valleyNoise(i, step + f.y);
            c.strokeStyle = color(n > 0.35 ? '#c7e5d3' : '#8fc7b7');
            c.lineWidth = 6 + n * 7;
            c.beginPath();
            c.moveTo(px, top + 2);
            c.quadraticCurveTo(px - 2 + n * 4, top + h * 0.5, px + 2, top + h);
            c.stroke();
            const phase = (t * 0.9 + n * 2) % 1;
            c.globalAlpha = 0.3 + Math.sin(phase * Math.PI) * 0.6;
            c.strokeStyle = color('#eef2dc');
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(px, top + phase * h);
            c.quadraticCurveTo(px + 2, top + Math.min(h, phase * h + 6), px + 1, top + Math.min(h + 2, phase * h + 15));
            c.stroke();
            c.globalAlpha = 1;
          }
          // 台沿仅露出零散钙华和苔草，不把每一层描成整齐横栏。
          for (let px = left + 8, i = 0; px < right; px += 31, i++) {
            const n = valleyNoise(i + 4, step + f.x);
            if (n < 0.48) oval(c, px, top + n * 5, 9 + n * 10, 2 + n * 2, color('#d8ddba'));
            if (n > 0.78 && step === 0) oval(c, px, top - 1, 6, 3, color('#8ea77e'));
          }
        }
        c.restore();
        for (let i = 0; i < f.width / 18; i++) {
          const pulse = (t * 0.7 + i * 0.27) % 1;
          oval(
            c,
            f.x - f.width / 2 + i * 18 + 7,
            f.y + f.height + 3 + pulse * 8,
            8 + pulse * 6,
            3 + pulse * 2,
            color('#dcebd4'),
          );
        }
        // 两端苔石固定在岸边，柔化直线水帘与草岸的交接。
        for (const side of [-1, 1]) {
          oval(c, f.x + side * (f.width / 2 + 5), f.y + 6, 17, 11, color('#a3b292'), color('#52745d'), 2);
          oval(c, f.x + side * (f.width / 2 + 3), f.y + 1, 13, 6, color('#c5c9a1'));
        }
      }
      c.restore();
    }
}
