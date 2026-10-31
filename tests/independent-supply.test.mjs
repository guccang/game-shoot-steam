import { equipmentRecipe } from '../src/progression/equipment-goals.js';
// 两套自动武器验收：独立供给、持续护航、存档兼容与弹道归属。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress, validateProgress, WEAPONS } from '../src/game.js';
import { updateFunnel, FUNNEL_CHARGING } from '../src/combat/funnel.js';
import { advanceReload } from '../src/combat/magazine.js';
import { summonRegenRate } from '../src/config/summon-energy.js';
import { fireBallistics } from '../src/combat/ballistics.js';

// 固定靶场使用正式控制器，弹丸不击杀目标以便检查能源守恒。
function arena(index = 12) {
  const p = freshProgress();
  p.weapons.fill(1);
  p.weapon = index;
  const g = new Game(p, () => 0.5);
  g.start();
  g.trees = [];
  g.enemies = [];
  g.boss = null;
  g.spawnTimer = 999;
  for (let i = 0; i < 3; i++)
    g.trees.push({
      id: 100 + i,
      type: 'tree',
      x: g.player.x + (i - 1) * 100,
      y: g.player.y - 300,
      hp: 1e9,
      maxHp: 1e9,
      radius: 17,
    });
  g.setViewport(390, 844);
  return g;
}

// 小步推进完整编队控制；可同时移动角色与靶子模拟移动中的母舰补给。
function tick(g, seconds, moving = false) {
  while (seconds > 1e-8) {
    const dt = Math.min(seconds, 1 / 120);
    seconds -= dt;
    if (moving) {
      g.player.x += 155 * dt;
      for (const t of g.trees) t.x += 155 * dt;
    }
    advanceReload(g.magazines[g.progress.weapon], g.weapon(), dt);
    updateFunnel(g, dt);
  }
}

test('旧浮游炮编号、装备和养成保留，新无人机只补空槽，门槛与价格独立', () => {
  const p = freshProgress();
  p.weapon = 12;
  p.weapons = p.weapons.slice(0, 13);
  p.weapons[12] = 7;
  p.mastery = p.mastery.slice(0, 13);
  p.mastery[12] = 120;
  p.mods = p.mods.slice(0, 13);
  p.mods[12] = 2;
  const restored = validateProgress(p);
  assert.equal(restored.weapon, 12);
  assert.equal(restored.weapons[12], 7);
  assert.equal(restored.mastery[12], 120);
  assert.equal(restored.mods[12], 2);
  for (const k of ['weapons', 'mastery', 'mods']) assert.equal(restored[k][13], 0);
  assert.equal(WEAPONS[13].id, 'drone');
  const g = new Game(freshProgress());
  const price=equipmentRecipe('weapons',13);
  g.progress.materials={parts:price.parts,crystal:price.crystal,core:price.core};
  Object.assign(g.progress, { coins: price.coins, wood: price.wood, bosses: price.bosses-1 });
  assert.equal(g.transact('weapons', 13, 'buy'), false);
  g.progress.bosses = price.bosses;
  assert.equal(g.transact('weapons', 13, 'buy'), true);
  assert.deepEqual([g.progress.weapon, g.progress.coins, g.progress.wood], [13, 0, 0]);
});

test('三炮各有十二发且引用唯一弹夹源，无目标不消耗，单炮耗尽不会中断其他炮', () => {
  const g = arena();
  const saved = g.trees;
  g.trees = [];
  tick(g, 2);
  assert.deepEqual(
    g.magazines[12].modules.map((m) => m.ammo),
    [12, 12, 12],
  );
  g.funnel.nodes.forEach((n, i) => assert.equal(n.magazine, g.magazines[12].modules[i]));
  g.trees = saved;
  g.funnel.nodes[0].magazine.ammo = 1;
  tick(g, 0.4);
  assert.equal(g.funnel.nodes[0].charging, false);
  assert.equal(g.funnel.nodes[0].magazine.ammo, 0);
  assert.ok(g.funnel.nodes.slice(1).every((n) => n.magazine.ammo === 11 && !n.charging));
  const fired = g.projectiles.length;
  tick(g, 1);
  assert.ok(g.projectiles.length >= fired + 2);
  assert.notEqual(g.funnel.nodes[0].targetId, null);
  assert.ok(g.funnel.nodes.slice(1).every((n) => n.targetId !== null));
});

test('原生炮空中逐格恢复，耗尽不返航且不打断其他炮',()=>{
 const g=arena();tick(g,2);const n=g.funnel.nodes[0];n.magazine.ammo=0;n.magazine.regenProgress=0;
 const count=g.projectiles.length;tick(g,.5);assert.equal(n.magazine.ammo,0);assert.equal(n.magazine.remaining,0);
 assert.equal(n.charging,false);assert.equal(n.flight.mode,'attack');tick(g,2);
 assert.ok(g.projectiles.length>count);assert.notEqual(n.targetId,null);
 g.trees=[];const before=n.magazine.ammo;tick(g,2,true);assert.ok(n.magazine.ammo>before&&n.magazine.ammo<12);
});

// 外挂脉冲枪继续返航，不套用原生能源规则。
test('外挂枪移动中返航入坞后按原时间装填',()=>{
 const g=arena();g.progress.funnelLoadout=[9,12,12];tick(g,2);
 const n=g.funnel.nodes[0];n.magazine.ammo=0;n.magazine.remaining=3.2;n.x=190;n.y=-160;
 tick(g,.01);assert.equal(n.magazine.remaining,3.2);
 g.trees=[];tick(g,7,true);assert.equal(n.magazine.remaining,0);assert.equal(n.magazine.ammo,3);
});

test('无敌人也持续回能；暂停、死亡、切枪均冻结每炮弹夹和冷却', () => {
  const g = arena();
  tick(g, 2);
  g.trees = [];
  Object.assign(g.funnel.nodes[0].magazine, { ammo: 0, remaining: 3.2 });
  tick(g, 2);
  const before = structuredClone(g.magazines[12]);
  assert.ok(before.modules[0].remaining < 3.2);
  g.pause();
  g.update(0.05);
  assert.deepEqual(g.magazines[12], before);
  g.pause();
  g.state = 'dead';
  g.update(0.05);
  assert.deepEqual(g.magazines[12], before);
  g.state = 'playing';
  const cooldowns = g.funnel.nodes.map((n) => n.cooldown);
  g.transact('weapons', 13, 'equip');
  for (let i = 0; i < 120; i++) g.update(1 / 120);
  assert.deepEqual(g.magazines[12], before);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.cooldown),
    cooldowns,
  );
  g.transact('weapons', 12, 'equip');
  tick(g, 13);
  assert.deepEqual(
    g.magazines[12].modules.map((m) => [m.ammo, m.remaining]),
    [
      [12, 0],
      [12, 0],
      [12, 0],
    ],
  );
});

test('升级与两条改装不补能、不重置冷却、不覆盖无人机供给', () => {
  const g = arena();
  tick(g, 2);
  Object.assign(g.progress, { coins: 1e6, wood: 1e6 });
  g.progress.mastery[12] = 40;
  Object.assign(g.funnel.nodes[0].magazine, { ammo: 0, remaining: 2 });
  g.funnel.nodes[0].charging = true;
  const before = structuredClone(g.magazines),
    cooldowns = g.funnel.nodes.map((n) => n.cooldown);
  assert.equal(g.transact('weapons', 12, 'upgrade'), true);
  for (const mod of [1, 2, 0]) {
    assert.equal(g.modifyWeapon(12, mod), true);
    assert.deepEqual(g.magazines, before);
  }
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.cooldown),
    cooldowns,
  );
});

test('无人机沿用近身射后换位，浮游炮保持远端射位，各自冷却状态互不污染', () => {
  const g = arena(13);
  tick(g, 4);
  assert.ok(g.drone.nodes.every((n) => Math.hypot(n.x, n.y) <= 80.001 && n.flight.shots >= 4));
  assert.ok(g.drone.nodes.some((n) => n.flight.step >= 2));
  assert.ok(g.magazines[13].ammo>24&&g.magazines[13].ammo<36);
  const before = structuredClone(g.magazines[13]),
    cd = g.drone.nodes.map((n) => n.cooldown);
  g.transact('weapons', 12, 'equip');
  tick(g, 2);
  assert.ok(g.funnel.nodes.some((n) => Math.hypot(n.x, n.y) > 135));
  assert.deepEqual(g.magazines[13], before);
  assert.deepEqual(
    g.drone.nodes.map((n) => n.cooldown),
    cd,
  );
});

test('无人机在途弹归属无人机，树干阻挡且只命中一次，不借用浮游炮熟练度', () => {
  const g = arena(13);
  g.trees = [{ id: 5, type: 'tree', x: 1040, y: 692, hp: 1, maxHp: 1, radius: 17 }];
  g.enemies = [{ id: 6, type: 'enemy', x: 1100, y: 692, hp: 100, maxHp: 100, radius: 17 }];
  fireBallistics(g, g.weapon(), { x: 940, y: 684 }, { x: 1, y: 0 }, 32, false, true);
  assert.equal(g.projectiles[0].kind, 'drone');
  g.transact('weapons', 12, 'equip');
  g.updateProjectiles(0.5);
  assert.equal(g.enemies[0].hp, 100);
  assert.equal(g.progress.mastery[13], 1);
  assert.equal(g.progress.mastery[12], 0);
  g.updateProjectiles(0.5);
  assert.equal(g.progress.mastery[13], 1);
});

test('低动态保留空中逐格回能，不显示返航或装填动画',()=>{
 const g=arena();g.reducedMotion=true;g.trees=[];const n=g.funnel.nodes[0];
 Object.assign(n.magazine,{ammo:0,remaining:3.2,regenProgress:0});tick(g,1.1);
 assert.equal(n.magazine.ammo,1);assert.equal(n.magazine.remaining,0);assert.equal(n.charging,false);assert.equal(n.flight.trail.length,0);
});

test('三炮长期供给守恒，帧率变化不额外齐射、不出现负数能源',()=>{
 const counts=[];
 for(const dt of [1/30,1/120]){
  const g=arena();let shots=0,previous=0,restored=0;
  g.onEvent=type=>{if(type==='shot')shots++;};
  for(let k=0;k<90/dt;k++){
   for(const n of g.funnel.nodes)if(n.magazine.ammo<12)restored+=summonRegenRate(g.weapon())*dt;
   updateFunnel(g,dt);
   const total=shots+g.magazines[12].modules.reduce((sum,m)=>sum+m.ammo+(m.regenProgress||0),0);
   assert.ok(Math.abs(total-36-restored)<1e-6,`能量守恒 ${total}/${restored}`);
   assert.ok(shots-previous<=3);previous=shots;
   for(const n of g.funnel.nodes){assert.ok(n.magazine.ammo>=0&&n.magazine.ammo<=12);assert.equal(n.magazine.remaining,0);}
   g.projectiles=[];
  }
  assert.ok(shots>200&&shots<300);counts.push(shots);
 }
 assert.ok(Math.abs(counts[0]-counts[1])<=3,JSON.stringify(counts));
});

// 集火协议不能把正在补给的首炮当作唯一领队。
test('首炮补给时其余炮稳定集火，不被新出现的近怪抢锁', () => {
  const g = arena();
  g.progress.mastery[12] = 40;
  g.progress.mods[12] = 2;
  g.enemies = g.trees.map((t) => ({ ...t, type: 'enemy' }));
  g.trees = [];
  tick(g, 2);
  const locked = g.funnel.nodes[1].targetId;
  Object.assign(g.funnel.nodes[0].magazine, { ammo: 0, remaining: 3.2 });
  tick(g, 0.01);
  g.enemies.push({
    id: 999,
    type: 'enemy',
    x: g.player.x + 30,
    y: g.player.y,
    hp: 1e6,
    radius: 17,
  });
  tick(g, 0.2);
  assert.deepEqual(
    g.funnel.nodes.map((n) => n.targetId),
    [locked, locked, locked],
  );
});

// 已停靠炮在母舰离开时先追随归队，不能继续显示空中供给。
test('外挂枪在玩家突然离开泊位后重新返航，不能在远处装填', () => {
  const g = arena();g.progress.funnelLoadout=[9,12,12];
  g.trees = [];
  const n = g.funnel.nodes[0];
  Object.assign(n.magazine, { ammo: 0, remaining: 3.2 });
  tick(g, 1);
  assert.equal(n.flight.mode, 'dock');
  const remaining = n.magazine.remaining;
  g.player.x += 100;
  tick(g, 1 / 120);
  assert.equal(n.magazine.remaining, remaining);
  assert.equal(n.flight.mode, 'return');
});
