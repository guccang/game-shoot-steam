// 正式负重、装配、货物和牵引事务回归，覆盖失败保存与实际移动。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {catLoad,vehicleLoad,movementLoadFactor,cropMass} from '../src/progression/load-weight.js';
import {vehicleMaxHp} from '../src/config/vehicles.js';
import {configureVehicleBuild,vehicleBuildPrice} from '../src/core/vehicle-build.js';
import {transferCargo,sellCrops} from '../src/core/cargo.js';
import {hookTow,unhookTow,advancePlayerTow,towReason,selfTowRepairQuote,deliverTowedVehicle} from '../src/core/player-towing.js';
import {vehicleRepairQuote,updateVehicleRepair} from '../src/core/vehicle-repair.js';
import {REPAIR_BAY} from '../src/config/vehicle-repair.js';
import {repairParkingSpot} from '../src/config/repair-parking.js';
import {canonical} from '../src/world/coordinates.js';
import {FARM_DELIVERY,FARM_CROPS} from '../src/config/farm.js';
import {farmAction} from '../src/core/farm.js';
import {updateCottage,cottageBlocked} from '../src/core/cottage.js';
import {parkingAvailable} from '../src/core/parking.js';
import {MAINLINE_IDS,MAINLINE_TASKS} from '../src/config/mainline.js';
import {mainlineConditionCost} from '../src/progression/mainline-cost.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 使用完成入职的正式存档，隔离随机战斗，保留地图碰撞和车辆运行时。
function scene(index=0){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls.fill(0);p.vehicleHulls[0]=p.vehicleHulls[index]=1;p.vehicleIndex=index;p.coins=100000;const g=new Game(p);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.spawnTimer=999;g.fireClock=999;g.livingPersist=()=>true;g.progress.campParking.owned=[];g.vehicle.active=true;Object.assign(g.player,{x:220,y:835,vx:0,vy:0});return g;}
// 残骸位置直接设置为正式维修订单，测试不使用替代拖车实现。
function wreck(g,index=0){g.vehicles[index].hp=0;g.vehicles[index].active=false;g.progress.vehicleService[index]={hp:0,phase:'wrecked',mapId:'forest',position:{x:g.player.x-100,y:g.player.y},wheel:0};}
test('新结构独立保存且不迁移旧等级，损坏计数不能抵消负重',()=>{const p=freshProgress();p.vehicleHulls[0]=20;p.vehicleParts[0].engine=20;delete p.logistics;const n=validateProgress(p);assert.equal(n.logistics.builds[0].plates,0);assert.equal(n.logistics.builds[0].engine,0);n.logistics.builds[0].cargo[0]=-100;assert.equal(validateProgress(n).logistics.builds[0].cargo[0],0);});
test('猫体、枪械弹药和作物计重；超载真实驾驶及自动停车停止，卸货恢复',()=>{const g=scene(5),b=g.progress.logistics.builds[5];assert.ok(catLoad(g).body>0);assert.ok(catLoad(g).weapon>0);const empty=vehicleLoad(g);g.progress.farm.inventory[0]=10;assert.equal(vehicleLoad(g).payload,empty.payload);assert.equal(vehicleLoad(g).mass-empty.mass,10*cropMass(0));assert.ok(transferCargo(g,5,0,10,'load').ok);assert.equal(g.progress.farm.inventory[0],0);assert.equal(g.progress.logistics.builds[5].cargo[0],10);assert.equal(vehicleLoad(g).payload-empty.payload,10*cropMass(0));g.progress.logistics.builds[5].cargo[0]=1000;assert.equal(movementLoadFactor(g),0);assert.equal(parkingAvailable(g),false);const before={x:g.player.x,y:g.player.y};for(let i=0;i<5;i++)g.update(.04,{x:1,y:0});assert.equal(g.player.x,before.x);assert.equal(g.player.y,before.y);g.progress.logistics.builds[5].cargo[0]=0;for(let i=0;i<5;i++)g.update(.04,{x:1,y:0});assert.ok(g.player.x>before.x);g.vehicle.active=false;g.progress.farm.inventory[0]=1000;assert.ok(movementLoadFactor(g)>0&&movementLoadFactor(g)<1);});
test('装配保留损耗、发动机买一次免费切换，装甲拆存复用；失败不扣费',()=>{const g=scene();g.vehicle.active=false;g.cottage={kind:'vehicle'};g.vehicle.hp=g.vehicle.maxHp*.4;const oldMax=g.vehicle.maxHp;assert.ok(configureVehicleBuild(g,0,'add-armor').ok);assert.ok(g.vehicle.maxHp>oldMax);assert.equal(g.vehicle.hp/g.vehicle.maxHp,.4);assert.equal(g.progress.vehicleHulls[0],1);assert.ok(configureVehicleBuild(g,0,'remove-armor').ok);assert.equal(vehicleBuildPrice(g.progress,0,'add-armor'),0);const coins=g.progress.coins;assert.ok(configureVehicleBuild(g,0,'add-armor').ok);assert.equal(g.progress.coins,coins);const capacity=vehicleLoad(g).capacity;assert.ok(configureVehicleBuild(g,0,'engine',2).ok);assert.ok(vehicleLoad(g).capacity>capacity);assert.ok(configureVehicleBuild(g,0,'engine',0).ok);const paid=g.progress.coins;assert.ok(configureVehicleBuild(g,0,'engine',2).ok);assert.equal(g.progress.coins,paid);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(configureVehicleBuild(g,0,'add-armor').ok,false);assert.deepEqual(g.progress,before);assert.equal(new Game(g.progress).vehicles[0].maxHp,vehicleMaxHp(g.progress));});
test('货舱独立且装卸/出售保存失败无损失，在场收购不会重复发钱',()=>{const g=scene();g.progress.farm.inventory[0]=20;const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(transferCargo(g,0,0,10,'load').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(transferCargo(g,0,0,10,'load').ok);assert.equal(g.progress.logistics.builds[1].cargo[0],0);assert.equal(sellCrops(g).ok,false);Object.assign(g.player,FARM_DELIVERY);g.livingPersist=()=>false;assert.equal(sellCrops(g).ok,false);assert.equal(g.progress.farm.inventory[0],10);g.livingPersist=()=>true;const coins=g.progress.coins;assert.ok(sellCrops(g).ok);assert.equal(g.progress.coins,coins+20*FARM_CROPS[0].value);assert.equal(sellCrops(g).ok,false);assert.equal(g.progress.logistics.builds[0].cargo[0],0);});
// 显式设置有车与无车两种收货场景，收获只增加实物，出售前不发金币。
for(const car of [false,true])test(`收获存入${car?'附近载具货舱':'无车时的背包'}并计重，金币等出售到账`,()=>{
 const g=scene();g.vehicle.active=false;g.progress.vehicleHulls.fill(0);
 if(car){g.progress.vehicleHulls[0]=1;g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:g.player.x,y:g.player.y,hp:1,ammo:0}];}
 g.progress.farm.plots=[{id:1,mapId:'forest',x:g.player.x,y:g.player.y,crop:0,plantedAt:1,readyAt:2,watered:true}];
 const coins=g.progress.coins,bagMass=catLoad(g).crops,cargoMass=vehicleLoad(g,0,{driver:false}).cargo;
 const r=farmAction(g,'harvest',{plot:1,now:100000});assert.ok(r.ok,r.message);
 assert.equal(g.progress.farm.inventory[0],car?0:1);assert.equal(g.progress.logistics.builds[0].cargo[0],car?1:0);
 assert.equal(catLoad(g).crops-bagMass,car?0:cropMass(0));assert.equal(vehicleLoad(g,0,{driver:false}).cargo-cargoMass,car?cropMass(0):0);
 assert.equal(g.progress.coins,coins);assert.equal(farmAction(g,'harvest',{plot:1,now:100000}).ok,false);
 const restored=new Game(structuredClone(g.progress));
 assert.equal(restored.progress.farm.inventory[0],car?0:1);assert.equal(restored.progress.logistics.builds[0].cargo[0],car?1:0);assert.equal(restored.progress.coins,coins);
});
test('电动车不能拉战车，货物和装甲消耗牵引余量，挂接不瞬移',()=>{const g=scene(5);wreck(g);assert.match(towReason(g,0),/牵引力不足/);assert.equal(hookTow(g,0).ok,false);const h=scene(1);wreck(h);const before={...h.progress.vehicleService[0].position};assert.ok(hookTow(h,0).ok);assert.deepEqual(new Game(structuredClone(h.progress)).progress.logistics.tow,{tractor:1,target:0});advancePlayerTow(h,{x:h.player.x,y:h.player.y},.04);assert.deepEqual(h.progress.vehicleService[0].position,before);const previous={x:h.player.x,y:h.player.y};h.player.x+=80;advancePlayerTow(h,previous,.04);assert.ok(h.progress.vehicleService[0].position.x>before.x);assert.equal(h.progress.vehicleService[0].hp,0);assert.ok(unhookTow(h).ok);const load=vehicleLoad(h);h.progress.logistics.builds[1].cargo[0]=10;assert.ok(vehicleLoad(h).towCapacity<load.towCapacity);});
// 自行牵引沿用正式维修泊位，交付后及重新读档都不能移动或复制车辆。
test('牵引路径碰撞撤回本帧移动，暂停不拖行；优惠交车仅扣一次且修好原位交付',()=>{
 const g=scene(1);wreck(g);assert.ok(hookTow(g,0).ok);
 const original={...g.progress.vehicleService[0].position},prev={x:g.player.x,y:g.player.y};
 g.trees=[{x:original.x+15,y:original.y,radius:20,hp:100}];g.player.x+=80;advancePlayerTow(g,prev,.04);
 assert.equal(g.player.x,prev.x);assert.deepEqual(g.progress.vehicleService[0].position,original);
 g.trees=[];g.player.x+=20;advancePlayerTow(g,prev,0);assert.deepEqual(g.progress.vehicleService[0].position,original);
 Object.assign(g.player,REPAIR_BAY);g.progress.vehicleService[0].position={x:REPAIR_BAY.x-100,y:REPAIR_BAY.y};g.progress.logistics.builds[0].cargo[0]=3;
 const fee=selfTowRepairQuote(g);assert.equal(fee,Math.ceil(vehicleRepairQuote(g,0)*.4));
 const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(deliverTowedVehicle(g).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(deliverTowedVehicle(g).ok);assert.equal(g.progress.coins,before.coins-fee);assert.equal(deliverTowedVehicle(g).ok,false);
 const spot=repairParkingSpot(g.progress.vehicleService[0]);assert.ok(spot,'交车后应预约正式维修泊位');
 for(let i=0;i<250;i++)updateVehicleRepair(g,.05);
 assert.equal(g.progress.vehicleService[0].phase,null);assert.equal(g.vehicles[0].hp,g.vehicles[0].maxHp);
 assert.deepEqual(g.progress.vehicleService[0].position,canonical({x:spot.x,y:spot.y}));
 const records=g.progress.campParking.owned.filter(r=>r.hull===0);assert.equal(records.length,1);assert.equal(records[0].spot,spot.id);
 assert.equal(g.progress.coins,before.coins-fee);assert.equal(g.progress.logistics.builds[0].cargo[0],3);
 const restored=new Game(structuredClone(g.progress));assert.equal(restored.progress.logistics.builds[0].cargo[0],3);
 assert.deepEqual(restored.progress.campParking.owned.filter(r=>r.hull===0),records);assert.deepEqual(restored.progress.vehicleService[0].position,g.progress.vehicleService[0].position);
 assert.equal(g.progress.mailbox.items.length,0);
});
test('主线直接读取装甲层和发动机，预算不包含旧等级升级',()=>{const g=scene(),task=MAINLINE_TASKS.find(t=>t.id==='vehicle-service');assert.match(JSON.stringify(task.goal),/logistics.builds.0.plates/);assert.ok(mainlineConditionCost(g.progress,task.goal).coins>0);g.progress.logistics.builds[0].plates=1;g.progress.logistics.builds[0].engine=1;assert.equal(mainlineConditionCost(g.progress,{path:'progress.logistics.builds.0.plates',min:1}).coins,0);});

// 室内同样采用背包负重，避免进门后重货失去重量。
test('屋内满载同样缓慢步行，仍保留实际负重影响',()=>{const g=scene();g.vehicle.active=false;g.cottage={kind:'vehicle'};let point;for(let y=100;y<500&&!point;y+=25)for(let x=60;x<500;x+=25)if(!cottageBlocked(x,y,g)&&!cottageBlocked(x+12,y,g)){point={x,y};break;}assert.ok(point);Object.assign(g.player,point);updateCottage(g,.1,{x:1,y:0});const normal=g.player.x-point.x;Object.assign(g.player,point);g.progress.farm.inventory[0]=1000;updateCottage(g,.1,{x:1,y:0});assert.ok(normal>0);assert.ok(g.player.x>point.x&&g.player.x-point.x<normal);});
