// 营地移动预热优先满足当前光照，验证白天发布、夜晚补齐和取消边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {GroundCache} from '../src/rendering/ground-cache.js';
const view={x:400,y:1500,w:550,h:880};

test('白天的新路面排在已有块的夜色之前，必要工作不会被误判为空闲',()=>{
 const c=new GroundCache();c.prepare(view,0);const first=c.pending[0];
 c.publish({day:{width:388,height:388}},first);c.prepare(view,0);
 const nightIndex=c.pending.findIndex(s=>s.key===first.key);
 assert.ok(nightIndex>0);assert.equal(c.pending[nightIndex].night,1);
 assert.ok(c.pending.slice(0,nightIndex).every(s=>s.night===0));assert.equal(c.needsWarmup(),true);
 for(const s of c.pending)c.publish({day:{}},s);c.prepare(view,0);
 assert.equal(c.needsWarmup(),false);assert.ok(c.pending.every(s=>s.night===1));
 c.prepare(view,.01);assert.equal(c.needsWarmup(),true);assert.ok(c.pending.every(s=>s.night===1));
});

test('白天任务发布后仍能按需补齐夜色，默认入场继续等待完整昼夜',()=>{
 const c=new GroundCache(),requested=[];c.prepare(view,0);
 // 以小生成器隔离队列调度，正式像素等价由浏览器验证。
 c.startWork=function(spec,night=1){requested.push(night);this.work={spec,night,steps:(function*(){return {day:{},...(night?{night:{}}:{})};})()};};
 c.advance(100,()=>0);assert.ok(requested.every(n=>n===0));assert.equal(c.ready(view),false);
 c.prepare(view);c.advance(100,()=>0);assert.equal(c.ready(view),true);assert.ok(requested.includes(1));
 c.prepare(view);assert.equal(c.needsWarmup(),false);c.dispose();assert.equal(c.needsWarmup(),false);
});

test('在途新地块保留必要时间片，纯夜色补齐在白天继续使用余量',()=>{
 const c=new GroundCache();c.prepare(view,0);const spec=c.pending[0];c.pending=[];
 c.work={spec,steps:(function*(){yield;})()};assert.equal(c.needsWarmup(),true);
 c.publish({day:{}},spec);assert.equal(c.needsWarmup(),false);
 c.requiredNight=true;assert.equal(c.needsWarmup(),true);
 c.cancelWarmup();assert.equal(c.needsWarmup(),false);
});
