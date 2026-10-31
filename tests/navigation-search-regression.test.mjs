import {worldBuildingBlocked} from '../src/world/building-collision.js';
// 导航性能专项：固定正式森林场景，以搜索工作量防回退，并核对空间索引与原碰撞完全一致。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {acceptClearingPost} from '../src/core/clearing-guide.js';
import {worldNavigationObjective} from '../src/core/world-navigation.js';
import {createQuestRouteSearch,questLineClear,planQuestRoute} from '../src/physics/quest-route.js';
import {storyRouteState} from '../src/core/story-route.js';
import {summonVehicle,dismountVehicle} from '../src/combat/vehicle.js';
import {SETTLEMENT_FENCES,settlementBlocked} from '../src/world/settlements.js';
import {nearest,WORLD,canonical} from '../src/world/coordinates.js';
import {SpatialGrid} from '../src/world/spatial-grid.js';
import {LIVING_PLACES} from '../src/config/living-world.js';
import {FARM_SEED_SHOP} from '../src/config/farm.js';
import {livingFacilityBlocked} from '../src/world/living-spaces.js';
import {livingRouteStates} from '../src/core/living-route.js';
import {updateLivingWorld} from '../src/core/living-world.js';
import {playerNavigationBody,createPlayerNavigationIndex} from '../src/core/prepared-navigation.js';

// 固定种子6重现上下车后四秒空白的长途清缴路线，使用真实树木和正式任务目标。
function scene(){
 let seed=6;const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.bosses=1;p.vehicleIndex=2;p.vehicleHulls[2]=1;
 const g=new Game(p,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));g.start();g.mainlineSpeech=null;g.vehicle.active=false;
 Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y,flying:false,amphibious:false,treePass:false});assert.ok(acceptClearingPost(g).ok);return g;
}

test('真实森林长途搜索不再为每个碰撞采样等待一帧额度',t=>{
 const g=scene(),body={...g.player,mapId:g.mapId,livingCollision:true},goal=worldNavigationObjective(g).site,index=new SpatialGrid(g.trees);
 const search=createQuestRouteSearch(body,goal,index,16000);let cpu=0;
 // 固定时钟只检验算法工作量，避免机器速度或并行测试影响通过结论；真实耗时仅作诊断。
 for(let frame=0;frame<32&&!search.result;frame++){const start=performance.now();search.advance(frame,{now:()=>0});cpu+=performance.now()-start;}
 assert.ok(search.result?.reachable);assert.ok(search.steps<6000);assert.ok(search.result.visited<2600);
 for(let i=1;i<search.result.points.length;i++)assert.ok(questLineClear(search.result.points[i-1],search.result.points[i],body,index));
 t.diagnostic(JSON.stringify({cpuMs:Math.round(cpu*100)/100,slices:search.slices,steps:search.steps,visited:search.result.visited}));
});

test('直升机上下车原地继续推进路线，恢复步行后所有线段仍通过正式碰撞',()=>{
 const g=scene();assert.ok(storyRouteState(g).reachable);
 for(const change of [summonVehicle,dismountVehicle]){
  const position={x:g.player.x,y:g.player.y};assert.ok(change(g));let r;
  for(let i=0;i<1000;i++){g.time+=1/60;r=storyRouteState(g);if(r?.reachable)break;}
  assert.ok(r?.reachable);assert.deepEqual({x:g.player.x,y:g.player.y},position);
  const body=playerNavigationBody(g),index=new SpatialGrid(g.trees);
  for(let i=1;i<r.points.length;i++)assert.ok(questLineClear(r.points[i-1],r.points[i],body,index));
 }
});

test('树木变化不作废接单预计算，砍伐后继续复用已算路线',()=>{
 const g=scene();g.trees=[...g.trees,{x:700,y:900,radius:40,hp:100}];
 const first=storyRouteState(g);assert.ok(first.reachable);assert.equal(first.searchStarts,0);
 g.trees=[];g.time+=1/60;const after=storyRouteState(g);assert.deepEqual(after.points,first.points);assert.equal(after.searchStarts,0);
 assert.equal(g.player.treePass,false);
});

test('首次规划必须绕树，之后原树被砍倒或移动也不改变碰撞快照',()=>{
 const body={x:700,y:900},goal={x:950,y:900},tree={x:820,y:900,radius:32,hp:100},index=createPlayerNavigationIndex([tree]);
 assert.equal(questLineClear(body,goal,body,index),false);const before=planQuestRoute(body,goal,index);
 assert.ok(before.reachable);assert.ok(before.points.length>2);
 tree.hp=0;tree.x=3000;tree.radius=1;
 assert.equal(questLineClear(body,goal,body,index),false);assert.deepEqual(planQuestRoute(body,goal,index),before);
 assert.equal(questLineClear(body,goal,body,createPlayerNavigationIndex([tree])),true);
});

test('主线与邻里搜索期间连续树木变化不重启，完成后树干落在路线上也保留指引',()=>{
 for(const kind of ['main','living']){
  const g=scene();
  if(kind==='living'){g.progress.living.patrolActive=false;updateLivingWorld(g,.05);g.progress.living.requests['neighbors-lunch'].stage=0;g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};}
  // 两栖切换使主线开启新搜索，避免直接消费接单缓存而漏测进行中的路线。
  g.player.amphibious=true;const originalTrees=g.trees.map(t=>({...t}));
  let route=kind==='main'?storyRouteState(g):livingRouteStates(g)[0];
  for(const tree of g.trees)tree.hp=0;
  for(let frame=0;frame<1000;frame++){
   g.trees=[{x:g.player.x,y:g.player.y,radius:80,hp:100},...g.trees.slice(-5)];g.time+=1/60;
   route=kind==='main'?storyRouteState(g):livingRouteStates(g)[0];
   assert.equal(route?.searchStarts,1);if(route.reachable)break;
  }
  assert.ok(route?.reachable);const before=route.points;
  const originalIndex=new SpatialGrid(originalTrees),body=playerNavigationBody(g);
  for(let i=1;i<before.length;i++)assert.ok(questLineClear(before[i-1],before[i],body,originalIndex));
  g.trees=before.map(p=>({...p,radius:80,hp:100}));g.time+=1/60;
  const after=kind==='main'?storyRouteState(g):livingRouteStates(g)[0];
  assert.ok(after.reachable);assert.equal(after.searchStarts,1);assert.deepEqual(after.points,before);
  assert.equal(g.player.treePass,false);
 }
});

// 保留优化前的全扫描算法作为独立基准，覆盖门洞、围栏边界、大碰撞半径及世界镜像。
function originalFenceBlocked(x,y,radius){return SETTLEMENT_FENCES.some(f=>{const p=nearest({x,y},f);return f.type==='settlement-fence'&&(f.horizontal?Math.abs(p.x-f.x)<f.length/2+radius&&Math.abs(p.y-f.y)<radius+5:Math.abs(p.y-f.y)<f.length/2+radius&&Math.abs(p.x-f.x)<radius+5);});}

test('围栏空间索引与原全扫描在边界和周期镜像下完全一致',()=>{
 for(const f of SETTLEMENT_FENCES)for(const radius of [0,12,48,140])for(const dx of [-f.length/2-radius-.01,0,f.length/2+radius-.01])for(const dy of [-radius-5,0,radius+4.99])for(const mirror of [-1,0,1]){
  const x=f.x+(f.horizontal?dx:dy)+mirror*WORLD.width,y=f.y+(f.horizontal?dy:dx)-mirror*WORLD.height;
  assert.equal(settlementBlocked(x,y,radius),originalFenceBlocked(x,y,radius),JSON.stringify({x,y,radius}));
 }
});

test('设施列表保留低矮底座与装饰排除，房屋改用完整墙体及周期坐标',()=>{
 const facilities=[FARM_SEED_SHOP,...Object.values(LIVING_PLACES)];
 for(const s of facilities)for(const radius of [0,12,48])for(const dx of [-s.width/2-radius,0,s.width/2+radius-.01])for(const dy of [-19-radius,-18.99-radius,0,5+radius])for(const mirror of [-1,0,1]){
  const x=s.x+dx+mirror*WORLD.width,y=s.y+dy-mirror*WORLD.height,p=canonical({x,y});
  const expected=worldBuildingBlocked(x,y,radius,{mapId:'forest'})||Object.values(LIVING_PLACES).some(f=>!['flowers','basket','warning','relay','kitchen','market'].includes(f.kind)&&Math.abs(p.x-f.x)<f.width/2+radius&&p.y>f.y-19-radius&&p.y<f.y+5+radius);
  assert.equal(livingFacilityBlocked(x,y,radius),expected);
 }
});
