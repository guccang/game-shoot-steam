import {drawEarthGround} from './earth-landforms.js';
import { gustStrength } from '../world/gust.js';
import { drawWindRipple } from './wind-ripple.js';
import {createRenderCanvas} from './canvas-recovery.js';
// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { releaseArtCache } from '../art-styles/cache.js';
import { mixRaster } from './season-raster.js';
import { snowCap, snowDrift } from './winter-art.js';
import { NATURAL_TERRAIN } from '../world/natural-terrain.js';
import {mountainPeaks} from '../world/mountain-peaks.js';
import { oval, poly } from './primitives.js';
import { nightTexture } from './river.js';
import { drawMountainShape } from './mountain-shapes.js';
import { shoreStone } from './shore-art.js';

// 自然地貌美术：湖岸进入地面缓存，草顶岩山按脚底排序并复用昼夜图集。

const mountainAtlas = new Map();
// 宽山地由正常比例的错落群峰组成，复用六张标准图集，不放大单座岩柱铺满山地。
function drawRegionalMountain(c,item,night,player,winter,view){
 for(const peak of mountainPeaks(item)){
  const {x,y}=peak;
  if(view&&(x-110>view.x+view.w||x+110<view.x||y-190>view.y+view.h||y+60<view.y))continue;
  drawMountain(c,peak,night,player,winter);
 }
}
// 共用绘制与动作输入，风格差异由配置提供。
function outlinePath(c, points, scale = 1, dx = 0, dy = 0) {
  c.beginPath();
  points.forEach((p, i) => {
    const x = p.x * scale + dx,
      y = p.y * scale + dy;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  });
  c.closePath();
}
// 共用绘制与动作输入，风格差异由配置提供。
function lake(c, item, winter,view=null) {
  c.save();
  c.translate(item.x, item.y);
  const points = item.outline;
  outlinePath(c, points, 1.035);
  c.fillStyle = winter ? '#c8d6d0' : '#c4c59a';
  c.fill();
  if (winter)
    for (const i of [2, 13, 27, 38, 49, 58]) {
      const p = points[i];
      snowDrift(c, p.x * 1.035, p.y * 1.035, 18 + (i % 3) * 5, 6 + (i % 4));
    }
  outlinePath(c, points);
  c.fillStyle = style.naturalTerrain.lake_fillStyleColor;
  c.fill();
  c.save();
  c.clip();
  outlinePath(c, points, 0.94);
  c.fillStyle = style.naturalTerrain.lake_fillStyleColor2;
  c.fill();
  outlinePath(c, points, 0.82, -10, 9);
  c.fillStyle = style.naturalTerrain.lake_fillStyleColor3;
  c.fill();
  outlinePath(c, points, 0.59, -19, 14);
  c.fillStyle = style.naturalTerrain.lake_fillStyleColor4;
  c.fill();
  const lowY=style.naturalTerrain.fineDetails?-item.ry*1.2:-item.ry,lowX=style.naturalTerrain.fineDetails?-item.rx*1.2:-item.rx;
  const startRow=view?Math.max(0,Math.floor((view.y-item.y-40-lowY)/style.naturalTerrain.lakeValue)):0;
  const startCol=view?Math.max(0,Math.floor((view.x-item.x-50-lowX)/style.naturalTerrain.lakeValue2)):0;
  for (
    let y=lowY+startRow*style.naturalTerrain.lakeValue,row=startRow;
    y < Math.min(-lowY,view?view.y+view.h-item.y+40:Infinity);
    y += style.naturalTerrain.lakeValue, row++
  )
    for (
      let x=lowX+startCol*style.naturalTerrain.lakeValue2;
      x < Math.min(-lowX,view?view.x+view.w-item.x+50:Infinity);
      x += style.naturalTerrain.lakeValue2
    ) {
      const px =
          (style.naturalTerrain.fineDetails ? x + (row % 2) * 21 : x) +
          (style.naturalTerrain.fineDetails ? Math.sin(y * 0.08 + x) : row % 2) * style.naturalTerrain.lakeValue3,
        py = y + Math.sin(x * 0.06) * style.naturalTerrain.lakeValue4;
      c.beginPath();
      c.moveTo(px - style.naturalTerrain.lakeValue5, py);
      c.quadraticCurveTo(
        style.naturalTerrain.fineDetails ? px - 15 : px,
        style.naturalTerrain.fineDetails ? py - 17 : py + 6,
        px + style.naturalTerrain.lakeValue6,
        style.naturalTerrain.fineDetails ? py - 14 : py,
      );
      // 细节开关只控制局部绘制，保留共同分层与动作输入。
      if (style.naturalTerrain.fineDetails) {
        c.quadraticCurveTo(px + 27, py - 12, px + 22, py + 4);
        c.quadraticCurveTo(px + 15, py + 19, px - 5, py + 15);
        c.quadraticCurveTo(px - 24, py + 12, px - 20, py);
      }
      c.strokeStyle = style.naturalTerrain.lake_strokeStyleColor;
      c.lineWidth = style.naturalTerrain.lake_lineWidthValue;
      // 细节开关只控制局部绘制，保留共同分层与动作输入。
      if (!style.naturalTerrain.fineDetails) {
        c.lineCap = 'round';
      }
      c.stroke();
    }
  for (const i of [3, 7, 20, 25, 39, 51, 57]) {
    const p = points[i];
    oval(c, p.x * 0.97, p.y * 0.97, 3.5, 1.5, '#d7eee0b0');
  }
  if (!winter)
    for (const [x, y] of [
      [item.rx * 0.48, -item.ry * 0.28],
      [item.rx * 0.58, -item.ry * 0.18],
    ]) {
      oval(c, x + 1, y + 2, 9, 4, '#277d8650');
      c.beginPath();
      c.moveTo(x, y);
      c.ellipse(x, y, 9, 5, -0.2, 0.3, Math.PI * 1.95);
      c.closePath();
      c.fillStyle = '#83b878';
      c.fill();
      oval(c, x - 2, y - 1, 3, 1, '#badb92');
    }
  c.restore();
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawNaturalGround(c, view = null, winter = false) {
  for (const item of NATURAL_TERRAIN.obstacles) {
    const b = item.visualBounds;
    if (view && (b.x > view.x + view.w || b.x + b.w < view.x || b.y > view.y + view.h || b.y + b.h < view.y)) continue;
    if(item.earth)drawEarthGround(c,item,winter);
    else if (item.kind === 'lake') lake(c, item, winter,view);
    else {
      c.save();
      c.translate(item.x, item.y);
      if (winter) {
        snowDrift(c, -item.rx * 0.35, item.ry * 0.45, item.rx * 0.86, 18);
        snowDrift(c, item.rx * 0.63, item.ry * 0.1, item.rx * 0.45, 12);
      }
      oval(c, 27, 22, item.rx * 1.15, item.ry * 0.95, '#31584428');
      outlinePath(c, item.outline, 1.12, 8, 5);
      c.fillStyle = '#35544032';
      c.fill();
      outlinePath(c, item.outline);
      c.fillStyle = winter ? '#c9dad7' : '#8d9883';
      c.fill();
      c.restore();
    }
  }
}
// 共用绘制与动作输入，风格差异由配置提供。
function rockColumn(c, x, y, rx, height, green = true, winter = false) {
  const top = y - height,
    cap = rx * 0.35;
  c.save();
  c.beginPath();
  c.moveTo(x - rx * 0.83, top);
  c.lineTo(x - rx * 0.97, top + height * 0.37);
  c.lineTo(x - rx * 1.1, top + height * 0.44);
  c.lineTo(x - rx * 1.16, y - 6);
  c.quadraticCurveTo(x - rx, y + 12, x + rx * 0.7, y + 9);
  c.quadraticCurveTo(x + rx * 1.2, y + 7, x + rx * 1.1, y - 7);
  c.lineTo(x + rx * 0.97, top + height * 0.56);
  c.lineTo(x + rx * 0.74, top + height * 0.49);
  c.lineTo(x + rx * 0.89, top);
  c.closePath();
  c.fillStyle = style.naturalTerrain.rockColumn_fillStyleColor;
  c.fill();
  c.strokeStyle = style.naturalTerrain.rockColumn_strokeStyleColor;
  c.lineWidth = style.naturalTerrain.rockColumn_lineWidthValue;
  c.stroke();
  c.save();
  c.clip();
  poly(
    c,
    [
      [x - rx, top],
      [x - rx * 0.22, top + 5],
      [x - rx * 0.4, top + height * 0.42],
      [x - rx * 0.18, y + 10],
      [x - rx * 1.2, y + 12],
    ],
    style.naturalTerrain.rockColumnColor,
    null,
  );
  poly(
    c,
    [
      [x + rx * 0.38, top],
      [x + rx * 1.1, top],
      [x + rx * 1.25, y + 14],
      [x + rx * 0.15, y + 14],
      [x + rx * 0.4, top + height * 0.55],
    ],
    style.naturalTerrain.rockColumnColor2,
    null,
  );
  // 细节开关只控制局部绘制，保留共同分层与动作输入。
  if (style.naturalTerrain.fineDetails) {
    poly(
      c,
      [
        [x - rx * 0.65, top + 12],
        [x - rx * 0.37, top + 16],
        [x - rx * 0.58, top + height * 0.65],
      ],
      '#d4d3bb',
      null,
    );
    poly(
      c,
      [
        [x + rx * 0.67, top + 10],
        [x + rx * 0.88, top + 6],
        [x + rx * 0.75, top + height * 0.36],
      ],
      '#a9b19e',
      null,
    );
    poly(
      c,
      [
        [x + rx * 0.28, top + height * 0.46],
        [x + rx * 0.92, top + height * 0.4],
        [x + rx * 0.74, top + height * 0.49],
        [x + rx * 0.32, top + height * 0.55],
      ],
      '#bec1aa',
      null,
    );
    poly(
      c,
      [
        [x - rx * 1.05, top + height * 0.44],
        [x - rx * 0.58, top + height * 0.48],
        [x - rx * 0.23, y - 6],
        [x - rx * 0.48, y + 8],
      ],
      '#a6af9b',
      null,
    );
  }
  c.restore();
  c.beginPath();
  c.moveTo(x - rx * 0.83, top);
  c.quadraticCurveTo(x - rx * 0.72, top - cap * 0.93, x - rx * 0.2, top - cap);
  c.quadraticCurveTo(x + rx * 0.3, top - cap * 1.12, x + rx * 0.7, top - cap * 0.45);
  c.quadraticCurveTo(x + rx, top, x + rx * 0.74, top + cap * 0.65);
  c.quadraticCurveTo(x + rx * 0.15, top + cap * 1.05, x - rx * 0.36, top + cap * 0.72);
  c.lineTo(x - rx * 0.73, top + cap * 0.38);
  c.closePath();
  c.fillStyle = winter
    ? '#eef3e8'
    : green
      ? style.naturalTerrain.rockColumn_fillStyleColor2
      : style.naturalTerrain.rockColumn_fillStyleColor3;
  c.fill();
  c.strokeStyle = style.naturalTerrain.rockColumn_strokeStyleColor2;
  c.lineWidth = style.naturalTerrain.rockColumn_lineWidthValue2;
  c.stroke();
  if (winter) snowCap(c, x, top + cap * 0.05, rx * 0.86, cap * 0.92);
  if (green && !winter) {
    oval(c, x - rx * 0.17, top - cap * 0.25, rx * 0.57, cap * 0.6, '#a6c684');
    for (const dx of [-0.55, 0.12, 0.57])
      poly(
        c,
        [
          [x + rx * dx, top + cap * 0.65],
          [x + rx * dx + 6, top + cap * 0.55],
          [x + rx * dx + 3, top + cap + 7],
        ],
        '#8fb574',
        null,
      );
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
function mountain(c, item, winter) {
  const r = item.rx;
  drawMountainShape(c, item, (c, x, y, rx, height, green) => rockColumn(c, x, y, rx, height, green, winter));
  // 小块山脚苔草统一落在低台前缘，不将固定高度的藤蔓悬空贴到矮山上。
  for (const [x, y, rx] of [
    [-r * 0.65, 8, 12],
    [-r * 0.48, 12, 9],
  ]) {
    oval(c, x, y, rx, 6, '#789857');
    if (winter) snowCap(c, x - 2, y - 2, rx, 5);
    else oval(c, x - 2, y - 3, rx * 0.7, 4, '#abc37d');
  }
  shoreStone(c, r * 0.72, item.ry * 0.5, 1.1);
}
// 共用绘制与动作输入，风格差异由配置提供。
function mountainSprite(item, night, winter) {
  const key = `${item.atlasId||item.id}:${item.variant}:${item.rx}:${item.height}:${winter}`;
  let entry = mountainAtlas.get(key);
  if (!entry) {
    const width = Math.ceil(item.rx * 2.6 + 24),
      height = Math.ceil(item.height + item.ry + 75);
    const canvas = createRenderCanvas();
    canvas.width = width * 2;
    canvas.height = height * 2;
    const c = canvas.getContext('2d');
    c.scale(2, 2);
    c.translate(width / 2, height - 65);
    mountain(c, item, winter);
    entry = { day: canvas, night: null, width, height };
    mountainAtlas.set(key, entry);
  }
  if (night > 0) entry.night ||= nightTexture(entry.day);
  return entry;
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawMountain(c, item, night = 0, player = null, winter = false,view=null) {
  // 群峰继续复用原有昼夜和融雪混合，山地宽度不影响单张图集尺寸。
  if(item.regional){
    drawRegionalMountain(c,item,night,player,winter,view);return;
  }
  const snow = Number(winter),
    frozen = snow >= 1;
  const entry = mountainSprite(item, night, frozen);
  const other = snow > 0 && snow < 1 ? mountainSprite(item, night, true) : null;
  // 雪层先在透明材质内混合，再统一应用前景透显，角色不会在中点露穿。
  const image = (dark) => {
    if (dark) {
      entry.night ||= nightTexture(entry.day);
      if (other) other.night ||= nightTexture(other.day);
    }
    const key = dark ? 'night' : 'day';
    return other ? mixRaster(entry[key], other[key], snow) : entry[key];
  };
  const behind =
    player &&
    !player.flying &&
    Math.abs(player.x - item.x) < item.rx &&
    player.y < item.y &&
    player.y > item.y - item.height - 25;
  c.save();
  c.translate(item.x, item.y);
  const alpha = c.globalAlpha * (behind ? 0.58 : 1);
  if (night < 1) {
    c.globalAlpha = (alpha * (1 - night)) / (1 - alpha * night);
    c.drawImage(image(false), -entry.width / 2, 65 - entry.height, entry.width, entry.height);
  }
  if (night > 0) {
    c.globalAlpha = alpha * night;
    c.drawImage(image(true), -entry.width / 2, 65 - entry.height, entry.width, entry.height);
  }
  c.restore();
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawNaturalMap(c, winter = false) {
  for (const item of [...NATURAL_TERRAIN.mountains].sort((a, b) => a.y - b.y)) drawMountain(c, item, 0, null, winter);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function naturalAtlasStats() {
  let bytes = 0;
  for (const entry of mountainAtlas.values()) bytes += entry.day.width * entry.day.height * 4 * (entry.night ? 2 : 1);
  return { count: mountainAtlas.size, bytes };
}
// 共用绘制与动作输入，风格差异由配置提供。
export function clearArtStyleCache() {
  releaseArtCache(mountainAtlas);
}

// 湖泊底图继续缓存；只在可见湖面裁切、叠画阵风经过的细纹。
export function drawLakeGusts(c, view, time, wind) {
  for (const lake of NATURAL_TERRAIN.lakes) {
    if (lake.x + lake.rx * 1.3 < view.x || lake.x - lake.rx * 1.3 > view.x + view.w ||
        lake.y + lake.ry * 1.3 < view.y || lake.y - lake.ry * 1.3 > view.y + view.h) continue;
    c.save();
    c.translate(lake.x, lake.y);
    outlinePath(c, lake.outline);
    c.clip();
    for (let i = 0; i < 21; i++) {
      const x = Math.cos(i * 2.4) * lake.rx * Math.sqrt(i / 21);
      const y = Math.sin(i * 2.4) * lake.ry * Math.sqrt(i / 21);
      drawWindRipple(c, x, y, time, gustStrength(time - .32, lake.x + x, wind), i);
    }
    c.restore();
  }
}
