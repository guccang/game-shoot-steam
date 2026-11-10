import { WORLD, ORIGINAL_WORLD, canonical } from './coordinates.js';
/* 移植自 game-slg/river.js：局部纹理扰动、定向波光、垂直水丝和泡沫。
 * 当前地图为矢量绘制，使用共享河道几何生成遮罩，保护岸边、岩石和木桥。
 */
export const WATERFALL = { x: 1220, y: 420, width: 64, height: 140 };
export const BRIDGE = { x: 1185, y: 690, width: 220, height: 78 };

// 三次贝塞尔采样与绘制使用同一组控制点，避免水面与岸边错位。
export function riverPoint(t) {
  const segments = [
    [
      [1250, 0],
      [1180, 160],
      [1200, 320],
      [1220, 420],
    ],
    [
      [1220, 420],
      [1220, 470],
      [1220, 520],
      [1220, 560],
    ],
    [
      [1220, 560],
      [1220, 650],
      [1380, 720],
      [1230, 900],
    ],
    [
      [1230, 900],
      [1160, 900 + (ORIGINAL_WORLD.height - 900) * 0.4],
      [1320, ORIGINAL_WORLD.height - 160],
      [1250, ORIGINAL_WORLD.height],
    ],
    // 营地以下的原河道保持原位，再向新南部延伸回循环接缝。
    [[1250, ORIGINAL_WORLD.height],[1180, 4400],[1320, WORLD.height-160],[1250,WORLD.height]],
  ];
  const section = Math.min(4, Math.floor(Math.max(0, Math.min(1, t)) * 5));
  const u = Math.max(0, Math.min(1, t)) * 5 - section,
    v = 1 - u,
    points = segments[section];
  return {
    x:
      v ** 3 * points[0][0] +
      3 * v * v * u * points[1][0] +
      3 * v * u * u * points[2][0] +
      u ** 3 * points[3][0],
    y:
      v ** 3 * points[0][1] +
      3 * v * v * u * points[1][1] +
      3 * v * u * u * points[2][1] +
      u ** 3 * points[3][1],
  };
}
// 延长河道时同步加密采样，保持岸线碰撞与水面纹理的精度。
export const riverSamples = Array.from({ length: 1201 }, (_, index) => riverPoint(index / 1200));

// 河道高度单调，二分找到首个不低于查询高度的样本，供插值与邻域查询复用。
function riverSampleIndex(y) {
  let low = 0, high = riverSamples.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (riverSamples[mid].y < y) low = mid + 1;
    else high = mid;
  }
  return low;
}

// 单调河道按高度插值，导航、出生点修正与碰撞共用同一中心线。
export function riverXAt(y) {
  // 越界和非有限输入沿用原查找结果，正常地形查询从线性扫描改为二分。
  const i = Number.isNaN(y) || y > riverSamples.at(-1).y ? -1 : riverSampleIndex(y);
  if (i <= 0) return riverSamples[Math.max(0, i)].x;
  const a = riverSamples[i - 1],
    b = riverSamples[i],
    t = (y - a.y) / (b.y - a.y);
  return a.x + (b.x - a.x) * t;
}
// 南侧横路在六千单位处过河；桥身贴合真实中心线，北桥的既有坐标与引用不变。
export const SOUTH_BRIDGE = { x: riverXAt(6000) - 110, y: 5961, width: 220, height: 78 };
export const BRIDGES = [BRIDGE, SOUTH_BRIDGE];
// 桥南的小河湾左右错开扩展，变化在两端平滑归零，桥面与其他河段保持原宽。
export function riverHalfWidth(y, side = 1) {
  if (y <= 800 || y >= 1180) return 39;
  const center = side < 0 ? 1015 : 890, reach = side < 0 ? 165 : 90;
  const t = Math.abs(y - center) / reach;
  return 39 + (t < 1 ? (side < 0 ? 16 : 13) * Math.cos(t * Math.PI / 2) ** 2 : 0);
}

// 木板承托脚底，护栏内沿保留四单位；桥上不再重复施加河岸的整圈半径。
// 桥外水域继续使用完整碰撞半径，包括瀑布与落水池。
export function isWaterBlocked(x, y, radius = 12) {
  ({ x, y } = canonical({ x, y }));
  const deckInset=Math.min(Math.max(0,radius),4);
  if (BRIDGES.some(b => x >= b.x && x <= b.x + b.width && y >= b.y + deckInset && y <= b.y + b.height - deckInset))
    return false;
  if (y > 400 - radius && y < 590 + radius && Math.abs(x - WATERFALL.x) < 54 + radius) return true;
  const dx = x - riverXAt(y);
  return Math.abs(dx) < riverHalfWidth(y, dx < 0 ? -1 : 1) + radius;
}

// 河道与桥头不生成树木和草叶，避免遮挡过河入口。
export function isWaterScenery(x, y) {
  ({ x, y } = canonical({ x, y }));
  if (BRIDGES.some(b => x > b.x - 35 && x < b.x + b.width + 35 && y > b.y - 35 && y < b.y + b.height + 35))
    return true;
  if (x > 1128 && x < 1312 && y > WATERFALL.y - 40 && y < WATERFALL.y + 180) return true;
  // 最大岸宽为 39 + 16，再加 23 留白；范围之外的样本不可能命中原距离判定。
  for (let i = riverSampleIndex(y - 78); i < riverSamples.length && riverSamples[i].y <= y + 78; i++) {
    const point = riverSamples[i];
    if (Math.hypot(point.x - x, point.y - y) < riverHalfWidth(point.y, x < point.x ? -1 : 1) + 23) return true;
  }
  return false;
}
