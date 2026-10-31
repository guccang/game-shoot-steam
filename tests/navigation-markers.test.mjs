// 导航绘制只验证缩放边界、减少动态和上下文隔离，不复制颜色细节断言。
import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationScale,navigationPinBelow,navigationPinLift,drawNavigationDot,drawNavigationRing,drawNavigationPin} from '../src/rendering/navigation-markers.js';

// 记录真实绘制指令用于比较减少动态下两次采样，避免要求浏览器Canvas环境。
function record(draw,time,reduced){
 const calls=[],c=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:(_,key,value)=>{calls.push([key,value]);return true;}});
 draw(c,time,reduced);return calls;
}
test('远景适度放大提示但有上限，近景不额外放大',()=>{
 assert.equal(navigationScale(.5),1.65);assert.equal(navigationScale(2),1);assert.ok(navigationScale(.8)*.8>=1);
});
test('标记避让顶部任务区域，翻转后仍以原目标为锚点',()=>{
 const p={x:120,y:200};assert.equal(navigationPinBelow(p,{y:0,zoom:.75}),true);assert.equal(navigationPinBelow(p,{y:-300,zoom:1}),false);
 for(const zoom of [.85,1.05]){const view={y:80,zoom},top=(p.y-view.y)*zoom+(navigationPinLift(p,view)-32)*navigationScale(zoom)*zoom;assert.ok(top>=200);}
 const calls=record(c=>drawNavigationPin(c,p,0,.75,true,true));assert.deepEqual(calls[1],['translate',120,200]);assert.ok(calls.some(c=>c[0]==='scale'&&c[2]<0));
});
test('减少动态时光点、光圈、悬浮标记不跳动，绘制均恢复上下文',()=>{
 const p={x:120,y:200,distance:80,angle:Math.PI/2,arrow:true};
 for(const draw of [(c,t,r)=>drawNavigationDot(c,p,t,.75,r),(c,t,r)=>drawNavigationRing(c,p,t,r),(c,t,r)=>drawNavigationPin(c,p,t,.75,r)]){
  const a=record(draw,0,true),b=record(draw,1,true);assert.deepEqual(a,b);
  assert.deepEqual(a[0],['save']);assert.deepEqual(a.at(-1),['restore']);assert.notDeepEqual(record(draw,0,false),record(draw,1,false));
 }
});
