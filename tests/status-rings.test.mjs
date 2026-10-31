// 弹药仪表使用真实弹夹快照，覆盖不同资源、补给阶段与暂停语义。
import test from 'node:test';
import assert from 'node:assert/strict';
import { ammoRingState } from '../src/ui/status-rings.js';
import { WEAPONS } from '../src/config/weapons.js';
test('每种枪械按自身弹夹容量显示余量', () => {
  for (const w of WEAPONS.filter((w) => !w.independentSupply)) {
    const s = ammoRingState({ ammo: w.magazineSize / 2, remaining: 0 }, w);
    assert.equal(s.fill, 0.5);
    assert.equal(s.max, w.magazineSize);
    assert.equal(s.state, 'ready');
  }
});
test('换弹由零填满，数字保留真实零弹药', () => {
  const w = WEAPONS[3];
  for (const fraction of [1, 0.5, 0.01]) {
    const s = ammoRingState({ ammo: 0, remaining: w.reloadTime * fraction }, w);
    assert.ok(Math.abs(s.fill - (1 - fraction)) < 1e-8);
    assert.equal(s.count, 0);
    assert.equal(s.mark, 'reload');
    assert.equal(s.max, 100);
  }
});
test('浮游炮返航不提前增长换弹环，暂停描述不改变进度', () => {
  const m = { ammo: 0, remaining: 1 },
    w = WEAPONS[9];
  const s = ammoRingState(m, w, { returning: true, prefix: '2 号炮 · ', stopped: ' · 暂停' });
  assert.equal(s.fill, 0);
  assert.equal(s.mark, 'return');
  assert.match(s.label, /2 号炮.*返航补给.*暂停/);
  assert.deepEqual(m, { ammo: 0, remaining: 1 });
  assert.equal(ammoRingState(m, w).fill, ammoRingState(m, w, { stopped: ' · 暂停' }).fill);
});
test('共享能源与枪械蓄能保留各自语义', () => {
  const s = ammoRingState({ ammo: 0, remaining: 1.6 }, WEAPONS[13], { skill: 0.4 });
  assert.equal(s.icon, 'energy');
  assert.match(s.label, /持续回能/);
  assert.equal(s.inner, 0.4);
});
