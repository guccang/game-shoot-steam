// 逐炮挂载验收：十二种原枪弹道、独立技能、装填、配置切换与永久存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
import { availableFunnelWeapons } from '../src/config/funnel-loadouts.js';
import { updateFunnel, funnelMuzzle, funnelTargets } from '../src/combat/funnel.js';
import { emitWeaponAttack } from '../src/combat/weapon-fire.js';
import { explodeGrenade } from '../src/combat/grenades.js';

// 浮点方向采用统一精度比较，避免三角函数的末位误差掩盖真实弹道差异。
function snapshot(value) {
  return JSON.parse(
    // 载体奖励与音频来源允许不同，所有实际弹道参数和原枪仍须完全相同。
    JSON.stringify(value, (key, v) => ['masteryOwnerIndex','audioSource'].includes(key) ? undefined :
      (typeof v === 'number' ? Math.round(v * 1e8) / 1e8 : v)),
  );
}

// 保持靶子不移动，正式的命中、弹道和武器成长仍然参与模拟。
function arena(loadout = [12, 12, 12]) {
  const p = freshProgress();
  p.weapons.fill(1);
  p.weapon = 12;
  p.funnelLoadout = loadout;
  const g = new Game(p, () => 0.5);
  g.start();
  g.enemies = [];
  g.trees = [];
  g.boss = null;
  g.spawnTimer = 999;
  g.reducedMotion = true;
  g.setViewport(390, 844);
  g.trees = [
    {
      id: 100,
      type: 'tree',
      x: g.player.x + 90,
      y: g.player.y - 60,
      hp: 1e8,
      maxHp: 1e8,
      radius: 16,
    },
  ];
  return g;
}

// 仅推进正式编队时钟，便于检查发射记录而不让在途子弹提前清理。
function tick(g, time, dt = 1 / 120) {
  while (time > 1e-8) {
    const h = Math.min(dt, time);
    time -= h;
    updateFunnel(g, h);
  }
}

test('旧档保留三门原生核心，非法、未拥有和嵌套自动武器逐槽修复', () => {
  const p = freshProgress();
  delete p.funnelLoadout;
  assert.deepEqual(validateProgress(p).funnelLoadout, [12, 12, 12]);
  p.funnelLoadout = [0, 1, 13];
  assert.deepEqual(validateProgress(p).funnelLoadout, [0, 12, 12]);
  p.weapons[1] = 1;
  p.funnelLoadout = [1, 999, 1];
  assert.deepEqual(validateProgress(p).funnelLoadout, [1, 12, 1]);
  assert.deepEqual(availableFunnelWeapons(p), [12, 0, 1]);
  const g = new Game(freshProgress());
  assert.equal(g.configureFunnel(0, 0), false);
  const all = arena();
  const before = JSON.stringify(all.progress);
  for (const [slot, index] of [
    [-1, 0],
    [3, 0],
    [0.5, 0],
    [0, 13],
    [0, 999],
  ])
    assert.equal(all.configureFunnel(slot, index), false);
  assert.equal(JSON.stringify(all.progress), before);
});

test('三个槽位独立继承容量和装填，三把同枪不会共享弹药', () => {
  const g = arena([2, 3, 8]);
  assert.deepEqual(
    g.magazines[12].modules.map((m) => m.ammo),
    [80, 6, 5],
  );
  const repeated = arena([3, 3, 3]);
  repeated.magazines[12].modules[0].ammo = 1;
  assert.deepEqual(
    repeated.magazines[12].modules.map((m) => m.ammo),
    [1, 6, 6],
  );
  for (let i = 0; i < 3; i++)
    assert.equal(repeated.funnel.nodes[i].magazine, repeated.magazines[12].modules[i]);
});

test('十二种枪械从炮口发射与原枪共用完全相同的弹道和命中参数', () => {
  for (let index = 0; index < 12; index++) {
    const g = arena([index, 12, 12]),
      baseline = arena(),
      node = g.funnel.nodes[0];
    g.funnel.deploy = 0;
    g.funnel.primed = true;
    g.funnel.hadTargets = true;
    g.funnel.nodes.slice(1).forEach((n) => (n.cooldown = 100));
    const weapon = effectiveWeapon(g.progress, index);
    if (weapon.chargeTime) node.pulse.charge = weapon.chargeTime;
    updateFunnel(g, 0);
    const muzzle = funnelMuzzle(g.player, node, true),
      direction = { x: Math.cos(node.angle), y: Math.sin(node.angle) };
    // 基准枪使用同一次射击后的弹夹，确保加特林热色也按相同供给状态比较。
    emitWeaponAttack(baseline, weapon, muzzle, direction, g.damage(index), false, true, node.magazine);
    assert.deepEqual(
      snapshot(g.projectiles),
      snapshot(baseline.projectiles),
      weapon.id + ' 弹道快照',
    );
    assert.deepEqual(snapshot(g.shots), snapshot(baseline.shots), weapon.id + ' 光束或链路');
    assert.equal(g.trees[0].hp, baseline.trees[0].hp, weapon.id + ' 即时伤害');
    assert.equal(node.magazine.ammo, weapon.magazineSize - 1, weapon.id + ' 一次射击扣一发');
    assert.equal(g.player.recoilX || 0, 0, '浮游炮不能把角色推退');
  }
});

test('所挂枪械等级、熟练度及改装实时生效，不叠加浮游炮伤害', () => {
  const g = arena([3, 12, 12]);
  g.progress.weapons[3] = 4;
  g.progress.mastery[3] = 120;
  g.progress.mods[3] = 2;
  g.progress.weapons[12] = 20;
  g.progress.mastery[12] = 550;
  g.progress.mods[12] = 2;
  g.funnel.deploy = 0;
  g.funnel.primed = true;
  g.funnel.hadTargets = true;
  g.funnel.nodes.slice(1).forEach((n) => (n.cooldown = 99));
  updateFunnel(g, 0);
  assert.equal(g.projectiles.length, 9);
  assert.ok(g.projectiles.every((b) => b.amount === g.damage(3) && b.weaponIndex === 3));
  // 以有效枪械公式核对，避免浮游炮等级给每颗散弹再乘一次倍率。
  assert.equal(g.damage(3), Math.round(effectiveWeapon(g.progress, 3).damage * (1 + 3 * 0.22)));
});

test('挂载枪射程仍独立，但狙击炮也不能锁定手机屏外目标', () => {
  const g = arena([1, 8, 7]);
  g.trees = [];
  g.enemies = [{ id: 1, type: 'enemy', x: g.player.x + 500, y: g.player.y, hp: 100, radius: 17 }];
  assert.deepEqual(
    funnelTargets(g, g.weapon()).map((t) => t?.id ?? null),
    [null, null, null],
  );
  g.enemies.push({ id: 2, type: 'enemy', x: g.player.x + 100, y: g.player.y, hp: 100, radius: 17 });
  updateFunnel(g, 0.01);
  assert.ok(g.funnel.nodes.every((n) => n.targetId !== null));
});

test('榴弹计时和脉冲蓄能独立运行，不会变成普通连射或吞掉额外技能', () => {
  const g = arena([6, 9, 7]);
  let pulseShots = 0;
  g.onEvent = (type, data) => {
    if (type === 'shot' && data.kind === 'pulse') pulseShots++;
  };
  tick(g, 1.4);
  assert.equal(pulseShots, 0);
  assert.equal(g.funnel.nodes[1].magazine.ammo, 3);
  tick(g, 0.6);
  assert.equal(pulseShots, 1);
  assert.equal(g.funnel.nodes[1].magazine.ammo, 2);
  assert.ok(g.projectiles.some((b) => b.kind === 'flame'));
  assert.ok(g.shots.some((s) => s.kind === 'pulse-beam'));
  tick(g, 1.6);
  assert.equal(g.projectiles.filter((b) => b.kind === 'grenade-bomb').length, 1);
  assert.equal(g.projectiles.find((b) => b.kind === 'grenade-bomb').weaponIndex, 6);
  const p = g.funnel.nodes[1].pulse;
  assert.ok(Number.isFinite(p.charge) && Number.isFinite(p.cooldown));
});

test('每炮耗尽后使用对应装填时间，返航和补给不停止其他炮', () => {
  const g = arena([0, 3, 8]);
  g.trees = [];
  for (const n of g.funnel.nodes) {
    n.magazine.ammo = 0;
    n.magazine.remaining = n.weapon.reloadTime;
  }
  updateFunnel(g, 0.01);
  for (const n of g.funnel.nodes) assert.equal(n.flight.mode, 'dock');
  tick(g, WEAPONS[0].reloadTime + 0.01);
  assert.equal(g.funnel.nodes[0].magazine.ammo, 12);
  assert.ok(g.funnel.nodes[2].magazine.remaining > 0);
  tick(g, 3);
  assert.deepEqual(
    g.magazines[12].modules.map((m) => m.ammo),
    [12, 6, 5],
  );
});

test('新模块空仓返航，切回模块恢复余弹、冷却与蓄能，其他炮不受影响', () => {
  const g = arena([9, 3, 8]),
    n = g.funnel.nodes[0];
  n.magazine.ammo = 1;
  n.cooldown = 0.7;
  n.pulse.charge = 0.6;
  n.pulse.cooldown = 0.2;
  const others = JSON.stringify(g.funnel.nodes.slice(1));
  assert.equal(g.configureFunnel(0, 2), true);
  assert.deepEqual(n.magazine, { ammo: 0, remaining: WEAPONS[2].reloadTime });
  assert.equal(JSON.stringify(g.funnel.nodes.slice(1)), others);
  assert.equal(g.configureFunnel(0, 9), true);
  assert.equal(n.magazine.ammo, 1);
  assert.equal(n.cooldown, 0.7);
  assert.deepEqual(n.pulse, { charge: 0.6, cooldown: 0.2 });
  g.configureFunnel(0, 2);
  g.trees = [];
  tick(g, 0.5);
  const remaining = n.magazine.remaining;
  g.configureFunnel(0, 0);
  tick(g, 0.5);
  g.configureFunnel(0, 2);
  assert.equal(n.magazine.remaining, remaining);
});

test('在途弹和榴弹在改配置后保留原枪归属，独立炮口不检测角色至炮口路径', () => {
  const g = arena([8, 12, 12]);
  g.trees = [];
  g.addTree(g.player.x + 150, g.player.y - 8, { hp: 1, maxHp: 1 });
  const w = effectiveWeapon(g.progress, 8);
  emitWeaponAttack(
    g,
    w,
    { x: g.player.x + 80, y: g.player.y - 16 },
    { x: 1, y: 0 },
    92,
    false,
    true,
  );
  g.configureFunnel(0, 0);
  g.updateProjectiles(0.3);
  assert.equal(g.progress.mastery[8], 1);
  assert.equal(g.progress.mastery[0], 0);
  assert.equal(g.progress.mastery[12], 0);
  const grenade = arena([6, 12, 12]);
  grenade.funnel.nodes.slice(1).forEach((n) => (n.cooldown = 99));
  tick(grenade, 3.6);
  const bomb = grenade.projectiles.find((b) => b.kind === 'grenade-bomb');
  assert.ok(bomb);
  const amount = bomb.amount;
  grenade.configureFunnel(0, 0);
  assert.equal(bomb.weaponIndex, 6);
  assert.equal(bomb.amount, amount);
});

test('暂停、死亡、切换主武器冻结逐炮技能和供给，重生按保存配置重建满夹', () => {
  const g = arena([9, 6, 3]);
  tick(g, 1);
  const snap = JSON.stringify(g.funnel);
  g.pause();
  g.update(0.05);
  assert.equal(JSON.stringify(g.funnel), snap);
  g.state = 'dead';
  g.update(0.05);
  assert.equal(JSON.stringify(g.funnel), snap);
  g.state = 'playing';
  const magazines = structuredClone(g.magazines[12]);
  const pulse = structuredClone(g.funnel.nodes[0].pulse);
  g.transact('weapons', 0, 'equip');
  g.update(0.05);
  assert.deepEqual(g.magazines[12], magazines);
  assert.deepEqual(g.funnel.nodes[0].pulse, pulse);
  const restored = new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))));
  assert.deepEqual(restored.progress.funnelLoadout, [9, 6, 3]);
  assert.deepEqual(
    restored.magazines[12].modules.map((m) => m.ammo),
    [3, 24, 6],
  );
  restored.resetProgress();
  assert.deepEqual(restored.progress.funnelLoadout, [12, 12, 12]);
});

test('改装挂载原枪清空未释放技能，但保留活动与收起模块的弹药和冷却', () => {
  const g = arena([9, 9, 6]);
  g.progress.coins = 10000;
  g.progress.wood = 10000;
  g.progress.mastery[9] = 40;
  for (const n of g.funnel.nodes.slice(0, 2)) {
    n.magazine.ammo = 1;
    n.pulse.charge = 0.7;
    n.pulse.cooldown = 0.3;
    n.cooldown = 0.4;
  }
  g.configureFunnel(1, 0);
  assert.equal(g.modifyWeapon(9, 1), true);
  const active = g.funnel.nodes[0],
    cached = g.funnel.nodes[1].loadouts[9];
  for (const record of [active, cached]) {
    assert.equal(record.magazine.ammo, 1);
    assert.equal(record.pulse.charge, 0);
    assert.equal(record.pulse.cooldown, 0.3);
    assert.equal(record.cooldown, 0.4);
  }
});

test('三炮挂载原枪采集同时培养原枪与浮游炮，所有弹道和近战都保留来源', () => {
  for (const index of [...Array(13).keys(), 14]) {
    const g = arena([index, index, index]);
    g.trees[0].hp = 1;
    // 电锯射程只有 85，靶子必须放在合法近战搜敌范围内。
    if (index === 14) Object.assign(g.trees[0], { x: g.player.x + 60, y: g.player.y - 8 });
    g.funnel.deploy = 0;
    g.funnel.primed = true;
    g.funnel.hadTargets = true;
    for (const node of g.funnel.nodes)
      if (node.weapon.chargeTime) node.pulse.charge = node.weapon.chargeTime;
    updateFunnel(g, 0);
    // 发射后切主武器，归属仍取发射时快照，不能按当前装备决定。
    g.transact('weapons', index === 0 ? 1 : 0, 'equip');
    for (let i = 0; i < 120; i++) g.updateProjectiles(1 / 120);
    assert.ok(g.trees[0].hp <= 0, WEAPONS[index].id + ' 实际采集');
    assert.equal(g.progress.mastery[index], 1, WEAPONS[index].id + ' 原枪');
    assert.equal(g.progress.mastery[12], 1, WEAPONS[index].id + ' 载体不重复');
    assert.equal(g.progress.mastery.reduce((sum, xp) => sum + xp, 0), index === 12 ? 1 : 2);
    // 死亡保护应挡住三炮后续命中及重复结算。
    g.hit(g.trees[0], 999, false, { weaponIndex: index, masteryOwnerIndex: 12 });
    assert.equal(g.progress.mastery[12], 1);
  }
});

test('浮游炮榴弹改挂载后爆炸，仍同时增加原枪和载体熟练度并可存档恢复', () => {
  const g = arena([6, 6, 6]);
  tick(g, 3.6);
  const bomb = g.projectiles.find(b => b.kind === 'grenade-bomb');
  assert.ok(bomb);
  assert.equal(bomb.masteryOwnerIndex, 12);
  const target = g.trees[0];
  target.hp = 1;
  g.configureFunnel(0, 0);
  g.transact('weapons', 0, 'equip');
  // 直接推进已完成飞行的落点，爆炸仍走正式范围伤害入口。
  bomb.x = bomb.endX;
  bomb.y = bomb.endY;
  explodeGrenade(g, bomb);
  explodeGrenade(g, bomb);
  assert.equal(g.progress.mastery[6], 1);
  assert.equal(g.progress.mastery[12], 1);
  assert.equal(g.progress.mastery[0], 0);
  const restored = validateProgress(JSON.parse(JSON.stringify(g.progress)));
  assert.deepEqual(restored.mastery, g.progress.mastery);
});

test('混装三门枪按实际击杀炮位奖励，怪物和领主奖励保持 4 与 30', () => {
  for (const [type, reward] of [['enemy', 4], ['boss', 30]]) {
    for (let slot = 0; slot < 3; slot++) {
      const g = arena([2, 3, 8]);
      const target = { ...g.trees[0], type, hp: 1 };
      g.trees = [];
      if (type === 'boss') g.boss = target;
      else g.enemies = [target];
      g.funnel.deploy = 0;
      g.funnel.primed = g.funnel.hadTargets = true;
      g.funnel.nodes.forEach((n, i) => { n.cooldown = i === slot ? 0 : 99; });
      updateFunnel(g, 0);
      for (let i = 0; i < 120; i++) g.updateProjectiles(1 / 120);
      assert.ok(target.hp <= 0);
      assert.equal(g.progress.mastery[[2, 3, 8][slot]], reward);
      assert.equal(g.progress.mastery[12], reward);
      assert.equal(g.progress.mastery.reduce((sum, xp) => sum + xp, 0), reward * 2);
    }
  }
});
