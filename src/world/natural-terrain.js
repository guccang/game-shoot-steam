import {TOWN_LAYOUT} from '../config/town-layout.js';
import { i18nText } from "../i18n/index.js";
// 可复现的自然地貌生成器：只产出数据，不依赖 Canvas、战斗随机数或存档。
import { WORLD, delta } from './coordinates.js';
import { PATHS } from './paths.js';
import { riverXAt } from './river-geometry.js';
import { LANDSCAPE_GROUPS, landscapeRecipes, lakeContour } from './landscape-variants.js';

export const TERRAIN_SEED = 743;
// 保护现有营地、建筑、田地；西侧扩建的周期镜像也避开新山湖。
export const TERRAIN_RESERVES = [
  { x:TOWN_LAYOUT.bounds.left, y:TOWN_LAYOUT.bounds.top, w:TOWN_LAYOUT.bounds.right-TOWN_LAYOUT.bounds.left+50, h:TOWN_LAYOUT.bounds.bottom-TOWN_LAYOUT.bounds.top },
  { x: 1330, y: 490, w: 260, h: 280 },
  { x: 2250, y: 1140, w: 310, h: 260 },
].flatMap(r=>r.x<0?[r,{...r,x:r.x+WORLD.width}]:[r]);
const LAKE_ZONES = LANDSCAPE_GROUPS.map(g=>({...g.lake,group:g.id}));
const MOUNTAIN_ZONES = LANDSCAPE_GROUPS.map(g=>({...g.mountain,group:g.id}));
// 每个沙湾只属于一侧：位置、长度与面积都独立，不再套用左右镜像模板。
const BEACH_ZONES = [
  { side: -1, y: 975, rise: 150, fall: 190, depth: 92 },
  { side: 1, y: 1230, rise: 100, fall: 155, depth: 34 },
  { side: 1, y: 1720, rise: 230, fall: 165, depth: 108 },
  { side: -1, y: 1900, rise: 105, fall: 140, depth: 31 },
  { side: -1, y: 2395, rise: 165, fall: 140, depth: 80 },
  { side: 1, y: 2225, rise: 90, fall: 110, depth: 24 },
];

// 独立整数随机流保证相同种子、参数与生成版本产生完全相同的地图。
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

// 极坐标轮廓用低频起伏形成湖湾和山脚，绘制与精确阻挡复用这些顶点。
function contour(rx, ry, phase, roughness, count = 64) {
  return Array.from({ length: count }, (_, i) => {
    const a = i / count * Math.PI * 2;
    const r = 1 + roughness * Math.sin(a * 3 + phase) + roughness * 0.5 * Math.sin(a * 5 - phase);
    return { x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r };
  });
}

// 矩形排斥包含地貌上方的可见岩壁，避免山顶遮住已有建筑和道路。
function overlaps(a, b, margin = 0) {
  return a.x < b.x + b.w + margin && a.x + a.w > b.x - margin &&
    a.y < b.y + b.h + margin && a.y + a.h > b.y - margin;
}

// 候选地貌避让道路、河道、营地和已有地标，并远离周期边缘以保留连续走廊。
function validSite(feature, reserved, occupied) {
  const b = feature.visualBounds;
  if (b.x < 90 || b.y < 90 || b.x + b.w > WORLD.width - 90 || b.y + b.h > WORLD.height - 90) return false;
  if (reserved.some(r => overlaps(b, r, 22)) || occupied.some(other => other.group && other.group===feature.group
    ? overlaps({...feature.bounds,x:feature.x+feature.bounds.x,y:feature.y+feature.bounds.y},
      {...other.bounds,x:other.x+other.bounds.x,y:other.y+other.bounds.y},55)
    : overlaps(b,other.visualBounds,65))) return false;
  if (PATHS.some(path => path.some(p => p.x > b.x - 70 && p.x < b.x + b.w + 70 &&
    p.y > b.y - 70 && p.y < b.y + b.h + 70))) return false;
  for (let y = b.y - 40; y < b.y + b.h + 40; y += 16)
    if (riverXAt(y) > b.x - 95 && riverXAt(y) < b.x + b.w + 95) return false;
  return true;
}

// 在有限候选区内生成地貌；无安全位置就省略，不侵占保留区来凑数量。
export function generateNaturalTerrain({ seed = TERRAIN_SEED, lakeZones = LAKE_ZONES,
  mountainZones = MOUNTAIN_ZONES, beachZones = BEACH_ZONES, reserved = TERRAIN_RESERVES, combinations } = {}) {
  if (!Number.isFinite(seed)) throw new TypeError(i18nText("world.natural-terrain.b9c97877aa"));
  const recipes=landscapeRecipes(seed,Math.max(lakeZones.length,mountainZones.length),combinations);
  const random = seededRandom(seed), lakes = [], mountains = [], occupied = [];
  for (const [kind, zones, output] of [['lake', lakeZones, lakes], ['mountain', mountainZones, mountains]]) {
    for (const [index, zone] of zones.entries()) for (let attempt = 0; attempt < 16; attempt++) {
      const scale = 0.94 + random() * 0.12, phase = random() * Math.PI * 2;
      const item = { id: `${kind}-${index}`, type: 'landform', kind,
        group: zone.group ?? `custom-${index}`, variant: zone.variant ?? recipes[index][kind],
        beachVariant: recipes[index].beach, forestVariant: recipes[index].forest,
        x: zone.x + (random() - 0.5) * 44, y: zone.y + (random() - 0.5) * 36,
        rx: zone.rx * scale, ry: zone.ry * scale, height: (zone.height || 0) * scale, phase };
      item.outline = kind==='lake' ? lakeContour(item.rx,item.ry,phase,item.variant) : contour(item.rx,item.ry,phase,.09);
      item.bounds = { x: Math.min(...item.outline.map(p => p.x)), y: Math.min(...item.outline.map(p => p.y)),
        w: 0, h: 0 };
      item.bounds.w = Math.max(...item.outline.map(p => p.x)) - item.bounds.x;
      item.bounds.h = Math.max(...item.outline.map(p => p.y)) - item.bounds.y;
      const pad = kind === 'lake' ? 60 : 30;
      item.visualBounds = { x: item.x + item.bounds.x - pad,
        y: item.y + item.bounds.y - item.height - pad, w: item.bounds.w + pad * 2 + 10,
        h: item.bounds.h + item.height + pad * 2 + 10 };
      if (!validSite(item, reserved, occupied)) continue;
      output.push(item); occupied.push(item); break;
    }
  }
  const beaches = beachZones.map((zone, index) => {
    const y = zone.y + (random() - 0.5) * 26, rise = zone.rise * (0.94 + random() * 0.12),
      fall = zone.fall * (0.94 + random() * 0.12);
    return { id: `beach-${index}`, side: zone.side, y, rise, fall, start: y - rise, end: y + fall,
      depth: zone.depth * (0.92 + random() * 0.16), phase: random() * Math.PI * 2 };
  });
  return { version: 2, seed: seed >>> 0, recipes, lakes, mountains, beaches, obstacles: [...lakes, ...mountains] };
}

export const NATURAL_TERRAIN = generateNaturalTerrain();

// 每岸独立查询沙宽，植被留白、沙滩绘画与地图预览使用同一结果。
export function riverBeachWidth(y, side, terrain = NATURAL_TERRAIN) {
  let width = 0;
  for (const beach of terrain.beaches) {
    if (side !== beach.side || y <= beach.start || y >= beach.end) continue;
    const t = (y - beach.y) / (y < beach.y ? beach.rise : beach.fall);
    const shape = Math.cos(t * Math.PI / 2) ** 2;
    width = Math.max(width, beach.depth * shape * (0.88 + 0.09 * Math.sin(t * 6 + beach.phase)));
  }
  return width;
}

// 圆形脚底与多边形相交：先判包围盒，再判边距及奇偶射线，不使用视觉近似圆。
export function touchesLandform(feature, x, y, radius = 0) {
  const px = delta(x - feature.x, WORLD.width), py = delta(y - feature.y, WORLD.height), b = feature.bounds;
  if (px < b.x - radius || px > b.x + b.w + radius || py < b.y - radius || py > b.y + b.h + radius) return false;
  let inside = false;
  const points = feature.outline;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
    if ((px - a.x - t * dx) ** 2 + (py - a.y - t * dy) ** 2 <= radius ** 2) return true;
    if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// 地面单位不可进入湖水或岩山底座；空中单位由物理入口统一豁免。
export function isNaturalBlocked(x, y, radius = 12, terrain = NATURAL_TERRAIN) {
  return terrain.obstacles.some(item => touchesLandform(item, x, y, radius));
}

// 两栖载具只豁免水域，山体底座依然参与脚底碰撞和周期镜像检测。
export function isMountainBlocked(x, y, radius = 12, terrain = NATURAL_TERRAIN) {
  return terrain.mountains.some(item => touchesLandform(item, x, y, radius));
}

// 雨面等系统只识别湖水，避免把石山错误当作水域。
export function isLakeWater(x, y, radius = 0, terrain = NATURAL_TERRAIN) {
  return terrain.lakes.some(item => touchesLandform(item, x, y, radius));
}

// 湖岸及完整山体轮廓留白；高树另外留出树冠高度，草花只避开实际底座。
export function excludesNaturalScenery(x, y, tree = false) {
  if (NATURAL_TERRAIN.lakes.some(item => tree
    ? [y - 120, y - 60, y].some(sy => touchesLandform(item, x, sy, 75))
    : touchesLandform(item, x, y, 28))) return true;
  return NATURAL_TERRAIN.mountains.some(item => {
    const px = delta(x - item.x, WORLD.width), py = delta(y - item.y, WORLD.height);
    return tree ? Math.abs(px) < item.rx + 75 && py > -item.height - 70 && py < item.ry + 145
      : touchesLandform(item, x, y, 20);
  });
}
