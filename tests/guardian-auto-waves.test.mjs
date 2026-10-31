// 守护自动开波回归：计时、手动跳过、移动布防、暂停与旧检查点迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { updateRealm } from '../src/core/realm-manager.js';
import { GUARDIAN_REST_SECONDS } from '../src/config/realms.js';
import { validateRealms } from '../src/progression/realm-progress.js';

// 使用正式清波事务创建已结算的休整阶段，保留部署与站位。
function resting() {
  const g = new Game(undefined, () => .45);
  g.enterRealm('guardian'); g.guardianDefense('deploy',0,'weapon',0); g.continueRealm();
  g.realm.kills = g.realm.spec.total; g.enemies = []; g.boss = null;
  updateRealm(g,0);
  return g;
}

// 固定帧推进正式循环，避免大步长截断影响精确开波边界。
function advance(g, seconds, input) {
  for(let i=0;i<Math.round(seconds*20);i++)g.update(.05,input);
}

test('清波后完整等待20秒，只自动推进一波，场地布防和奖励保持', () => {
  const g=resting(), arena={...g.realm.arena}, coins=g.progress.coins;
  assert.equal(g.realm.phase,'rest'); assert.equal(g.realm.restRemaining,GUARDIAN_REST_SECONDS);
  assert.deepEqual(g.realm.offers,[]);
  const x=g.player.x; advance(g,.5,{x:1,y:0}); assert.notEqual(g.player.x,x);
  assert.ok(g.guardianDefense('upgrade',0));
  const balance=g.realm.realmCoins;
  advance(g,19.45); assert.equal(g.realm.phase,'rest'); assert.equal(g.realm.stage,1);
  const position={x:g.player.x,y:g.player.y};
  advance(g,.05); assert.equal(g.realm.phase,'combat'); assert.equal(g.realm.stage,2);
  assert.equal(g.state,'playing'); assert.equal(g.realm.warning,3);
  assert.deepEqual(g.realm.arena,arena); assert.deepEqual({x:g.player.x,y:g.player.y},position);
  assert.equal(g.realm.defenses[0].level,2); assert.equal(g.realm.realmCoins,balance);
  assert.equal(g.progress.coins,coins); assert.equal(g.continueRealm(),false);
});

test('暂停冻结计时，刷新保留剩余秒数，点击提前开波不能重复推进', () => {
  const g=resting(); advance(g,7); const remaining=g.realm.restRemaining;
  g.pause(); advance(g,10); assert.equal(g.realm.restRemaining,remaining);
  assert.equal(g.state,'paused'); g.start(); assert.equal(g.state,'realm');
  const restored=new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.realm.restRemaining,remaining); assert.equal(restored.realm.phase,'rest');
  assert.ok(restored.continueRealm()); assert.equal(restored.realm.stage,2);
  assert.equal(restored.continueRealm(),false);
  assert.equal(restored.chooseRealmBlessing('power'),false);
  g.leaveRealm(); advance(g,20); assert.equal(g.realm,null);
});

test('旧守护祝福页迁移为20秒休整，保留余额与部署，拒绝失守和矛盾进度', () => {
  const g=resting(), old=structuredClone(g.progress.realms.run);
  Object.assign(old,{phase:'choice',offers:['mend','heal','power'],restRemaining:1});
  const migrated=validateRealms({run:old}).run;
  assert.equal(migrated.phase,'rest'); assert.equal(migrated.restRemaining,20);
  assert.deepEqual(migrated.offers,[]); assert.deepEqual(migrated.defenses,old.defenses);
  assert.equal(migrated.realmCoins,old.realmCoins);
  assert.equal(validateRealms({run:{...old,goddessHp:0}}).run,null);
  assert.equal(validateRealms({run:{...old,cleared:0}}).run,null);
});
