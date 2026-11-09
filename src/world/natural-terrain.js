import {REGIONAL_CAMPS} from '../config/regional-camps.js';
import {appendEarthLandforms} from './earth-landforms.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';
import {appendRegionalLandforms} from './regional-landforms.js';
import {mountainPeaks,touchesMountainPeak} from './mountain-peaks.js';
import { i18nText } from "../i18n/index.js";
// 可复现的自然地貌生成器：只产出数据，不依赖 Canvas、战斗随机数或存档。
import { WORLD, delta, wrap,nearest } from './coordinates.js';
import { PATHS } from './paths.js';
import { riverXAt } from './river-geometry.js';
import { LANDSCAPE_GROUPS, landscapeRecipes, lakeContour } from './landscape-variants.js';

export const TERRAIN_SEED = 743;
// 保护现有营地、建筑、田地；西侧扩建的周期镜像也避开新山湖。
export const TERRAIN_RESERVES = [
  ...REGIONAL_CAMPS.map(c=>({x:c.x-530,y:c.y-580,w:1060,h:1160})),
  { x:TOWN_LAYOUT.bounds.left, y:TOWN_LAYOUT.bounds.top, w:TOWN_LAYOUT.bounds.right-TOWN_LAYOUT.bounds.left+50, h:TOWN_LAYOUT.bounds.bottom-TOWN_LAYOUT.bounds.top },
  { x: 1330, y: 490, w: 260, h: 280 },
  { x: 2250, y: 1140, w: 310, h: 260 },
].flatMap(r=>r.x<0?[r,{...r,x:r.x+WORLD.width}]:[r]);
const LAKE_ZONES = LANDSCAPE_GROUPS.map(g=>({...g.lake,group:g.id}));
const MOUNTAIN_ZONES = LANDSCAPE_GROUPS.map(g=>({...g.mountain,group:g.id}));
// 西门外、松林、古林和深林各选一处山湖。使用独立随机流保留旧景点及河滩的位置。
const WOODLAND_SITES=[
  {group:'west-wood',x:46680,y:1420,rx:132,ry:98,dx:45,dy:-242,height:99},
  {group:'pine-tarn',x:13240,y:10580,rx:192,ry:116,dx:-42,dy:-290,height:164},
  {group:'amber-bank',x:33780,y:9480,rx:158,ry:100,dx:368,dy:-42,height:118},
  {group:'moss-basin',x:21840,y:21160,rx:183,ry:112,dx:58,dy:-265,height:148},
];
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
  mountainZones = MOUNTAIN_ZONES, beachZones = BEACH_ZONES, reserved = TERRAIN_RESERVES, combinations, regenerate=false } = {}) {
  if (!Number.isFinite(seed)) throw new TypeError(i18nText("world.natural-terrain.b9c97877aa"));
  const recipes=landscapeRecipes(seed,Math.max(lakeZones.length,mountainZones.length),combinations);
  const random = seededRandom(seed), lakes = [], mountains = [], occupied = [];
  for (const [kind, zones, output] of [['lake', lakeZones, lakes], ['mountain', mountainZones, mountains]]) {
    const attempts=zones===MOUNTAIN_ZONES?48:16;
    for (const [index, zone] of zones.entries()) for (let attempt = 0; attempt < attempts; attempt++) {
      // 原候选用尽后，在同一景点稍宽的范围内试位，仍逐一避开湖岸、道路和建筑。
      const offset=Math.max(0,attempt-15)*11,angle=attempt*2.39996;
      const scale = 0.94 + random() * 0.12, phase = random() * Math.PI * 2;
      const item = { id: zone.id ?? `${kind}-${index}`, type: 'landform', kind,
        group: zone.group ?? `custom-${index}`, variant: zone.variant ?? recipes[index][kind],
        beachVariant: recipes[index].beach, forestVariant: recipes[index].forest,
        x: zone.x + (random() - 0.5) * 44+Math.cos(angle)*offset,
        y: zone.y + (random() - 0.5) * 36+Math.sin(angle)*offset,
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
  if (lakeZones===LAKE_ZONES && mountainZones===MOUNTAIN_ZONES) {
    const outer=generateNaturalTerrain({seed:seed^0x5a1c,reserved,combinations,beachZones:[],
      lakeZones:WOODLAND_SITES.map(s=>({...s,id:`lake-${s.group}`})),
      mountainZones:WOODLAND_SITES.map(s=>({group:s.group,id:`mountain-${s.group}`,
        x:s.x+s.dx,y:s.y+s.dy,rx:s.rx*.65,ry:42,height:s.height}))});
    lakes.push(...outer.lakes); mountains.push(...outer.mountains);
    occupied.push(...outer.obstacles); recipes.push(...outer.recipes);
  }
  const terrain={ version: 4, seed: seed >>> 0, recipes, lakes, mountains, beaches, obstacles: occupied };
  return lakeZones===LAKE_ZONES&&mountainZones===MOUNTAIN_ZONES?appendEarthLandforms(appendRegionalLandforms(terrain,{reserved,regenerate:regenerate||reserved!==TERRAIN_RESERVES||!!combinations}),reserved):terrain;
}

export const NATURAL_TERRAIN = generateNaturalTerrain();

// 按整座山的真实视觉范围裁剪，宽山的中心在屏幕外时山脚仍必须显示。
export function visibleMountains(view){
 const result=[],reference={x:view.x+view.w/2,y:view.y+view.h/2};
 for(const item of NATURAL_TERRAIN.mountains){
  const p=nearest(item,reference),b=item.visualBounds,dx=p.x-item.x,dy=p.y-item.y;
  if(b.x+dx>view.x+view.w||b.x+b.w+dx<view.x||b.y+dy>view.y+view.h||b.y+b.h+dy<view.y)continue;
  for(const peak of mountainPeaks(item)){
   const at={...peak,x:peak.x+dx,y:peak.y+dy};
   if(item.regional&&(at.x+110<view.x||at.x-110>view.x+view.w||at.y+60<view.y||at.y-190>view.y+view.h))continue;
   result.push(at);
  }
 }
 return result;
}

// 山湖固定不动。把轮廓连同最大树冠净空放入格子，普通移动只精查本格地貌。
const cellSize=480, columns=WORLD.width/cellSize, rows=WORLD.height/cellSize;
const landformCells=new Map(), emptyCell=[];
for (const item of NATURAL_TERRAIN.obstacles) {
  const b=item.visualBounds, margin=256;
  for(let row=Math.floor((b.y-margin)/cellSize);row<=Math.floor((b.y+b.h+margin)/cellSize);row++)
    for(let col=Math.floor((b.x-margin)/cellSize);col<=Math.floor((b.x+b.w+margin)/cellSize);col++) {
      const key=wrap(row,rows)*columns+wrap(col,columns);
      if(!landformCells.has(key))landformCells.set(key,[]);
      landformCells.get(key).push(item);
    }
}
// 自定义地图或超大探测半径走完整集合，保持编辑器与导航的精确边界。
function nearbyLandforms(x,y,radius,terrain) {
  if(terrain!==NATURAL_TERRAIN || radius>256)return terrain.obstacles;
  return landformCells.get(wrap(Math.floor(y/cellSize),rows)*columns+wrap(Math.floor(x/cellSize),columns)) || emptyCell;
}

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

// 湖泊保持水界阻挡，山地区域只检查分散岩柱，峰间地面可步行与驾驶。
export function isNaturalBlocked(x, y, radius = 12, terrain = NATURAL_TERRAIN) {
  return nearbyLandforms(x,y,radius,terrain).some(item => item.kind==='mountain'?mountainBlocked(item,x,y,radius):item.kind!=='rainforest'&&touchesLandform(item,x,y,radius));
}

// 旧地标仍保留原底座；新增山地拆分为共用绘制点位的独立群峰。
function mountainBlocked(item,x,y,radius){return item.regional?mountainPeaks(item).some(peak=>touchesMountainPeak(peak,x,y,radius)):touchesLandform(item,x,y,radius);}

// 地貌面积与通行分别查询，不能因开放峰间道路而把山地统计成草地。
export function isMountainArea(x,y,radius=0,terrain=NATURAL_TERRAIN){
 return nearbyLandforms(x,y,radius,terrain).some(item=>item.kind==='mountain'&&touchesLandform(item,x,y,radius));
}

// 两栖载具只豁免水域，山体底座依然参与脚底碰撞和周期镜像检测。
export function isMountainBlocked(x, y, radius = 12, terrain = NATURAL_TERRAIN) {
  return nearbyLandforms(x,y,radius,terrain).some(item => (item.kind==='mountain' && mountainBlocked(item,x,y,radius))||(item.earth&&item.kind!=='rainforest'&&touchesLandform(item,x,y,radius)));
}

// 雨面等系统只识别湖水，避免把石山错误当作水域。
export function isLakeWater(x, y, radius = 0, terrain = NATURAL_TERRAIN) {
  return nearbyLandforms(x,y,radius,terrain).some(item => item.kind==='lake' && touchesLandform(item, x, y, radius));
}

// 湖岸及完整山体轮廓留白；高树另外留出树冠高度，草花只避开实际底座。
export function excludesNaturalScenery(x, y, tree = false) {
  const nearby=nearbyLandforms(x,y,0,NATURAL_TERRAIN);
  if (nearby.some(item => item.kind==='lake' && (tree
    ? [y - 120, y - 60, y].some(sy => touchesLandform(item, x, sy, 75))
    : touchesLandform(item, x, y, 28)))) return true;
  return nearby.some(item => {
    if(item.earth)return item.kind!=='rainforest'&&[y,tree?y-100:y].some(sy=>touchesLandform(item,x,sy,tree?75:20));
    if(item.kind!=='mountain')return false;
    // 大片山地的纵深可能超过峰高，树根和树冠都按真实底座轮廓避让。
    if(tree&&[y-120,y-60,y].some(sy=>touchesLandform(item,x,sy,75)))return true;
    const px = delta(x - item.x, WORLD.width), py = delta(y - item.y, WORLD.height);
    return tree ? Math.abs(px) < item.rx + 75 && py > -item.height - 70 && py < item.ry + 145
      : touchesLandform(item, x, y, 20);
  });
}
