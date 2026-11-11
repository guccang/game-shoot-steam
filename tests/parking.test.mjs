import {TOWN_SHIFT_X} from '../src/config/town-layout.js';
// 自动停车专项：真实Game逐帧运行，验证点击发起、碰撞、动作、取消和单次工坊通知。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {PARKING as C,PARKING_SPOTS} from '../src/config/parking.js';
import {requestParking,parkingPathClear,parkingAvailable,nearestParkingSpot} from '../src/core/vehicles/parking.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {PATHS,pathDistance} from '../src/world/paths.js';
import {blocked} from '../src/physics/motion.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';

// 测试夹具只提供已拥有载具与完成主线的存档，移动及入库仍走正式更新。
function setup(id='garage',hull=0){
 const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.vehicleHulls.fill(0);p.vehicleHulls[hull]=1;p.vehicleIndex=hull;
 const events=[],g=new Game(p,()=>.4,(type,data)=>events.push({type,...data}));g.state='playing';g.summonVehicle();
 const spot=PARKING_SPOTS.find(s=>s.id===id);Object.assign(g.player,{x:spot.x,y:spot.approachY,vx:0,vy:0});
 return {g,spot,events};
}
// 固定正式上限步长，无跳过计时、移动或入位事件。
function tick(g,frames,input){for(let i=0;i<frames;i++)g.update(.05,input);}

test('所有自有车型到空位都显示停车入口，未拥有的车不能占位',()=>{
 const {g}=setup('north-0-1');
 g.parkingVisitors=[];g.progress.campParking.owned=[];
 for(const [hull,model] of COLLECTED_VEHICLES.entries()){
  g.vehicle=g.vehicles[hull];g.vehicle.active=true;g.progress.vehicleHulls[hull]=1;
  assert.equal(nearbyInteraction(g)?.id,'parking-north-0-1',model.name);
  g.progress.vehicleHulls[hull]=0;
  assert.equal(requestParking(g),false,model.name);
  g.vehicle.active=false;
 }
});

test('静止十秒不倒车，点击立即启动，暂停与连点不重复发起',()=>{
 const {g}=setup();tick(g,200);assert.equal(g.parking.phase,'waiting');assert.equal(g.parking.elapsed,0);
 g.pause();assert.equal(requestParking(g),false);g.start();assert.ok(requestParking(g));
 assert.ok(['align','reverse'].includes(g.parking.phase));assert.equal(requestParking(g),false);
});
test('三栋房屋各有专属车位，北门十二个公共位均可连续倒入且不重复开工坊',()=>{
 assert.equal(PARKING_SPOTS.filter(s=>s.number).length,12);
 for(const building of ['garage','weapons','cottage'])assert.ok(PARKING_SPOTS.filter(s=>s.building===building).length>=1&&PARKING_SPOTS.filter(s=>s.building===building).length<=3);
 for(const spot of PARKING_SPOTS){
  if(!spot.indoor)for(const dx of [-48,48])for(const dy of [-48,38])assert.ok(pathDistance(spot.x+dx,spot.y+dy)>30,'露天泊位退出主路');
  const {g,events}=setup(spot.id);g.player.x+=24;g.vehicle.hp*=.7;
  const hp=g.vehicle.hp,ammo=g.vehicle.module?.magazine.ammo,wheel=g.vehicle.wheelPhase;
  assert.ok(parkingPathClear(g,[{x:g.player.x,y:spot.approachY},{x:spot.x,y:spot.approachY},spot]));
  assert.ok(requestParking(g));let reverse=false;
  for(let i=0;i<300&&g.parking?.phase!=='parked';i++){const before={...g.player},phase=g.parking?.phase;g.update(.05);
   if(['align','reverse'].includes(phase)&&g.parking?.phase!=='parked'){assert.ok(worldDistance(before,g.player)<=C.speed*.05+.00001);if(g.player.y<before.y)reverse=true;}
  }
  assert.equal(g.parking.phase,'parked');assert.equal(g.vehicle.active,false);assert.equal(g.progress.campParking.owned.at(-1).spot,spot.id);assert.ok(reverse);
  assert.notEqual(g.vehicle.wheelPhase,wheel);assert.equal(g.vehicle.hp,hp);assert.equal(g.vehicle.module?.magazine.ammo,ammo);
  const parked=events.filter(e=>e.type==='vehicle-parked');assert.equal(parked.length,1);assert.equal(parked[0].kind,spot.kind);
  tick(g,150);assert.equal(events.filter(e=>e.type==='vehicle-parked').length,1);assert.equal(g.vehicle.module?.magazine.ammo,ammo);
 }
});
test('倒车可中止，离开区域后重新停车；暂停恢复不跳坐标',()=>{
 const {g,spot}=setup();requestParking(g);tick(g,15);const before={...g.player},wheel=g.vehicle.wheelPhase;
 g.pause();tick(g,60);assert.equal(worldDistance(before,g.player),0);assert.equal(g.vehicle.wheelPhase,wheel);g.start();
 g.update(.05,{x:1,y:0});assert.equal(g.parking.phase,'cancelled');tick(g,80);assert.equal(g.parking.phase,'cancelled');
 Object.assign(g.player,{x:spot.x+220,y:spot.approachY,vx:0,vy:0});g.update(.05);assert.equal(g.parking,null);
 Object.assign(g.player,{x:spot.x,y:spot.approachY,vx:0,vy:0});requestParking(g);tick(g,160);assert.equal(g.progress.campParking.owned.at(-1).spot,spot.id);
});
test('路线障碍不穿越，新出现障碍不会无限倒车，特殊活动不接管',()=>{
 const {g,spot}=setup();g.addTree(spot.x,spot.y+40);const barrier=g.trees[g.trees.length-1];barrier.hp=1e9;
 assert.equal(requestParking(g),false);assert.equal(g.parking.phase,'cancelled');assert.equal(g.player.y,spot.approachY);
 barrier.hp=0;g.parking=null;requestParking(g);
 g.player.worldBarriers=[{x:spot.x,y:g.player.y-15,width:120,height:12}];tick(g,80);assert.equal(g.parking.phase,'cancelled');
 for(const field of ['story','realm','campDefense','workshopTrial','livingBattle']){
  const {g:other}=setup();other[field]={};assert.equal(parkingAvailable(other),false);
 }
});
test('重坦履带连续倒转，循环地图镜像也能回到对应门洞',()=>{
 const {g,spot}=setup('garage',1);g.player.x+=WORLD.width;g.player.y+=WORLD.height;
 requestParking(g);const phase=g.player.walkPhase;tick(g,100);
 assert.equal(g.progress.campParking.owned.at(-1).spot,spot.id);assert.notEqual(g.player.walkPhase,phase);assert.ok(g.player.walkPhase>=0);assert.equal(g.vehicle.active,false);
});
test('北门通道开放，停稳不冻结生活世界与修复冷却',()=>{
 const {g}=setup('north-0-1');
 for(let y=60;y<=170;y+=4)assert.equal(blocked(650+TOWN_SHIFT_X,y,18,g.trees,g.player),false);
 requestParking(g);tick(g,200);assert.equal(g.progress.campParking.owned.at(-1).spot,'north-0-1');g.vehicles[1].cooldown=10;
 const before=g.time;tick(g,20);assert.ok(g.time>before+.9);assert.ok(g.vehicles[1].cooldown<9.1);assert.equal(g.vehicle.active,false);
});

// 主路与路肩逐段采样，防止调整车位时再次把候停区扩回通行带。
test('营地主路及路肩不触发候停，旧工坊停车入口也保持自由驾驶',()=>{
 const {g}=setup();
 for(const path of PATHS.slice(0,2))for(const point of path){
  if(point.x<120||point.x>1090||point.y<110||point.y>1130)continue;
  for(const offset of [-40,0,40]){
   Object.assign(g.player,{x:point.x+(path===PATHS[1]?offset:0),y:point.y+(path===PATHS[0]?offset:0),vx:0,vy:0});
   assert.equal(nearestParkingSpot(g),null,JSON.stringify(g.player));
  }
 }
 for(const point of [{x:445,y:735},{x:555,y:735},{x:260,y:745}]){
  g.parking=null;Object.assign(g.player,point,{vx:0,vy:0});tick(g,85);
  assert.equal(g.parking,null);assert.equal(g.vehicle.active,true);
 }
 // 循环地图镜像也使用同一条道路保护边界。
 Object.assign(g.player,{x:445+WORLD.width,y:735+WORLD.height});assert.equal(nearestParkingSpot(g),null);
});
test('进入院内只提示点击，驶出边界立即清除候选',()=>{
 for(const spot of PARKING_SPOTS){
  const {g}=setup(spot.id);assert.equal(nearestParkingSpot(g)?.id,spot.id);
  // 门口站定一秒会进入房屋，先在该交互完成前检查停车候选边界。
  tick(g,1);assert.equal(g.parking.elapsed,0);
  Object.assign(g.player,{x:spot.x,y:spot.approachY+C.approachMargin+1,vx:0,vy:0});g.update(.05);
  assert.notEqual(g.parking?.id,spot.id);
 }
});
