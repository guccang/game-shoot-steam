// 首次远征第五关引导：真实结算、暂停、读档、返回与再次进入的回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { validateRealms } from '../src/progression/realm-progress.js';
import { updateRealm } from '../src/core/realm-manager.js';

// 只解锁远征设施，以正式补给和祝福接口进入第一关。
function start(progress=freshProgress()) {
  progress.arrival=null;progress.restoration.repaired.push('rogue');
  const g=new Game(progress,()=>.5);
  assert.ok(g.enterRealm('rogue'));
  g.rollRealmEquipment('weapon');g.rollRealmEquipment('vehicle');g.readyRealm();
  assert.ok(g.chooseRealmBlessing(g.realm.offers[0]));
  return g;
}
// 模拟配额已经击败，通关奖励与阶段推进仍走正式事务。
function clear(g) {
  g.enemies=[];g.boss=null;g.realm.kills=g.realm.spec.total;
  updateRealm(g,0);
  assert.equal(g.realm.phase,'choice');
  assert.ok(g.chooseRealmBlessing(g.realm.offers[0]));
}
// 生成未进入第五关战斗的检查点，确保前四关不提前提示。
function reachGuide() {
  const g=start();
  for(let stage=1;stage<=4;stage++) {
    assert.equal(g.realm.stage,stage);assert.equal(g.realm.phase,'combat');clear(g);
  }
  assert.equal(g.realm.stage,5);assert.equal(g.realm.cleared,4);
  assert.equal(g.realm.phase,'guide');return g;
}

test('首次抵达第五关暂停刷怪，刷新保留选择与已发奖励',()=>{
  let g=reachGuide();const coins=g.progress.coins,counts=structuredClone(g.progress.realms.run.blessingCounts);
  for(let n=0;n<20;n++)updateRealm(g,1);
  assert.equal(g.realm.phase,'guide');assert.equal(g.enemies.length,0);assert.equal(g.progress.coins,coins);
  g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.equal(g.realm.phase,'guide');assert.equal(g.state,'realm');assert.equal(g.realm.stage,5);
  assert.equal(g.progress.statistics.plays.rogue,1);assert.equal(g.progress.coins,coins);
  assert.deepEqual(g.realm.blessingCounts,counts);
  assert.ok(g.continueRealm());assert.equal(g.realm.stage,5);assert.equal(g.realm.phase,'combat');
  assert.equal(g.continueRealm(),false);
  clear(g);assert.equal(g.realm.stage,6);assert.equal(g.realm.phase,'combat');
});

test('引导返回保留收益、恢复森林并追踪主线；第二次远征不再提示',()=>{
  const g=reachGuide(),coins=g.progress.coins,forest=g.forestState.player;
  assert.ok(g.leaveRealm());assert.equal(g.realm,null);assert.equal(g.progress.realms.run,null);
  assert.equal(g.player,forest);assert.equal(g.progress.coins,coins);assert.deepEqual(g.progress.taskTracking,{kind:'mainline'});
  const second=start(g.progress);assert.equal(second.realm.firstRun,false);
  for(let n=0;n<4;n++)clear(second);
  assert.equal(second.realm.stage,5);assert.equal(second.realm.phase,'combat');
});

test('中途刷新仍是首次；提前退出再进入及有历史纪录的旧档不会误提示',()=>{
  let g=start();clear(g);g=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.equal(g.realm.firstRun,true);assert.equal(g.realm.stage,2);
  g.leaveRealm();assert.equal(start(g.progress).realm.firstRun,false);
  const p=freshProgress();p.realms.records.rogue.best=3;
  assert.equal(start(p).realm.firstRun,false);
});

test('引导检查点仅接受首次肉鸽第五关、已通关四关的合法组合',()=>{
  const run=reachGuide().progress.realms.run;
  for(const patch of [{stage:6},{cleared:5},{mode:'tower'},{firstRun:false}])
    assert.equal(validateRealms({run:{...run,...patch}}).run,null);
  const legacy={...run,phase:'combat'};delete legacy.firstRun;
  assert.equal(validateRealms({run:legacy}).run.firstRun,false);
});

