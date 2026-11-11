// 扩图后的公里级路线使用真实森林、建筑和运动碰撞，限制搜索工作量而非机器耗时。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {playerNavigationBody,createPlayerNavigationIndex} from '../src/core/navigation/prepared-navigation.js';
import {createQuestRouteSearch,questLineClear} from '../src/physics/quest-route.js';
import {travelToWaystation,updateWaystationTravel} from '../src/core/navigation/waystations.js';
import {driveBody} from '../src/physics/motion.js';
import {WORLD,nearest,worldDistance} from '../src/world/coordinates.js';
import {WORLD_BUILDINGS} from '../src/config/world-buildings.js';
import {worldBuildingBlocked} from '../src/world/building-collision.js';
import {vehicleSpeed} from '../src/config/vehicles.js';
import {HEROES} from '../src/config/heroes.js';
import {movementLoadFactor} from '../src/progression/inventory/load-weight.js';
import {createVisualRouteSession,advanceVisualRouteSession} from '../src/core/navigation/visual-route-cache.js';
// 固定森林树木种子，避免用空地图验证远程导航。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[3]=1;p.vehicleIndex=3;const g=new Game(p,()=>.5);g.start();Object.assign(g.player,{x:3320,y:3000});return g;}

test('步行和气垫船的远程路线在任务预算内完成，所有短边通过正式碰撞',()=>{
 const g=scene(),index=createPlayerNavigationIndex(g.trees);
 for(const amphibious of [false,true])for(const goal of [{x:18000,y:11000},{x:23000,y:16000},{x:45000,y:33000}]){
  const body={...playerNavigationBody(g),amphibious},search=createQuestRouteSearch(body,goal,index,16000);
  for(let frame=0;frame<32&&!search.result;frame++)search.advance(frame,{now:()=>0});
  assert.equal(search.result?.reachable,true,JSON.stringify({amphibious,goal}));assert.ok(search.result.visited<3000);assert.ok(search.steps<8000);
  for(let i=1;i<search.result.points.length;i++){const a=search.result.points[i-1],b=search.result.points[i];assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<=64.001);assert.ok(questLineClear(a,b,body,index));}
 }
});

test('原先超时的1672米驿站路线能起步并真实驾驶抵达',()=>{
 const g=scene();g.vehicle=g.vehicles[3];g.summonVehicle();g.progress.vehicleSE[3].owned=g.progress.vehicleSE[3].installed=['autopilot'];Object.assign(g.player,{x:3320,y:3000,vx:0,vy:0});const goal={id:1,name:'远山驿站',x:18000,y:11000,mapId:'forest'};g.progress.waystations.sites=[goal];assert.equal(travelToWaystation(g,1).ok,true);let moving=false;
 for(let frame=0;frame<5000&&g.waystationTravel;frame++){
  const input=updateWaystationTravel(g,.04,{x:0,y:0});moving ||= !!g.waystationTravel?.moving;
  driveBody(g.player,input,HEROES[g.progress.hero].speed*vehicleSpeed(g.loadout,3)*movementLoadFactor(g),.04,WORLD,g.trees);
 }
 assert.ok(moving);assert.equal(g.waystationTravel,null);assert.match(g.waystationMessage,/已到达/);assert.ok(worldDistance(g.player,goal)<=14);
});

test('远地建筑空间查询保留原矩形墙体判定，包括宽半径和周期镜像',()=>{
 // 独立的原全扫描作为对照，碰撞边界前后都取样，不能只验证建筑中心。
 const original=(x,y,radius)=>WORLD_BUILDINGS.some(b=>{const p=nearest({x,y},b);return b.rects.some(([l,t,r,d])=>p.x-b.x>l-radius&&p.x-b.x<r+radius&&p.y-b.y>t-radius&&p.y-b.y<d+radius);});
 for(const b of WORLD_BUILDINGS)for(const [l,t,r,d]of b.rects)for(const radius of [0,12,64,300])for(const shift of [-1,0,1])for(const dx of [l-radius-.01,l-radius+.01,(l+r)/2,r+radius-.01,r+radius+.01])for(const dy of [t-radius-.01,t-radius+.01,(t+d)/2,d+radius-.01,d+radius+.01]){
  const x=b.x+dx+shift*WORLD.width,y=b.y+dy-shift*WORLD.height;
  assert.equal(worldBuildingBlocked(x,y,radius,{mapId:'forest',legendaryBuilding:true}),original(x,y,radius));
 }
});

test('规划期间停车变化不丢弃进度，但发布前必须绕开新增车体',()=>{
 for(const obstructs of [false,true]){
  const body={x:5000,y:5000,arena:{x:6000,y:5000,radius:3000}},goal={x:7000,y:5000},session=createVisualRouteSession(body,goal,createPlayerNavigationIndex([]),0);
  // 用一批生成器推进确定进入搜索，再模拟新访客出现，避免依赖机器帧耗时。
  session.search.advance(-1,{steps:1,now:()=>0});body.parkingBarriers=[{x:6000,y:obstructs?5000:6000,width:72,height:60}];let route;
  for(let frame=1;frame<2000;frame++){route=advanceVisualRouteSession(session,body,frame*.04);if(route.reachable&&!route.planning)break;}
  assert.equal(route.reachable,true);assert.equal(session.searchStarts,obstructs?2:1);
  for(let i=1;i<route.points.length;i++)assert.ok(questLineClear(route.points[i-1],route.points[i],body,[]));
 }
});
