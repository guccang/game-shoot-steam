// 守护清波回归：视觉正常收尾、残弹即时撤销，移动布防与战斗冻结互不干扰。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { updateRealm } from '../src/core/realms/realm-manager.js';
import { triggerRecoil } from '../src/combat/recoil.js';

// 经过正式击杀和清波入口，保留死亡残影以及最后一击的视觉反馈。
function clearedGuardian() {
  const g = new Game(undefined, () => 0.45);
  g.enterRealm('guardian');
  g.guardianDefense('deploy', 0, 'weapon', 0);
  g.continueRealm();
  g.realm.warning = 0;
  updateRealm(g, 0.01);
  g.realm.kills = g.realm.spec.total - 1;
  g.realm.spawned = g.realm.spec.total;
  g.hit(g.enemies[0], 99999);
  g.shots.push({ life: 0.3, lifetime: 0.3 });
  g.fx.add('ring', g.player.x, g.player.y, 0.6);
  g.burst(g.player.x, g.player.y, '#fff');
  g.projectiles.push({ kind: 'grenade-bomb', damage: 999, life: 2 });
  g.hazards.push({ kind: 'blast', damage: 999, life: 2 });
  triggerRecoil(g.player.recoil, g.loadout.weapon);
  updateRealm(g, 0.01);
  assert.equal(g.realm.phase, 'rest');
  return g;
}

test('清波即时清残弹，已有飘字光束爆炸残影逐帧消散，玩家仍能移动布防', () => {
  const g = clearedGuardian(), x = g.player.x, y = g.player.y;
  assert.equal(g.projectiles.length, 0); assert.equal(g.hazards.length, 0);
  assert.ok(g.numbers.length && g.shots.length && g.fx.items.length && g.remnants.length);
  const number = g.numbers[0], life = number.life, top = number.y;
  const money = g.realm.realmCoins, earnings = JSON.stringify(g.realm.earnings);
  const health = [g.player.hp, g.realm.goddess.hp], time = g.time, spawned = g.realm.spawned;
  const magazine = g.magazines[g.loadout.weapon]; magazine.remaining = 1;
  const towerMagazine = g.realm.defenses[0].runtime.vehicle.module.magazine;
  towerMagazine.remaining = 1;
  const ammo = magazine.ammo, towerAmmo = towerMagazine.ammo;
  g.update(0.05, { x: 1, y: 0 });
  assert.ok(number.life < life && number.y < top); assert.ok(g.shots.length, '余辉不能瞬间删除');
  for (let i = 0; i < 60; i++) g.update(0.05, { x: 1, y: 0 });
  assert.ok(Math.hypot(g.player.x - x, g.player.y - y) > 0);
  for (const key of ['numbers', 'shots', 'particles', 'drops', 'remnants', 'projectiles', 'hazards']) assert.equal(g[key].length, 0, key);
  assert.equal(g.fx.items.length, 0); assert.equal(g.player.recoil.flash, 0);
  assert.deepEqual([g.player.hp, g.realm.goddess.hp], health);
  assert.equal(g.time, time); assert.equal(g.realm.spawned, spawned);
  assert.equal(magazine.remaining, 1); assert.equal(towerMagazine.remaining, 1);
  assert.equal(magazine.ammo, ammo); assert.equal(towerMagazine.ammo, towerAmmo);
  assert.equal(g.realm.realmCoins, money); assert.equal(JSON.stringify(g.realm.earnings), earnings);
  assert.ok(g.guardianDefense('upgrade', 0));
  assert.ok(g.continueRealm());
  assert.equal(g.realm.stage, 2); assert.equal(g.realm.phase, 'combat');
  assert.equal(g.projectiles.length, 0); assert.equal(g.hazards.length, 0);
});

test('真正暂停仍冻结特效，恢复波间后继续消散', () => {
  const g = clearedGuardian(), life = g.numbers[0].life;
  g.state = 'paused';
  g.update(0.05, { x: 1, y: 0 });
  assert.equal(g.numbers[0].life, life);
  g.state = 'realm';g.update(0.05);
  assert.ok(g.numbers[0].life < life);
});
