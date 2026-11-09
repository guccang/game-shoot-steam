// 三倍地图回归覆盖面积、旧地点、环面、空间查询、局部纹理和远处存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,ORIGINAL_WORLD,canonical,worldDistance} from '../src/world/coordinates.js';
import {PATHS,pathDistance} from '../src/world/paths.js';
import {forestLayout,biomeAt} from '../src/world/biomes.js';
import {groundDetails} from '../src/world/ground-details.js';
import {groundTiles,GROUND_CACHE_LIMIT} from '../src/rendering/ground-cache.js';
import {TreeSpacingIndex} from '../src/world/forest-expansion.js';
import {forestUnderstory} from '../src/world/forest-understory.js';
import {BUS_STOP_TREES} from '../src/world/bus-stop-landscape.js';
import {HABITATS,forestHabitat} from '../src/world/forest-habitats.js';
import {MONSTER_CAMPS} from '../src/config/monster-camps.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {normalizeLivingWorld} from '../src/progression/camp/living-world.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {SETTLEMENTS} from '../src/config/settlements.js';
import {riverSamples,BRIDGE,isWaterBlocked} from '../src/world/river-geometry.js';
// 保留一个独立的全扫描参考，仅测试时验证索引没有改变精确留白距离。
function bruteDistance(x,y){const p=canonical({x,y});let best=Infinity;for(const path of PATHS)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t));}return best;}
test('森林最远探索距离3000米，营地与新手短路线不随地图拉伸',()=>{
 assert.deepEqual(WORLD,{width:48000,height:36000});assert.equal(Math.hypot(WORLD.width/2,WORLD.height/2)/10,3000);
 const camp=SETTLEMENTS[0];assert.equal(camp.left,-780);
 assert.ok(RANGER.route.length<70);assert.ok(RANGER.route.every(p=>p.y>=-660&&p.y<1000));
 assert.equal(PATHS[1].find(p=>p.y===900).x,330+Math.sin(900/2800*Math.PI*2)*65);
});
test('新边界连续，原边界成为普通可通行的地图内部',()=>{
 assert.deepEqual(canonical({x:WORLD.width+10,y:-10}),{x:10,y:WORLD.height-10});assert.equal(worldDistance({x:WORLD.width-10,y:100},{x:10,y:100}),20);
 assert.deepEqual(canonical({x:3610,y:2810}),{x:3610,y:2810});
 for(const road of PATHS.slice(0,-2))assert.ok(worldDistance(road[0],road.at(-1))<1e-8);
 assert.equal(riverSamples.at(-1).y,WORLD.height);assert.ok(riverSamples.every((p,i)=>!i||p.y>=riverSamples[i-1].y));
 assert.equal(isWaterBlocked(BRIDGE.x+BRIDGE.width/2,BRIDGE.y+BRIDGE.height/2,12),false);
});
test('道路空间索引与全扫描一致，外圈连接支路准确落到纵路',()=>{
 for(let i=0;i<100;i++){const x=(i*987.31)%WORLD.width,y=(i*727.7)%WORLD.height;assert.ok(Math.abs(pathDistance(x,y)-bruteDistance(x,y))<1e-8);}
 for(const path of PATHS.slice(-2))for(const p of [path[0],path.at(-1)])assert.ok(PATHS.slice(0,-2).some(road=>road.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-8)));
});
test('外圈林团覆盖八个新增大区且树木刷新稳定，间距查询识别循环邻居',()=>{
 const trees=forestLayout();assert.ok(trees.length>3000&&trees.length<15000);assert.deepEqual(forestLayout(),trees);
 for(let row=0;row<3;row++)for(let col=0;col<3;col++)assert.ok(trees.filter(t=>Math.floor(t.x/3600)===col&&Math.floor(t.y/2800)===row).length>100);
 const index=new TreeSpacingIndex();index.add({x:WORLD.width-10,y:100},70);assert.equal(index.accepts({x:10,y:100},30),false);assert.equal(index.accepts({x:100,y:100},30),true);
});
test('地表查询只返回当前局部，跨块重复点一致且缓存上限不变',()=>{
 const a={x:7000,y:5000,w:384,h:384},b={x:7200,y:5000,w:384,h:384},points=[...groundDetails(a,'grass')];
 assert.ok(points.length>60&&points.length<250);assert.deepEqual(points,[...groundDetails(a,'grass')]);
 const keys=new Map([...groundDetails(b,'grass')].map(p=>[p.index,p]));for(const p of points.filter(p=>p.x>=7192))assert.deepEqual(keys.get(p.index),p);
 assert.equal(GROUND_CACHE_LIMIT,64);assert.ok(groundTiles(a).length<=9);assert.ok(groundTiles({x:WORLD.width-50,y:WORLD.height-50,w:200,h:200}).some(t=>t.ox===WORLD.width&&t.oy===WORLD.height));
});
test('地图生态名称与实景树种、环面地色一致，营地形成聚落和空地',()=>{
 for(const [id,{label:[x,y]}] of Object.entries(HABITATS)){
  const tint=[0,0,0],mirrorTint=[0,0,0];
  assert.equal(forestHabitat(x,y,tint).dominant.id,id);
  assert.equal(biomeAt(x,y).id,id);
  forestHabitat(x-WORLD.width,y+WORLD.height,mirrorTint);
  assert.deepEqual(tint.map(Math.round),mirrorTint.map(Math.round));
 }
 const sectors=Array(180).fill(0),camps=MONSTER_CAMPS.filter(c=>c.mapId==='forest');
 assert.equal(camps.length,185);
 for(const c of camps)sectors[Math.floor(c.y/3000)*15+Math.floor(c.x/3200)]++;
 assert.ok(sectors.filter(n=>n===0).length>=40);
 assert.ok(sectors.filter(n=>n>=3).length>=10);
});
test('野外手机视野能遇到树木或低景，公交站树位与跨界景物稳定',()=>{
 const trees=forestLayout();
 assert.ok(BUS_STOP_TREES.every(p=>trees.some(t=>t.x===p.x&&t.y===p.y)&&pathDistance(p.x,p.y)>66));
 let covered=0;
 for(let i=0;i<160;i++){
  const view={x:5000+i*11731%42000,y:5000+i*12571%30000,w:390,h:600};
  const inside=p=>p.x>=view.x&&p.x<view.x+view.w&&p.y>=view.y&&p.y<view.y+view.h;
  if(forestUnderstory(view).some(inside)||trees.some(inside))covered++;
 }
 assert.ok(covered>=144,`160个视野中只有${covered}个有景物`);
 const seam={x:-200,y:18000,w:450,h:600},items=forestUnderstory(seam);
 assert.ok(items.length>0);
 const mirror=forestUnderstory({...seam,x:seam.x+WORLD.width});
 assert.equal(mirror.length,items.length);
 items.forEach((p,i)=>{
  assert.equal(p.kind,mirror[i].kind);assert.equal(p.y,mirror[i].y);
  assert.ok(Math.abs(mirror[i].x-p.x-WORLD.width)<1e-8);
 });
});
test('营门外有连片林冠，主路和桥头留白',()=>{
 const trees=forestLayout();
 for(const center of [{x:-985,y:530},{x:-1000,y:986},{x:90,y:-242},{x:605,y:-225},{x:985,y:405}]){
  const grove=trees.filter(t=>t.woodland&&worldDistance(t,center)<250);
  assert.ok(grove.length>=10,JSON.stringify(center));
  assert.ok(grove.every(t=>pathDistance(t.x,t.y)>=66));
 }
 const east=trees.filter(t=>t.woodland&&t.x>850&&t.x<1100&&t.y<800);
 assert.ok(east.every(t=>t.y<665));
});
test('新区域坐标保存并恢复，非法边界仍拒绝',()=>{
 const p=normalizeLivingWorld({position:{x:9800,y:7600}});assert.deepEqual(p.position,{x:9800,y:7600});
 assert.equal(normalizeLivingWorld({position:{x:WORLD.width,y:7600}}).position,null);
 assert.deepEqual(normalizeLivingWorld({position:{x:900,y:700}}).position,{x:900,y:700});
});

test('扩图后旧档西门外的玩家与报废车仍相邻，重复读档不会再次搬动',()=>{
 const old=freshProgress(),hull=old.vehicleIndex;
 delete old.forestExtentVersion;
 old.living.position={x:10500,y:650};
 old.vehicleService[hull]={phase:'wrecked',mapId:'forest',position:{x:10470,y:650}};
 const restored=validateProgress(old);
 assert.deepEqual(restored.living.position,{x:WORLD.width-300,y:650});
 assert.deepEqual(restored.vehicleService[hull].position,{x:WORLD.width-330,y:650});
 assert.deepEqual(validateProgress(restored).living.position,restored.living.position);
 assert.equal(old.living.position.x,10500);
 restored.living.position={x:10500,y:650};
 assert.equal(validateProgress(restored).living.position.x,10500);
 old.living.position.x=9705;old.vehicleService[hull].position.x=9695;
 old.logistics.tow={tractor:'cat',target:hull};
 const towing=validateProgress(old);
 assert.equal(worldDistance(towing.living.position,towing.vehicleService[hull].position),10);
});
