// 验证浏览器事件去重、离屏观察、缓存生命周期和移动预算，像素恢复另由真实浏览器验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {watchRenderCanvas,recordCanvasContextEvent,canvasRecoveryStats} from '../src/rendering/canvas-recovery.js';
import {CatCoatFrames} from '../src/rendering/cat-coats.js';
import {GroundCache,groundTiles,groundCacheLimit} from '../src/rendering/ground-cache.js';

// 不连接DOM的画布也能发送真实形态的事件，测试不依赖文档捕获兜底。
function surface(width=256,height=320){return Object.assign(new EventTarget(),{width,height});}
test('离屏丢失与恢复都推进代际，同一事件经过捕获与目标时只计一次且不禁止恢复',()=>{
 const canvas=watchRenderCanvas(surface()),before=canvasRecoveryStats();watchRenderCanvas(canvas);
 const lost=new Event('contextlost',{cancelable:true});canvas.dispatchEvent(lost);recordCanvasContextEvent(lost);
 assert.equal(lost.defaultPrevented,false);assert.equal(canvasRecoveryStats().lost,before.lost+1);
 canvas.dispatchEvent(new Event('contextrestored'));assert.equal(canvasRecoveryStats().restored,before.restored+1);
 assert.equal(canvasRecoveryStats().revision,before.revision+2);
});
test('淘汰帧释放像素后迟到的恢复事件不引发下一轮缓存清空',()=>{
 const canvas=watchRenderCanvas(surface()),cache=new CatCoatFrames();cache.frames.set('旧帧',canvas);cache.work=surface();
 const work=cache.work;cache.clear();assert.equal(canvas.width,1);assert.equal(work.height,1);assert.equal(cache.bytes(),0);
 const before=canvasRecoveryStats().revision;canvas.dispatchEvent(new Event('contextrestored'));assert.equal(canvasRecoveryStats().revision,before);
});
test('手机每季24块、双池48块，拉远镜头仍完整保留可见区域',()=>{
 const previous=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:true});
 try{
  assert.equal(groundCacheLimit(),24);
  const cache=new GroundCache();cache.prepare({x:300,y:400,w:460,h:990});assert.equal(cache.limit,24);assert.ok(cache.desired.size<=24);
  const wide={x:300,y:400,w:2600,h:2400},visible=groundTiles(wide);cache.prepare(wide);
  assert.equal(cache.limit,new Set(visible.map(t=>t.key)).size);
  for(const tile of visible)assert.ok(cache.desired.has(tile.key));
 }finally{if(previous)globalThis.matchMedia=previous;else delete globalThis.matchMedia;}
});
