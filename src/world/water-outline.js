import { i18nText } from "../i18n/index.js";
// 水域几何并集：裁掉内部重叠边，圆顺外轮廓，并为正式碰撞建立边段索引。

// 有向面积统一多边形绕向，交点处才能按同一方向串接边界。
function area(points) {
  return points.reduce((sum, a, i) => { const b = points[(i + 1) % points.length]; return sum + a.x * b.y - b.x * a.y; }, 0) / 2;
}

// 射线法只判断内部，边界半径由共享线段距离另行处理。
function inside(points, p) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

// 每个交点将原边分段，只有其他水体外部的片段属于最终岸线。
export function mergeWaterOutlines(features) {
  const polygons = features.map(f => {
    const points = f.outline.map(p => ({ x: p.x + f.x, y: p.y + f.y }));
    return area(points) < 0 ? points.reverse() : points;
  });
  const edges = polygons.flatMap((points, owner) => points.map((a, i) => ({ a, b: points[(i + 1) % points.length], owner })));
  const boundary = [];
  for (const e of edges) {
    const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, cuts = [0, 1];
    for (const q of edges) {
      if (q.owner === e.owner || Math.max(e.a.x, e.b.x) < Math.min(q.a.x, q.b.x) || Math.min(e.a.x, e.b.x) > Math.max(q.a.x, q.b.x) || Math.max(e.a.y, e.b.y) < Math.min(q.a.y, q.b.y) || Math.min(e.a.y, e.b.y) > Math.max(q.a.y, q.b.y)) continue;
      const qx = q.b.x - q.a.x, qy = q.b.y - q.a.y, cross = dx * qy - dy * qx;
      if (Math.abs(cross) < 1e-9) continue;
      const ox = q.a.x - e.a.x, oy = q.a.y - e.a.y;
      const t = (ox * qy - oy * qx) / cross, u = (ox * dy - oy * dx) / cross;
      if (t > 1e-8 && t < 1 - 1e-8 && u >= 0 && u <= 1) cuts.push(t);
    }
    cuts.sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] < 1e-8) continue;
      const mid = (cuts[i - 1] + cuts[i]) / 2, p = { x: e.a.x + dx * mid, y: e.a.y + dy * mid };
      if (polygons.some((poly, owner) => owner !== e.owner && inside(poly, p))) continue;
      boundary.push({ a: { x: e.a.x + dx * cuts[i - 1], y: e.a.y + dy * cuts[i - 1] }, b: { x: e.a.x + dx * cuts[i], y: e.a.y + dy * cuts[i] } });
    }
  }
  const key = p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`, starts = new Map(boundary.map(e => [key(e.a), e]));
  const loops = [];
  while (starts.size) {
    const first = starts.values().next().value, points = [];
    let edge = first;
    do {
      points.push(edge.a); starts.delete(key(edge.a));
      if (key(edge.b) === key(first.a)) break;
      edge = starts.get(key(edge.b));
      if (!edge) throw new Error(i18nText("world.water-outline.dcdef39911"));
    } while (points.length <= boundary.length);
    if (area(points) < 0) throw new Error(i18nText("world.water-outline.2761ac1b8b"));
    loops.push(roundOutline(points));
  }
  return loops;
}

// 先按弧长等距重采样，再平滑约六十单位的邻域；不让交点旁的极短边限制圆角半径。
function roundOutline(points) {
  const samples = [];
  let remaining = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], length = Math.hypot(b.x - a.x, b.y - a.y);
    while (remaining < length) {
      const t = remaining / length;
      samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); remaining += 8;
    }
    remaining -= length;
  }
  // 最终采样轮廓直接用于绘制和碰撞，避免画面圆滑但角色仍撞上旧尖角。
  return samples.map((_, i) => {
    let x = 0, y = 0, weight = 0;
    for (let j = -8; j <= 8; j++) {
      const p = samples[(i + j + samples.length) % samples.length], w = 9 - Math.abs(j);
      x += p.x * w; y += p.y * w; weight += w;
    }
    return { x: x / weight, y: y / weight };
  });
}

// 按高度分桶索引线段，避开整条水系大包围盒导致每次移动扫描上千条边。
export function indexWaterOutline(points, id) {
  const rows = new Map(), xs = points.map(p => p.x), ys = points.map(p => p.y);
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length], edge = { a, b };
    for (let row = Math.floor(Math.min(a.y, b.y) / 64); row <= Math.floor(Math.max(a.y, b.y) / 64); row++) {
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(edge);
    }
  });
  return { id, x: 0, y: 0, kind: 'water', outline: points, rows,
    bounds: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } };
}

// 射线交点与近边距离共用最终岸线，半径查询只扫描邻近高度桶，支持负坐标之外的上层周期归一。
export function touchesWaterOutline(item, x, y, radius) {
  const b = item.bounds;
  if (x < b.x - radius || x > b.x + b.w + radius || y < b.y - radius || y > b.y + b.h + radius) return false;
  let hit = false;
  for (const { a, b: q } of item.rows.get(Math.floor(y / 64)) || [])
    if ((a.y > y) !== (q.y > y) && x < (q.x - a.x) * (y - a.y) / (q.y - a.y) + a.x) hit = !hit;
  if (hit) return true;
  for (let row = Math.floor((y - radius) / 64); row <= Math.floor((y + radius) / 64); row++) for (const { a, b: q } of item.rows.get(row) || []) {
    if (x < Math.min(a.x, q.x) - radius || x > Math.max(a.x, q.x) + radius) continue;
    const dx = q.x - a.x, dy = q.y - a.y, length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length)) : 0;
    if ((x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2 <= radius * radius) return true;
  }
  return false;
}
