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
import {RESTORATION_FLIGHT,TOWN_RESTORATIONS,facilityOpen} from '../src/config/town-restoration.js';
import {MAINLINE_TASKS,MAINLINE_IDS} from '../src/config/mainline.js';
import {mainlineConditionCost,mainlineResourceHint} from '../src/progression/story/mainline-cost.js';
import {mainlineSteps} from '../src/core/story/mainline-manager.js';
import {mainlineReward} from '../src/config/economy.js';
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

test('首枪缺料时工坊显示真实缺口，其他入职交易仍不能提前购买',()=>{
 const g=rebuilt();g.progress.wood=7;const q=quoteWorkshop(g.progress,{kind:'weapons',index:0,action:'buy'});assert.equal(q.ok,false);assert.equal(q.rows[0].missing,1);
 g.progress.wood=10000;g.progress.coins=10000;assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:3,action:'buy'}).ok,false);assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:14,action:'upgrade'}).ok,false);
});

test('赠送电动车在采木阶段立即可骑，完成购枪后未修车库仍可停车取车',()=>{
 const g=new Game(freshRangerProgress(),()=>.5);g.start();skipArrivalJourney(g);assert.equal(facilityOpen(g.progress,'garage'),false);assert.ok(g.summonVehicle());assert.ok(g.dismountVehicle());
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'complete',keys:true,parked:true});p.weapons[0]=1;p.weapon=0;p.vehicleHulls[5]=1;p.vehicleIndex=5;
 const loaded=new Game(p,()=>.5);loaded.start();loaded.update(.01);const parked=parkedOwned(loaded).find(p=>p.record.hull===5);assert.ok(parked);Object.assign(loaded.player,parked);assert.ok(boardParkedVehicle(loaded,5));assert.equal(facilityOpen(loaded.progress,'garage'),false);
 assert.equal(quoteWorkshop(loaded.progress,{kind:'vehicle',index:5,action:'upgrade'}).ok,false);
});

test('每个主线的上一步奖励覆盖必需整备币木及设施修复，额外消费仍提示去向',()=>{
 for(let i=1;i<MAINLINE_TASKS.length;i++){const task=MAINLINE_TASKS[i],p=freshProgress(),cost=mainlineConditionCost(p,task.goal),reward=mainlineReward(MAINLINE_TASKS[i-1],p),repair=TOWN_RESTORATIONS.filter(f=>f.before===task.id).reduce((s,f)=>s+f.wood,0);assert.ok(reward.coins>=cost.coins,task.id+'金币');assert.ok(reward.wood>=cost.wood+repair,task.id+'木头');}
 const p=freshProgress();p.coins=p.wood=0;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pistol-upgrade'));p.mainline.phase='doing';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 const g=new Game(p);const hint=mainlineSteps(g)[0].hint;assert.match(hint,/还差/);assert.match(hint,/营地周围采树/);assert.match(hint,/告示牌接清缴/);
 g.progress.weapons[0]=3;g.progress.heroes[0]=2;assert.equal(mainlineResourceHint(g.progress,MAINLINE_TASKS[2].goal),'');
});

test('材料缺口有来源提示，余额与装备改变会实时更新提示且不修改进度',()=>{
 const p=freshProgress(),goal={path:'progress.weapons.3',min:1};p.coins=p.wood=1e6;p.materials={parts:0,crystal:0,core:0};const original=structuredClone(p);
 assert.match(mainlineResourceHint(p,goal),/材料：清缴怪潮与领主/);assert.deepEqual(p,original);p.materials={parts:999,crystal:999,core:999};assert.equal(mainlineResourceHint(p,goal),'');p.coins=0;assert.match(mainlineResourceHint(p,goal),/金币/);
});
