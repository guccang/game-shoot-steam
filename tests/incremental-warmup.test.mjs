// 验证预热预算、取消生命周期、路径结果与森林布局隔离，避免后台工作改变战斗行为。
import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationWarmup, naturalWaypoint } from '../src/physics/terrain-navigation.js';
import { GroundCache,groundTiles } from '../src/rendering/ground-cache.js';
import { forestLayout } from '../src/world/biomes.js';

test('导航预热按预算让出，准备前后同一绕行需求保持一致', () => {
  const body = { x: 1600.123456, y: 1100.654321, mapId: 'forest' }, goal = { x: 2600, y: 1200 };
  const before = naturalWaypoint({ ...body }, goal), warmup = new NavigationWarmup();
  warmup.prepare(body);
  let tick = 0;
  warmup.advance(2, () => tick++);
  assert.ok(warmup.steps, '一次小预算不能同步完成整个导航图');
  assert.ok(warmup.stats().warmed > 0);
  for (let n = 0; warmup.steps && n < 1000; n++) warmup.advance(10);
  assert.equal(warmup.steps, null);
  assert.deepEqual(naturalWaypoint({ ...body }, goal), before);
  assert.ok(warmup.stats().count <= warmup.stats().limit);
  warmup.prepare({ ...body, mapId: 'jiuzhaigou' }); warmup.dispose();
  assert.equal(warmup.steps, null);
});

test('地块分帧任务只发布完成结果，地图切换取消未完成步骤', () => {
  const cache = new GroundCache(); let resumed = 0, cancelled = false;
  // 用两步绘制任务隔离调度器验证，不在 Node 中模拟像素绘制。
  function* steps() {
    try { resumed++; yield; resumed++; return { day: {}, night: {} }; }
    finally { cancelled = true; }
  }
  cache.work = { spec: { key: '0:0' }, surfaces: new Set(), steps: steps() };
  let tick = 0; cache.advance(2, () => tick++);
  assert.equal(resumed, 1); assert.equal(cache.tiles.size, 0);
  cache.setMap('jiuzhaigou');
  assert.ok(cancelled); assert.equal(cache.work, null); assert.equal(cache.tiles.size, 0);
  cache.dispose(); assert.equal(cache.stats().pendingBytes, 0);
});

test('缓存森林布局仍返回独立树对象，不共享伐木或战场状态', () => {
  const before = forestLayout(), originalX = before[0].x;
  before[0].x = -9999; before[0].destroyed = true; before.pop();
  const after = forestLayout();
  assert.equal(after[0].x, originalX); assert.equal(after[0].destroyed, undefined);
  assert.equal(after.length, before.length + 1);
});

// 加载统计只计当前视野的已发布纹理，半成品与远处预热不会提前完成。
test('首屏完成比例按昼夜纹理计数，导航完成比例按实际有向边计数',()=>{
 const view={x:10,y:10,w:600,h:400},cache=new GroundCache(),specs=groundTiles(view);assert.equal(cache.readiness(view),0);
 cache.publish({day:{}},specs[0]);assert.equal(cache.readiness(view),1/(specs.length*2));cache.publish({day:{},night:{}},{key:'90:90',x:34560,y:34560});assert.equal(cache.readiness(view),1/(specs.length*2));
 for(const spec of specs)cache.publish({day:{},night:{}},spec);assert.equal(cache.readiness(view),1);assert.equal(cache.ready(view),true);
 const nav=new NavigationWarmup();nav.prepare({x:1600,y:1100,mapId:'forest'});assert.equal(nav.progress,0);nav.advance(2,(()=>{let n=0;return ()=>n++;})());assert.ok(nav.progress>0&&nav.progress<1);while(nav.steps)nav.advance(10);assert.equal(nav.progress,1);cache.dispose();
});
