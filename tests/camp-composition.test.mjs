// 营地构图与河湾几何回归：验证真实可通行边界、资源树和前景遮挡，而非截图颜色。
import test from 'node:test';
import assert from 'node:assert/strict';
import { riverHalfWidth, riverXAt, isWaterBlocked, isWaterScenery, BRIDGE } from '../src/world/river-geometry.js';
import { WORLD } from '../src/world/coordinates.js';
import { Game, freshProgress } from '../src/game.js';
import { campCanopyAlpha } from '../src/rendering/forest-art.js';

test('桥南两岸错峰扩展，桥面和远处河道保留原宽，水面与周期阻挡一致', () => {
  assert.ok(riverHalfWidth(890, 1) > riverHalfWidth(890, -1));
  assert.ok(riverHalfWidth(1015, -1) > riverHalfWidth(1015, 1));
  for (const y of [0, 600, 690, 729, 768, 800, 1180, 1600, WORLD.height])
    for (const side of [-1, 1]) assert.equal(riverHalfWidth(y, side), 39);
  for (let y = 800; y <= 1180; y += 5) for (const side of [-1, 1]) {
    const w = riverHalfWidth(y, side), x = riverXAt(y);
    assert.ok(w >= 39 && w <= 55);
    assert.equal(isWaterBlocked(x + side * (w - 1), y, 0), true);
    assert.equal(isWaterBlocked(x + side * (w + 1), y, 0), false);
    assert.equal(isWaterBlocked(x + side * (w + 10), y, 12), true);
    assert.equal(isWaterScenery(x + side * (w - 1), y), true);
    assert.equal(isWaterBlocked(x + side * (w - 1) + WORLD.width, y - WORLD.height, 0), true);
  }
  for (let x = BRIDGE.x; x <= BRIDGE.x + BRIDGE.width; x += 4)
    assert.equal(isWaterBlocked(x, BRIDGE.y + BRIDGE.height / 2, 12), false);
});

test('桥头空地不被树冠侵占，前景树柔化只影响局部表现', () => {
  const game = new Game(freshProgress(), () => 0.42);
  for (const x of [960, 1040, 1130, 1180]) {
    assert.ok(!game.trees.some(t => Math.abs(t.x - x) < 55 * t.size &&
      t.y > 790 && t.y - 135 * t.size < 790), `树冠遮住桥头 ${x}`);
  }
  const tree = game.trees.find(t => t.x === 940 && t.y === 1070);
  assert.ok(tree);
  const before = JSON.stringify(tree);
  assert.ok(campCanopyAlpha(tree, {x:940,y:1020}) < 0.4);
  assert.equal(campCanopyAlpha(tree, {x:1100,y:1020}), 1);
  assert.equal(campCanopyAlpha(tree, {x:940,y:1110}), 1);
  assert.equal(campCanopyAlpha({...tree,x:2340}, {x:2340,y:1020}), 1);
  assert.equal(JSON.stringify(tree), before);
});
