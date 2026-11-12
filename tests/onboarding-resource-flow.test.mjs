// 旧版入职存档的上车、采木和施工检查点仍可接续。
// 开局工坊、赠车、整备预算与缺口提示回归，事务使用正式游戏入口。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {quoteWorkshop} from '../src/progression/workshop/workshop.js';
import {commitWorkshop} from '../src/core/workshop/workshop.js';
import {skipArrivalJourney} from '../src/core/camp/ranger-arrival.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
import {RESTORATION_FLIGHT,facilityOpen} from '../src/config/town-restoration.js';
import {mainlineResourceHint} from '../src/progression/story/mainline-cost.js';
import {boardParkedVehicle,parkedOwned} from '../src/core/vehicles/camp-parking.js';
// 只快进原开场，80木料由测试提供，后续开工、报价和购枪均走真实事务。
function rebuilt(){const g=new Game(freshRangerProgress(),()=>.5);g.start();skipArrivalJourney(g);g.progress.arrival.phase='repair';g.progress.wood=80;Object.assign(g.player,{x:WORKSHOP.x,y:WORKSHOP.y+25});assert.ok(g.advanceArrival());g.attackTimer=999;for(let i=0;i<125;i++)g.update(.05);assert.equal(g.progress.arrival.phase,'craft');return g;}

test('80木料重建后谢礼足够买首枪，正式工坊一次扣费且先于清缴开放',()=>{
 const g=rebuilt();assert.equal(g.progress.wood,8);assert.equal(g.arrivalPending,true);assert.equal(g.progress.weapons[0],0);
 const plan={kind:'weapons',index:0,action:'buy'},q=quoteWorkshop(g.progress,plan);assert.equal(q.ok,true);assert.deepEqual(q.rows.map(r=>[r.key,r.need]),[['wood',8]]);
 assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.equal(g.progress.wood,8);assert.equal(g.progress.arrival.phase,'craft');
 assert.equal(g.advanceArrival(),false);assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(g.progress.wood,0);assert.equal(g.progress.arrival.phase,'complete');assert.equal(g.progress.weapon,0);assert.equal(g.progress.weapons[0],1);assert.equal(g.arrivalPending,false);assert.equal(facilityOpen(g.progress,'clearing'),false);
 assert.equal(commitWorkshop(g,plan,()=>true).ok,false);assert.equal(new Game(validateProgress(structuredClone(g.progress))).arrivalPending,false);
});

test('首枪缺料时工坊显示真实缺口，电锯可按常规条件升级',()=>{
 const g=rebuilt();g.progress.wood=7;const q=quoteWorkshop(g.progress,{kind:'weapons',index:0,action:'buy'});assert.equal(q.ok,false);assert.equal(q.rows[0].missing,1);
 g.progress.wood=10000;g.progress.coins=10000;assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:3,action:'buy'}).ok,false);assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:14,action:'upgrade'}).ok,true);
});

test('交接后走到木制自行车旁即可骑乘，完成购枪后未修车库仍可停车取车',()=>{
 const g=new Game(freshRangerProgress(),()=>.5);g.start();skipArrivalJourney(g);assert.equal(facilityOpen(g.progress,'garage'),false);assert.equal(g.summonVehicle(),false);Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});assert.ok(g.summonVehicle());assert.ok(g.dismountVehicle());
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'complete',keys:true,parked:true});p.weapons[0]=1;p.weapon=0;p.vehicleHulls[5]=1;p.vehicleIndex=5;
 p.arrival.giftHull=5;const loaded=new Game(p,()=>.5);loaded.start();loaded.update(.01);const parked=parkedOwned(loaded).find(p=>p.record.hull===5);assert.ok(parked);Object.assign(loaded.player,parked);assert.ok(boardParkedVehicle(loaded,5));assert.equal(facilityOpen(loaded.progress,'garage'),false);
 assert.equal(quoteWorkshop(loaded.progress,{kind:'vehicle',index:5,action:'upgrade'}).ok,false);
});

test('整备资源不足时给出种地和伐木来源，满足目标后提示消失',()=>{
 const p=freshProgress(),goal={path:'progress.weapons.0',min:3};p.wood=p.coins=0;
 const hint=mainlineResourceHint(p,goal);assert.match(hint,/电锯采树/);assert.match(hint,/种田收获后出售/);
 p.weapons[0]=3;assert.equal(mainlineResourceHint(p,goal),'');
});

test('材料缺口有来源提示，余额与装备改变会实时更新提示且不修改进度',()=>{
 const p=freshProgress(),goal={path:'progress.weapons.3',min:1};p.coins=p.wood=1e6;p.materials={parts:0,crystal:0,core:0};const original=structuredClone(p);
 assert.match(mainlineResourceHint(p,goal),/材料：清缴怪潮与领主/);assert.deepEqual(p,original);p.materials={parts:999,crystal:999,core:999};assert.equal(mainlineResourceHint(p,goal),'');p.coins=0;assert.match(mainlineResourceHint(p,goal),/金币/);
});
