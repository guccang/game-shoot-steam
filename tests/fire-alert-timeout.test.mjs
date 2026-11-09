// 火警邀请专项：十秒过期、暂停与读档、接受临界点均走正式事件生命周期。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {updateFireRescue} from '../src/core/activities/fire-rescue.js';
import {FIRE_RESCUE as C} from '../src/config/fire-rescue.js';
// 使用真实森林与真实起火树，记录正式事件以校验静默收起。
function scene(){const events=[],p=freshProgress();p.restoration.repaired.push('fire');const g=new Game(p,()=>.4);g.start();g.onEvent=(type,data)=>events.push({type,data});assert.ok(g.requestFireRescue('random'));return {g,events};}
test('未接火警十秒自动清理并进入冷却，不追加关闭文字或奖励',()=>{
 const {g,events}=scene(),before=structuredClone(g.progress.vehicleHulls),coins=g.progress.coins;
 assert.equal(g.fireRescue.offerRemaining,10);updateFireRescue(g,9.9);assert.equal(g.fireRescue.phase,'offered');
 updateFireRescue(g,.1);assert.equal(g.fireRescue,null);assert.ok(g.fireClock>=C.cooldown);assert.equal(g.trees.some(t=>t.fireRescue),false);assert.equal(g.progress.fireDispatch.run,null);assert.equal(events.at(-1).data.text,'');
 assert.deepEqual(g.progress.vehicleHulls,before);assert.equal(g.progress.coins,coins);updateFireRescue(g,1);assert.equal(g.fireRescue,null);
 assert.ok(g.requestFireRescue());assert.equal(g.fireRescue.offerRemaining,10);
});
test('暂停冻结邀请，存档续接剩余秒数，旧邀请默认十秒',()=>{
 const {g}=scene();updateFireRescue(g,4);g.pause();updateFireRescue(g,30);assert.equal(g.fireRescue.offerRemaining,6);g.syncFireRescue();
 const p=JSON.parse(JSON.stringify(g.progress)),restored=new Game(validateProgress(p),()=>.4);assert.equal(restored.fireRescue.offerRemaining,6);restored.start();updateFireRescue(restored,6);assert.equal(restored.fireRescue,null);
 delete p.fireDispatch.run.offerRemaining;const old=new Game(validateProgress(p),()=>.4);assert.equal(old.fireRescue.offerRemaining,10);
});
test('最后一秒接受后不再按邀请倒计时取消救援',()=>{
 const {g}=scene();updateFireRescue(g,9.9);assert.ok(g.startFireRescue());const rescue=g.fireRescue;
 for(let i=0;i<220;i++)updateFireRescue(g,.05);
 assert.equal(g.fireRescue,rescue);assert.notEqual(rescue.phase,'offered');assert.ok(g.fireActive);
});
