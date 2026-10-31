// 三倍地图回归覆盖面积、旧地点、环面、空间查询、局部纹理和远处存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD,ORIGINAL_WORLD,canonical,worldDistance} from '../src/world/coordinates.js';
import {PATHS,pathDistance} from '../src/world/paths.js';
import {forestLayout} from '../src/world/biomes.js';
import {groundDetails} from '../src/world/ground-details.js';
import {groundTiles,GROUND_CACHE_LIMIT} from '../src/rendering/ground-cache.js';
import {TreeSpacingIndex} from '../src/world/forest-expansion.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {normalizeLivingWorld} from '../src/progression/living-world.js';
import {SETTLEMENTS} from '../src/config/settlements.js';
import {riverSamples,BRIDGE,isWaterBlocked} from '../src/world/river-geometry.js';
// 保留一个独立的全扫描参考，仅测试时验证索引没有改变精确留白距离。
function bruteDistance(x,y){const p=canonical({x,y});let best=Infinity;for(const path of PATHS)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));best=Math.min(best,Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t));}return best;}
test('地图跨度三倍面积九倍，营地与新手短路线不随地图拉伸',()=>{
 assert.deepEqual(WORLD,{width:10800,height:8400});assert.equal(WORLD.width*WORLD.height/(ORIGINAL_WORLD.width*ORIGINAL_WORLD.height),9);
 const camp=SETTLEMENTS[0];assert.equal((camp.right-camp.left)*(camp.bottom-camp.top),989400);
 assert.ok(RANGER.route.length<70);assert.ok(RANGER.route.every(p=>p.y>=-660&&p.y<1000));
 assert.equal(PATHS[1].find(p=>p.y===900).x,630+Math.sin(900/2800*Math.PI*2)*65);
});
test('新边界连续，原边界成为普通可通行的地图内部',()=>{
 assert.deepEqual(canonical({x:10810,y:-10}),{x:10,y:8390});assert.equal(worldDistance({x:10790,y:100},{x:10,y:100}),20);
 assert.deepEqual(canonical({x:3610,y:2810}),{x:3610,y:2810});
 assert.equal(riverSamples.at(-1).y,WORLD.height);assert.ok(riverSamples.every((p,i)=>!i||p.y>=riverSamples[i-1].y));
 assert.equal(isWaterBlocked(BRIDGE.x+BRIDGE.width/2,BRIDGE.y+BRIDGE.height/2,12),false);
});
test('道路空间索引与全扫描一致，外圈连接支路准确落到纵路',()=>{
 for(let i=0;i<100;i++){const x=(i*987.31)%WORLD.width,y=(i*727.7)%WORLD.height;assert.ok(Math.abs(pathDistance(x,y)-bruteDistance(x,y))<1e-8);}
 for(const path of PATHS.slice(-2))for(const p of [path[0],path.at(-1)])assert.ok(PATHS.slice(0,-2).some(road=>road.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-8)));
});
test('外圈林团覆盖八个新增大区且树木刷新稳定，间距查询识别循环邻居',()=>{
 const trees=forestLayout();assert.ok(trees.length>3000&&trees.length<5000);assert.deepEqual(forestLayout(),trees);
 for(let row=0;row<3;row++)for(let col=0;col<3;col++)assert.ok(trees.filter(t=>Math.floor(t.x/3600)===col&&Math.floor(t.y/2800)===row).length>100);
 const index=new TreeSpacingIndex();index.add({x:10790,y:100},70);assert.equal(index.accepts({x:10,y:100},30),false);assert.equal(index.accepts({x:100,y:100},30),true);
});
test('地表查询只返回当前局部，跨块重复点一致且缓存上限不变',()=>{
 const a={x:7000,y:5000,w:384,h:384},b={x:7200,y:5000,w:384,h:384},points=[...groundDetails(a,'grass')];
 assert.ok(points.length>60&&points.length<250);assert.deepEqual(points,[...groundDetails(a,'grass')]);
 const keys=new Map([...groundDetails(b,'grass')].map(p=>[p.index,p]));for(const p of points.filter(p=>p.x>=7192))assert.deepEqual(keys.get(p.index),p);
 assert.equal(GROUND_CACHE_LIMIT,32);assert.ok(groundTiles(a).length<=9);assert.ok(groundTiles({x:10750,y:8350,w:200,h:200}).some(t=>t.ox===10800&&t.oy===8400));
});
test('新区域坐标保存并恢复，非法边界仍拒绝',()=>{
 const p=normalizeLivingWorld({position:{x:9800,y:7600}});assert.deepEqual(p.position,{x:9800,y:7600});
 assert.equal(normalizeLivingWorld({position:{x:10800,y:7600}}).position,null);
 assert.deepEqual(normalizeLivingWorld({position:{x:900,y:700}}).position,{x:900,y:700});
});
