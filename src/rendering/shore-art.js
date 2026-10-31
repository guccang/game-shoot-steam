// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { consumeDrawSteps } from './draw-steps.js';
import { WORLD } from '../world/coordinates.js';
import { riverXAt, riverHalfWidth, BRIDGE } from '../world/river-geometry.js';
import { NATURAL_TERRAIN, riverBeachWidth } from '../world/natural-terrain.js';
import { oval } from './primitives.js';

// 河岸与水面使用同一组平滑轮廓；局部河湾和逻辑碰撞共享宽度，桥梁通行范围保持不变。

// 周期起伏让地图首尾衔接，左右岸采用不同相位，避免平行等宽的边框。
// 共用绘制与动作输入，风格差异由配置提供。
function ripple(y, side, frequency = 9) {
  return Math.sin((y / WORLD.height) * Math.PI * 2 * frequency + side * 1.7);
}
// 共用绘制与动作输入，风格差异由配置提供。
function waterEdge(y, side) {
  return riverXAt(y) + side * (riverHalfWidth(y, side) - 2 + ripple(y, side) * 1.3);
}
// 共用绘制与动作输入，风格差异由配置提供。
function* ribbon(c, start, end, left, right, color) {
  c.beginPath();
  for (let y = start; y < end; y += 4) {
    const x = left(y);
    if (y === start) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.lineTo(left(end), end);
  for (let y = end; y > start; y -= 4) c.lineTo(right(y), y);
  c.lineTo(right(start), start);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  yield;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawShoreGround(c, winter = false) {
  consumeDrawSteps(drawShoreGroundSteps(c, winter)); // 同步入口保留全部图元。
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* drawShoreGroundSteps(c, winter = false) {
  for (const side of [-1, 1]) {
    yield* ribbon(
      c,
      0,
      WORLD.height,
      (y) => waterEdge(y, side) + side * (10 + ripple(y, side, 17) * 2),
      (y) => waterEdge(y, -side),
      winter ? '#eff3e8' : '#8b9d69',
    );
    yield* ribbon(
      c,
      0,
      WORLD.height,
      (y) => waterEdge(y, side) + side * (5 + ripple(y, side, 13)),
      (y) => waterEdge(y, -side),
      '#c1bf8b',
    );
  }
  for (const { start, end, side } of NATURAL_TERRAIN.beaches) {
    for (const [fraction, edge, color] of [
      [1, 6, winter ? '#ecf2e7' : '#8b9b62'],
      [1, 2.5, '#b6a16d'],
      [1, 0, '#ecd39a'],
      [0.24, 0, '#d4ba83'],
      [0.065, 0, '#bac6a3'],
    ]) {
      yield* ribbon(
        c,
        start,
        end,
        (y) =>
          waterEdge(y, side) +
          side * (5 + riverBeachWidth(y, side) * fraction + edge * Math.min(1, riverBeachWidth(y, side) / 12)),
        (y) => waterEdge(y, side) - side * 2,
        color,
      );
    }
    // 少量沙纹和碎石强调材质，不把可走的干沙铺成满屏纹理。
    for (let y = start + 43; y < end - 30; y += 57) {
      const width = riverBeachWidth(y, side);
      if (width < 24) continue;
      const x = waterEdge(y, side) + side * (8 + width * 0.6);
      oval(c, x, y, 5.5, 1.3, '#f8e6b6');
      oval(c, x + side * 8, y + 9, 1.5, 1, '#bda173');
      oval(c, x + side * 11, y + 8, 0.8, 0.6, '#fff0ce');
    }
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawShoreWater(c) {
  consumeDrawSteps(drawShoreWaterSteps(c)); // 同步入口保留全部图元。
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* drawShoreWaterSteps(c) {
  c.save();
  yield* ribbon(
    c,
    0,
    WORLD.height,
    (y) => waterEdge(y, -1),
    (y) => waterEdge(y, 1),
    style.shoreArt.drawShoreWaterStepsColor,
  );
  c.clip();
  yield* ribbon(
    c,
    0,
    WORLD.height,
    (y) => waterEdge(y, -1) + 9 + ripple(y, -1, 13) * 3,
    (y) => waterEdge(y, 1) - 9 + ripple(y, 1, 11) * 3,
    style.shoreArt.drawShoreWaterStepsColor2,
  );
  yield* ribbon(
    c,
    0,
    WORLD.height,
    (y) => riverXAt(y) - riverHalfWidth(y, -1) * 0.43 + ripple(y, 1, 6) * 7,
    (y) => riverXAt(y) + riverHalfWidth(y, 1) * 0.38 + ripple(y, -1, 8) * 8,
    style.shoreArt.drawShoreWaterStepsColor3,
  );
  for (
    let row = style.shoreArt.drawShoreWaterStepsValue;
    row < (style.shoreArt.fineWater ? WORLD.height / 38 + 1 : WORLD.height / 78);
    row++
  ) {
    if (row % 8 === 0) yield;

    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (style.shoreArt.fineWater) {
      const y = row * 38;
      for (let col = -1; col <= 1; col++) {
        const cy = y + Math.sin(row * 2.1 + col) * 8;
        // 营地河湾留出完整水色，细纹集中在中流，不和战斗弹道争抢注意力。
        if (cy > 600 && cy < 1180 && col !== 0) continue;
        const x = riverXAt(Math.max(0, Math.min(WORLD.height, cy))) + col * 29 + Math.sin(row * 1.7) * 5;
        const rx = 13 + Math.sin(row * 3.3 + col) * 3;
        c.beginPath();
        c.moveTo(x - rx, cy - 5);
        c.bezierCurveTo(x - rx + 2, cy - 15, x + rx - 2, cy - 14, x + rx, cy - 4);
        c.bezierCurveTo(x + rx + 4, cy + 8, x + 2, cy + 13, x - rx + 3, cy + 9);
        c.quadraticCurveTo(x - rx - 4, cy + 4, x - rx, cy - 5);
        c.fillStyle = row % 3 ? '#86d3dc0c' : '#247e9d16';
        c.fill();
        c.strokeStyle = '#a1e0dd25';
        c.lineWidth = 1.4;
        c.stroke();
      }
    } else {
      const y = row * 78 + 27,
        x = riverXAt(y) + Math.sin(row * 2.1) * 19;
      c.beginPath();
      c.moveTo(x - 7, y);
      c.quadraticCurveTo(x, y + 6, x + 7, y);
      c.strokeStyle = '#b5ebf0';
      c.lineWidth = 2.4;
      c.lineCap = 'round';
      c.stroke();
    }
  }
  for (let y = 87; y < WORLD.height; y += 113) {
    const side = Math.sin(y) > 0 ? 1 : -1;
    c.strokeStyle = '#deeee0a0';
    c.lineWidth = 1.5;
    c.lineCap = 'round';
    c.beginPath();
    for (let dy = 0; dy <= 15; dy += 3) {
      const x = waterEdge(y + dy, side) - side * 2.5;
      if (!dy) c.moveTo(x, y);
      else c.lineTo(x, y + dy);
    }
    c.stroke();
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function shoreStone(c, x, y, scale) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  oval(c, 3, 3, 11, 4, '#476c4b35');
  c.beginPath();
  c.moveTo(-9, 0);
  c.lineTo(-6, -8);
  c.lineTo(1, -12);
  c.lineTo(9, -6);
  c.lineTo(11, 2);
  c.lineTo(2, 5);
  c.closePath();
  c.fillStyle = style.shoreArt.shoreStone_fillStyleColor;
  c.fill();
  c.strokeStyle = style.shoreArt.shoreStone_strokeStyleColor;
  c.lineWidth = style.shoreArt.shoreStone_lineWidthValue;
  c.stroke();
  c.beginPath();
  c.moveTo(-6, -8);
  c.lineTo(1, -12);
  c.lineTo(7, -6);
  c.lineTo(0, -3);
  c.lineTo(-7, -3);
  c.closePath();
  c.fillStyle = style.shoreArt.shoreStone_fillStyleColor2;
  c.fill();
  oval(c, -4, 1, 4, 1.5, '#84995e');
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function shorePlant(c, x, y) {
  oval(c, x + 2, y + 2, 10, 3, '#466c4930');
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.moveTo(x - 2, y);
    c.quadraticCurveTo(x + i * 4 - 3, y - 10, x + i * 6, y - 17 + Math.abs(i) * 3);
    c.quadraticCurveTo(x + i * 3 + 3, y - 7, x + 2, y);
    c.closePath();
    c.fillStyle = i % 2 ? '#7e9d59' : '#a5bd72';
    c.fill();
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawShoreDetails(c) {
  for (const [y, side, stones] of [
    [160, -1, true],
    [300, 1, false],
    [640, -1, false],
    [879, 1, true],
    [1030, -1, false],
    [1102, 1, false],
    [1340, -1, true],
    [1605, -1, false],
    [1795, 1, true],
    [1950, -1, true],
    [2150, 1, false],
    [2315, -1, true],
    [2495, 1, false],
    [2690, -1, false],
  ]) {
    if (y > BRIDGE.y - 60 && y < BRIDGE.y + BRIDGE.height + 60) continue;
    const x = waterEdge(y, side) + side * (14 + riverBeachWidth(y, side));
    if (stones) {
      shoreStone(c, x, y, 0.85);
      shoreStone(c, x + side * 13, y + 6, 0.48);
      shorePlant(c, x + side * 10, y - 6);
    } else shorePlant(c, x, y);
  }
}
