import {campPurchasePrice} from '../src/progression/camp-level.js';
import {weaponDamage} from '../src/config/weapon-mods.js';
// 角色招募、旧档扩容、独立成长和逐帧毛色的回归验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../src/config/heroes.js';
import { Game, freshProgress, validateProgress } from '../src/game.js';
import { recolorCatFrame } from '../src/rendering/cat-coats.js';

test('旧双猫存档保留选择与等级，新增角色保持未招募', () => {
  const p = validateProgress({ version: 1, hero: 1, heroes: [4, 7], coins: 987, wood: 123 });
  assert.equal(HEROES.length, 7); assert.equal(new Set(HEROES.map(h => h.breed)).size, 7);
  assert.deepEqual(p.heroes, [4, 7, 0, 0, 0, 0, 0]); assert.equal(p.hero, 1);
  assert.equal(p.coins, 987); assert.equal(p.wood, 123);
  assert.deepEqual(freshProgress().heroes, [1, 0, 0, 0, 0, 0, 0]);
});

test('所有猫可逐一招募切换升级并刷新恢复，数值来自各自品种', () => {
  const g = new Game(freshProgress(), () => 0.5); g.progress.coins = g.progress.wood = 10000;
  for (let index = 0; index < HEROES.length; index++) {
    const spec = HEROES[index], coins = g.progress.coins, price=campPurchasePrice(g.progress,spec);
    assert.ok(g.transact('heroes', index, index ? 'buy' : 'equip'));
    assert.equal(g.progress.coins, coins - price.coins);
    assert.equal(g.maxHp(), spec.hp);
    assert.equal(g.damage(), weaponDamage(g.progress,g.progress.weapon));
    assert.ok(g.transact('heroes', index, 'upgrade'));
    assert.equal(g.maxHp(), spec.hp + 24);
    const restored = validateProgress(JSON.parse(JSON.stringify(g.progress)));
    assert.equal(restored.hero, index); assert.equal(restored.heroes[index], 2);
  }
  assert.deepEqual(g.progress.heroes, [2, 2, 2, 2, 2, 2, 2]);
  assert.equal(g.transact('heroes', 7, 'buy'), false);
});

test('品种着色保留透明轮廓和围巾，四种毛色有明确区别', () => {
  const source = new Uint8ClampedArray(16 * 16 * 4);
  for (let i = 0; i < source.length; i += 4) source.set([240, 205, 145, i % 12 ? 255 : 0], i);
  source.set([100, 145, 110, 255], 0);
  const outputs = [];
  for (const coat of ['tabby', 'point', 'bicolor', 'black']) {
    const data = source.slice(); recolorCatFrame(data, 16, coat);
    assert.deepEqual([...data.slice(0, 4)], [100, 145, 110, 255]);
    for (let i = 3; i < data.length; i += 4) assert.equal(data[i], source[i]);
    outputs.push(data.toString());
  }
  assert.equal(new Set(outputs).size, 4);
});
