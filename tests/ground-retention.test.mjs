// 验证增加保留内存确实减少折返重建，同时保持预热工作量、淘汰和地图释放边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundCache,groundTiles,GROUND_CACHE_LIMIT,GROUND_WARM_LIMIT} from '../src/rendering/ground-cache.js';

// 不模拟像素内容，只用可释放的画布尺寸验证正式缓存调度与生命周期。
function tile(){return {day:{width:388,height:388},night:{width:388,height:388}};}

test('沿途32块以外的旧纹理仍可折返命中，四周预热受既有容量约束',()=>{
  const cache=new GroundCache(),first=tile();
  cache.publish(first,{key:'0:0'});
  for(let i=1;i<50;i++)cache.publish(tile(),{key:`history-${i}`});
  cache.prepare({x:1800,y:2000,w:390,h:844});
  assert.ok(cache.pending.length<=GROUND_WARM_LIMIT);
  assert.equal(cache.tiles.get('0:0'),first);assert.equal(first.day.width,388);
  assert.equal(cache.get({key:'0:0'},1),first);assert.equal(cache.syncMisses,0);
  const visible=groundTiles({x:1800,y:2000,w:390,h:844});
  for(const spec of visible)cache.publish(tile(),spec);
  for(let i=50;i<100;i++){cache.publish(tile(),{key:`history-${i}`});cache.trim();}
  assert.equal(cache.tiles.size,GROUND_CACHE_LIMIT);
  for(const spec of visible)assert.ok(cache.tiles.has(spec.key),'当前工作集不得因历史块被淘汰');
  cache.setMap('jiuzhaigou');assert.equal(cache.tiles.size,0);assert.equal(cache.pending.length,0);
});

test('季节切换与销毁释放额外保留的昼夜画布',()=>{
  const cache=new GroundCache(),old=tile();cache.publish(old,{key:'0:0'});
  cache.setSeason('winter');assert.equal(old.day.width,1);assert.equal(old.night.height,1);
  const next=tile();cache.publish(next,{key:'0:0'});cache.dispose();
  assert.equal(next.day.width,1);assert.equal(cache.stats().bytes,0);
});
