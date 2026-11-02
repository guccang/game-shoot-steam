import {requestParking} from '../src/core/parking.js';
// 停车下车、展示轮换与小屋状态专项测试，使用真实Game及正式存档迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress,freshRangerProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {boardParkedVehicle,updateParkingVisitors,parkedOwned} from '../src/core/camp-parking.js';
import {parkedVehicleObjects} from '../src/rendering/parked-vehicles.js';
import {arrivalObjects} from '../src/rendering/ranger-arrival.js';
import {COTTAGE} from '../src/config/cottage.js';
import {enterCottage,leaveCottage} from '../src/core/cottage.js';
import {blocked} from '../src/physics/motion.js';
import {RANGER} from '../src/config/ranger-arrival.js';
// 准备已完成主线的营地，不跳过正式停车和房屋更新。
function setup(){const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;const g=new Game(p,()=>.7);g.start();g.spawnTimer=999;return g;}
// 固定步长推进与真实运行一致的控制器。
function tick(g,seconds,input){for(let i=0;i<Math.ceil(seconds/.05);i++)g.update(.05,input);}
// 仅设置起始泊位附近位置，由正式控制器完成下车。
function park(g,id='weapons-west'){const s=PARKING_SPOTS.find(s=>s.id===id);g.summonVehicle();Object.assign(g.player,{x:s.x,y:s.approachY});requestParking(g);tick(g,8);return s;}

test('停车后车辆唯一留位、下车点可通行，近车上车保留耐久并阻止重停',()=>{
 const g=setup();g.vehicle.hp*=.6;const hp=g.vehicle.hp,s=park(g);
 assert.equal(g.vehicle.active,false);assert.equal(parkedVehicleObjects(g).filter(s=>s.owner).length,1);
 assert.ok(!blocked(g.player.x,g.player.y,12,g.trees,g.player));assert.ok(blocked(s.x,s.y-15,12,g.trees,g.player));
 Object.assign(g.player,{x:1000,y:900});assert.equal(g.summonVehicle(),false);
 Object.assign(g.player,{x:s.x+64,y:s.y+18});assert.equal(boardParkedVehicle(g,0),true);assert.equal(g.vehicle.hp,hp);
 assert.equal(g.progress.campParking.owned.length,0);tick(g,4);assert.equal(g.vehicle.active,true);assert.equal(g.parking.phase,'cancelled');
});
test('停车记录刷新保留并双重去重，旧交接电动车只显示一次',()=>{
 const g=setup();park(g,'garage');const p=validateProgress(JSON.parse(JSON.stringify(g.progress)));
 assert.equal(p.campParking.owned.length,1);const copy={...p.campParking.owned[0]};p.campParking.owned.push(copy,{...copy,hull:1},{...copy,spot:'fake'});
 assert.equal(validateProgress(p).campParking.owned.length,1);
 const old=setup();old.progress.vehicleHulls[5]=1;old.progress.arrival={version:2,phase:'complete',keys:true,parked:true};updateParkingVisitors(old,.05);
 assert.equal(parkedOwned(old).filter(s=>s.record.hull===5).length,1);assert.equal(arrivalObjects(old).filter(s=>s.type==='arrival-scooter').length,0);
});
// 快捷入口与场景上车共用核心，暂停允许取回原车但不能越过距离限制。
test('停驻车暂停后快捷上车仍可用，离车过远与室内不能取车',()=>{
 const g=setup(),s=park(g,'garage');g.pause();const hp=g.vehicle.hp;
 assert.equal(g.summonVehicle(),true);assert.equal(g.vehicle.hp,hp);assert.equal(g.progress.campParking.owned.length,0);
 assert.equal(g.state,'paused');assert.ok(Math.hypot(g.player.x-s.x,g.player.y-s.y)<.001);
});
// 点击不要求候满三秒，仍必须步行靠近，且出门锁仅约束自动入门。
test('小屋靠近点击立即进入，远处、驾驶和暂停拒绝，出门后允许主动再进',()=>{
 const g=setup();Object.assign(g.player,{x:COTTAGE.door.x+200,y:COTTAGE.door.y});assert.equal(enterCottage(g),false);
 Object.assign(g.player,{x:COTTAGE.door.x+60,y:COTTAGE.door.y+80});g.summonVehicle();assert.equal(enterCottage(g),false);g.dismountVehicle();
 g.pause();assert.equal(enterCottage(g),false);g.start();assert.equal(enterCottage(g),true);assert.equal(enterCottage(g),false);
 assert.equal(leaveCottage(g),true);assert.equal(enterCottage(g),true);assert.equal(g.summonVehicle(),false);
});
test('访客仅在视野外公共空位轮换，留两空位且不进入自有装备',()=>{
 const g=setup(),owned=[...g.progress.vehicleHulls];g.parkingView={x:100,y:100,w:500,h:400};g.parkingVisitTimer=0;
 updateParkingVisitors(g,1);assert.equal(g.parkingVisitors.length,0);
 g.parkingView={x:700,y:700,w:300,h:400};g.parkingVisitTimer=0;updateParkingVisitors(g,1);
 assert.ok(g.parkingVisitors.length>0&&g.parkingVisitors.length<=3);assert.ok(g.parkingVisitors.every(v=>v.spot.startsWith('north-')));
 const previous=JSON.stringify(g.parkingVisitors);g.parkingView={x:100,y:100,w:500,h:400};g.parkingVisitTimer=0;updateParkingVisitors(g,1);assert.equal(JSON.stringify(g.parkingVisitors),previous);
 assert.deepEqual(g.progress.vehicleHulls,owned);assert.equal(g.progress.campParking.owned.length,0);
});
test('门口站定三秒进入，出门后停留不会自动返回',()=>{
 const g=setup();g.progress.restoration.repaired=['cottage'];g.vehicle.active=false;Object.assign(g.player,{x:COTTAGE.door.x,y:COTTAGE.door.y+20,vx:0,vy:0});tick(g,2.9);assert.equal(g.cottage,null);tick(g,.2);
 assert.ok(g.cottage);assert.deepEqual({x:g.player.x,y:g.player.y},COTTAGE.spawn);
 assert.ok(leaveCottage(g));tick(g,5);assert.equal(g.cottage,null);assert.ok(enterCottage(g));
});




// 新开场九秒接送仍由导演推进，不被附近点击或停车候选抢占。
test('入职接送不被普通停车或访客接管，交接后进入采木任务',()=>{
 const g=new Game(freshRangerProgress(),()=>.8);g.start();
 for(let i=0;i<220;i++){g.update(.05);assert.equal(g.parking,null);}
 assert.equal(g.progress.arrival.phase,'gather');assert.ok(Math.hypot(g.player.x-RANGER.doorstep.x,g.player.y-RANGER.doorstep.y)<1);
 assert.equal(g.progress.campParking.owned.length,0);
});
