import {terrainNoise as valleyNoise} from './terrain-noise.js';
import { i18nText } from "../i18n/index.js";
import {monsterCampClearing} from '../config/monster-camps.js';
// 九寨沟地貌数据：以日则沟、则查洼沟和树正沟的 Y 形水系组织风格化可玩地图。
import { ORIGINAL_WORLD, canonical } from './coordinates.js';
import { mergeWaterOutlines, indexWaterOutline, touchesWaterOutline } from './water-outline.js';

export const JIUZHAIGOU_SPAWN = { x: 1485, y: 1625 };
// 地名对应景观原型；坐标为游戏尺度压缩，保持湖—滩—瀑的上下游关系。
export const JIUZHAIGOU_ZONES = [
  { id: 'meadow', name: i18nText("world.jiuzhaigou.5623480cf5"), x: 1420, y: 1780, level: 1, range: '1–3', tree: 'round', palette: 0, color: '#a7bf87', monster: '#9bae71', species: i18nText("config.story.8c77682946"), accent: '#c8da91' },
  { id: 'pine', name: i18nText("world.jiuzhaigou.cb26d05215"), x: 2050, y: 1450, level: 4, range: '4–6', tree: 'pine', palette: 1, color: '#91b39a', monster: '#7c9eaa', species: i18nText("world.biomes.131bd90f4a"), accent: '#b5d5d9' },
  { id: 'amber', name: i18nText("world.jiuzhaigou.79a9085fb5"), x: 1000, y: 720, level: 7, range: '7–9', tree: 'round', palette: 2, color: '#bbc28b', monster: '#bc9561', species: i18nText("world.biomes.77b7434dd7"), accent: '#e0c58c' },
  { id: 'deep', name: i18nText("world.jiuzhaigou.387baeae16"), x: 2450, y: 560, level: 10, range: '10–12', tree: 'pine', palette: 3, color: '#91aaa0', monster: '#a08aad', species: i18nText("world.biomes.ea5cb064bc"), accent: '#cfb5e1' },
];

// 固定噪声只控制地貌与植被，不消耗战斗随机数。
export {valleyNoise};

// 所有水体使用相同多边形供碰撞、小地图与正式绘制器读取。
function feature(id, name, x, y, rx, ry, phase, kind = 'lake') {
  const outline = Array.from({ length: 48 }, (_, i) => {
    const a = i / 48 * Math.PI * 2;
    const r = 1 + .09 * Math.sin(a * 3 + phase) + .045 * Math.cos(a * 5 - phase);
    return { x: Math.cos(a) * rx * r, y: Math.sin(a) * ry * r };
  });
  return withBounds({ id, name, x, y, rx, ry, phase, kind, outline });
}

// 包围盒由可见边界计算，导航不依赖另画的近似圆。
function withBounds(item) {
  const xs = item.outline.map(p => p.x), ys = item.outline.map(p => p.y);
  item.bounds = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return item;
}

export const JIUZHAIGOU_LAKES = [
  feature('five-flower', i18nText("world.jiuzhaigou.9f244bf57f"), 1010, 640, 320, 245, .4),
  feature('pearl', i18nText("world.jiuzhaigou.cf3a83fee5"), 1300, 1040, 255, 125, 1.4, 'shoal'),
  feature('long-lake', i18nText("world.jiuzhaigou.d9d6c1f26b"), 2450, 480, 215, 345, 2.3),
  feature('five-colour', i18nText("world.jiuzhaigou.f7d06fd0ad"), 2180, 1000, 180, 135, 2.9),
  feature('nuorilang', i18nText("world.jiuzhaigou.71281168bc"), 1800, 1410, 295, 140, .7),
  feature('rhinoceros', i18nText("world.jiuzhaigou.44ffc1e846"), 1760, 1740, 245, 160, 1.8),
  feature('shuzheng-upper', i18nText("world.jiuzhaigou.bc26ce8288"), 1660, 2070, 230, 125, 2.5),
  feature('shuzheng-lower', i18nText("world.jiuzhaigou.5deab52eb8"), 1830, 2380, 285, 170, 3.5),
];

// 宽窄不一的连接水道嵌入湖内，岸线不会在上下游接缝处断开。
function stream(id, points, width) {
  // 插值弯曲河槽后再计算两岸法线，使水系连接自然过渡且碰撞仍完全同源。
  const curve = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[Math.max(0, i - 1)], b = points[i], d = points[i + 1], e = points[Math.min(points.length - 1, i + 2)];
    for (let j = 0; j < 8; j++) {
      const t = j / 8;
      curve.push([0, 1].map(k => .5 * (2 * b[k] + (-a[k] + d[k]) * t + (2 * a[k] - 5 * b[k] + 4 * d[k] - e[k]) * t * t + (-a[k] + 3 * b[k] - 3 * d[k] + e[k]) * t * t * t)));
    }
  }
  points = [...curve, points[points.length - 1]];
  const left = [], right = [];
  points.forEach(([x, y], i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    left.push({ x: x + nx * width, y: y + ny * width });
    right.push({ x: x - nx * width, y: y - ny * width });
  });
  const [x, y] = points[Math.floor(points.length / 2)];
  return withBounds({ id, kind: 'stream', x, y, outline: [...left, ...right.reverse()].map(p => ({ x: p.x - x, y: p.y - y })) });
}

export const JIUZHAIGOU_STREAMS = [
  stream('rize', [[1100, 780], [1150, 880], [1300, 1040], [1320, 1190], [1510, 1310], [1740, 1400]], 63),
  stream('zechawa', [[2400, 680], [2320, 820], [2180, 1000], [2070, 1200], [1900, 1390]], 43),
  stream('shuzheng', [[1800, 1430], [1800, 1550], [1760, 1740], [1700, 1920], [1660, 2070], [1770, 2240], [1830, 2380]], 98),
];

export const JIUZHAIGOU_FALLS = [
  { id: 'pearl-falls', name: i18nText("world.jiuzhaigou.a02824d431"), x: 1310, y: 1140, width: 230, height: 68, steps: 3 },
  { id: 'nuorilang-falls', name: i18nText("world.jiuzhaigou.2a3bb79973"), x: 1800, y: 1530, width: 390, height: 82, steps: 3 },
  { id: 'shuzheng-falls', name: i18nText("world.jiuzhaigou.3cb84a713f"), x: 1700, y: 1940, width: 240, height: 55, steps: 4 },
  { id: 'lower-falls', name: i18nText("world.jiuzhaigou.b6113b5778"), x: 1760, y: 2210, width: 210, height: 48, steps: 3 },
];

// 钙华跌坎占地与画面一致，两栖载具能过湖但不能攀越瀑布台阶。
export const JIUZHAIGOU_FALL_SURFACES = JIUZHAIGOU_FALLS.map(f => {
  const top = [], bottom = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, x = (u - .5) * f.width;
    top.push({ x, y: -6 + Math.sin(u * Math.PI * 2 + .4) * 4 + Math.abs(u - .5) ** 6 * 300 });
    bottom.push({ x, y: f.height - 3 + Math.sin(u * Math.PI * 3) * 3 - Math.abs(u - .5) ** 6 * 450 });
  }
  return withBounds({ ...f, kind: 'fall', outline: [...top, ...bottom.reverse()] });
});
const fallsTerrain = JIUZHAIGOU_FALL_SURFACES;
// 上下游浅滩包住跌水两端，消除宽水帘硬接窄河槽造成的矩形折角。
const fallBasins = JIUZHAIGOU_FALLS.map(f => feature(`${f.id}-basin`, f.name, f.x, f.y + f.height * .4, f.width * .68, f.height + 50, .9, 'shoal'));
const waterSources = [...JIUZHAIGOU_STREAMS, ...JIUZHAIGOU_LAKES, ...fallBasins, ...fallsTerrain];
export const JIUZHAIGOU_WATER = mergeWaterOutlines(waterSources).map((points, i) => indexWaterOutline(points, `valley-water-${i}`));
export const JIUZHAIGOU_TERRAIN = {
  lakes: JIUZHAIGOU_WATER,
  mountains: fallsTerrain,
  // 导航保留局部地貌的包围盒角点；实际通行检测始终查询合并后的统一水界。
  obstacles: waterSources,
};

// 带半径的精确多边形检测支持循环坐标，岸边步行不会踩入绘制水面。
export function valleyTouches(item, x, y, radius = 0) {
  const p = canonical({ x, y });
  return touchesAt(item, p.x, p.y, radius);
}

// 内部查询接受已归一化坐标，整组水体检测只进行一次周期取模。
function touchesAt(item, x, y, radius) {
  if (item.rows) return touchesWaterOutline(item, x, y, radius);
  const px = x - item.x, py = y - item.y, b = item.bounds;
  if (px < b.x - radius || px > b.x + b.w + radius || py < b.y - radius || py > b.y + b.h + radius) return false;
  let inside = false;
  for (let i = 0, j = item.outline.length - 1; i < item.outline.length; j = i++) {
    const a = item.outline[j], q = item.outline[i], dx = q.x - a.x, dy = q.y - a.y;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
    if ((px - a.x - t * dx) ** 2 + (py - a.y - t * dy) ** 2 <= radius * radius) return true;
    if ((a.y > py) !== (q.y > py) && px < (q.x - a.x) * (py - a.y) / (q.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// 水系与跌坎分开查询，供步行、气垫船、降落和雨滴共同使用。
export function valleyBlocked(x, y, radius = 12, amphibious = false) {
  const p = canonical({ x, y });
  return (amphibious ? fallsTerrain : JIUZHAIGOU_WATER).some(f => touchesAt(f, p.x, p.y, radius));
}

// 两岸游径由地面和植被共用，低矮植被、树干与地名牌均避开主通道。
export const JIUZHAIGOU_PATHS = [
  [[1320, 2600], [1320, 2030], [1400, 1600], [1390, 1430], [1000, 1160], [710, 880], [590, 480]],
  [[2180, 2590], [2210, 1740], [2240, 1400], [2490, 1140], [2810, 820], [2820, 260]],
];

// 外围地貌以连续林坡组织；这些是植被分区，不虚构额外的官方景点。
export const JIUZHAIGOU_SLOPES = [
  { x: 310, y: 560, rx: 300, ry: 490, phase: .7, alpine: true },
  { x: 420, y: 1410, rx: 390, ry: 490, phase: 1.8 },
  { x: 560, y: 2250, rx: 490, ry: 430, phase: 2.6 },
  { x: 1740, y: 430, rx: 350, ry: 370, phase: 1.2, alpine: true },
  { x: 3110, y: 500, rx: 360, ry: 410, phase: 2.4, alpine: true },
  { x: 2980, y: 1410, rx: 490, ry: 440, phase: .5 },
  { x: 2930, y: 2250, rx: 520, ry: 450, phase: 3.3 },
];

// 每一处已生成湖滩和瀑布都有独立路牌；牌脚在干岸，副标题注明所属沟谷和朝向。
const landmarkPositions = [
  ['five-flower', 580, 740, i18nText("world.jiuzhaigou.eb25249231"), '→'], ['pearl', 1670, 1090, i18nText("world.jiuzhaigou.eb25249231"), '←'],
  ['long-lake', 2800, 570, i18nText("world.jiuzhaigou.a24fb313a2"), '←'], ['five-colour', 1910, 920, i18nText("world.jiuzhaigou.a24fb313a2"), '↘'],
  ['nuorilang', 2240, 1370, i18nText("world.jiuzhaigou.76733031bf"), '←'], ['rhinoceros', 1400, 1810, i18nText("world.jiuzhaigou.408d0384b2"), '→'],
  ['shuzheng-upper', 1260, 2110, i18nText("world.jiuzhaigou.5623480cf5"), '→'], ['shuzheng-lower', 2230, 2450, i18nText("world.jiuzhaigou.5623480cf5"), '←'],
  ['pearl-falls', 1030, 1290, i18nText("world.jiuzhaigou.eb25249231"), '→'], ['nuorilang-falls', 1460, 1570, i18nText("world.jiuzhaigou.76733031bf"), '→'],
  ['shuzheng-falls', 2050, 2040, i18nText("world.jiuzhaigou.408d0384b2"), '↖'], ['lower-falls', 1440, 2330, i18nText("world.jiuzhaigou.5623480cf5"), '↗'],
];
export const JIUZHAIGOU_SIGNPOSTS = [
  ...landmarkPositions.map(([id, x, y, valley, arrow]) => {
    const site = [...JIUZHAIGOU_LAKES, ...JIUZHAIGOU_FALLS].find(f => f.id === id);
    return { id, type: 'signpost', scenic: true, x, y, zone: { name: site.name, accent: '#83bcb1' }, subtitle: `${valley} ${arrow}` };
  }),
  ...[
    ['rize-valley', i18nText("world.jiuzhaigou.eb25249231"), 860, 1610, i18nText("world.jiuzhaigou.bd459a0ab8")],
    ['zechawa-valley', i18nText("world.jiuzhaigou.a24fb313a2"), 2600, 1670, i18nText("world.jiuzhaigou.ea821ec65e")],
    ['shuzheng-valley', i18nText("world.jiuzhaigou.408d0384b2"), 1840, 2700, i18nText("world.jiuzhaigou.6985bdcd66")],
  ].map(([id, name, x, y, subtitle]) => ({ id, type: 'signpost', scenic: true, x, y, zone: { name, accent: '#b9ca88' }, subtitle })),
];

// 点到游径线段的距离保证弯道也有连续通行带，不只清理离散路径点。
export function valleyPathDistance(x, y) {
  let distance = Infinity;
  for (const path of JIUZHAIGOU_PATHS) for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i], dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    distance = Math.min(distance, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return distance;
}

// 牌面与玩家停留处留出观景空地，广角放大牌面时也不被树冠盖住。
export function valleySignClearing(x, y) {
  return JIUZHAIGOU_SIGNPOSTS.some(s => Math.abs(x - s.x) < 190 && y > s.y - 200 && y < s.y + 165);
}

// 坡林密度连续变化，平缓林缘有灌草，避免外围整片空白或满屏等距树阵。
export function valleySlopeWeight(x, y) {
  return Math.max(0, ...JIUZHAIGOU_SLOPES.map(s => 1 - Math.hypot((x - s.x) / s.rx, (y - s.y) / s.ry)));
}

// 低矮灌草、苔石和落叶是可通行地被，只生成一次并按地面分块缓存。
export const JIUZHAIGOU_UNDERSTORY = [];
for (let y = 55; y < ORIGINAL_WORLD.height - 40; y += 64) for (let x = 55; x < ORIGINAL_WORLD.width - 40; x += 64) {
  const n = valleyNoise(x + 31, y), px = x + (n - .5) * 55, py = y + (valleyNoise(y + 17, x) - .5) * 55;
  if (n > .46 + valleySlopeWeight(px, py) * .38 || valleyBlocked(px, py, 38) || valleyPathDistance(px, py) < 46 || valleySignClearing(px, py)) continue;
  if (Math.hypot(px - JIUZHAIGOU_SPAWN.x, py - JIUZHAIGOU_SPAWN.y) < 100) continue;
  JIUZHAIGOU_UNDERSTORY.push({ x: px, y: py, n, kind: n < .14 ? 'stone' : n < .3 ? 'fern' : n < .48 ? 'shrub' : 'grass' });
}

// 混交林按岸线和坡地成簇生长；瀑前、湖边和入口保留可交战的空地。
export function jiuzhaigouTrees() {
  const trees = [];
  for (let y = 120; y < ORIGINAL_WORLD.height - 100; y += 78) for (let x = 110; x < ORIGINAL_WORLD.width - 100; x += 78) {
    const n = valleyNoise(x, y), px = x + (n - .5) * 46, py = y + (valleyNoise(y, x) - .5) * 44;
    const grove = Math.sin(x * .007) + Math.cos(y * .009) + Math.sin((x + y) * .004);
    const slope = valleySlopeWeight(px, py);
    if (n > .63 + slope * .27 || grove < -.65 - slope * 2.5 || valleyBlocked(px, py, 48) || Math.hypot(px - 1485, py - 1625) < 135) continue;
    if (valleyPathDistance(px, py) < 63 || valleySignClearing(px, py)) continue;
    if (JIUZHAIGOU_FALLS.some(f => Math.abs(px - f.x) < f.width / 2 + 95 && Math.abs(py - f.y) < 155)) continue;
    // 高处以针叶树为主，湖岸混入阔叶与少量秋色桦木。
    const pine = y < 600 || n < .28;
    trees.push({ x: px, y: py, variant: pine ? 'pine' : n < .45 ? 'birch' : 'round', palette: pine ? 1 : n < .45 ? 2 : 0, size: .78 + valleyNoise(x + 5, y) * .28 });
  }
  return trees.filter(t=>!monsterCampClearing(t.x,t.y,'jiuzhaigou'));
}
