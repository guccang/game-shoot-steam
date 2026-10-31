// 验证真实攻击与自动装填的衔接，覆盖多弹丸、蓄能、暂停、切换和重新出发。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, WEAPONS } from '../src/game.js';
import { advanceReload } from '../src/combat/magazine.js';

// 静止高血量树提供稳定靶子，隔离怪物移动与死亡对换弹测试的影响。
function arena(index = 0) {
  const events = [];
  const g = new Game(
    freshProgress(),
    () => 0.5,
    (type) => events.push(type),
  );
  g.progress.weapons.fill(1);
  g.progress.weapon = index;
  g.trees = [];
  g.enemies = [];
  g.aimLock = null;
  g.addTree(1040, 700, { hp: 1000000, maxHp: 1000000 });
  g.start();
  g.spawnTimer = 999;
  g.attackTimer = 999;
  return { g, events };
}

// 以生产更新步长推进世界，允许在装填期间验证移动与暂停。
function step(g, seconds, input = { x: 0, y: 0 }) {
  while (seconds > 1e-8) {
    const dt = Math.min(1 / 120, seconds);
    g.update(dt, input);
    seconds -= dt;
  }
}

test('全部手持枪按有效射击扣一发，空夹立即自动装填，空场不会扣弹', () => {
  for (let index = 0; index < WEAPONS.length; index++) {
    // 独立三炮调度由 funnel 专项测试覆盖。
    if (WEAPONS[index].controller) continue;
    const { g } = arena(index),
      weapon = WEAPONS[index],
      mag = g.magazines[index];
    const trees = g.trees;
    g.trees = [];
    assert.equal(g.attack(), false);
    assert.equal(mag.ammo, weapon.magazineSize);
    g.trees = trees;
    // 近战电锯使用接触距离的靶子，仍执行同一套扣能量、空仓和补给验收。
    if (weapon.attackKind === 'melee') trees[0].x = g.player.x + 60;
    for (let i = 0; i < weapon.magazineSize; i++) {
      if (weapon.chargeTime) {
        g.pulse.charge = weapon.chargeTime;
        g.pulse.cooldown = 0;
      }
      assert.equal(g.attack(), true, weapon.id);
      assert.equal(mag.ammo, weapon.magazineSize - i - 1);
    }
    assert.equal(mag.remaining, weapon.reloadTime);
    const count = g.projectiles.length;
    assert.equal(g.attack(), false);
    assert.equal(g.projectiles.length, count);
  }
});

test('散弹六弹丸仅消耗一发，脉冲蓄能不扣弹且释放才消耗', () => {
  const { g } = arena(3);
  g.attack();
  assert.equal(g.projectiles.length, 6);
  assert.equal(g.magazines[3].ammo, 5);
  const { g: p, events } = arena(9);
  step(p, 0.8);
  assert.equal(p.magazines[9].ammo, 3);
  assert.ok(p.pulse.charge > 0.7);
  step(p, 0.41);
  assert.equal(events.filter((e) => e === 'shot').length, 1);
  assert.equal(p.magazines[9].ammo, 2);
});

test('空夹禁止攻击，换弹仍可走位和命中在途弹，装填完成自动继续且不扣资源', () => {
  const { g, events } = arena(),
    mag = g.magazines[0];
  mag.ammo = 1;
  const resources = [g.progress.coins, g.progress.wood],
    tree = g.trees[0];
  g.attack();
  step(g, 0.3, { x: 0, y: 1 });
  assert.ok(g.player.y > 730);
  assert.ok(tree.hp < tree.maxHp);
  assert.equal(events.filter((e) => e === 'shot').length, 1);
  assert.ok(mag.remaining > 0.8);
  step(g, 0.88);
  assert.equal(mag.ammo, 0);
  assert.equal(g.attack(), false);
  step(g, 0.03);
  assert.equal(events.filter((e) => e === 'shot').length, 2);
  assert.equal(mag.ammo, 11);
  assert.deepEqual([g.progress.coins, g.progress.wood], resources);
});

test('暂停和倒下冻结装填，无目标仍能装填，重新出发与清空进度恢复满夹', () => {
  const { g } = arena();
  g.magazines[0].ammo = 1;
  g.attack();
  step(g, 0.2);
  g.trees = [];
  const left = g.magazines[0].remaining;
  g.pause();
  step(g, 2);
  assert.equal(g.magazines[0].remaining, left);
  g.pause();
  step(g, 1.1);
  assert.equal(g.magazines[0].ammo, 12);
  g.magazines[0].ammo = 0;
  g.magazines[0].remaining = 0.7;
  g.hurt(99999);
  step(g, 1);
  assert.equal(g.magazines[0].remaining, 0.7);
  g.start();
  assert.equal(g.magazines[0].ammo, 12);
  assert.equal(g.magazines[0].remaining, 0);
  g.magazines[0].ammo = 2;
  g.resetProgress();
  assert.equal(g.magazines[0].ammo, 12);
});

test('切枪保留各自余弹与装填，升级、换角色不补弹，永久存档不包含弹夹', () => {
  const { g } = arena();
  g.magazines[0].ammo = 1;
  g.attack();
  step(g, 0.2);
  const left = g.magazines[0].remaining;
  g.transact('weapons', 3, 'equip');
  g.attack();
  assert.equal(g.magazines[3].ammo, 5);
  step(g, 0.5);
  assert.equal(g.magazines[0].remaining, left);
  g.progress.coins = 10000;
  g.progress.wood = 10000;
  g.transact('weapons', 3, 'upgrade');
  assert.equal(g.magazines[3].ammo, 5);
  g.progress.heroes[1] = 1;
  g.transact('heroes', 1, 'equip');
  assert.equal(g.magazines[3].ammo, 5);
  g.transact('weapons', 0, 'equip');
  assert.equal(g.magazines[0].remaining, left);
  assert.equal(g.attack(), false);
  assert.equal('magazines' in g.progress, false);
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.magazines[0].ammo, 12);
});

test('换弹期间榴弹不触发、脉冲不蓄能，完成后恢复各自攻击周期', () => {
  const { g, events } = arena(6);
  g.magazines[6].ammo = 1;
  g.weaponCycle = { charge: 2.99, firing: true };
  g.attack();
  step(g, 1);
  assert.equal(events.filter((e) => e === 'grenade-launch').length, 0);
  assert.equal(g.weaponCycle.charge, 0);
  const { g: p, events: pe } = arena(9);
  p.magazines[9].ammo = 1;
  p.pulse.charge = 1.2;
  p.attack();
  step(p, 3.1);
  assert.equal(pe.filter((e) => e === 'shot').length, 1);
  assert.equal(p.pulse.charge, 0);
  step(p, 2.6);
  assert.equal(pe.filter((e) => e === 'shot').length, 2);
});

test('装填时长按秒计算，30/120帧一致且只把完成后剩余时间交给蓄能', () => {
  for (const fps of [30, 120]) {
    const mag = { ammo: 0, remaining: WEAPONS[8].reloadTime };
    for (let i = 0; i < fps * 2; i++) advanceReload(mag, WEAPONS[8], 1 / fps);
    assert.equal(mag.ammo, 0);
    assert.ok(Math.abs(mag.remaining - 0.4) < 1e-8);
    const active = advanceReload(mag, WEAPONS[8], 0.5);
    assert.ok(Math.abs(active - 0.1) < 1e-8);
    assert.equal(mag.ammo, 5);
    assert.equal(mag.remaining, 0);
  }
});
