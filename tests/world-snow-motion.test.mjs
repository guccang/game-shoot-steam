// 镜头运动必须是纯世界投影，雪花身份、缩放和跨地图镜像不会依赖屏幕重排。
import test from 'node:test';
import assert from 'node:assert/strict';
import { snowSample, projectSnow, visibleSnow, SNOW_LAYERS } from '../src/world/snowfall.js';
import { WORLD } from '../src/world/coordinates.js';
// 浮点投影只允许计算误差，不能容许原来的部分镜头位移。
function close(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}

test('同一雪花在任意镜头平移、反向与缩放后保持完整世界位移',()=>{
 for(let layer=0;layer<3;layer++)for(const zoom of [.2,.6,.85,1.05,2]) {
  const sample=snowSample(-2,5,layer,3),a={x:-300,y:400,zoom},b={x:-235,y:363,zoom};
  const first=projectSnow(sample,a),next=projectSnow(sample,b);
  close(next.x-first.x,-65*zoom);close(next.y-first.y,37*zoom);
  close(projectSnow(sample,{...a,zoom:zoom*2}).x,first.x*2);
  close(projectSnow(sample,{...a,zoom:zoom*2}).radius,first.radius*2);
  assert.deepEqual(projectSnow(sample,a),first);
 }
});
test('跨格点与不同屏幕尺寸仍保留共同雪花身份，屏幕边缘不回绕',()=>{
 const a={x:713,y:412,zoom:.85},b={...a,x:781,y:451};
 const first=new Map([...visibleSnow(a,390,844,3)].map(p=>[p.id,p]));
 let shared=0;
 for(const next of visibleSnow(b,390,844,3))if(first.has(next.id)) {
  const prev=first.get(next.id);close(next.x-prev.x,-68*.85);close(next.y-prev.y,-39*.85);shared++;
 }
 assert.ok(shared>20);
 for(const next of visibleSnow(a,430,900,3))if(first.has(next.id)){close(next.x,first.get(next.id).x);close(next.y,first.get(next.id).y);}
 const offscreen=projectSnow({x:700,y:500,radius:3},{x:800,y:400,zoom:1});assert.equal(offscreen.x,-100);
});
test('循环世界及负坐标共用雪花相位，地图接缝不跳动',()=>{
 for(let layer=0;layer<3;layer++) {
  const cfg=SNOW_LAYERS[layer],a=snowSample(-1,-1,layer,4),b=snowSample(-1+WORLD.width/cfg.width,-1+WORLD.height/cfg.height,layer,4);
  close(b.x-a.x,WORLD.width);close(b.y-a.y,WORLD.height);close(b.alpha,a.alpha);close(b.angle,a.angle);close(b.radius,a.radius);
 }
});
test('镜头不改变雪花自身轨迹，广角预算有界，大雪花仍有出现和休止',()=>{
 for(let layer=0;layer<3;layer++) {
  const a=snowSample(3,5,layer,2),b=snowSample(3,5,layer,2.1);
  const sa=projectSnow(a,{x:200,y:400,zoom:.85}),sb=projectSnow(b,{x:230,y:420,zoom:.85});
  close(sb.x-sa.x,(b.x-a.x-30)*.85);close(sb.y-sa.y,(b.y-a.y-20)*.85);
 }
 let largeOn=false,largeOff=false;
 for(let t=0;t<36;t+=.5) {
  const flake=snowSample(0,0,2,t);largeOn ||= flake.alpha>0;largeOff ||= flake.alpha===0;
  for(const [w,h,z] of [[390,844,.85],[1100,1000,.6],[5000,5000,.02]]) {
   const particles=[...visibleSnow({x:-350,y:2790,zoom:z},w,h,t)];
   assert.ok(particles.length<=167);assert.ok(particles.filter(p=>p.layer===2).length<=3);
  }
 }
 assert.ok(largeOn&&largeOff);
});

// 方向镜头的天气和实体必须落在同一点，普通营地投影不变。
test('阳台四向雨雪与闪电共用投影并保持预算',async()=>{
 const {homeBalconyView}=await import('../src/rendering/home-balcony.js');
 const {worldPointToView,viewPointToWorld}=await import('../src/world/view-projection.js');
 const {prepareStormStrike,projectStormStrike}=await import('../src/rendering/storm.js');
 for(const side of ['north','east','south','west']){
  const view=homeBalconyView({balcony:side,floor:62},390,550);
  const point={x:100,y:200},world=viewPointToWorld(view,point),screen=worldPointToView(view,world);
  close(screen.x,point.x);close(screen.y,point.y);
  const snow=projectSnow({...world,radius:4},view);close(snow.x,point.x);close(snow.y,point.y);
  const particles=[...visibleSnow(view,390,550,3)];assert.ok(particles.length>0&&particles.length<=167);
  const strike=prepareStormStrike(null,view,{frame:1,cycle:0},'forest',1),bolt=projectStormStrike(strike,view);
  close(bolt.x,390*.68);assert.ok(bolt.groundY>=0&&bolt.groundY<550);
 }
 const normal={x:100,y:200,zoom:.5};assert.deepEqual(worldPointToView(normal,{x:200,y:400}),{x:50,y:100});assert.deepEqual(viewPointToWorld(normal,{x:50,y:100}),{x:200,y:400});
});
