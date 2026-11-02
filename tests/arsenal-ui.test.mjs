// 工坊分组与解锁边界：编号不变、装备去重、成长不覆盖。
import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, WEAPON_DISPLAY_ORDER } from '../src/config/weapons.js';
import {
  WEAPON_CATEGORIES,
  weaponCategory,
  workshopWeapons,
} from '../src/config/weapon-categories.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { unlockedWeaponProgress } from '../src/progression/unlock-weapons.js';

test('全部武器恰好归属一个分类，分类内仍按解锁顺序排列', () => {
  const p = freshProgress();
  for (const [i, w] of WEAPONS.entries())
    assert.equal(WEAPON_CATEGORIES.filter((c) => c.weapons?.includes(w.id)).length, 1, w.id);
  for (const c of WEAPON_CATEGORIES.slice(1)) {
    const list = workshopWeapons(p, c.id);
    assert.deepEqual(
      list.slice(1),
      WEAPON_DISPLAY_ORDER.filter((i) => i !== p.weapon && weaponCategory(i) === c.id),
    );
  }
});
test('每种分类都保留当前装备置顶，全部列表无重复无遗漏', () => {
  const p = freshProgress();
  for (let i = 0; i < WEAPONS.length; i++) {
    p.weapon = i;
    for (const c of WEAPON_CATEGORIES) {
      const list = workshopWeapons(p, c.id);
      assert.equal(list[0], i);
      assert.equal(new Set(list).size, list.length);
    }
    assert.equal(workshopWeapons(p).length, WEAPONS.length);
  }
});
test('解锁授予一级所有权，保留资源、成长、当前装备和模块配置，支持重复调用', () => {
  const p = freshProgress();
  p.weapon = 9;
  p.weapons[9] = 7;
  p.mastery[9] = 120;
  p.mods[9] = 2;
  p.funnelLoadout = [9, 0, 12];
  const normalized=validateProgress(p);
  const before = structuredClone(p),
    next = unlockedWeaponProgress(p);
  assert.deepEqual(p, before);
  assert.ok(next.weapons.every((n) => n > 0));
  assert.equal(next.weapons[9], 7);
  for (const k of Object.keys(p).filter((k) => !['weapons','warehouse'].includes(k))) assert.deepEqual(next[k], normalized[k],k);
  assert.ok(next.warehouse.weapons.length>0);
  assert.ok(!next.warehouse.weapons.includes(next.weapon));
  assert.deepEqual(unlockedWeaponProgress(next), next);
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(next))), next);
});
