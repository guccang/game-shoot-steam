import { WORLD } from '../src/world/coordinates.js';
// 激光削弱回归：真实扣血、混合目标、近枪口去重、改装暴击和循环地图。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { fireBallistics } from '../src/combat/ballistics.js';

// 排列不同类型的目标，并反转容器顺序，验证结算仍遵循弹道先后。
function lane(origin = 900, mod = 0) {
  const progress = freshProgress();
  progress.weapon = 1;
  progress.weapons[1] = 1;
  progress.mastery[1] = mod ? 40 : 0;
  progress.mods[1] = mod;
  const game = new Game(progress, () => 0.5);
  game.start();
  game.trees = [];
  game.enemies = [];
  game.player.x = origin;
  game.player.y = 700;
  const targets = [];
  for (let i = 0; i < 7; i++) {
    game.spawnEnemy(0, 50);
    const target = game.enemies.at(-1);
    Object.assign(target, {
      x: (origin + 30 + i * 45) % WORLD.width,
      y: 700,
      hp: 1000,
      maxHp: 1000,
      radius: 14,
    });
    if (i === 1) {
      game.enemies.pop();
      target.type = 'tree';
      game.trees.push(target);
    } else if (i === 2) {
      game.enemies.pop();
      target.type = 'boss';
      game.boss = target;
    }
    targets.push(target);
  }
  game.enemies.reverse();
  return { game, targets };
}

// 固定枪口穿过首个目标，使近枪口段和主射线重复命中同一碰撞体。
function fire(game, amount, critical = false) {
  fireBallistics(
    game,
    game.weapon(),
    { x: game.player.x + 40, y: 692 },
    { x: 1, y: 0 },
    amount,
    critical,
  );
}

test('树木、怪物和领主共同消耗三个穿透名额，光束停在第三个目标', () => {
  const { game, targets } = lane();
  fire(game, 12);
  assert.deepEqual(
    targets.map((t) => 1000 - t.hp),
    [12, 6, 3, 0, 0, 0, 0],
  );
  assert.deepEqual(
    game.numbers.map((n) => n.text),
    ['12', '6', '3'],
  );
  assert.equal(game.shots.length, 1);
  assert.ok(Math.abs(game.shots[0].ex - targets[2].x) <= targets[2].radius + 5);
  fire(game, 12);
  assert.deepEqual(
    targets.map((t) => 1000 - t.hp),
    [24, 12, 6, 0, 0, 0, 0],
  );
});

test('跨地图边界与两种改装均保持减半，暴击仅使用本次射击快照', () => {
  for (const mod of [0, 1, 2]) {
    const { game, targets } = lane(WORLD.width - 40, mod);
    assert.equal(game.weapon().pierceDecay, 0.5);
    assert.equal(game.weapon().pierce, 3);
    fire(game, 70, true);
    assert.deepEqual(
      targets.map((t) => 1000 - t.hp),
      [70, 35, 18, 0, 0, 0, 0],
    );
    assert.deepEqual(
      game.numbers.map((n) => n.text),
      ['70!', '35!', '18!'],
    );
  }
});

test('死亡目标不消耗穿透层数，击杀首目标后仍按半伤结算下一个', () => {
  const { game, targets } = lane();
  targets[0].hp = 1;
  targets[1].hp = 0;
  fire(game, 64);
  assert.equal(game.kills, 1);
  assert.deepEqual(
    targets.slice(2).map((t) => 1000 - t.hp),
    [32, 16, 0, 0, 0],
  );
  fire(game, 64);
  assert.equal(game.kills, 1);
  assert.equal(targets[2].hp, 1000 - 32 - 64);
});
