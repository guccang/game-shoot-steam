// 驿站覆盖真实避障、跨边界、暂停接管与存档，不用传送模拟抵达。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {normalizeWaystations,randomWaystationName} from '../src/progression/navigation/waystations.js';
import {buildWaystation,removeWaystation,travelToWaystation,updateWaystationTravel,waystationBuildReason} from '../src/core/navigation/waystations.js';
import {WAYSTATION_PURPOSES} from '../src/config/waystations.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {NATURAL_TERRAIN} from '../src/world/natural-terrain.js';
import {questLineClear,createQuestRouteSearch} from '../src/physics/quest-route.js';
import {playerNavigationBody,createPlayerNavigationIndex} from '../src/core/navigation/prepared-navigation.js';
import {createVisualRouteSession,advanceVisualRouteSession} from '../src/core/navigation/visual-route-cache.js';
import {farmLandReason} from '../src/world/farm-land.js';

// 在正式世界中找一条有足够宽度的测试通道，避免假造无地形的物理环境。
function fixture(){
 const g={progress:freshProgress(),player:{x:0,y:0,hp:120,vx:0,vy:0},mapId:'forest',state:'playing',trees:[],vehicle:{active:false}};
 for(let y=9000;y<13000;y+=180)for(let x=15000;x<20000;x+=180){Object.assign(g.player,{x,y});const body=playerNavigationBody(g);if(!blocked(x,y,70,[],body)&&questLineClear({x,y},{x:x+420,y}, {...body,navigationRadius:70},[]))return g;}
 throw Error('测试通道缺失');
}
// 按正式运动扫掠前进，并检查每一步不穿过树木或地形。
function advance(g,limit=1800){let steps=0;while(g.waystationTravel&&steps++<limit){const input=updateWaystationTravel(g,.05,{x:0,y:0});moveBody(g.player,input.x*7,input.y*7,WORLD,12,g.trees);assert.equal(blocked(g.player.x,g.player.y,12,g.trees,playerNavigationBody(g)),false);}return steps;}
test('当前位置建站、阻止重叠、读档保留名称坐标，旧档默认空列表',()=>{
 const g=fixture(),a=buildWaystation(g,'林缘');assert.ok(a.ok);assert.equal(a.site.x,g.player.x);assert.equal(buildWaystation(g).ok,false);
 assert.match(farmLandReason(g,{x:g.player.x,y:g.player.y,mapId:'forest'}),/驿站/);
 g.player.x+=220;assert.ok(buildWaystation(g).ok);const p=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.deepEqual(p.waystations,g.progress.waystations);assert.equal(normalizeWaystations(null).sites.length,0);
 const clean=normalizeWaystations({sites:[a.site,a.site,{id:4,x:NaN,y:0},{id:5,x:-5,y:-8,name:'  '}]});assert.equal(clean.sites.length,2);assert.equal(clean.sites[1].x,WORLD.width-5);assert.equal(clean.sites[1].name,'晴叶营地');
});
test('湖水、树干、室内与飞行禁止建站，失败不新增记录',()=>{
 const g=fixture(),lake=NATURAL_TERRAIN.lakes[0];Object.assign(g.player,lake);assert.ok(waystationBuildReason(g));assert.equal(buildWaystation(g).ok,false);assert.equal(g.progress.waystations.sites.length,0);
 const h=fixture();h.trees=[{x:h.player.x,y:h.player.y,radius:20,hp:100}];assert.equal(buildWaystation(h).ok,false);h.trees=[];h.player.flying=true;assert.equal(buildWaystation(h).ok,false);h.player.flying=false;h.cottage={};assert.equal(buildWaystation(h).ok,false);
 const farm=fixture();farm.progress.farm.plots=[{id:'test',mapId:'forest',x:farm.player.x,y:farm.player.y-40}];assert.equal(buildWaystation(farm).ok,false);
});
test('两站间真实行进绕过树木，抵达后停稳，无瞬移或穿透',()=>{
 const g=fixture(),start={...g.player};buildWaystation(g,'出发站');g.player.x+=360;const destination=buildWaystation(g,'终点站').site;Object.assign(g.player,start);
 g.trees=[{x:start.x+180,y:start.y,radius:38,hp:100}];assert.ok(travelToWaystation(g,destination.id).ok);const steps=advance(g);assert.ok(steps>40);assert.equal(g.waystationTravel,null);assert.ok(worldDistance(g.player,destination)<=14);assert.match(g.waystationMessage,/已到达/);assert.equal(g.player.vx,0);
});
test('暂停冻结、方向输入立即接管，跨场景或角色变化撤销行程',()=>{
 const g=fixture();buildWaystation(g);g.player.x+=240;assert.ok(travelToWaystation(g,1).ok);g.state='paused';const trip=g.waystationTravel;for(let i=0;i<10;i++)updateWaystationTravel(g,.05,{x:0,y:0});assert.equal(trip.frame,0);assert.equal(trip.elapsed,0);
 g.state='playing';assert.deepEqual(updateWaystationTravel(g,.05,{x:1,y:0}),{x:1,y:0});assert.equal(g.waystationTravel,null);
 travelToWaystation(g,1);g.player={...g.player};updateWaystationTravel(g,.05,{x:0,y:0});assert.equal(g.waystationTravel,null);
});
test('两栖与驾驶通行能力延续正式物理，无法到达时明确停止',()=>{
 const g=fixture(),lake=NATURAL_TERRAIN.lakes[0];g.progress.waystations.sites=[{id:1,name:'旧地点',mapId:'forest',x:lake.x,y:lake.y}];assert.ok(travelToWaystation(g,1).ok);advance(g,100);assert.equal(g.waystationTravel,null);assert.match(g.waystationMessage,/没有找到/);
 const h=fixture();buildWaystation(h);h.player.x+=200;h.vehicle={active:true,index:3,hp:300};h.progress.vehicleHulls[3]=1;h.progress.vehicleSE[3].owned=h.progress.vehicleSE[3].installed=['autopilot'];h.player.amphibious=true;travelToWaystation(h,1);advance(h);assert.match(h.waystationMessage,/已到达/);
});
test('世界边缘驿站使用最近镜像寻路，不沿长边绕世界',()=>{
 const g=fixture();g.player.flying=true;g.player.x=WORLD.width-80;g.progress.waystations.sites=[{id:1,name:'边界站',mapId:'forest',x:80,y:g.player.y}];travelToWaystation(g,1);const steps=advance(g);assert.ok(steps<200);assert.ok(worldDistance(g.player,g.progress.waystations.sites[0])<=14);
});
test('随机中文名称不重复，编号从1连续递增，读档后继续编号且名称不重抽',()=>{
 const g=fixture();g.random=()=>.25;const a=buildWaystation(g).site;g.player.x+=180;const b=buildWaystation(g).site;
 assert.equal(a.id,1);assert.equal(b.id,2);assert.notEqual(a.name,b.name);assert.equal(/\d/.test(a.name),false);
 g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.equal(g.progress.waystations.sites[0].name,a.name);g.player.x+=180;const c=buildWaystation(g).site;assert.equal(c.id,3);
 assert.notEqual(randomWaystationName([],()=>0),randomWaystationName([],()=>.5));
 const sites=[];for(let i=0;i<32;i++)sites.push({name:randomWaystationName(sites,()=>0)});assert.equal(new Set(sites.map(s=>s.name)).size,32);
});

test('每种驿站用途可创建和读档，旧档与未知用途归通用，名称编号保留',()=>{
 for(const purpose of WAYSTATION_PURPOSES){const g=fixture(),site=buildWaystation(g,{purpose:purpose.id}).site;assert.equal(site.purpose,purpose.id);assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(g.progress))).waystations,g.progress.waystations);}
 const old={id:8,name:'旧林间站',x:100,y:200};
 const normalized=normalizeWaystations({nextId:12,sites:[old,{...old,id:9,purpose:'unknown'},{...old,id:10,purpose:'fishing'}]});
 assert.deepEqual(normalized.sites.map(s=>s.purpose),['general','general','fishing']);assert.equal(normalized.sites[0].name,old.name);assert.equal(normalized.nextId,12);
});

test('手机远程移除驿站保留其他站和后续编号，可读档且不能重复移除',()=>{
 const g=fixture(),a=buildWaystation(g,{purpose:'farm'}).site;g.player.x+=220;const b=buildWaystation(g,{purpose:'camp'}).site;
 const count=g.progress.waystations.nextId;g.state='paused';g.cottage={kind:'mine'};let saves=0;
 assert.ok(removeWaystation(g,a.id,()=>{saves++;return true;}).ok);assert.deepEqual(g.progress.waystations.sites,[b]);assert.equal(g.progress.waystations.nextId,count);assert.equal(saves,1);
 assert.equal(removeWaystation(g,a.id,()=>{saves++;return true;}).ok,false);assert.equal(saves,1);assert.deepEqual(normalizeWaystations(g.progress.waystations),g.progress.waystations);
 g.cottage=null;g.state='playing';g.player.x+=220;assert.equal(buildWaystation(g).site.id,count);
});

test('移除目的地仅在保存成功后终止行程，失败或异常不影响站点和惯性',()=>{
 for(const save of [()=>false,()=>{throw Error('磁盘错误');}]){
  const g=fixture(),site=buildWaystation(g).site;g.player.x+=240;travelToWaystation(g,site.id);g.player.vx=17;g.player.vy=9;
  const stations=g.progress.waystations,trip=g.waystationTravel;assert.equal(removeWaystation(g,site.id,save).ok,false);assert.equal(g.progress.waystations,stations);assert.equal(g.waystationTravel,trip);assert.equal(g.player.vx,17);assert.equal(g.player.vy,9);
  assert.ok(removeWaystation(g,site.id,()=>true).ok);assert.equal(g.waystationTravel,null);assert.equal(g.player.vx,0);assert.equal(g.player.vy,0);assert.match(g.waystationMessage,/目的驿站已移除/);
 }
});

test('移除其他站不打断当前行程，死亡或无效状态不得移除',()=>{
 const g=fixture(),a=buildWaystation(g).site;g.player.x+=240;const b=buildWaystation(g).site;g.player.x+=240;travelToWaystation(g,a.id);const trip=g.waystationTravel;
 assert.ok(removeWaystation(g,b.id).ok);assert.equal(g.waystationTravel,trip);
 for(const reason of ['dead','state']){if(reason==='dead')g.player.hp=0;else{g.player.hp=120;g.state='lost';}const before=structuredClone(g.progress.waystations);assert.equal(removeWaystation(g,a.id).ok,false);assert.deepEqual(g.progress.waystations,before);}
});
test('长途稀疏网格依然逐段检查树木，不能以较大步长穿过障碍',()=>{
 const g=fixture(),body=playerNavigationBody(g),goal={x:g.player.x+400,y:g.player.y};g.trees=[{x:g.player.x+190,y:g.player.y,radius:38,hp:100}];
 const search=createQuestRouteSearch(body,goal,g.trees,10000,{step:96});let route;
 for(let frame=0;frame<1000&&!route;frame++)route=search.advance(frame,{now:()=>0,steps:100});
 assert.ok(route.reachable);assert.ok(route.points.length>2);for(let i=1;i<route.points.length;i++)assert.ok(questLineClear(route.points[i-1],route.points[i],body,g.trees));
});

// 驿站与任务缓存接受相同起点、目标和树快照时，必须输出同一条细网格路线。
test('驿站直接复用任务路线会话和单帧工作上限',()=>{
 const g=fixture(),start={...g.player},goal={x:start.x+360,y:start.y};g.trees=[{x:start.x+180,y:start.y,radius:38,hp:100}];g.progress.waystations.sites=[{id:1,name:'目标站',mapId:'forest',...goal}];travelToWaystation(g,1);
 const body=playerNavigationBody(g),task=createVisualRouteSession(body,goal,createPlayerNavigationIndex(g.trees),0);let route;
 for(let i=1;i<1500;i++){
  const prior=g.waystationTravel.session?.search.steps||0;updateWaystationTravel(g,1/60,{x:0,y:0});const trip=g.waystationTravel;
  assert.ok(trip.session.search.steps-prior<=256);route=advanceVisualRouteSession(task,body,i/60);
  if(trip.phase==='moving'&&route.reachable)break;
 }
 assert.equal(g.waystationTravel.phase,'moving');assert.ok(route.reachable);assert.deepEqual(g.waystationTravel.session.search.result.points,task.search.result.points);
 assert.equal(g.waystationTravel.step,undefined);assert.equal(g.waystationTravel.session.searchStarts,1);
});

// 经过短路点不再把输入幅度降到零；仅终点前七十单位开始减速。
test('连续路点保持行进速度，远处树木与停车变化不反复重算',()=>{
 const g=fixture(),start={...g.player},goal={x:start.x+400,y:start.y};g.progress.waystations.sites=[{id:1,name:'终点站',mapId:'forest',...goal}];travelToWaystation(g,1);
 let moving=0,session;
 for(let i=0;i<300&&g.waystationTravel;i++){
  const distance=worldDistance(g.player,goal),input=updateWaystationTravel(g,.05,{x:0,y:0}),trip=g.waystationTravel;if(!trip)break;
  if(trip.phase==='moving'){
   session??=trip.session;assert.equal(trip.session,session);assert.equal(session.searchStarts,1);
   if(distance>70){assert.ok(Math.abs(Math.hypot(input.x,input.y)-1)<1e-9);moving++;}
   g.trees=[{x:start.x+180,y:start.y+450,radius:30,hp:i%2?100:0}];g.player.parkingBarriers=[{x:start.x+250,y:start.y+500,width:72,height:60}];
  }
  moveBody(g.player,input.x*7,input.y*7,WORLD,12,g.trees);
 }
 assert.ok(moving>30);assert.equal(g.waystationTravel,null);assert.match(g.waystationMessage,/已到达/);
});

// 原路线只对静态树快照负责，自动行进还须在眼前新障碍出现时安全停下重规划。
test('眼前新长出的树触发一次重规划，仍以真实碰撞绕行抵达',()=>{
 const g=fixture(),start={...g.player},goal={x:start.x+400,y:start.y};g.progress.waystations.sites=[{id:1,name:'终点站',mapId:'forest',...goal}];travelToWaystation(g,1);
 for(let i=0;i<100&&g.waystationTravel.phase!=='moving';i++)updateWaystationTravel(g,.05,{x:0,y:0});
 const trip=g.waystationTravel;g.trees=[{x:start.x+110,y:start.y,radius:24,hp:100}];advance(g);
 assert.equal(g.waystationTravel,null);assert.match(g.waystationMessage,/已到达/);assert.equal(trip.retries,1);
});

// 已得到路线不等于车辆实际行驶，静止状态必须能从导航状态中区分。
test('气垫船起步状态以实际位移为准，零位移不显示已移动',()=>{
 const g=fixture();g.vehicle={active:true,index:3,hp:300};g.progress.vehicleHulls[3]=1;g.progress.vehicleSE[3].owned=g.progress.vehicleSE[3].installed=['autopilot'];g.player.amphibious=true;buildWaystation(g);g.player.x+=240;assert.ok(travelToWaystation(g,1).ok);
 for(let i=0;i<100&&g.waystationTravel.phase==='planning';i++)updateWaystationTravel(g,.04,{x:0,y:0});
 assert.equal(g.waystationTravel.phase,'moving');assert.equal(g.waystationTravel.moving,false);
 const input=updateWaystationTravel(g,.04,{x:0,y:0});moveBody(g.player,input.x*7,input.y*7,WORLD,12,g.trees);updateWaystationTravel(g,.04,{x:0,y:0});assert.equal(g.waystationTravel.moving,true);
});

// 正式驾驶限制在出发前及途中均生效，禁止反复重算路线掩盖不能开动的车辆。
test('气垫船满载、发动机损坏和牵引不足明确提示，恢复后可重新出发',()=>{
 const g=fixture();g.vehicle={active:true,index:3,hp:300};g.progress.vehicleHulls[3]=1;g.progress.vehicleSE[3].owned=g.progress.vehicleSE[3].installed=['autopilot'];g.player.amphibious=true;buildWaystation(g);g.player.x+=240;
 g.progress.logistics.builds[3].wood=1e8;assert.match(travelToWaystation(g,1).message,/载荷已满/);assert.equal(g.waystationTravel,undefined);
 g.progress.logistics.builds[3].wood=0;g.progress.supplies.engineFaults[3]=100;assert.match(travelToWaystation(g,1).message,/发动机/);
 g.progress.supplies.engineFaults[3]=0;g.progress.logistics.tow={tractor:3,target:1};assert.match(travelToWaystation(g,1).message,/牵引/);
 g.progress.logistics.tow=null;assert.ok(travelToWaystation(g,1).ok);g.progress.supplies.engineFaults[3]=100;assert.deepEqual(updateWaystationTravel(g,.04,{x:0,y:0}),{x:0,y:0});assert.equal(g.waystationTravel,null);assert.match(g.waystationMessage,/发动机/);
 g.progress.supplies.engineFaults[3]=0;assert.ok(travelToWaystation(g,1).ok);advance(g);assert.match(g.waystationMessage,/已到达/);
});
test('坦克在晴叶西门贴近门柱时能绕进门洞并抵达驿站',async()=>{
 const {campBoundary}=await import('../src/world/camp-boundary.js');
 const {driveBody}=await import('../src/physics/motion.js');
 const g=fixture(),gate=campBoundary(g.progress).gates.find(g=>g.side==='left');
 g.vehicle={active:true,index:1,hp:300};g.progress.vehicleHulls[1]=1;
 g.progress.vehicleSE[1].owned=g.progress.vehicleSE[1].installed=['autopilot'];
 Object.assign(g.player,{mapId:'forest',campProgress:g.progress,fenceVehicle:g.vehicle,x:gate.x-28,y:gate.y-152});
 const goal={id:1,name:'晴叶营地',mapId:'forest',x:gate.x+110,y:gate.y-205};
 g.progress.waystations.sites=[goal];
 assert.ok(travelToWaystation(g,1).ok);
 for(let i=0;i<1200&&g.waystationTravel;i++){
  const input=updateWaystationTravel(g,.035,{x:0,y:0});
  driveBody(g.player,input,155,.035,WORLD,g.trees);
 }
 assert.match(g.waystationMessage,/已到达/);
});
