// 守护塔防验证：真实火力、随机进攻、局内经济、暂停及断点恢复。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { guardianPads } from '../src/config/guardian.js';
import { WEAPONS } from '../src/config/weapons.js';
import { updateGuardianDefenses } from '../src/core/battle/guardian-defense.js';
import { guardianSpawnPoint } from '../src/core/battle/guardian-spawns.js';
import { realmSites, prepareRealmTrees } from '../src/core/realms/realm-region.js';
import { blocked } from '../src/physics/motion.js';
import { updateRealm } from '../src/core/realms/realm-manager.js';
import { validateRealms } from '../src/progression/realms/realm-progress.js';

// 使用默认新手拥有权，选择性解锁供装备覆盖测试。
function create(all = false) {
  const p = freshProgress();
  if (all) { p.weapons.fill(1); p.vehicleHulls.fill(1); }
  const g = new Game(p, () => .45); g.enterRealm('guardian'); return g;
}

test('开局准备不刷怪，非法、重复、未拥有及余额不足的部署均不扣币', () => {
  const g = create();
  assert.equal(g.realm.phase, 'build');
  for (let i = 0; i < 30; i++) g.update(.05);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.guardianDefense('deploy', 0, 'weapon', 1), false);
  assert.equal(g.guardianDefense('deploy', 0, 'vehicle', 2, 0), false);
  assert.equal(g.guardianDefense('deploy', -1, 'weapon', 0), false);
  assert.equal(g.realm.realmCoins, 160);
  assert.ok(g.guardianDefense('deploy', 0, 'weapon', 0));
  assert.equal(g.guardianDefense('deploy', 0, 'weapon', 0), false);
  assert.equal(g.guardianDefense('deploy', 1, 'vehicle', 0, 0), false);
  assert.ok(g.guardianDefense('deploy', 1, 'weapon', 0));
  assert.equal(g.realm.realmCoins, 40);
  assert.ok(g.guardianDefense('upgrade', 0));
  assert.equal(g.guardianDefense('upgrade', 0), false);
  assert.equal(g.guardianDefense('deploy', 2, 'weapon', 0), false);
});

test('局内升级有实际伤害增长，满级拒绝扣费，拆除返还且森林装备原样恢复', () => {
  const g = create(), before = JSON.stringify(g.progress.weapons), coins = g.progress.coins;
  g.guardianDefense('deploy', 0, 'weapon', 0);
  const damage = g.realm.defenses[0].runtime.damage();
  g.guardianDefense('upgrade', 0);
  assert.ok(g.realm.defenses[0].runtime.damage() > damage);
  assert.equal(g.realm.realmCoins, 60);
  assert.ok(g.guardianDefense('remove', 0));
  assert.equal(g.realm.realmCoins, 160);
  g.realm.realmCoins = 10000; g.guardianDefense('deploy', 0, 'weapon', 0);
  for (let n = 0; n < 9; n++) assert.ok(g.guardianDefense('upgrade', 0));
  const balance = g.realm.realmCoins;
  assert.equal(g.guardianDefense('upgrade', 0), false);
  assert.equal(g.realm.realmCoins, balance);
  g.leaveRealm();
  assert.equal(JSON.stringify(g.progress.weapons), before); assert.equal(g.progress.coins, coins);
  assert.equal(g.progress.realms.run, null);
  g.enterRealm('guardian'); assert.equal(g.realm.realmCoins, 160); assert.equal(g.realm.defenses.length, 0);
});

test('同一击杀只赚一次秘境币，战中增援立即生效，刷新一起回退币与布防', () => {
  const g = create(); g.guardianDefense('deploy', 0, 'weapon', 0); g.guardianDefense('upgrade', 0);
  g.continueRealm();
  assert.ok(g.guardianDefense('deploy', 1, 'weapon', 0));
  assert.equal(g.realm.realmCoins, 0);
  g.realm.warning = 0; updateRealm(g, .01);
  const enemy = g.enemies[0]; g.hit(enemy, 9999); g.hit(enemy, 9999);
  assert.equal(g.realm.realmCoins, 12); assert.equal(g.realm.kills, 1);
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.state, 'paused'); assert.equal(restored.realm.realmCoins, 60);
  assert.equal(restored.realm.defenses.length, 1);
  assert.equal(restored.realm.defenses[0].level, 2); assert.equal(restored.realm.kills, 0);
  const runtime = restored.realm.defenses[0].runtime;
  updateGuardianDefenses(restored, 5); assert.equal(runtime.vehicle.module.magazine.ammo, 12);
});

test('战中升级保持运行时余弹与动作，回收部署原子扣款，暂停不能交易', () => {
  const g = create(); g.guardianDefense('deploy', 0, 'weapon', 0); g.continueRealm();
  const tower = g.realm.defenses[0], runtime = tower.runtime;
  runtime.vehicle.module.magazine.ammo = 3;
  assert.ok(g.guardianDefense('upgrade', 0));
  assert.equal(tower.runtime, runtime); assert.equal(runtime.vehicle.module.magazine.ammo, 3);
  assert.equal(tower.level, 2);
  g.pause();
  const balance = g.realm.realmCoins;
  assert.equal(g.guardianDefense('remove', 0), false);
  assert.equal(g.guardianDefense('deploy', 1, 'weapon', 0), false);
  assert.equal(g.realm.realmCoins, balance);
  g.pause(); assert.ok(g.guardianDefense('remove', 0));
  assert.equal(g.realm.realmCoins, 160);
  assert.equal(g.guardianDefense('deploy', 1, 'vehicle', 0, 0), false);
  assert.ok(g.guardianDefense('deploy', 1, 'weapon', 0));
  assert.equal(g.realm.realmCoins, 100);
  assert.equal(g.guardianDefense('deploy', 1, 'weapon', 0), false);
  assert.equal(g.realm.realmCoins, 100);
  assert.ok(g.realm.defenses[0].runtime.vehicle.active);
});

test('每次刷怪随机选择外围空地，普通怪与领主避开玩家、树干和已有敌人', () => {
  const g=create(), points=[];
  for(const value of Array.from({length:32},(_,i)=>i/32)) {
    g.random=()=>value;
    const p=guardianSpawnPoint(g);assert.ok(p);points.push(p);
    assert.ok(Math.hypot(p.x-g.realm.arena.x,p.y-g.realm.arena.y)>g.realm.arena.radius*.6);
    assert.ok(Math.hypot(p.x-g.player.x,p.y-g.player.y)>=205);
    assert.equal(blocked(p.x,p.y,25,g.trees,{arena:g.realm.arena}),false);
  }
  assert.ok(new Set(points.map(p=>`${Math.sign(p.x-g.realm.arena.x)}:${Math.sign(p.y-g.realm.arena.y)}`)).size>=3);
  const p=points[0];g.player.x=p.x;g.player.y=p.y;g.random=()=>.01;
  const other=guardianSpawnPoint(g);assert.ok(Math.hypot(other.x-p.x,other.y-p.y)>=205);
  g.continueRealm();g.realm.warning=0;updateRealm(g,.05);
  assert.equal(g.enemies[0].pathIndex,undefined);assert.equal(g.enemies[0].goddessTarget,true);
  g.enemies=[];g.realm.stage=5;g.realm.spec.boss=true;g.realm.spawned=g.realm.spec.total-1;g.realm.spawnTimer=0;
  updateRealm(g,.05);assert.ok(g.boss);assert.equal(g.boss.pathIndex,undefined);
  assert.equal(blocked(g.boss.x,g.boss.y,42,g.trees,g.boss),false);
});

test('所有主场景选区都有可用入场空地，无法安全刷新时等待而非贴脸或消耗波次名额', () => {
  const g=create(), forest=g.forestState.trees;
  for(const a of realmSites()) {
    g.realm.arena=a;g.realm.goddess={...g.realm.goddess,x:a.x,y:a.y};
    g.player.x=a.x;g.player.y=a.y+45;g.trees=prepareRealmTrees(forest,g.realm);
    for(const boss of [false,true])assert.ok(guardianSpawnPoint(g,boss),`选区 ${a.x}/${a.y} 领主 ${boss}`);
    for(const p of guardianPads(a))assert.equal(blocked(p.x,p.y,42,g.trees,{arena:a}),false);
  }
  g.continueRealm();g.realm.warning=0;
  // 用封闭树体构造没有可用位置的场景，检查重试不会刷到中心或提前扣除名额。
  g.trees=[{x:g.realm.arena.x,y:g.realm.arena.y,hp:100,radius:g.realm.arena.radius}];
  updateRealm(g,.05);assert.equal(g.enemies.length,0);assert.equal(g.realm.spawned,0);assert.ok(g.realm.spawnTimer>0);
});

test('全部格位枪械使用正式火力造成伤害，角色站位不会替代支架射程', () => {
  for (const kind of ['weapon']) {
    const entries = kind === 'weapon' ? WEAPONS.map((_, i) => i) : [0, 1, 2, 3];
    for (const index of entries) {
      const g = create(true), weaponIndex = kind === 'weapon' ? index : 0;
      assert.ok(g.guardianDefense('deploy', 0, kind, index, weaponIndex));
      g.continueRealm();
      const pad = guardianPads(g.realm.arena)[0], e = g.spawnEnemy(0, 0, { x: pad.x + 65, y: pad.y + 5 });
      Object.assign(e, { hp: 10000, maxHp: 10000, arena: g.player.arena, mass: 10000 });
      Object.assign(g.player, g.realm.goddess);
      for (let n = 0; n < 240; n++) { updateGuardianDefenses(g, .05); g.updateProjectiles(.05); }
      assert.ok(e.hp < 10000, `${kind}/${index} 必须实际伤害怪物`);
      assert.ok(g.realm.defenses[0].runtime.vehicle !== g.vehicle);
    }
  }
});

test('新手两座火力可自动通过第一波，波间保存全部秘境币并可继续升级', () => {
  const g = create(); g.guardianDefense('deploy', 0, 'weapon', 0); g.guardianDefense('deploy', 2, 'weapon', 0);
  g.continueRealm();
  for (let i = 0; i < 4000 && g.realm.phase === 'combat'; i++) g.update(.05);
  assert.equal(g.realm.phase, 'rest'); assert.equal(g.realm.cleared, 1);
  const balance=g.realm.realmCoins;assert.ok(balance>g.realm.spec.total*12); assert.ok(g.realm.goddess.hp > 0);
  assert.ok(g.guardianDefense('upgrade', 0));
  const restored = new Game(JSON.parse(JSON.stringify(g.progress)));
  assert.equal(restored.realm.realmCoins, balance - 40); assert.equal(restored.realm.defenses[0].level, 2);
  assert.ok(restored.continueRealm()); assert.equal(restored.realm.stage, 2);
});

test('部署浮游炮沿用玩家挂载的脉冲、榴弹与电锯，并初始化独立技能周期', () => {
  for (const index of [9, 6, 14]) {
    const g = create(true); g.progress.funnelLoadout = [index, index, index];
    assert.ok(g.guardianDefense('deploy', 0, 'weapon', 12)); g.continueRealm();
    const pad = guardianPads(g.realm.arena)[0], e = g.spawnEnemy(0, 0, { x: pad.x + 65, y: pad.y + 5 });
    Object.assign(e, { hp: 10000, maxHp: 10000, arena: g.player.arena, mass: 10000 });
    for (let n = 0; n < 240; n++) { updateGuardianDefenses(g, .05); g.updateProjectiles(.05); }
    assert.ok(e.hp < 10000, `挂载 ${index} 应实际造成伤害`);
    for (const node of g.realm.defenses[0].runtime.funnel.nodes) {
      assert.ok(node.pulse && node.cycle); assert.equal(node.weaponIndex, index);
    }
  }
});

test('损坏部署拒绝重复槽位、越界和控制器载具，旧档自动补齐经济字段', () => {
  const g = create(), run = structuredClone(g.progress.realms.run);
  delete run.realmCoins; delete run.defenses;
  assert.equal(validateRealms({ run }).run.realmCoins, 160);
  run.defenses = [{ slot: 0, kind: 'weapon', index: 0, weaponIndex: 0, level: 999 },
    { slot: 0, kind: 'weapon', index: 0, weaponIndex: 0 }, { slot: 1, kind: 'vehicle', index: 0, weaponIndex: 12 }];
  const result = validateRealms({ run }).run;
  assert.equal(result.defenses.length, 1); assert.equal(result.defenses[0].level, 10);
});
