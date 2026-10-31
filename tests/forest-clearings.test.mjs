// 验证实际战场的活动空间、地标留白和采集树再生，不依赖截图颜色或随机删树。
import test from 'node:test';
import assert from 'node:assert/strict';
import {forestReward} from '../src/config/economy.js';
import { Game, freshProgress } from '../src/game.js';
import { coversScenery, CAMP_EDGE_TREES } from '../src/world/forest-clearings.js';
import { WORLD, worldDistance } from '../src/world/coordinates.js';
import {TOWN_LAYOUT,townPoint} from '../src/config/town-layout.js';
import {settlementAt} from '../src/world/settlements.js';

test('实际生成树冠避开小屋、帐篷、三片麦田和沙湾，环形镜像一致', () => {
  const game = new Game(freshProgress(), () => 0.5);
  for (const tree of game.trees) {
    assert.equal(coversScenery(tree.x, tree.y), false, `树冠压住地标：${tree.x},${tree.y}`);
    assert.equal(coversScenery(tree.x + WORLD.width, tree.y - WORLD.height), false);
  }
  const camp = game.trees.filter(t => settlementAt(t)?.id==='sunleaf');
  assert.ok(camp.length >= 2 && camp.length <= 8, '营地只保留少量分散的景观树');
});

test('营地到南侧活动区、桥头与小屋门前保留角色宽度的连续通路', () => {
  const game = new Game(freshProgress(), () => 0.5);
  for (const [from, to] of [
    [TOWN_LAYOUT.spawn, townPoint({ x: 900, y: 1030 })],
    [townPoint({ x: 900, y: 780 }), { x: 1160, y: 780 }],
    [townPoint({ x: 1010, y: 610 }), townPoint({ x: 1010, y: 780 })],
  ]) {
    for (let step = 0; step <= 40; step++) {
      const p = { x: from.x + (to.x - from.x) * step / 40,
        y: from.y + (to.y - from.y) * step / 40 };
      assert.ok(game.trees.every(tree => worldDistance(p, tree) > tree.radius + 18),
        `通路被树干堵住：${p.x},${p.y}`);
    }
  }
});

test('边缘采集树保留资源奖励并在原位置再生，重建战场不恢复旧近景树', () => {
  const game = new Game(freshProgress(), () => 0.5);
  game.start(); game.enemies = []; game.attackTimer = 999;
  const position = CAMP_EDGE_TREES[0];
  const tree = game.trees.find(t => t.x === position.x && t.y === position.y);
  const wood = game.progress.wood, coins = game.progress.coins, reward=forestReward('tree',0,game.progress);
  game.hit(tree, 9999);
  assert.equal(game.progress.wood, wood + reward.wood);
  assert.equal(game.progress.coins, coins + reward.coins);
  game.stumps[0].life = 0;
  game.update(0.01, { x: 0, y: 0 });
  const regrown = game.trees.find(t => t.x === position.x && t.y === position.y && t.hp > 0);
  assert.ok(regrown); assert.equal(regrown.size, position.size);
  game.reset();
  for (const [x, y] of [[1045, 640], [750, 660], [960, 870]])
    assert.ok(!game.trees.some(t => t.x === x && t.y === y));
});
