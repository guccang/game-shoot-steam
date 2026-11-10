// 检查正式雪团绘制的比例、强度、减少动态和粒子预算。
import test from 'node:test';
import assert from 'node:assert/strict';
import {SnowRenderer} from '../src/rendering/snow.js';
// 用记录画布捕获正式几何，避免仅验证独立的示意公式。
function capture(intensity=1,time=3,reduced=false){
 const calls=[],c=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:()=>true});
 const snow=new SnowRenderer();snow.draw(c,time,390,844,{x:713,y:412,zoom:.85},intensity,0,reduced);
 return {calls,stats:snow.stats()};
}
test('大雪以实心雪团为主并保留晶体、近景及总量预算',()=>{
 const {calls,stats}=capture();assert.ok(stats.tuftCount>stats.count*.6);assert.ok(stats.tuftCount<stats.count);
 assert.ok(stats.count<=167&&stats.largeCount<=3);assert.ok(calls.some(c=>c[0]==='fill'));assert.ok(calls.some(c=>c[0]==='stroke'));
});
test('加强大雪尺寸，减少动态保持固定雪场，晴天不绘制',()=>{
 const large=capture().calls.filter(c=>c[0]==='ellipse').map(c=>c[3]);
 const light=capture(.45).calls.filter(c=>c[0]==='ellipse').map(c=>c[3]);
 assert.ok(Math.max(...large)>Math.max(...light));assert.deepEqual(capture(1,2,true),capture(1,8,true));assert.equal(capture(0).calls.length,0);
});
