import { WORLD } from '../src/world/coordinates.js';
// 验证穿透武器选密集射线、持续锁向与最远目标中点构图，不依赖静态配置断言。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { piercingLane, updateAimLock } from '../src/combat/targeting.js';
import { sniperGuide } from '../src/combat/aim.js';
import { CombatCamera } from '../src/rendering/camera.js';

// 使用静止高血量目标独立验证射线顺序，保留真实扫掠碰撞。
function enemy(id, x, y = 600) {
  return { id, type: 'enemy', x, y, hp: 2000, maxHp: 2000, radius: 17, mass: 1, speed: 0 };
}
// 隔离刷新配额与原生树木，初始状态没有任何历史锁定。
function arena(weapon) {
  const g = new Game(freshProgress(), () => 0.5);
  g.trees = [];
  g.enemies = [];
  g.aimLock = null;
  g.progress.weapon = weapon;
  g.progress.weapons[weapon] = 1;
  Object.assign(g.player, { x: 900, y: 600 });
  g.start();
  g.spawnTimer = 999;
  return g;
}

test('狙击与脉冲都选择可贯穿最多怪物的方向，而非最近单怪', () => {
  for (const weapon of [8, 9]) {
    const g = arena(weapon);
    const group = [enemy(1, 1100), enemy(2, 1200), enemy(3, 1350)];
    g.enemies = [enemy(9, 830), ...group];
    assert.equal(g.findAttackTarget().id, 1);
    updateAimLock(g, 0);
    assert.ok(g.aimLock.direction.x > 0.99);
    assert.deepEqual(g.aimLock.focus, { x: 1350, y: 600 });
    assert.equal(piercingLane(g).count, 3);
    if (weapon === 9) g.pulse.charge = 1.2;
    assert.ok(g.attack());
    g.updateProjectiles(0.3);
    assert.ok(group.every((t) => t.hp < 2000));
    assert.equal(g.enemies[0].hp, 2000);
  }
});

test('新怪增多和前排击杀不抢走目标组，原组清空后立即选新线', () => {
  const g = arena(8);
  g.enemies = [enemy(1, 1100), enemy(2, 1250), enemy(3, 1400)];
  updateAimLock(g, 0);
  const original = structuredClone(g.aimLock);
  g.enemies[0].hp = 0;
  g.enemies.push(...[700, 620, 540, 460, 380].map((x, i) => enemy(20 + i, x)));
  for (let i = 0; i < 60; i++) updateAimLock(g, 1 / 60);
  assert.ok(g.aimLock.direction.x > 0.99);
  assert.ok(g.aimLock.memberIds.every((id) => [2, 3].includes(id)));
  assert.equal(g.findAttackTarget().id, 2);
  assert.deepEqual(g.aimLock.focus, original.focus, '前排死亡不改变最远注视目标');
  g.enemies[1].hp = g.enemies[2].hp = 0;
  assert.ok(g.findAttackTarget().x < 900, '击杀后只读查询立即获得新目标');
  assert.ok(sniperGuide(g).direction.x < -0.99, '预览不能沿用死亡目标的旧射线');
  updateAimLock(g, 0);
  assert.ok(g.aimLock.direction.x < -0.99);
});

test('并排目标之间的射线也参与密度选择，不局限于瞄准某一个怪物中心', () => {
  const g = arena(8);
  g.enemies = [enemy(1, 1200, 582), enemy(2, 1200, 618), enemy(3, 830, 600)];
  updateAimLock(g, 0);
  assert.equal(piercingLane(g).count, 2);
  assert.ok(g.aimLock.direction.x > 0.99);
});

test('目标移动后持续跟踪，暂停冻结锁定，换枪和重生不沿用旧锁定', () => {
  const g = arena(8);
  const a = enemy(1, 1200);
  g.enemies = [a];
  updateAimLock(g, 0);
  const lock = structuredClone(g.aimLock);
  a.y = 800;
  g.pause();
  g.update(0.05);
  assert.deepEqual(g.aimLock, lock);
  g.pause();
  updateAimLock(g, 0.7);
  assert.ok(g.aimLock.direction.y > 0.4);
  g.transact('weapons', 0, 'equip');
  assert.equal(g.aimLock, null);
  g.reset();
  assert.equal(g.aimLock, null);
});

test('预览不修改锁定，怪物方向优先于密集树群，并尊重树干消耗的穿透次数', () => {
  const g = arena(8);
  g.enemies = [enemy(1, 1400), enemy(2, 1500), enemy(3, 1600), enemy(4, 700), enemy(5, 600)];
  g.trees = Array.from({ length: 6 }, (_, i) => ({
    ...enemy(50 + i, 1000 + i * 50),
    type: 'tree',
  }));
  updateAimLock(g, 0);
  assert.ok(g.aimLock.direction.x < 0, '优先可实际贯穿两怪的通路');
  const before = JSON.stringify(g.aimLock);
  sniperGuide(g);
  g.findAttackTarget();
  assert.equal(JSON.stringify(g.aimLock), before);
});

test('脉冲注视点为角色与最远目标的中点，缩放不随距离改变且切线限速', () => {
  const g = arena(9);
  g.enemies = [enemy(1, 1000), enemy(2, 1100)];
  updateAimLock(g, 0);
  const c = new CombatCamera(),
    first = c.update(g.player, 390, 844, sniperGuide(g), 0);
  assert.equal(first.x + first.w / 2, 1000);
  assert.equal(first.y + first.h / 2, 600);
  assert.equal(first.zoom, 0.85 / 1.2);
  g.enemies[0].hp = 0;
  updateAimLock(g, 0.1);
  assert.deepEqual(c.update(g.player, 390, 844, sniperGuide(g), 0.1), first);
  let previous = first;
  for (let i = 1; i <= 360; i++) {
    const next = c.update(
      g.player,
      390,
      844,
      {
        kind: 'pulse',
        target: enemy(99, 700),
        focus: { x: 700, y: 600 },
      },
      0.1 + i / 60,
    );
    assert.equal(next.zoom, 0.85 / 1.2);
    assert.ok(Math.abs(next.x - previous.x) * next.zoom < 2.01);
    previous = next;
  }
  assert.ok(Math.abs(previous.x + previous.w / 2 - 800) < 1);
});

// 每帧真实走位持续超过脉冲蓄能时间，避免只验证静止方向或手动搬动坐标。
test('狙击与脉冲在30/120帧横向移动时持续跟踪，脉冲不会散能', () => {
  for (const weapon of [8, 9])
    for (const fps of [30, 120]) {
      const g = arena(weapon),
        victim = enemy(1, 1200);
      g.enemies = [victim];
      updateAimLock(g, 0);
      let shots = 0;
      g.onEvent = (type) => {
        if (type === 'shot') shots++;
      };
      let previousCharge = 0;
      for (let i = 0; i < Math.round(1.6 * fps); i++) {
        g.update(1 / fps, { x: 0, y: 1 });
        assert.equal(g.findAttackTarget()?.id, 1, '移动不能清空锁定');
        const guide = sniperGuide(g);
        assert.ok(
          guide.hits.some((h) => h.target.id === 1),
          '瞄准线持续穿过原目标',
        );
        if (weapon === 9 && shots === 0)
          assert.ok(g.pulse.charge >= previousCharge, '走位不打断蓄能');
        previousCharge = g.pulse.charge;
      }
      assert.ok(g.player.y > 800);
      assert.ok(shots >= 1);
      assert.ok(victim.hp < 2000);
      assert.equal(g.aimLock.anchorId, 1);
    }
});

test('怪物移动、玩家跨地图接缝和反向走位保持同一目标，超出射程立即重选', () => {
  for (const weapon of [8, 9]) {
    const g = arena(weapon);
    Object.assign(g.player, { x: WORLD.width - 40, y: 600 });
    const a = enemy(1, 100, 600),
      b = enemy(2, WORLD.width - 250, 600);
    g.enemies = [a, b];
    updateAimLock(g, 0);
    assert.equal(g.findAttackTarget().id, 1);
    Object.assign(g.player, { x: WORLD.width + 20, y: 640 });
    a.y = 680;
    updateAimLock(g, 0);
    assert.equal(g.aimLock.anchorId, 1);
    assert.ok(sniperGuide(g).hits.some((h) => h.target.id === 1));
    Object.assign(g.player, { x: WORLD.width - 60, y: 530 });
    a.y = 570;
    updateAimLock(g, 0);
    assert.equal(g.aimLock.anchorId, 1);
    assert.ok(sniperGuide(g).hits.some((h) => h.target.id === 1));
    a.x = 840;
    a.y = 530;
    updateAimLock(g, 0);
    assert.equal(g.findAttackTarget().id, 2, '出射程不等待宽限');
  }
});

test('击杀整组后同帧锁定下一组，瞄准线随真实炮口转过去', () => {
  for (const weapon of [8, 9]) {
    const g = arena(weapon),
      front = enemy(1, 1100),
      back = enemy(2, 1200),
      next = enemy(3, 700);
    front.hp = back.hp = 1;
    g.enemies = [front, back, next];
    g.attackTimer = 999;
    updateAimLock(g, 0);
    if (weapon === 9) g.pulse.charge = 1.2;
    g.attack();
    for (let i = 0; i < 40 && back.hp > 0; i++) g.update(1 / 120);
    assert.ok(front.hp <= 0 && back.hp <= 0);
    assert.equal(g.findAttackTarget().id, 3);
    assert.ok(g.aimLock.direction.x < 0);
    assert.ok(!sniperGuide(g).hits.some((h) => h.target.id === 3));
    for(let i=0;i<40;i++)g.update(1/120);
    assert.ok(sniperGuide(g).hits.some((h) => h.target.id === 3));
  }
});

test('树木锁定遇到新怪立即转向怪物，目标全部消失后清空，重新出现立即锁定', () => {
  const g = arena(9);
  g.addTree(1100, 600);
  updateAimLock(g, 0);
  assert.equal(g.aimLock.enemyLane, false);
  g.enemies = [enemy(1, 700)];
  updateAimLock(g, 0);
  assert.equal(g.findAttackTarget().id, 1);
  g.enemies = [];
  g.trees = [];
  updateAimLock(g, 0);
  assert.equal(g.aimLock, null);
  g.enemies = [enemy(2, 1200)];
  updateAimLock(g, 0);
  assert.equal(g.findAttackTarget().id, 2);
});
