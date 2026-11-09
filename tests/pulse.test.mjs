import {upgradeCost} from '../src/progression/progress.js';
import { equipmentRecipe } from '../src/progression/workshop/equipment-goals.js';
import { WORLD } from '../src/world/coordinates.js';
// 验证重型脉冲的蓄能、贯穿、反冲碰撞、成长兼容与缓冲镜头。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, WEAPONS, freshProgress, validateProgress } from '../src/game.js';
import { fireBallistics, updateBallistics } from '../src/combat/ballistics.js';
import { sniperGuide } from '../src/combat/aim.js';
import { kickHolder, updateHolderKick } from '../src/combat/pulse.js';
import { CombatCamera } from '../src/rendering/camera.js';
import { CombatFX, FX_LIMIT } from '../src/combat/effects.js';
import { isWaterBlocked, riverXAt } from '../src/world/river-geometry.js';
const index = WEAPONS.findIndex((w) => w.id === 'pulse'),
  weapon = WEAPONS[index];

// 静止耐久目标保持真实碰撞尺寸，避开怪物寻路对弹道测试的干扰。
function target(id, x, type = 'enemy') {
  return { id, type, x, y: 600, hp: 2000, maxHp: 2000, radius: 10, mass: 1, speed: 0, phase: 0 };
}

// 隔离刷怪与地形，生产的自动攻击、生命周期和物理更新仍然执行。
function arena() {
  const g = new Game(freshProgress(), () => 0.5);
  g.trees = [];
  g.enemies = [];
  g.progress.weapon = index;
  g.progress.weapons[index] = 1;
  Object.assign(g.player, { x: 200, y: 600 });
  g.spawnTimer = 999;
  // 靶场从已装填的弹匣开始，保留正式开火与换弹计时。
  Object.assign(g.magazines[index],{ammo:weapon.magazineSize,remaining:0});
  g.start();
  return g;
}

test('脉冲必须蓄满才射击，丢失目标散能，暂停冻结，换装和重生清空蓄能', () => {
  const g = arena();
  g.enemies = [target(1, 600)];
  assert.equal(g.attack(), false);
  for (let i = 0; i < 23; i++) g.update(0.05);
  assert.equal(g.projectiles.length, 0);
  assert.ok(g.pulse.charge > 1);
  g.pause();
  const before = structuredClone(g.pulse);
  g.update(0.05);
  assert.deepEqual(g.pulse, before);
  g.pause();
  g.update(0.05);
  assert.equal(g.projectiles.length, 1);
  assert.equal(g.pulse.charge, 0);
  assert.ok(g.player.recoilX < -300);
  assert.equal(g.attack(), false);
  g.enemies = [];
  g.update(0.05);
  assert.equal(g.pulse.charge, 0);
  const x = g.player.x;
  g.pause();
  g.update(0.05);
  assert.equal(g.player.x, x);
  g.pause();
  g.transact('weapons', 0, 'equip');
  assert.deepEqual(g.pulse, { charge: 0, cooldown: 0 });
  g.reset();
  assert.equal(g.player.recoilX, undefined);
  assert.equal(g.pulse.charge, 0);
});

test('脉冲真实飞行并贯穿十二个目标，宽弹道预览匹配命中且不重复发奖', () => {
  const g = arena();
  const targets = Array.from({ length: 13 }, (_, i) =>
    target(i + 1, 300 + i * 42, 'enemy'),
  );
  const trunk={...targets[0],id:100,type:'tree',x:275};
  g.trees=[trunk];
  g.enemies=targets;
  const guide = sniperGuide(g);
  assert.equal(guide.range, 820);
  assert.equal(guide.hits.length, 12);
  Object.assign(g.magazines[index],{ammo:1,remaining:0});
  g.pulse.charge = 1.2;
  assert.ok(g.attack());
  assert.equal(targets[0].hp, 2000);
  updateBallistics(g, 0.5);
  assert.equal(targets.filter((t) => t.hp < 2000).length, 12);
  assert.equal(targets[0].hp, targets[0].maxHp-Math.round(g.damage()));
  assert.equal(trunk.hp,trunk.maxHp);
  assert.ok(targets[11].hp < 1880);
  assert.equal(targets[12].hp, 2000);
  assert.equal(g.projectiles.length, 0);
  assert.ok(g.fx.items.some((p) => p.kind === 'pulse-scar'));
  const last = g.fx.items.filter((p) => p.kind === 'pulse-scar').at(-1);
  assert.ok(last.x <= guide.end.x + 1, '余波不能跑到最后碰撞点前方');
});

test('脉冲有更远射程与宽度，换枪升级不改变在途威力，跨边界仍只命中一次', () => {
  const g = arena();
  g.player.x = 900;
  const e = target(1, 1700);
  e.y += 17;
  g.enemies = [e];
  fireBallistics(g, weapon, { x: 950, y: 592 }, { x: 1, y: 0 }, 240, false);
  g.transact('weapons', 0, 'equip');
  g.progress.weapons[index] = 20;
  updateBallistics(g, 0.2);
  assert.equal(e.hp, 2000);
  updateBallistics(g, 0.2);
  assert.equal(e.hp, 1760);
  const edge = arena();
  edge.player.x = WORLD.width - 60;
  edge.enemies = [target(2, 40), target(3, 140)];
  fireBallistics(edge, weapon, { x: WORLD.width - 20, y: 592 }, { x: 1, y: 0 }, 240, false);
  updateBallistics(edge, 1);
  assert.deepEqual(
    edge.enemies.map((t) => t.hp),
    [1760, 1772],
  );
  assert.equal(edge.projectiles.length, 0);
});

test('反冲退步约六十像素且帧率一致，树干和河岸阻止穿越', () => {
  const end = [];
  for (const dt of [1 / 30, 1 / 120]) {
    const p = { x: 900, y: 700 };
    kickHolder(p, { x: 1, y: 0 }, 360);
    for (let t = 0; t < 1 - 1e-8; t += dt) updateHolderKick(p, dt, []);
    end.push(p.x);
  }
  assert.ok(Math.abs(end[0] - end[1]) < 0.01);
  assert.ok(end[0] > 840 && end[0] < 841);
  const p = { x: 900, y: 700 },
    tree = { ...target(1, 850, 'tree'), y: 700, radius: 22 };
  kickHolder(p, { x: 1, y: 0 }, 360);
  for (let i = 0; i < 120; i++) updateHolderKick(p, 1 / 120, [tree]);
  assert.ok(p.x >= 884);
  const bank = { x: riverXAt(900) - 95, y: 900 };
  kickHolder(bank, { x: -1, y: 0 }, 360);
  for (let i = 0; i < 120; i++) updateHolderKick(bank, 1 / 120, []);
  assert.equal(isWaterBlocked(bank.x, bank.y, 12), false);
});

test('重脉冲致命冲量强于狙击，粒子有界且回收，领主仍受质量约束', () => {
  const g = arena(),
    a = target(1, 500),
    b = target(2, 600);
  a.hp = b.hp = 1;
  g.enemies = [a, b];
  g.hit(a, 240, false, { direction: { x: 1, y: 0 }, impulse: 165, power: 2.7 });
  g.hit(b, 92, false, { direction: { x: 1, y: 0 }, impulse: 110, power: 1.8 });
  assert.ok(g.remnants[0].pushX > g.remnants[1].pushX);
  assert.ok(g.remnants[0].vz > g.remnants[1].vz);
  const coins = g.progress.coins;
  g.hit(a, 240);
  assert.equal(g.progress.coins, coins);
  const fx = new CombatFX(() => 0.5);
  for (let i = 0; i < 1000; i++) fx.pulseWake(i, 600, { dx: 1, dy: 0 });
  assert.ok(fx.items.length <= FX_LIMIT);
  fx.update(2);
  assert.equal(fx.items.length, 0);
});

test('旧档保留已有武器，脉冲枪按工坊报价购买、升级后可读档', () => {
  const old = validateProgress({
    ...freshProgress(),
    weapons: [1, 0, 0, 0, 0, 0, 0, 0, 3],
    weapon: 8,
  });
  assert.equal(old.weapon, 8);
  assert.equal(old.weapons[8], 3);
  assert.equal(old.weapons[index], 0);
  // 保留当前装备，其余旧枪放入仓库，给新枪留出随身空间。
  old.warehouse.weapons=old.weapons.flatMap((level,i)=>level&&i!==old.weapon?[i]:[]);
  const g=new Game(old),p=g.progress;
  g.cottage={kind:'weapons'};
  const price=equipmentRecipe('weapons',index,p),upgrade=upgradeCost(1,p,'weapons',index);
  p.coins=price.coins-1;
  p.wood=price.wood+upgrade.wood;
  Object.assign(p.materials,{parts:price.parts,crystal:price.crystal,core:price.core});
  const before=structuredClone(p);
  assert.equal(g.transact('weapons',index,'buy'),false);
  assert.deepEqual(p,before);
  p.coins=price.coins+upgrade.coins;
  assert.equal(p.bosses,0);
  assert.ok(g.transact('weapons',index,'buy'));
  assert.equal(p.coins,upgrade.coins);
  assert.equal(p.wood,upgrade.wood);
  assert.equal(p.weapon,index);
  const beforeUpgrade=g.damage();
  assert.ok(g.transact('weapons',index,'upgrade'));
  const restored=new Game(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.progress.weapon,index);
  assert.equal(restored.progress.weapons[index],2);
  assert.equal(restored.progress.coins,0);
  assert.equal(restored.progress.wood,0);
  assert.ok(restored.damage()>beforeUpgrade);
  assert.equal(restored.damage(),g.damage());
});

test('无锁定注视点时，镜头忽略蓄能和候选目标，真实退步仍正确跟随', () => {
  const c = new CombatCamera(),
    p = { x: 900, y: 700 },
    first = c.update(p, 390, 844, { kind: 'pulse' });
  for (let i = 0; i < 120; i++)
    assert.deepEqual(
      c.update(
        p,
        390,
        844,
        { kind: 'pulse', point: { x: i % 2 ? 300 : 1500, y: 700 }, charge: i / 120 },
        i / 60,
      ),
      first,
    );
  p.x -= 60;
  const next = c.update(p, 390, 844, { kind: 'pulse' });
  assert.equal(next.zoom, first.zoom);
  assert.equal(next.x, first.x - 60);
});

test('粗能量束只延伸至真实弹头，换枪不追踪枪口，暂停冻结并在结束后回收', () => {
  const g = arena(),
    victim = target(1, 600);
  g.enemies = [victim];
  const expectedHp = victim.hp - g.damage();
  g.pulse.charge = g.weapon().chargeTime;
  assert.ok(g.attack());
  const beam = g.shots[0],
    start = { x: beam.x, y: beam.y };
  assert.equal(beam.kind, 'pulse-beam');
  assert.equal(beam.ex, beam.x);
  g.updateProjectiles(0.08);
  assert.ok(beam.ex > beam.x + 100 && beam.ex < 600);
  assert.equal(beam.ex, g.projectiles[0].x);
  const before = structuredClone(beam);
  g.pause();
  g.update(0.05);
  assert.deepEqual(beam, before);
  g.pause();
  g.transact('weapons', 0, 'equip');
  g.attackTimer = 999;
  g.player.x -= 50;
  assert.equal(beam.x, start.x);
  assert.equal(beam.y, start.y);
  for (let i = 0; i < 30; i++) g.update(0.05);
  assert.equal(g.shots.length, 0);
  assert.equal(g.projectiles.length, 0);
  assert.equal(victim.hp, expectedHp);
});
