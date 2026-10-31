// 后坐回归：冲量、阻尼回弹、左右镜像、连射限幅以及战斗状态衔接。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { createRecoil, triggerRecoil, updateRecoil, weaponPose, muzzlePosition, RECOIL_PROFILES } from '../src/combat/recoil.js';

// 构建固定战场，让目标足够耐打，避免死亡影响射击节奏。
function armedGame(weapon = 0) {
  const progress = freshProgress(); progress.weapons = [1, 1]; progress.weapon = weapon;
  const game = new Game(progress, () => .5); game.start(); game.trees = []; game.enemies = [];
  game.spawnEnemy(0, 180); game.enemies[0].hp = game.enemies[0].maxHp = 10000; return game;
}

test('只有实际射击产生后坐，弹道从冲量前的枪口发出且不移动角色', () => {
  const game = armedGame(), player = game.player; player.angle = 0;
  const position = { x: player.x, y: player.y }, muzzle = muzzlePosition(player, 0);
  game.attack(); assert.equal(game.projectiles[0].x, muzzle.x); assert.equal(game.projectiles[0].y, muzzle.y);
  assert.ok(player.recoil.kick > 0 && player.recoil.rise > 0 && player.recoil.flash > 0);
  assert.deepEqual({ x: player.x, y: player.y }, position);
  game.enemies = []; player.recoil = createRecoil(); assert.equal(game.attack(), false); assert.deepEqual(player.recoil, createRecoil());
});

test('后坐先冲起再回正，手枪冲击强于激光步枪，停止后无残留抬升', () => {
  const states = [createRecoil(), createRecoil()];
  states.forEach((state, weapon) => triggerRecoil(state, weapon));
  const initial = states[0].kick;
  states.forEach((state, weapon) => updateRecoil(state, weapon, .04));
  assert.ok(states[0].kick > initial); assert.ok(states[0].kick > states[1].kick); assert.ok(states[0].rise > states[1].rise);
  for (let i = 0; i < 240; i++) states.forEach((state, weapon) => updateRecoil(state, weapon, 1 / 120));
  for (const state of states) assert.deepEqual(state, createRecoil());
});

test('左右持枪镜像都表现为枪口向屏幕上方抬升，八方向无数值异常', () => {
  const state = createRecoil(); triggerRecoil(state, 0); updateRecoil(state, 0, .04);
  const right = weaponPose(0, 0, state), left = weaponPose(Math.PI, 0, state);
  assert.ok(right.muzzleY < weaponPose(0).muzzleY); assert.ok(left.muzzleY < weaponPose(Math.PI).muzzleY);
  assert.ok(Math.abs(right.muzzleX + left.muzzleX) < 1e-8); assert.ok(Math.abs(right.muzzleY - left.muzzleY) < 1e-8);
  for (let i = 0; i < 8; i++) for (const value of Object.values(weaponPose(i * Math.PI / 4, 1, state))) assert.ok(Number.isFinite(value));
});

test('持续连射叠加受上限约束，低帧率与高帧率回弹一致', () => {
  const state = createRecoil();
  for (let i = 0; i < 150; i++) {
    triggerRecoil(state, 1); updateRecoil(state, 1, 1 / 60);
    assert.ok(state.kick <= RECOIL_PROFILES[1].maxKick); assert.ok(state.rise <= RECOIL_PROFILES[1].maxRise);
  }
  const slow = createRecoil(), fast = createRecoil(); triggerRecoil(slow, 0); triggerRecoil(fast, 0);
  for (let i = 0; i < 9; i++) updateRecoil(slow, 0, 1 / 30);
  for (let i = 0; i < 36; i++) updateRecoil(fast, 0, 1 / 120);
  assert.ok(Math.abs(slow.kick - fast.kick) < .001); assert.ok(Math.abs(slow.rise - fast.rise) < .0001);
});

test('暂停冻结动作，换枪与重生清空旧后坐，射击间隔保持瞄准', () => {
  const game = armedGame(); game.attack(); const recoil = structuredClone(game.player.recoil);
  game.pause(); game.update(.05); assert.deepEqual(game.player.recoil, recoil);
  game.pause(); game.attackTimer = 2; game.update(.05, { x: -1, y: 0 }); assert.equal(game.player.angle, 0);
  game.transact('weapons', 1, 'equip'); assert.deepEqual(game.player.recoil, createRecoil());
  game.attack(); game.hurt(10000); game.start(); assert.deepEqual(game.player.recoil, createRecoil()); assert.equal(game.player.aimHold, 0);
});
