// 接岸回归：实际并集轮廓不得自交，索引碰撞与可见多边形一致，瀑坎保持独立。
import test from 'node:test';
import assert from 'node:assert/strict';
import { JIUZHAIGOU_WATER, JIUZHAIGOU_FALL_SURFACES, valleyBlocked, valleyTouches } from '../src/world/jiuzhaigou.js';

// 检测两段内部交点，邻接边的共同端点不算折叠。
function crosses(a, b, p, q) {
  const dx = b.x - a.x, dy = b.y - a.y, ex = q.x - p.x, ey = q.y - p.y;
  const cross = dx * ey - dy * ex;
  if (Math.abs(cross) < 1e-9) return false;
  const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / cross;
  const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / cross;
  return t > 1e-7 && t < 1 - 1e-7 && u > 1e-7 && u < 1 - 1e-7;
}

test('湖溪与四处跌水形成单个闭合无自交的可见外岸', () => {
  assert.equal(JIUZHAIGOU_WATER.length, 1);
  const points = JIUZHAIGOU_WATER[0].outline;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > .001);
    for (let j = i + 2; j < points.length; j++)
      assert.equal(crosses(a, b, points[j], points[(j + 1) % points.length]), false, `岸线自交 ${i}/${j}`);
  }
  for (const f of JIUZHAIGOU_FALL_SURFACES) {
    for (const p of f.outline) assert.equal(valleyBlocked(f.x + p.x, f.y + p.y, 0), true, f.id);
    assert.equal(valleyBlocked(f.x, f.y + f.height / 2, 12, true), true);
  }
});

test('优化后的水界碰撞与正式可见多边形的内部及半径距离一致', () => {
  const water = JIUZHAIGOU_WATER[0], plain = { ...water, rows: null };
  for (const radius of [0, 12, 28]) for (let y = 100; y < 2600; y += 37) for (let x = 550; x < 2800; x += 41)
    assert.equal(valleyTouches(water, x, y, radius), valleyTouches(plain, x, y, radius), `${x}/${y}/${radius}`);
  for (let i = 0; i < water.outline.length; i += 13) {
    const p = water.outline[i];
    assert.equal(valleyBlocked(p.x, p.y, .1), true);
    assert.equal(valleyBlocked(p.x + 3600, p.y - 2800, .1), true);
  }
});
