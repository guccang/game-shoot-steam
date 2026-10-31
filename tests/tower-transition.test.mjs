// 时空之塔自动传送回归：真实帧循环、暂停恢复、检查点和连续换区。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { updateRealm } from '../src/core/realm-manager.js';
import { towerRealmLandmark } from '../src/world/realm-entrances.js';
import { triggerRecoil } from '../src/combat/recoil.js';
import { blocked } from '../src/physics/motion.js';

// 通过正式通关事务结算本层，保留帧循环与下一层初始化行为。
function clearFloor(game) {
  game.enemies = []; game.boss = null;
  game.realm.kills = game.realm.spec.total;
  updateRealm(game, 0);
}

// 用固定帧步长推进游戏，避免大步长被正式循环截断而产生假通过。
function advance(game, seconds) {
  for (let i = 0; i < Math.round(seconds * 20); i++) game.update(.05);
}

test('5秒自动进入下一层，固定随机数也连续换区且不重复发奖', () => {
  const g = new Game(freshProgress(), () => 0);
  g.enterRealm('tower');
  for (let stage = 1; stage <= 3; stage++) {
    const arena = { ...g.realm.arena };
    clearFloor(g);
    const coins = g.progress.coins, ammo = g.magazines[0].ammo, vehicle = g.vehicle;
    assert.equal(g.realm.restRemaining, 5);
    advance(g, 4.95);
    assert.equal(g.realm.stage, stage);
    assert.equal(g.realm.phase, 'rest');
    advance(g, .05);
    assert.equal(g.realm.stage, stage + 1);
    assert.equal(g.realm.phase, 'combat');
    assert.equal(g.state, 'playing');
    assert.notDeepEqual(g.realm.arena, arena);
    assert.deepEqual(g.player.arena, g.realm.arena);
    assert.equal(blocked(g.player.x, g.player.y, 42, g.trees, g.player), false);
    assert.equal(g.progress.coins, coins);
    assert.equal(g.magazines[0].ammo, ammo);
    assert.equal(g.vehicle, vehicle);
    assert.equal(g.continueRealm(), false);
    assert.equal(g.realm.warning, 3);
    const landmark = towerRealmLandmark(g.realm.arena);
    assert.equal(landmark.mode, 'tower');
    assert.ok(Math.hypot(landmark.x - g.player.x, landmark.y - g.player.y) < 160);
  }
});

test('休整暂停冻结倒计时，刷新恢复剩余秒数和位置，退出取消自动推进', () => {
  const g = new Game(); g.enterRealm('tower'); clearFloor(g); advance(g, 2);
  const remaining = g.realm.restRemaining;
  g.pause(); advance(g, 10);
  assert.equal(g.realm.restRemaining, remaining);
  assert.equal(g.state, 'paused');
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)), () => .99);
  assert.deepEqual(restored.realm.arena, g.realm.arena);
  assert.equal(restored.realm.restRemaining, remaining);
  advance(restored, 3);
  assert.equal(restored.realm.stage, 2);
  g.start(); advance(g, 1);
  assert.ok(g.realm.restRemaining < remaining);
  g.leaveRealm(); advance(g, 10);
  assert.equal(g.realm, null);
  assert.equal(g.progress.realms.run, null);
});

test('传送保留载具耐久和弹药，移除旧场景弹道与飞控锁定', () => {
  const g = new Game(); g.enterRealm('tower'); clearFloor(g);
  g.vehicle.hp = 40; g.vehicle.cooldown = 17; g.magazines[0].ammo = 2;
  g.funnel.nodes[0].targetId = 42; g.drone.nodes[0].targetId = 42;
  g.shots.push({ x: 1, y: 1 }); g.fx.items.push({ x: 1, y: 1 });
  advance(g, 5);
  assert.equal(g.vehicle.hp, 40); assert.equal(g.vehicle.cooldown, 17);
  assert.equal(g.magazines[0].ammo, 2);
  assert.equal(g.funnel.nodes[0].targetId, null); assert.equal(g.drone.nodes[0].targetId, null);
  assert.equal(g.shots.length, 0); assert.equal(g.fx.items.length, 0);
});

// 最后一击留下真实死亡表现，验证层间继续动作但不推进战斗资源。
test('高塔倒计时可移动、收尾动画连续，暂停冻结且不补给或重复发奖',()=>{
 const g=new Game(freshProgress(),()=>.45);g.enterRealm('tower');g.realm.warning=0;updateRealm(g,.01);
 g.realm.kills=g.realm.spec.total-1;g.realm.spawned=g.realm.spec.total;g.hit(g.enemies[0],99999);
 g.shots.push({life:.3,lifetime:.3});g.fx.add('ring',g.player.x,g.player.y,.6);g.burst(g.player.x,g.player.y,'#fff');
 g.projectiles.push({life:2,damage:999});g.enemyBolts.push({life:2,damage:999});g.hazards.push({life:2,damage:999});
 triggerRecoil(g.player.recoil,g.loadout.weapon);updateRealm(g,0);
 assert.equal(g.canExploreRealm,true);assert.equal(g.realm.phase,'rest');
 for(const key of ['projectiles','enemyBolts','hazards'])assert.equal(g[key].length,0);
 const start={x:g.player.x,y:g.player.y},number=g.numbers[0],life=number.life,time=g.time,hp=g.player.hp,coins=g.progress.coins;
 const magazine=g.magazines[g.loadout.weapon];magazine.ammo=1;magazine.remaining=2;g.vehicle.cooldown=17;
 g.update(.05,{x:1,y:0});assert.ok(number.life<life);assert.ok(g.shots.length);assert.ok(g.realm.idleTime>0);
 assert.ok(Math.hypot(g.player.x-start.x,g.player.y-start.y)>0);
 const frozen={x:g.player.x,life:number.life,idle:g.realm.idleTime,remaining:g.realm.restRemaining};g.pause();g.update(.05,{x:1,y:0});
 assert.deepEqual({x:g.player.x,life:number.life,idle:g.realm.idleTime,remaining:g.realm.restRemaining},frozen);
 g.pause();advance(g,3);
 for(const key of ['numbers','shots','particles','drops','remnants'])assert.equal(g[key].length,0,key);
 assert.equal(g.fx.items.length,0);assert.equal(g.player.recoil.flash,0);assert.equal(g.player.hp,hp);
 assert.equal(g.progress.coins,coins);assert.equal(g.time,time);assert.equal(magazine.ammo,1);assert.equal(magazine.remaining,2);assert.equal(g.vehicle.cooldown,17);
 assert.equal(g.realm.stage,1);assert.ok(g.realm.idleTime>=3);
 advance(g,1.95);assert.equal(g.realm.stage,2);assert.equal(g.realm.warning,3);assert.equal(g.progress.coins,coins);
});
