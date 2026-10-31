// 工坊室内和访客目录专项：真实状态、点击入门、通行与持久化边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {WEAPONS} from '../src/config/weapons.js';
import {VISITOR_MODELS,SCIENCE_VEHICLES} from '../src/config/parking-visitors.js';
import {WORKSHOP_INTERIORS,interiorWeaponDisplays,garageVehicleRecord,interiorLayout,VEHICLE_BAY,VEHICLE_GALLERY,interiorVehicleDisplays} from '../src/config/workshop-interiors.js';
import {enterWorkshop,updateCottage,leaveCottage,cottageBlocked,sleepInCottage} from '../src/core/cottage.js';
import {updateParkingVisitors,boardParkedVehicle} from '../src/core/camp-parking.js';
import {capturePatrol} from '../src/core/patrol-session.js';
// 所有测试从完成入职的真实营地开始，保留正式碰撞和装备实例。
function setup(){const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];const g=new Game(p,()=>0);g.start();g.enemies=[];g.spawnTimer=g.fireClock=999;return g;}
// 独立推进候门控制器，避免战斗和任务无关计时混入断言。
function step(g,seconds,input={x:0,y:0}){for(let i=0;i<Math.round(seconds/.05);i++)updateCottage(g,.05,input);}
test('六款科幻车与全部可获得车型进入访客池，轮换不连续重复单一型号',()=>{
 assert.equal(SCIENCE_VEHICLES.length,6);assert.equal(new Set(SCIENCE_VEHICLES.map(m=>m.id)).size,6);
 assert.deepEqual(VISITOR_MODELS.filter(m=>!m.sciFi).map(m=>m.hull),COLLECTED_VEHICLES.map((_,i)=>i));
 const g=setup(),before=JSON.stringify(g.progress.vehicleHulls),seen=new Set();g.parkingView={x:900,y:900,w:200,h:200};
 for(let n=0;n<12;n++){g.parkingVisitTimer=0;updateParkingVisitors(g,1);assert.ok(g.parkingVisitors.length>=2&&g.parkingVisitors.length<=3);for(const v of g.parkingVisitors)seen.add(v.model);assert.equal(new Set(g.parkingVisitors.map(v=>v.spot)).size,g.parkingVisitors.length);}
 assert.deepEqual([...seen].sort(),VISITOR_MODELS.map(m=>m.id).sort());assert.equal(JSON.stringify(g.progress.vehicleHulls),before);
 const previous=JSON.stringify(g.parkingVisitors);g.parkingView={x:100,y:100,w:500,h:400};g.parkingVisitTimer=0;updateParkingVisitors(g,1);assert.equal(JSON.stringify(g.parkingVisitors),previous);
});
test('两座工坊门前站定三秒入内，出门保持原位置',()=>{
 for(const kind of ['weapons','vehicle']){const g=setup(),layout=WORKSHOP_INTERIORS[kind];g.progress.restoration.repaired=['garage'];g.vehicle.active=false;Object.assign(g.player,layout.door,{vx:0,vy:0});
  step(g,2.9);assert.equal(g.cottage,null);assert.ok(g.cottageEntry);step(g,.1);
  assert.equal(g.cottage.kind,kind);assert.equal(sleepInCottage(g,'morning'),false);
  Object.assign(g.player,layout.exit);step(g,.95);assert.ok(g.cottage);step(g,.05);assert.equal(g.cottage,null);assert.equal(g.player.x,layout.outside.x);
  assert.ok(enterWorkshop(g,kind));assert.ok(leaveCottage(g));
 }
});
test('入职、驾驶、远距离不能进入；存档记录室外落点，不能在屋内召车',()=>{
 const g=setup();Object.assign(g.player,{x:1800,y:1800});assert.equal(enterWorkshop(g,'weapons'),false);Object.assign(g.player,WORKSHOP_INTERIORS.vehicle.door);g.vehicle.active=true;assert.equal(enterWorkshop(g,'vehicle'),false);g.vehicle.active=false;g.progress.arrival.phase='repair';assert.equal(enterWorkshop(g,'vehicle'),false);g.progress.arrival.phase='complete';assert.equal(enterWorkshop(g,'vehicle'),true);
 capturePatrol(g);assert.deepEqual(g.progress.living.position,g.cottage.outside);assert.equal(g.summonVehicle(),false);assert.equal(enterWorkshop(g,'weapons'),false);
});
test('室内只使用车库真实泊位，同一车辆不复制，固定展柜覆盖完整武器目录',()=>{
 const g=setup();assert.equal(garageVehicleRecord(g),null);g.progress.campParking.owned=[{hull:0,spot:'north-0-0',hp:.6,ammo:3,reload:0,wheel:2,track:1}];assert.equal(garageVehicleRecord(g),null);g.progress.campParking.owned[0].spot='garage';const record=garageVehicleRecord(g);Object.assign(g.player,WORKSHOP_INTERIORS.vehicle.door);enterWorkshop(g,'vehicle');assert.equal(garageVehicleRecord(g),record);assert.equal(boardParkedVehicle(g,0),false);assert.equal(g.progress.campParking.owned.length,1);leaveCottage(g);assert.equal(record.hp,.6);
 const all=interiorWeaponDisplays();assert.deepEqual(all.map(s=>s.index),WEAPONS.map((_,i)=>i));
});
test('家具与中央泊位有真实边界，两侧环路能通到工具台和全部陈列柜',()=>{
 for(const kind of ['weapons','vehicle']){const g=setup();g.progress.campParking.owned=[{hull:0,spot:'garage',hp:1}];Object.assign(g.player,WORKSHOP_INTERIORS[kind].door);enterWorkshop(g,kind);const layout=interiorLayout(g.cottage),start=[layout.spawn.x,Math.floor(layout.spawn.y/5)*5],queue=[start],seen=new Set([start.join(',')]);
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[5,0],[-5,0],[0,5],[0,-5]]){const a=x+dx,b=y+dy,key=a+','+b;if(a<20||a>layout.width-20||b<75||b>layout.height-20||seen.has(key)||cottageBlocked(a,b,g))continue;seen.add(key);queue.push([a,b]);}}
  const goals=kind==='weapons'?interiorWeaponDisplays().map(s=>[s.x,s.y+35]):[[85,165],[355,165],[110,300],[330,300],[220,200],[220,430]].map(([x,y])=>[x,y+VEHICLE_GALLERY.depth]).concat(interiorVehicleDisplays().map(item=>[item.x,item.y+65]));
  for(const goal of goals)assert.ok(seen.has(goal.join(',')),kind+' 通路受阻 '+goal);assert.equal(cottageBlocked(kind==='vehicle'?VEHICLE_BAY.x:interiorWeaponDisplays()[0].x,kind==='vehicle'?VEHICLE_BAY.y:interiorWeaponDisplays()[0].y,g),true);
 }
});

// 真实步行贯穿完整展厅并返回出口，不依赖跳页或传送解锁下一批装备。
test('长展厅中轴可连续行走往返，暂停不移动，全部展柜有独立稳定位置',()=>{
 const g=setup(),layout=WORKSHOP_INTERIORS.weapons;Object.assign(g.player,layout.door);enterWorkshop(g,'weapons');
 const racks=interiorWeaponDisplays();assert.equal(new Set(racks.map(s=>s.x+','+s.y)).size,WEAPONS.length);
 assert.ok(layout.height>1000);const start=g.player.y;step(g,12,{x:0,y:-1});assert.ok(g.player.y<100);assert.equal(g.player.x,layout.spawn.x);
 g.pause();const stopped=g.player.y;step(g,1,{x:0,y:1});assert.equal(g.player.y,stopped);g.start();
 step(g,(start-stopped)/115,{x:0,y:1});assert.ok(Math.abs(g.player.y-start)<6);assert.ok(g.cottage);
 Object.assign(g.player,layout.exit);step(g,3);assert.ok(g.cottage);assert.ok(leaveCottage(g));
});

// 四边环路使用真实移动和碰撞，避免可达检查遗漏只能进不能绕的狭道。
test('维修间能从入口连续绕停放车辆一周，空泊位可通过',()=>{
 const g=setup(),layout=WORKSHOP_INTERIORS.vehicle;g.progress.campParking.owned=[{hull:0,spot:'garage',hp:1}];Object.assign(g.player,layout.door);enterWorkshop(g,'vehicle');
 for(const local of [{x:110,y:480},{x:110,y:200},{x:330,y:200},{x:330,y:430},{x:110,y:430},{x:110,y:480},{x:220,y:480}]){
  const target={...local,y:local.y+VEHICLE_GALLERY.depth};
  const dx=target.x-g.player.x,dy=target.y-g.player.y,seconds=Math.hypot(dx,dy)/115;
  for(let t=0;t<seconds;t+=.01)updateCottage(g,Math.min(.01,seconds-t),{x:Math.abs(dx)>.01?Math.sign(dx):0,y:Math.abs(dy)>.01?Math.sign(dy):0});
  assert.ok(Math.hypot(g.player.x-target.x,g.player.y-target.y)<.1,'环路受阻 '+JSON.stringify(target));
 }
 assert.equal(cottageBlocked(VEHICLE_BAY.x,VEHICLE_BAY.y,g),true);g.progress.campParking.owned=[];assert.equal(cottageBlocked(VEHICLE_BAY.x,VEHICLE_BAY.y,g),false);
});

// 展位来自全部六款可购车型，新增展厅行数不影响中央通行。
test('载具展区包含全部可购车型且中央走道贯通维修区',()=>{
 const g=setup(),layout=WORKSHOP_INTERIORS.vehicle;Object.assign(g.player,layout.door);enterWorkshop(g,'vehicle');
 const before=JSON.stringify(g.progress),displays=interiorVehicleDisplays();
 assert.deepEqual(displays.map(item=>item.index).sort(),COLLECTED_VEHICLES.map((m,index)=>m.rewardOnly?null:index).filter(index=>index!==null));
 assert.equal(new Set(displays.map(item=>item.id)).size,displays.length);
 const first=displays[0].x;displays[0].x=-999;assert.equal(interiorVehicleDisplays()[0].x,first);
 step(g,Math.ceil(layout.spawn.y/115),{x:0,y:-1});assert.ok(g.player.y<100);assert.equal(g.player.x,layout.spawn.x);
 assert.equal(JSON.stringify(g.progress),before);assert.equal(garageVehicleRecord(g),null);
});
