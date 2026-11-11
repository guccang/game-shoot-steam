// 赠车在开场结束即可使用，同时保留距离、演出和工坊交易限制。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {completeArrivalLetter,skipArrivalJourney} from '../src/core/camp/ranger-arrival.js';
import {adoptArrivalParking,boardParkedVehicle,parkedOwned,updateParkingVisitors} from '../src/core/vehicles/camp-parking.js';
import {facilityOpen} from '../src/config/town-restoration.js';
// 使用正式开场或跳过入口创建尚未修复任何建筑的新档。
function arrive(skip=false){
 const g=new Game(freshRangerProgress(),()=>.5);g.start();
 if(skip)assert.equal(skipArrivalJourney(g),true);
 else for(let i=0;i<200&&g.progress.arrival.phase!=='letter';i++)g.update(.05);
 assert.equal(g.progress.arrival.phase,'letter');
 assert.equal(facilityOpen(g.progress,'garage'),false);
 assert.equal(g.progress.weapons[0],0);return g;
}
// 上车使用真实停车坐标旁的可通行位置，不直接改变载具状态。
function approach(g){Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});}
test('旧档已领电动车时保留原车与木材，读信后可自由骑行',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{keys:true,phase:'leave',parked:true});
 p.vehicleIndex=RANGER.scooter;p.vehicleHulls[RANGER.scooter]=1;p.logistics.builds[RANGER.scooter].wood=12;
 const g=new Game(p);g.start();assert.ok(skipArrivalJourney(g));assert.ok(completeArrivalLetter(g));
 assert.equal(g.progress.vehicleHulls[RANGER.giftHull],0);assert.equal(g.progress.logistics.builds[RANGER.scooter].wood,12);
 approach(g);assert.ok(g.summonVehicle());g.update(.05);assert.equal(g.progress.arrival.phase,'complete');
});
test('自然交接后赠车立即成为可点击的停车实体，不等待造枪与车库',()=>{
 const g=arrive();assert.equal(parkedOwned(g).length,1);
 assert.equal(parkedOwned(g)[0].id,RANGER.parkingId);approach(g);
 assert.equal(boardParkedVehicle(g,RANGER.giftHull),true);
 assert.equal(g.vehicle.active,true);assert.equal(g.progress.arrival.phase,'letter');
 assert.equal(facilityOpen(g.progress,'garage'),false);assert.equal(parkedOwned(g).length,0);
 assert.equal(g.dismountVehicle(),true);assert.equal(g.summonVehicle(),true);
 updateParkingVisitors(g,.05);assert.equal(parkedOwned(g).length,0);
 assert.equal(g.buyVehicle(0),false);
});
test('跳过演出后的首个快捷输入仍需靠近北广场赠车',()=>{
 const g=arrive(true);Object.assign(g.player,{x:1100,y:900});
 assert.equal(g.summonVehicle(),false);assert.equal(parkedOwned(g).length,1);
 approach(g);assert.equal(g.summonVehicle(),true);assert.equal(g.vehicle.active,true);
});
test('未交钥匙、演出和施工锁定时不能接管或上车',()=>{
 const g=arrive(true);approach(g);
 g.progress.arrival.keys=false;adoptArrivalParking(g);assert.equal(parkedOwned(g).length,0);
 g.progress.arrival.keys=true;g.progress.arrival.phase='leave';
 adoptArrivalParking(g);assert.equal(parkedOwned(g).length,0);assert.equal(g.summonVehicle(),false);
 g.progress.arrival.phase='gather';adoptArrivalParking(g);
 g.progress.arrival.phase='repairing';assert.equal(boardParkedVehicle(g,RANGER.giftHull),false);
 assert.equal(g.summonVehicle(),false);
 g.progress.arrival.phase='repair';g.vehicle.cooldown=1;
 assert.equal(boardParkedVehicle(g,RANGER.giftHull),false);
 g.vehicle.cooldown=0;assert.equal(boardParkedVehicle(g,RANGER.giftHull),true);
});
test('入职任务中的停车记录重载后仍能使用且不会生成第二辆赠车',()=>{
 const g=arrive();const restored=new Game(JSON.parse(JSON.stringify(g.progress)));
 restored.start();updateParkingVisitors(restored,.05);adoptArrivalParking(restored);
 assert.equal(parkedOwned(restored).length,1);approach(restored);
 assert.equal(boardParkedVehicle(restored,RANGER.giftHull),true);
 adoptArrivalParking(restored);assert.equal(parkedOwned(restored).length,0);
 assert.equal(restored.progress.arrival.parked,false);
});
