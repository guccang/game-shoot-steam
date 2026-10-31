// 解锁排序和早期激光定位回归，覆盖旧存档身份、实际换弹、射程与射击间隔。
import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, WEAPON_DISPLAY_ORDER } from '../src/config/weapons.js';
import { Game, freshProgress, validateProgress } from '../src/game.js';
import { advanceReload } from '../src/combat/magazine.js';

test('展示按门槛和价格递增，存档编号不随展示位置改变', () => {
  assert.deepEqual(WEAPON_DISPLAY_ORDER, [0, 14, 17, 3, 5, 1, 4, 7, 2, 11, 10, 6, 8, 9, 13, 15, 12, 16]);
  assert.equal(WEAPONS[1].id, 'laser');
  const progress = freshProgress();
  progress.weapon = 1;
  progress.weapons[1] = 7;
  progress.mastery[1] = 120;
  progress.mods[1] = 2;
  const restored = validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.equal(restored.weapon, 1);
  assert.equal(restored.weapons[1], 7);
  assert.equal(restored.mastery[1], 120);
  assert.equal(restored.mods[1], 2);
  assert.equal(new Game(restored).weapon().name, '萤火激光步枪');
});

// 使用高血量树靶，排除怪物死亡和移动对射速测试的干扰。
function laserArena() {
  const progress = freshProgress();
  progress.weapon = 1;
  progress.weapons[1] = 1;
  const g = new Game(progress, () => 0.5);
  g.start();
  g.enemies = [];
  g.trees = [];
  g.spawnTimer = 999;
  g.addTree(1130, 700, { hp: 100000, maxHp: 100000 });
  return g;
}

// 按真实更新入口推进，控制浮点累积与单帧上限。
function step(g, time) {
  while (time > 1e-8) {
    const dt = Math.min(time, 0.01);
    g.update(dt);
    time -= dt;
  }
}

test('激光每夹20发、装填2.2秒，射程300且间隔0.24秒', () => {
  const g = laserArena(),
    w = g.weapon(),
    mag = g.magazines[1];
  assert.equal(w.damage, 12);
  assert.equal(w.range, 300);
  assert.equal(w.interval, 0.24);
  g.trees[0].x = 1230;
  assert.equal(g.attack(), false);
  g.trees[0].x = 1130;
  assert.equal(g.attack(), true);
  g.attackTimer = w.interval;
  step(g, 0.23);
  assert.equal(mag.ammo, 19);
  step(g, 0.02);
  assert.equal(mag.ammo, 18);
  for (let i = 0; i < 18; i++) assert.equal(g.attack(), true);
  assert.equal(mag.ammo, 0);
  assert.equal(mag.remaining, 2.2);
  assert.equal(g.attack(), false);
  advanceReload(mag, w, 1.8);
  assert.equal(mag.ammo, 0);
  assert.ok(mag.remaining > 0.39);
  advanceReload(mag, w, 0.4);
  assert.equal(mag.remaining, 0);
  assert.equal(mag.ammo, 20);
});
