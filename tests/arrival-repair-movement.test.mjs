// 首次施工自由移动专项：真实主循环、骑乘、暂停、读档与保存失败，不直接改完成阶段。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {RANGER,arrivalCinematic} from '../src/config/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {RESTORATION_SECONDS,facilityOpen} from '../src/config/town-restoration.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {worldDistance} from '../src/world/coordinates.js';
// 人物放在工坊前的通路，保留正式建筑碰撞；以存档拥有的赠车准备骑乘状态。
function scene(mounted=false){
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',elapsed:0,keys:true,parked:false,x:WORKSHOP.x,y:WORKSHOP.y+25});
 p.wood=RANGER.repairWood;p.vehicleHulls[RANGER.scooter]=1;p.vehicleIndex=RANGER.scooter;
 const g=new Game(p,()=>.5);g.start();g.attackTimer=999;g.enemies=[];
 if(mounted)assert.ok(g.summonVehicle());return g;
}
// 按固定时间片推进正式移动和施工时钟，输入持续传给主循环。
function tick(g,seconds,input={x:0,y:0}){for(let i=0;i<Math.ceil(seconds/.05);i++)g.update(.05,input);}

for(const mounted of [false,true])test(`${mounted?'骑车':'步行'}开工同帧及施工期间可移动，离开后照常完工`,()=>{
 const g=scene(mounted),start={...g.player};g.update(.05,{x:0,y:1});
 assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.arrivalCinematic,false);assert.ok(worldDistance(g.player,start)>0);assert.equal(g.progress.wood,0);
 tick(g,1,{x:0,y:1});assert.ok(worldDistance(g.player,start)>30);assert.equal(g.progress.arrival.phase,'repairing');
 const moved={x:g.player.x,y:g.player.y};assert.equal(g.progress.arrival.x,moved.x);assert.equal(g.progress.arrival.y,moved.y);
 tick(g,RESTORATION_SECONDS);assert.equal(g.progress.arrival.phase,'craft');assert.equal(facilityOpen(g.progress,'weapons'),true);
 // 松手后的既有减速允许少量滑行，完工不能把人拉回开工点。
 assert.ok(worldDistance(g.player,moved)<40);assert.ok(worldDistance(g.player,start)>30);
 assert.equal(g.progress.wood,RANGER.pistolWood);assert.equal(g.vehicle.active,mounted);assert.equal(g.enemies.length,0);
});
test('暂停同时冻结施工和移动，恢复后继续原进度',()=>{
 const g=scene();g.update(.05);tick(g,.4,{x:0,y:1});const pos={...g.player},elapsed=g.progress.arrival.elapsed;
 g.pause();tick(g,1,{x:0,y:1});assert.equal(g.progress.arrival.elapsed,elapsed);assert.equal(worldDistance(g.player,pos),0);
 g.start();tick(g,.4,{x:0,y:1});assert.ok(g.progress.arrival.elapsed>elapsed);assert.ok(worldDistance(g.player,pos)>0);
});
test('移动中保存并重载保持新位置、施工时间和骑乘，木料只扣一次',()=>{
 const g=scene(true);g.update(.05);tick(g,.7,{x:0,y:1});g.progress.patrol=capturePatrol(g);
 const raw=structuredClone(g.progress),position={...g.player},elapsed=raw.arrival.elapsed;
 const restored=new Game(validateProgress(raw),()=>.5);restored.start();restored.attackTimer=999;
 assert.ok(worldDistance(restored.player,position)<.1);assert.equal(restored.vehicle.active,true);assert.equal(restored.progress.arrival.elapsed,elapsed);
 tick(restored,RESTORATION_SECONDS);assert.equal(restored.progress.arrival.phase,'craft');assert.equal(restored.progress.wood,RANGER.pistolWood);
});
test('完工保存失败保留施工但不锁移动，远处重试不重复扣料或谢礼',()=>{
 const g=scene();g.update(.05);g.arrivalPersist=()=>false;tick(g,RESTORATION_SECONDS);
 assert.equal(g.arrivalError,true);assert.equal(g.progress.arrival.phase,'repairing');const pos={...g.player};tick(g,.5,{x:0,y:1});assert.ok(worldDistance(g.player,pos)>0);assert.equal(g.progress.wood,0);
 g.arrivalPersist=()=>true;assert.ok(g.advanceArrival());g.update(.05);assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.progress.wood,RANGER.pistolWood);tick(g,1);assert.equal(g.progress.wood,RANGER.pistolWood);
});
test('接送短剧及旧制枪演出仍冻结操控，修复不再属于演出',()=>{
 for(const phase of ['bus','ride','handover','crafting'])assert.equal(arrivalCinematic({arrival:{phase}}),true);
 assert.equal(arrivalCinematic({arrival:{phase:'repairing'}}),false);
});
