// 点格作业与返车使用真实事务、路径及物理；覆盖玩家接管和失败时的边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatCamera} from '../src/rendering/camera.js';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {setFarmTool,queueAdvancedFarm,updateFarmWork,liftOxPlow,oxRigClear} from '../src/core/farming/farm.js';
import {farmLandReason} from '../src/world/farm-land.js';
import {enterFarmVehicle,restoreFarmVehicle} from '../src/core/farming/farm-vehicle.js';
import {updateSceneApproach} from '../src/core/navigation/scene-approach.js';
import {updateVehicleBoarding,VEHICLE_BOARDING} from '../src/core/vehicles/vehicle-boarding.js';
import {driveBody} from '../src/physics/motion.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';

// 隔离随机战斗，保留正式世界、停车、农田和存档事务。
function scene(){
 const p=freshProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.farm.lessonRewarded=true;p.farm.wildMaps=['forest','jiuzhaigou'];p.materials.reaperKit=1;p.farm.oxPlow=true;
 const g=new Game(p,()=>.4);g.state='playing';g.vehicle.active=false;g.trees=[];g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.livingPersist=()=>true;
 Object.assign(g.player,{x:657,y:2762});return g;
}
// 不移动存档坐标，逐帧通过正式物理到达目标。
function tick(g,mode='farm'){
 const input=mode==='farm'?updateFarmWork(g,.04,{x:0,y:0}):updateSceneApproach(g,.04,{x:0,y:0});
 if(mode==='return')updateVehicleBoarding(g,.04);
 driveBody(g.player,input,140,.04,WORLD,g.trees);
}
// 三格田中点未成熟也能选行；横向和纵向都保护其余田行。
test('点任意田格自动走近并完成整行／列，松手无需重复启动',()=>{
 for(const axis of ['row','column']){
  const g=scene();g.progress.farm.axis=axis;
  g.progress.farm.plots=Array.from({length:4},(_,id)=>({id,mapId:'forest',x:700+(axis==='row'?56*Math.min(id,2):id===3?56:0),y:2752+(axis==='column'?52*Math.min(id,2):id===3?52:0),crop:0,plantedAt:id===1?Date.now():1,readyAt:id===1?Date.now()+999999:2}));g.progress.farm.nextId=4;
  setFarmTool(g,'reaper');assert.ok(queueAdvancedFarm(g,{plot:1}).ok);assert.equal(g.progress.farm.harvested,0);
  for(let i=0;i<800&&g.farmWork.reaper.held;i++)tick(g);
  assert.equal(g.progress.farm.harvested,2);assert.equal(g.farmWork.reaper.held,false);assert.equal(g.progress.farm.plots[1].crop,0);assert.equal(g.progress.farm.plots[3].crop,0);
 }
});
// 耕牛选中格是第一格，自动连续开田在障碍边界停止，摇杆接管不再追加田块。
test('点格犁地按行列开垦、保护已有作物，边界与手动停止有效',()=>{
 for(const axis of ['row','column']){
  const g=scene();g.progress.farm.axis=axis;let target;
  outer:for(let y=800;y<1300;y+=52)for(let x=1400;x<2300;x+=56){
   const points=Array.from({length:4},(_,i)=>({x:x+(axis==='row'?i*56:0),y:y+(axis==='column'?i*52:0),mapId:g.mapId}));
   if(points.every(p=>!farmLandReason(g,p)&&oxRigClear(g,p,0))){target=points;break outer;}
  }
  assert.ok(target);Object.assign(g.player,target[0]);setFarmTool(g,'ox');g.farmWork.ox={phase:0,facing:1,yaw:axis==='column'?Math.PI/2:0,held:false};
  g.progress.farm.plots=[{...target[1],id:0,crop:0,plantedAt:1,readyAt:2}];g.progress.farm.nextId=1;
  g.trees=[{...target[3],radius:12,hp:100}];
  assert.ok(queueAdvancedFarm(g,{point:target[0]}).ok);
  for(let i=0;i<800&&g.farmWork.ox.auto;i++)tick(g);
  assert.equal(g.farmWork.ox.auto,null);assert.equal(g.progress.farm.plots.length,3);assert.equal(g.progress.farm.plots.find(p=>p.id===0).crop,0);
  Object.assign(g.player,target[0]);g.progress.farm.plots=[];assert.ok(queueAdvancedFarm(g,{point:target[0]}).ok);
  updateFarmWork(g,.04,{x:.5,y:0});assert.equal(g.farmWork.ox.auto,null);const count=g.progress.farm.dug;
  for(let i=0;i<30;i++)tick(g);assert.equal(g.progress.farm.dug,count);liftOxPlow(g);
 }
});
// 失败事务不会继续自动扩田；不把保存失败解释为已完成。
test('自动开田保存失败后停车，未保存的格子与库存保持原样',()=>{
 const g=scene();Object.assign(g.player,{x:1460,y:1110});setFarmTool(g,'ox');g.farmWork.ox={phase:0,facing:1,yaw:0};
 assert.ok(queueAdvancedFarm(g,{point:g.player}).ok);g.livingPersist=()=>false;tick(g);
 assert.equal(g.progress.farm.dug,0);assert.equal(g.farmWork.ox.auto,null);assert.equal(g.farmWork.result.ok,false);
});
// 两张地图返车都须步行、接近后等足一秒；同车损伤与手动取消行为保持。
test('退出后先步行再候停上车，支持两张地图与手动取消',()=>{
 for(const mapId of ['forest','jiuzhaigou']){
  const g=scene();g.mapId=mapId;g.player.mapId=mapId;Object.assign(g.player,mapId==='forest'?{x:900,y:750}:{x:1400,y:1500});g.progress.vehicleHulls[0]=1;assert.ok(g.summonVehicle());g.vehicle.hp=73;
  assert.ok(enterFarmVehicle(g).dismounted);setFarmTool(g,'hoe');Object.assign(g.player,mapId==='forest'?{x:1200,y:750}:{x:1400,y:1800});setFarmTool(g,null);
  const before={x:g.player.x,y:g.player.y};assert.ok(restoreFarmVehicle(g));assert.equal(worldDistance(g.player,before),0);assert.equal(g.vehicle.active,false);
  for(let i=0;i<600&&g.sceneApproach;i++){tick(g,'return');assert.equal(g.vehicle.active,false);}
  assert.equal(g.sceneApproach,null);assert.ok(worldDistance(g.player,before)>100);assert.ok(g.vehicleBoarding);
  for(let i=0;i<VEHICLE_BOARDING.wait/.04-1;i++)tick(g,'return');assert.equal(g.vehicle.active,false);
  tick(g,'return');assert.equal(g.vehicle.active,true);assert.equal(g.vehicle.hp,73);
  assert.ok(enterFarmVehicle(g).dismounted);setFarmTool(g,null);assert.ok(restoreFarmVehicle(g));updateSceneApproach(g,.04,{x:1,y:0});assert.equal(g.sceneApproach,null);
 }
});

// 渲染位置先停在旧帧、再插值到座位，镜头不能反向跳动；减少动态同样保持连续取景。
test('登乘镜头兼容插值与减少动态，每帧缓动且最终跟随座位',()=>{
 for(const reduced of [false,true]){
  const camera=new CombatCamera(),p={x:1400,y:855},before=camera.update(p,390,844,null,1,reduced);
  camera.boardingAnchor={...p,to:{x:1400,y:800},body:{x:1400,y:800},elapsed:0};let last=before;
  for(let i=1;i<=80;i++){
   p.y=855-55*Math.min(1,Math.max(0,i-2)/3);
   const next=camera.update(p,390,844,null,1+i*.04,reduced);
   assert.ok(Math.hypot(next.x-last.x,next.y-last.y)<6);last=next;
  }
  assert.equal(camera.boardingAnchor,null);assert.ok(Math.abs(last.y-(before.y-55))<.5);
  const driving=new CombatCamera(),driver={x:1400,y:855};let previous=driving.update(driver,390,844,null,1,reduced);driving.boardingAnchor={...driver,to:{x:1400,y:800},body:driver,elapsed:0};
  for(let i=1;i<=30;i++){driver.y=800+i*.04*220;const current=driving.update(driver,390,844,null,1+i*.04,reduced);assert.ok(Math.abs(current.y-previous.y)<15);previous=current;}
  assert.equal(driving.boardingAnchor,null);

 }
});
// 自动高级农具迎敌保留计划，威胁结束后重新寻路；主动摇杆仍取消作业。
test('高级农具迎敌冻结计划，解除警戒后续作，摇杆可取消推镰',()=>{
 for(const tool of ['ox','reaper']){
  const g=scene();g.progress.weapon=0;Object.assign(g.player,{x:1400,y:800});
  if(tool==='reaper'){g.progress.farm.plots=Array.from({length:3},(_,id)=>({id,mapId:'forest',x:1456+56*id,y:800,crop:0,plantedAt:1,readyAt:2}));g.progress.farm.nextId=3;}
  setFarmTool(g,tool);if(tool==='ox')g.farmWork.ox={phase:0,facing:1,yaw:0,held:false};
  assert.ok(queueAdvancedFarm(g,tool==='ox'?{point:{x:1456,y:800}}:{plot:1}).ok);
  const work=g.farmWork,plan=work.ox?.auto||work.reaper.line;
  const enemy={id:901,type:'enemy',hp:100,radius:12,x:1420,y:800};g.enemies=[enemy];g.combatSight=new WeakMap([[enemy,enemy.id]]);
  updateFarmWork(g,.04,{x:0,y:0});assert.equal(work.autoCombat,true);assert.equal(work.ox?.auto||work.reaper.line,plan);assert.equal(g.progress.farm.harvested,0);assert.equal(g.progress.farm.dug,0);
  g.enemies=[];for(let i=0;i<28;i++)updateFarmWork(g,.04,{x:0,y:0});assert.equal(work.autoCombat,false);assert.equal(work.ox?.auto||work.reaper.line,plan);
  updateFarmWork(g,.04,{x:.5,y:0});assert.ok(!work.ox?.auto&&!work.reaper?.auto);
 }
});
