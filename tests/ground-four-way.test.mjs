// 四向预热、像素预算及同步未命中归因，验证正式缓存调度而不在Node模拟绘图。
import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundCache,groundTiles,groundWarmView,GROUND_CACHE_LIMIT} from '../src/rendering/ground-cache.js';
// 用带真实尺寸的可释放对象检查调度生命周期；像素一致性另由浏览器验证。
function tile(night=true){return {day:{width:388,height:388},night:night?{width:388,height:388}:null};}
// 保留生产get/advance/publish，只替换需要Canvas的构建器，并使任务经过至少一次让出。
function fakeBuilder(cache){cache.startWork=function(spec,night=1){
  const old=this.tiles.get(spec.key);
  // 分两步模拟完整地块发布，测试可见补建不会取消别处正在进行的预热。
  function* steps(){yield;return {...old,day:old?.day||tile().day,night:night?tile().night:null};}
  this.work={spec,night,surfaces:new Set(),ms:0,steps:steps()};
};return cache;}

test('日志视野四周一屏连同斜角完整覆盖，48块仍在64块容量内',()=>{
  const view={x:2039.951,y:268.422,w:440/.85,h:793/.85},cache=new GroundCache();cache.prepare(view,0);
  const expected=new Set(groundTiles(groundWarmView(view)).map(s=>s.key));
  assert.equal(expected.size,48);assert.deepEqual(cache.desired,expected);assert.equal(cache.limit,64);
  for(const dx of [-view.w,0,view.w])for(const dy of [-view.h,0,view.h])
    for(const s of groundTiles({...view,x:view.x+dx,y:view.y+dy}))assert.ok(cache.desired.has(s.key));
  assert.equal(cache.stats().warmCoverage.dayBytes*2,56914944);
  assert.equal(new Set(cache.pending.map(s=>s.key)).size,cache.pending.length);
});

test('循环边缘和超广角去重且优先保留全部可见块',()=>{
  for(const view of [{x:-100,y:-100,w:520,h:930},{x:10600,y:8200,w:520,h:930},{x:100,y:100,w:2000,h:1500}]){
    const cache=new GroundCache();cache.prepare(view,1);const visible=new Set(groundTiles(view).map(s=>s.key));
    for(const key of visible)assert.ok(cache.desired.has(key));
    assert.ok(cache.desired.size<=Math.max(GROUND_CACHE_LIMIT,visible.size));
    assert.equal(new Set(cache.pending.map(s=>s.key)).size,cache.pending.length);
  }
});

test('同步补建保留其他块的预热进度，夜景缺失独立计数',()=>{
  const cache=fakeBuilder(new GroundCache());cache.startWork({key:'0:0'});const work=cache.work;
  work.steps.next();cache.get({key:'1:0'},0);assert.equal(cache.work,work);
  cache.advance(2);assert.ok(cache.tiles.get('0:0').night);
  cache.get({key:'1:0'},1);assert.equal(cache.stats().missReasons.cold,1);assert.equal(cache.stats().missReasons.night,1);
  assert.ok(cache.stats().completedWork===3);assert.ok(cache.stats().buildMs>=0);
});

test('换季与淘汰原因可追溯，诊断记录有界且不持有已释放画布',()=>{
  const cache=fakeBuilder(new GroundCache());cache.publish(tile(),{key:'0:0'});cache.setSeason('winter');
  cache.get({key:'0:0'},1);assert.equal(cache.stats().missReasons.season,1);
  cache.desired=new Set();cache.limit=1;cache.publish(tile(),{key:'1:0'});cache.trim();
  cache.get({key:'0:0'},1);assert.equal(cache.stats().missReasons.evicted,1);
  for(let n=0;n<45;n++)cache.get({key:'new-'+n},1);
  assert.equal(cache.stats().missSamples.length,40);
  const snapshot=cache.stats();snapshot.missSamples[0].key='tampered';assert.notEqual(cache.stats().missSamples[0].key,'tampered');
  cache.dispose();assert.equal(cache.stats().bytes,0);
});
