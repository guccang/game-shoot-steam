import { gustStrength } from '../world/gust.js';
import { drawWindRipple } from './wind-ripple.js';
import {createRenderCanvas} from './canvas-recovery.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { consumeDrawSteps } from './draw-steps.js';
import { oval, box } from './primitives.js';
import { WORLD } from '../world/coordinates.js';
import { drawAlignedTile } from './tile-blit.js';
import { WATERFALL, BRIDGE, riverPoint, riverXAt, riverSamples, riverHalfWidth } from '../world/river-geometry.js';
import { drawShoreGroundSteps, drawShoreWaterSteps, drawShoreDetails } from './shore-art.js';

// 河流、瀑布与夜色纹理的 Canvas 表现，使用共享地形几何。

export { WATERFALL, BRIDGE } from '../world/river-geometry.js';
const regions = [
  { x: 1100, y: 0, w: 310, h: 620 },
  { x: 1100, y: 620, w: 310, h: WORLD.height - 620 },
];
const RIVER_TILE_HEIGHT = 128;
const RIVER_PAD = 8;
const RIVER_CACHE_LIMIT = 24;
const NIGHT_RED = 0.86,
  NIGHT_GREEN = 0.88,
  NIGHT_BLUE = 0.98,
  NIGHT_GREEN_TO_BLUE = 0.045;
// 共用绘制与动作输入，风格差异由配置提供。
export function nightColor(hex, amount = 1) {
  const value = hex.slice(1),
    r = parseInt(value.slice(0, 2), 16),
    g = parseInt(value.slice(2, 4), 16),
    b = parseInt(value.slice(4, 6), 16);
  const mix = (a, target) => Math.round(a + (target - a) * amount);
  return `rgba(${mix(r, r * NIGHT_RED)},${mix(g, g * NIGHT_GREEN)},${mix(b, Math.min(255, g * NIGHT_GREEN_TO_BLUE + b * NIGHT_BLUE))},${value.length === 8 ? parseInt(value.slice(6), 16) / 255 : 1})`;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function nightTexture(source) {
  const steps = nightTextureSteps(source);
  let result;
  do {
    result = steps.next();
  } while (!result.done);
  return result.value;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* nightTextureSteps(source, owned) {
  const canvas = createRenderCanvas();
  owned?.add(canvas);
  canvas.width = source.width;
  canvas.height = source.height;
  let complete = false;
  try {
    // 此临时画布必定读回并写入像素，避免浏览器先上传 GPU 再同步下载。
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height),
      data = image.data;
    const batch = canvas.width * 4 * 32;
    for (let start = 0; start < data.length; start += batch) {
      const end = Math.min(data.length, start + batch);
      for (let i = start; i < end; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        data[i] = r * NIGHT_RED;
        data[i + 1] = g * NIGHT_GREEN;
        data[i + 2] = Math.min(255, g * NIGHT_GREEN_TO_BLUE + b * NIGHT_BLUE);
      }
      yield;
    }
    ctx.putImageData(image, 0, 0);
    complete = true;
    return canvas;
  } finally {
    if (!complete) {
      canvas.width = 1;
      canvas.height = 1;
      owned?.delete(canvas);
    }
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function pool(ctx, color, rx = 54, ry = 24) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(WATERFALL.x, WATERFALL.y + 150, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawWater(ctx) {
  consumeDrawSteps(drawWaterSteps(ctx)); // 动态河面遮罩同步复用同一水形。
}
// 共用绘制与动作输入，风格差异由配置提供。
function* drawWaterSteps(ctx) {
  yield* drawShoreWaterSteps(ctx);
  pool(ctx, style.river.drawWaterStepsColor, 56, 26);
  pool(ctx, style.river.drawWaterStepsColor2, 53, 23);
  pool(ctx, style.river.drawWaterStepsColor3, 41, 17);
  ctx.fillStyle = style.river.drawWaterSteps_fillStyleColor;
  ctx.fillRect(WATERFALL.x - 32, WATERFALL.y, 64, 140);
  ctx.fillStyle = style.river.drawWaterSteps_fillStyleColor2;
  ctx.fillRect(WATERFALL.x - 32, WATERFALL.y, 7, 136);
  ctx.fillStyle = style.river.drawWaterSteps_fillStyleColor3;
  ctx.fillRect(WATERFALL.x + 23, WATERFALL.y, 9, 136);
  ctx.strokeStyle = '#d5ebd7';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 26; i++) {
    const p = riverPoint((i + 0.3) / 26);
    if (p.y > WATERFALL.y - 8 && p.y < WATERFALL.y + 142) continue;
    const x = p.x + Math.sin(i * 7) * 16;
    ctx.beginPath();
    ctx.moveTo(x - 7, p.y);
    ctx.quadraticCurveTo(x, p.y + 3, x + 7, p.y);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) box(ctx, WATERFALL.x - 20 + i * 12, WATERFALL.y + 18 + (i % 2) * 25, 3, 52, 2, '#d3ebe0');
  for (let i = 0; i < 5; i++)
    oval(ctx, WATERFALL.x - 26 + i * 13, WATERFALL.y + 140 + Math.sin(i * 2) * 3, 11, 5, '#d8ece0');
}
// 共用绘制与动作输入，风格差异由配置提供。
function bankRock(ctx, x, y, rx, ry) {
  ctx.save();
  ctx.translate(x, y);
  const contour = new Path2D();
  contour.moveTo(-rx, ry * 0.3);
  contour.quadraticCurveTo(-rx, -ry * 0.8, -rx * 0.3, -ry);
  contour.quadraticCurveTo(rx * 0.65, -ry * 1.2, rx, 0);
  contour.quadraticCurveTo(rx * 1.1, ry, -rx * 0.6, ry);
  contour.quadraticCurveTo(-rx, ry, -rx, ry * 0.3);
  contour.closePath();
  ctx.fillStyle = style.river.bankRock_fillStyleColor;
  ctx.fill(contour);
  ctx.save();
  ctx.clip(contour);
  oval(ctx, rx * 0.6, ry * 0.7, rx * 1.2, ry, style.river.bankRockColor);
  ctx.restore();
  ctx.strokeStyle = style.river.bankRock_strokeStyleColor;
  ctx.lineWidth = style.river.bankRock_lineWidthValue;
  ctx.stroke(contour);
  // 细节开关只控制局部绘制，保留共同分层与动作输入。
  if (style.river.bankRockDetail) {
    oval(ctx, -rx * 0.28, -ry * 0.48, rx * 0.35, ry * 0.15, '#cad1ad');
  }
  ctx.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawRiverGround(ctx, winter = false) {
  consumeDrawSteps(drawRiverGroundSteps(ctx, winter)); // 同步入口完整执行原绘制序列。
}
// 共用绘制与动作输入，风格差异由配置提供。
export function* drawRiverGroundSteps(ctx, winter = false) {
  ctx.save();
  ctx.lineCap = 'round';
  yield* drawShoreGroundSteps(ctx, winter);
  pool(ctx, winter ? '#d8e4db' : '#9cae7e', 62, 30);
  yield* drawWaterSteps(ctx);
  drawShoreDetails(ctx);
  // 瀑布两侧采用三块圆润岩石，无锐利切面、岩层纹理或体积渐变。
  for (const side of [-1, 1]) {
    for (let tier = 2; tier >= 0; tier--) {
      const x = WATERFALL.x + side * (57 + (tier % 2) * 3),
        y = WATERFALL.y + 16 + tier * 48;
      bankRock(ctx, x, y, 25, 31);
      if (tier !== 1) {
        oval(ctx, x - 6, y - 22, 11, 4, winter ? '#eff4e9' : '#91ae72');
        oval(ctx, x + 6, y - 23, 6, 3, winter ? '#c5d8d6' : '#a6c17e');
      }
    }
  }
  ctx.strokeStyle = '#d7ebda';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(WATERFALL.x - 30, WATERFALL.y + 1);
  ctx.lineTo(WATERFALL.x + 30, WATERFALL.y + 1);
  ctx.stroke();
  drawBridge(ctx);
  ctx.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function drawBridge(ctx) {
  const b = BRIDGE;
  box(ctx, b.x + 6, b.y + 10, b.width, b.height + 2, 5, '#2e57413b');
  box(ctx, b.x, b.y + b.height - 3, b.width, 10, 3, '#786342');
  ctx.fillStyle = '#8d7852';
  ctx.strokeStyle = style.river.drawBridge_strokeStyleColor;
  ctx.lineWidth = 3;
  ctx.fillRect(b.x, b.y, b.width, b.height);
  ctx.strokeRect(b.x, b.y, b.width, b.height);
  for (let i = 0; i < style.river.drawBridgeValue; i++) {
    const x = b.x + 2 + (i * (b.width - 4)) / style.river.drawBridgeValue;
    ctx.fillStyle = i % 3 ? style.river.drawBridge_fillStyleColor : style.river.drawBridge_fillStyleColor2;
    ctx.fillRect(x, b.y + 2, (b.width - 4) / style.river.drawBridgeValue - 1, b.height - 4);
    ctx.strokeStyle = style.river.drawBridge_strokeStyleColor2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 5, b.y + 13);
    ctx.lineTo(x + 7, b.y + b.height - 12);
    ctx.stroke();
  }
  ctx.fillStyle = '#e3c08c';
  ctx.fillRect(b.x - 4, b.y - 4, b.width + 8, 7);
  ctx.fillRect(b.x - 4, b.y + b.height - 3, b.width + 8, 7);
  for (const x of [b.x, b.x + b.width])
    for (const y of [b.y, b.y + b.height]) {
      ctx.fillStyle = '#97744c';
      ctx.fillRect(x - 5, y - 14, 10, 19);
      ctx.fillStyle = '#e2bf89';
      ctx.beginPath();
      ctx.ellipse(x, y - 14, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
}
export class RiverRenderer {
  // 河水按真实有色边界分块，透明边缘不触发更新，离屏块不分配纹理。
  constructor() {
    this.tiles = new Map();
    this.frames = 0;
    this.lastFrame = -1;
    this.updates = 0;
    this.strips = 0;
    this.bounds = [];
    for (const region of regions)
      for (let top = 0; top < region.h; top += RIVER_TILE_HEIGHT) {
        const y = region.y + top,
          h = Math.min(RIVER_TILE_HEIGHT, region.h - top);
        const samples = riverSamples.filter((p) => p.y >= y - 32 && p.y <= y + h + 32);
        let left = Math.min(...samples.map((p) => p.x - riverHalfWidth(p.y, -1))) - 5;
        let right = Math.max(...samples.map((p) => p.x + riverHalfWidth(p.y, 1))) + 5;
        if (y < WATERFALL.y + 182 && y + h > WATERFALL.y - 12) {
          left = Math.min(left, WATERFALL.x - 62);
          right = Math.max(right, WATERFALL.x + 62);
        }
        left = Math.max(region.x, Math.floor(left));
        right = Math.min(region.x + region.w, Math.ceil(right));
        this.bounds.push({ key: y, x: left, y, w: right - left, h, phaseY: region.y });
      }
  }

  // 小块保留扰动采样边距；挖空桥面与瀑布岩壁的几何和旧版相同。
  getTile(region, night) {
    let tile = this.tiles.get(region.key);
    if (!tile) {
      const texture = createRenderCanvas();
      texture.width = region.w + RIVER_PAD * 2;
      texture.height = region.h + RIVER_PAD * 2;
      const ctx = texture.getContext('2d');
      ctx.translate(RIVER_PAD - region.x, RIVER_PAD - region.y);
      drawWater(ctx);
      ctx.clearRect(BRIDGE.x - 5, BRIDGE.y - 5, BRIDGE.width + 10, BRIDGE.height + 10);
      const left = regions[0].x,
        right = left + regions[0].w;
      ctx.clearRect(left, WATERFALL.y - 8, WATERFALL.x - WATERFALL.width / 2 - left, WATERFALL.height + 8);
      ctx.clearRect(
        WATERFALL.x + WATERFALL.width / 2,
        WATERFALL.y - 8,
        right - WATERFALL.x - WATERFALL.width / 2,
        WATERFALL.height + 8,
      );
      ctx.clearRect(WATERFALL.x - WATERFALL.width / 2 - 2, WATERFALL.y - 2, WATERFALL.width + 4, 4);
      tile = { mask: texture, layers: [] };
    }
    const count = night > 0 ? 2 : 1;
    while (tile.layers.length < count) {
      const index = tile.layers.length;
      const canvas = createRenderCanvas();
      canvas.width = tile.mask.width;
      canvas.height = tile.mask.height;
      tile.layers.push({
        canvas,
        ctx: canvas.getContext('2d'),
        texture: index ? nightTexture(tile.mask) : tile.mask,
        frame: -1,
      });
    }
    this.tiles.delete(region.key);
    this.tiles.set(region.key, tile);
    return tile;
  }

  // 八像素条带保留原始小幅正弦扰动，减少四分之三采样调用；边缘遮罩仍精确裁切。
  updateTile(layer, region, time, rain, mask, wind, windTime) {
    const c = layer.ctx,
      pad = RIVER_PAD,
      width = layer.canvas.width;
    c.clearRect(0, 0, width, layer.canvas.height);
    for (let row = -pad; row < region.h + pad; row += 8) {
      const y = region.y + row - region.phaseY;
      const dx = Math.sin(y * 0.06 - time * 2.1) * 1.2 + Math.sin(y * 0.025 - time * 1.1) * 0.5;
      const dy = Math.sin(y * 0.04 - time * 1.5) * 1.3;
      c.drawImage(layer.texture, 0, row + pad, width, 8, dx, row + pad + dy, width, 9);
      this.strips++;
    }
    c.save();
    c.translate(pad, pad);
    this.streamHighlights(c, region, time, rain, wind, windTime);
    if (region.y < WATERFALL.y + 180 && region.y + region.h > WATERFALL.y) this.waterfall(c, region, time);
    c.restore();
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(mask, 0, 0);
    c.globalCompositeOperation = 'source-over';
    this.updates++;
  }

  // 稀疏圆头波纹沿河道缓慢下移，避免密集反光和写实折射纹理。
  streamHighlights(ctx, region, time, rain, wind, windTime) {
    ctx.save();
    ctx.translate(-region.x, -region.y);
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const phase = (i / 26 + time * 0.009) % 1,
        p = riverPoint(phase);
      if (p.y > WATERFALL.y - 10 && p.y < WATERFALL.y + 144) continue;
      const x = p.x + Math.sin(i * 7) * 17;
      ctx.strokeStyle = '#d4ebdc99';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - 7, p.y);
      ctx.quadraticCurveTo(x, p.y + 4, x + 8, p.y + 1);
      ctx.stroke();
    }
    // 定距采样真实河心线，长河段也有风纹，并由原水域遮罩裁去桥面。
    if (wind) for (let y = Math.ceil((region.y - 8) / 37) * 37; y < region.y + region.h + 8; y += 37) {
      const x = riverXAt(y) + Math.sin(y * .17) * 22;
      drawWindRipple(ctx, x, y, windTime, gustStrength(windTime - .32, x, wind), y / 37);
    }
    if (rain > 0.01)
      for (let i = 0; i < 12; i++) {
        const phase = (time * 0.6 + i * 0.173) % 1,
          p = riverPoint((i + 0.5) / 12);
        if (p.y > WATERFALL.y - 10 && p.y < WATERFALL.y + 144) continue;
        ctx.globalAlpha = (1 - phase) * rain * 0.5;
        ctx.strokeStyle = '#e1f1df';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 3 + phase * 12, 1 + phase * 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    ctx.restore();
  }

  // 四组宽水丝和云朵泡沫表达落水力量，少量圆水滴使用错相动画。
  waterfall(ctx, region, time) {
    ctx.save();
    ctx.translate(WATERFALL.x - region.x, WATERFALL.y - region.y);
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const p = (time * 0.55 + i * 0.173) % 1,
        y = 6 + p * 112,
        x = -23 + i * 9;
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.7;
      ctx.strokeStyle = '#e2f2e3';
      ctx.lineWidth = i % 2 ? 3 : 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 2, y + 10, x, y + 24);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 5; i++)
      oval(ctx, -25 + i * 13, 139 + Math.sin(time * 2 + i) * 2, 10 + Math.sin(time * 2 + i) * 1.5, 5, '#d8ece0');
    for (let i = 0; i < 3; i++) {
      const p = (time * 0.55 + i / 3) % 1;
      ctx.globalAlpha = (1 - p) * 0.65;
      ctx.strokeStyle = '#e4f1df';
      ctx.lineWidth = style.river.bankRock_lineWidthValue;
      ctx.beginPath();
      ctx.ellipse(0, 147 + p * 8, 15 + p * 25, 4 + p * 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const p = (time * 0.65 + i * 0.173) % 1;
      ctx.globalAlpha = (1 - p) * 0.7;
      oval(ctx, Math.sin(i * 7) * 30 * p, 139 - 12 * Math.sin(p * Math.PI), 2, 3, '#e4f1df');
    }
    ctx.restore();
  }

  // 可见块使用统一 24 FPS 相位，同帧移动与世界镜像只更新一次。
  draw(ctx, time, night, rain, reduced, viewport, wind = 0, windTime = time) {
    if (reduced) return;
    const frame = Math.floor(time * 24);
    if (frame !== this.lastFrame) {
      this.lastFrame = frame;
      this.frames++;
      this.frameTime = time;
    }
    for (const region of this.bounds) {
      if (
        region.x > viewport.x + viewport.w ||
        region.x + region.w < viewport.x ||
        region.y > viewport.y + viewport.h ||
        region.y + region.h < viewport.y
      )
        continue;
      const tile = this.getTile(region, night);
      for (let index = night >= 1 ? 1 : 0; index < (night > 0 ? 2 : 1); index++) {
        const layer = tile.layers[index];
        if (layer.frame !== frame || layer.rain !== rain || layer.wind !== wind) {
          this.updateTile(layer, region, this.frameTime, rain, tile.mask, wind, windTime);
          layer.wind = wind;
          layer.frame = frame;
          layer.rain = rain;
        }
        ctx.globalAlpha = index === 1 ? night : 1;
        drawAlignedTile(ctx, layer.canvas, RIVER_PAD, region.x, region.y, region.w, region.h);
      }
    }
    ctx.globalAlpha = 1;
    while (this.tiles.size > RIVER_CACHE_LIMIT) {
      const key = this.tiles.keys().next().value,
        tile = this.tiles.get(key);
      for (const canvas of new Set([tile.mask, ...tile.layers.flatMap((layer) => [layer.canvas, layer.texture])])) {
        canvas.width = 1;
        canvas.height = 1;
      }
      this.tiles.delete(key);
    }
  }

  // 报告实际缓存、更新与条带数量，手机可验证离屏水域确实没有被重绘。
  stats() {
    let bytes = 0;
    for (const tile of this.tiles.values())
      for (const canvas of new Set([tile.mask, ...tile.layers.flatMap((layer) => [layer.canvas, layer.texture])]))
        bytes += canvas.width * canvas.height * 4;
    return { count: this.tiles.size, bytes, updates: this.updates, strips: this.strips };
  }
}
