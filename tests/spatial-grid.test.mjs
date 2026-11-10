// 空间裁剪与完整扫描对照，验证优化不改变环面碰撞、排序、即时死亡或绘制镜像。
import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialGrid, treeGrid, treesInBounds } from '../src/world/spatial-grid.js';
import { WORLD, viewBody, visibleBodies } from '../src/world/coordinates.js';
import { traceTargets } from '../src/combat/collision.js';
import { stepBodies, blocked } from '../src/physics/motion.js';

// 分散的确定性实体包含大半径 Boss、边界树干及多次越界坐标。
function targets() {
  return Array.from({ length: 800 }, (_, id) => ({
    id, x: ((id * 137) % WORLD.width) - WORLD.width,
    y: ((id * 223) % WORLD.height) + WORLD.height,
    radius: id % 23 === 0 ? 90 : 12 + (id % 14), hp: 100,
  }));
}

test('空间弹道查询与全量扫圆一致：接缝、负坐标、粗弹道、长射线和命中顺序', () => {
  const items = targets(), grid = new SpatialGrid(items, { offsetY: -8 });
  for (let i = 0; i < 320; i++) {
    const start = { x: i * 139 - WORLD.width * 3, y: i * 97 - WORLD.height * 2 };
    const end = { x: start.x + Math.cos(i) * (i % 7 ? 1020 : 4500),
      y: start.y + Math.sin(i) * (i % 7 ? 900 : 3100) };
    const width = i % 5 ? 2 : 48;
    const exclude = [i % items.length, (i + 1) % items.length];
    assert.deepEqual(traceTargets(start, end, grid, width, exclude),
      traceTargets(start, end, items.filter(t => !exclude.includes(t.id)), width));
  }
});

test('宽查询不重复实体，局部候选显著减少，死亡状态与排除表即时生效', () => {
  const items = targets(), grid = new SpatialGrid(items, { offsetY: -8 });
  const all = grid.query(-WORLD.width * 3, -WORLD.height * 2, WORLD.width * 4, WORLD.height * 3);
  assert.equal(all.length, items.length);
  assert.equal(new Set(all).size, items.length);
  assert.ok(grid.query(700, 700, 710, 710, 5).length < items.length / 10);
  const t = items[0], start = { x: t.x - 20, y: t.y - 8 }, end = { x: t.x + 20, y: t.y - 8 };
  assert.ok(traceTargets(start, end, grid).some(h => h.target === t));
  t.hp = 0;
  assert.ok(!traceTargets(start, end, grid).some(h => h.target === t));
});

test('树干索引与完整扫描保持同样的挤压、连锁击退和跨边界位移', () => {
  const trees = targets();
  for (let i = 0; i < 240; i++) {
    const x = i * 37 - 3900, y = i * 29 - 2900;
    assert.equal(blocked(x, y, 12, new SpatialGrid(trees)), blocked(x, y, 12, trees));
  }
  trees.push({ id: 9000, x: 26, y: 700, radius: 16, hp: 100 });
  const indexed = Array.from({ length: 12 }, (_, id) => ({ id, type: 'enemy',
    x: WORLD.width - 95 + (id % 4) * 27, y: 680 + Math.floor(id / 4) * 25,
    radius: 17, mass: 1 + id % 3, pushX: id % 3 ? 0 : 320, hp: 100 }));
  const full = structuredClone(indexed), indexedHits = [], fullHits = [];
  // 可迭代参考源绕过分桶阈值，继续走完整树干扫描。
  const iterable = { [Symbol.iterator]: () => trees[Symbol.iterator]() };
  for (let frame = 0; frame < 60; frame++) {
    stepBodies(indexed, 1 / 60, WORLD, (a,b,s) => indexedHits.push([a.id,b?.id,s]), trees);
    stepBodies(full, 1 / 60, WORLD, (a,b,s) => fullHits.push([a.id,b?.id,s]), iterable);
  }
  assert.deepEqual(indexed, full);
  assert.deepEqual(indexedHits, fullHits);
});

test('先裁剪后复制与原有周期镜像完全一致，包含前摇坐标与宽视野多副本', () => {
  const items = targets().map(t => ({ ...t,
    assault: { phase: 'lunge', originX: t.x - 30, originY: t.y, endX: t.x + 20, endY: t.y + 10 },
    trail: [{ x: t.x - 10, y: t.y }], ex: t.x + 10, ey: t.y - 8 }));
  for (const view of [{ x: -90, y: -70, w: 650, h: 1400 },
    { x: 3500, y: 2750, w: 650, h: 1400 }, { x: -4000, y: 1500, w: 8500, h: 5900 }]) {
    const reference = { x: view.x + view.w / 2, y: view.y + view.h / 2 }, legacy = [];
    for (const item of items) {
      const base = viewBody(item, reference);
      for (let x = Math.ceil((view.x - 140 - base.x) / WORLD.width);
        x <= Math.floor((view.x + view.w + 140 - base.x) / WORLD.width); x++)
        for (let y = Math.ceil((view.y - 140 - base.y) / WORLD.height);
          y <= Math.floor((view.y + view.h + 140 - base.y) / WORLD.height); y++)
          legacy.push(viewBody(base, { x: base.x + x * WORLD.width, y: base.y + y * WORLD.height }));
    }
    assert.deepEqual(visibleBodies(items, view), legacy);
    const nearby = treesInBounds(items, view.x, view.y, view.x + view.w, view.y + view.h, 140);
    assert.deepEqual(visibleBodies(nearby, view), legacy);
  }
});

test('静态树索引跨帧复用，补种、清场与矿井原地替换均能取得新目标', () => {
  const trees = targets(), grid = treeGrid(trees);
  assert.equal(treeGrid(trees), grid);
  const sapling = {id: 10000, x: 90, y: 120, radius: 18, hp: 1};
  trees.push(sapling);
  assert.ok(treeGrid(trees).query(90,120,90,120).includes(sapling));
  assert.ok(!treeGrid(trees.filter(t => t !== sapling)).query(90,120,90,120).includes(sapling));
  const rocks = Object.assign([sapling], {mineScene: {}});
  treeGrid(rocks);
  rocks[0] = {...sapling, x: 9000};
  assert.deepEqual(treeGrid(rocks).query(9000,120,9000,120), [rocks[0]]);
});

// 清理同一帧多棵树后复用索引，仍按原顺序绘制；再生和换图会刷新碰撞。
test('死亡原地删除不重建分桶，不残留幽灵碰撞或死亡绘制项',async()=>{
 const {cleanupTreeDeaths,markTreeDeath}=await import('../src/world/spatial-grid.js');
 const trees=targets(),grid=treeGrid(trees),dead=[trees[0],trees[75],trees[799]],expected=trees.filter(t=>!dead.includes(t));dead.forEach(t=>{t.hp=0;markTreeDeath(trees,t);});
 cleanupTreeDeaths(trees);assert.equal(treeGrid(trees),grid);assert.deepEqual(trees,expected);
 for(const t of dead)assert.ok(!grid.query(t.x,t.y,t.x,t.y).includes(t));
 assert.deepEqual(treesInBounds(trees,0,0,WORLD.width,WORLD.height,200),expected);
 const sapling={id:10001,x:90,y:120,radius:18,hp:1};trees.push(sapling);assert.ok(treeGrid(trees).query(90,120,90,120).includes(sapling));
 cleanupTreeDeaths(trees);assert.equal(trees.length,expected.length+1);
});

// 同帧再生与死亡混合时，新树必须参与碰撞；旧数组换场后不消费旧死亡通知。
test('补种后立即伐木仍包含新障碍，死亡通知不跨地图污染',async()=>{
 const {cleanupTreeDeaths,markTreeDeath}=await import('../src/world/spatial-grid.js');const trees=targets();treeGrid(trees);const dead=trees[0],sapling={id:10000,x:90,y:120,radius:18,hp:1};trees.push(sapling);dead.hp=0;markTreeDeath(trees,dead);cleanupTreeDeaths(trees);assert.ok(treeGrid(trees).query(90,120,90,120).includes(sapling));
 const replacement=[{...dead,hp:100}];cleanupTreeDeaths(replacement);assert.equal(replacement.length,1);
});

// 领主范围毁树走相同死亡队列，清理后共享碰撞索引与奖励保持正确。
test('领主毁树登记清理且复用共享索引，不产生玩家木材',async()=>{
 const {cleanupTreeDeaths}=await import('../src/world/spatial-grid.js'),{breakTreesAlong}=await import('../src/combat/boss-terrain.js');
 const trees=[{id:1,type:'tree',x:2000,y:1500,radius:12,hp:55},{id:2,type:'tree',x:2000,y:1600,radius:12,hp:55}],grid=treeGrid(trees),stumps=[];
 const g={trees,fx:{impact(){}},leaveStump(tree){stumps.push(tree);}};
 breakTreesAlong(g,{x:1960,y:1500},{x:2040,y:1500},8,{protectSettlement:false});cleanupTreeDeaths(trees);
 assert.equal(treeGrid(trees),grid);assert.equal(stumps.length,1);assert.deepEqual(trees.map(t=>t.id),[2]);assert.ok(!grid.query(2000,1500,2000,1500).some(t=>t.id===1));
});
