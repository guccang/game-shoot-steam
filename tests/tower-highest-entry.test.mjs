// 高塔最高纪录入场回归：正式入口、难度、奖励、失败与刷新检查点保持一致。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {realmStageSpec,realmReward} from '../src/config/realms.js';
import {updateRealm} from '../src/core/realms/realm-manager.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';

// 最高纪录使用已有存档字段，不伪造当前会话检查点。
function setup(best=0){const p=freshProgress();p.realms.records.tower.best=best;const g=new Game(p,()=>.45);g.start();assert.ok(g.enterRealm('tower'));return g;}
// 清理实际生成的敌人与领主，保留正式关卡结算和奖励发放。
function clear(g){let steps=0;while(g.realm.phase==='combat'&&steps++<3000){updateRealm(g,.05);for(const e of g.enemies)if(e.hp>0)g.hit(e,1e9);if(g.boss)g.hit(g.boss,1e9);}assert.equal(g.realm.phase,'rest');}
// 保存冻结森林和秘境起点，复用应用正式读档流程。
function reload(g){g.progress.patrol=capturePatrol(g);return new Game(JSON.parse(JSON.stringify(g.progress)),()=>.45);}

test('首次进入第一层，历史最高纪录直接决定入场层数及真实难度，不补发低层奖励',()=>{
 for(const best of [0,1,5,17,120]){
  const g=setup(best),stage=Math.max(1,best);
  assert.equal(g.realm.stage,stage);assert.equal(g.realm.cleared,stage-1);assert.equal(g.wave,stage);
  assert.deepEqual(g.realm.spec,realmStageSpec('tower',stage));
  assert.deepEqual(g.realm.earnings,{coins:0,wood:0,parts:0,crystal:0,core:0});
  assert.equal(g.progress.realms.records.tower.best,best);
  assert.equal(g.progress.realms.run.stage,stage);
 }
});

test('失败与主动离开后重新进入均保留最高纪录层，不退到第一层',()=>{
 for(const fail of [false,true]){
  const g=setup(17);
  if(fail){g.hurt(1e9);assert.equal(g.realm.phase,'lost');}
  assert.ok(g.leaveRealm());assert.ok(g.enterRealm('tower'));
  assert.equal(g.realm.stage,17);assert.equal(g.realm.cleared,16);assert.equal(g.realm.phase,'combat');
 }
});

test('重战纪录层后推进下一层，新纪录结算后用于下一次入场',()=>{
 const g=setup(5),core=g.progress.materials.core;
 clear(g);assert.equal(g.realm.stage,5);assert.equal(g.progress.realms.records.tower.best,5);
 assert.equal(g.progress.materials.core,core);assert.deepEqual(g.realm.earnings,realmReward('tower',5,5,g.progress));
 assert.ok(g.continueRealm());assert.equal(g.realm.stage,6);clear(g);
 assert.equal(g.progress.realms.records.tower.best,6);
 assert.ok(g.leaveRealm());assert.ok(g.enterRealm('tower'));assert.equal(g.realm.stage,6);
});

test('刷新优先恢复当前挑战与休整检查点，不被最高纪录覆盖',()=>{
 let g=setup(17);clear(g);g.realm.restRemaining=1.5;
 // 更新会话快照后保存，确保休整倒计时也被正式校验。
 updateRealm(g,0);g=reload(g);assert.equal(g.realm.stage,17);assert.equal(g.realm.phase,'rest');assert.equal(g.realm.restRemaining,1.5);
 assert.ok(g.continueRealm());assert.equal(g.realm.stage,18);
 g=reload(g);assert.equal(g.realm.stage,18);assert.equal(g.realm.cleared,17);assert.equal(g.state,'paused');
 assert.equal(g.progress.realms.records.tower.best,17);
});

test('遗留的低层进行中存档仍从原检查点恢复，退出重进才应用最高纪录',()=>{
 let g=setup();g.progress.realms.records.tower.best=30;g=reload(g);
 assert.equal(g.realm.stage,1);assert.ok(g.leaveRealm());assert.ok(g.enterRealm('tower'));assert.equal(g.realm.stage,30);
});

test('高塔纪录不影响探险和守护的初始关卡',()=>{
 for(const mode of ['rogue','guardian']){const g=setup(30);g.leaveRealm();assert.ok(g.enterRealm(mode));assert.equal(g.realm.stage,1);assert.equal(g.realm.cleared,0);}
});
