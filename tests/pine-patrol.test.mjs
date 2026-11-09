// 松果战车之后的西门体验：任务顺序、真实救场、保存事务和主线交付。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {mainlineTask,mainlineObjective,updateMainline,completeMainline} from '../src/core/story/mainline-manager.js';
import {startCampDefense,rescueCampDefense,updateCampDefense,claimCampDefense} from '../src/core/camp/camp-defense.js';
import {summonVehicle} from '../src/combat/vehicle.js';
// 只建立已购车检查点，正式守门与结算共用游戏实现。
function setup(){const p=ownedPineProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pine-patrol'));p.mainline.phase='doing';const g=new Game(p,()=>.5);g.start();Object.assign(g.player,MAINLINE_SITES.westGate);g.mainlineTalkDelay=999;summonVehicle(g);return g;}
test('购买之后体验西门怪潮，然后整备；清缴和旧击杀计数不代做',()=>{
 const g=setup(),i=MAINLINE_IDS.indexOf('pine-patrol');assert.equal(MAINLINE_IDS[i-1],'first-vehicle');assert.equal(MAINLINE_IDS[i+1],'vehicle-service');assert.equal(mainlineObjective(g).key,'westGate');
 g.progress.mainline.seen.pineKills=100;g.progress.mainline.seen.pineWaves=10;g.progress.campDefense.runs=10;updateMainline(g,0);assert.equal(g.progress.mainline.phase,'doing');
});
test('实际西门救场结算 B 也能继续，保存失败与重复领取不误发奖励',()=>{
 const g=setup();assert.ok(startCampDefense(g,'left'));assert.ok(g.vehicle.active);assert.equal(mainlineObjective(g),null);
 rescueCampDefense(g,'death');for(let i=0;i<300&&g.campDefense.phase!=='result';i++)updateCampDefense(g,.05);assert.equal(g.campDefense.phase,'result');
 const before=g.progress.coins;g.campDefensePersist=()=>false;assert.equal(claimCampDefense(g),false);assert.equal(g.progress.mainline.seen.westHorde,0);assert.equal(g.progress.coins,before);
 g.campDefensePersist=()=>true;assert.ok(claimCampDefense(g));assert.equal(g.progress.mainline.seen.westHorde,1);const paid=g.progress.coins;assert.equal(claimCampDefense(g),false);assert.equal(g.progress.coins,paid);
 updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');Object.assign(g.player,MAINLINE_SITES.garage);g.enemies=[];g.mainlinePersist=()=>true;assert.ok(completeMainline(g));assert.equal(mainlineTask(g).id,'vehicle-service');assert.equal(g.progress.coins,paid+180);assert.equal(g.progress.vehicleHulls[0],1);
});
test('北门、未接主线均不能冒充西门体验，A 与 S 都接受',()=>{
 for(const [gate,phase,grade,expected] of [['top','doing','S',0],['left','meet','S',0],['left','doing','A',1],['left','doing','S',1]]){
  const g=setup();g.progress.mainline.phase=phase;if(gate==='top')Object.assign(g.player,{x:650,y:110});assert.ok(startCampDefense(g,gate));
  Object.assign(g.campDefense,{phase:'result',cleared:10,bossDefeated:true,gateHp:grade==='S'?1500:600});g.state='paused';assert.ok(claimCampDefense(g));assert.equal(g.progress.mainline.seen.westHorde,expected);
 }
});
