import {summonClearingBossAtNode as summonBossAtNode} from './helpers/clearing-scene.mjs';
// 秘境端到端规则测试：无尽推进、真实女神承伤、断点恢复与森林现场隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { REALMS, REALM_ARENA, realmReward, realmWeapon, realmStageSpec } from '../src/config/realms.js';
import { updateRealm, hurtGoddess, syncRealm, beginRealmStage } from '../src/core/realm-manager.js';
import { updateBoss, updateBossHazards } from '../src/combat/bosses.js';
import { updateBossSupport } from '../src/core/boss-reinforcements.js';
import { capturePatrol } from '../src/core/patrol-session.js';
import { updateEnemies } from '../src/core/enemy-manager.js';
import { moveBody, blocked } from '../src/physics/motion.js';
import { WORLD } from '../src/world/coordinates.js';
import { funnelTargets } from '../src/combat/funnel.js';

// 用确定性随机源创建一局，避免测试依赖抽签结果。
function create(mode) {
  const game = new Game(freshProgress(), () => 0.45);
  game.start();
  assert.ok(game.enterRealm(mode));
  if (mode === 'guardian') game.continueRealm();
  if (mode === 'rogue') equip(game);
  return game;
}
// 完成新的开局补给流程，旧有秘境规则断言从祝福阶段继续。
function equip(game) {
  game.rollRealmEquipment('weapon'); game.rollRealmEquipment('vehicle'); game.rollRealmEquipment('turret'); game.readyRealm();
}
// 通过公开命中入口清除实际生成的敌人，保留刷怪配额与阶段事务。
function clear(game) {
  if (game.realm.phase === 'choice') game.chooseRealmBlessing(game.realm.offers[0]);
  if (['rest', 'build'].includes(game.realm.phase)) game.continueRealm();
  let guard = 0;
  while (game.realm.phase === 'combat' && guard++ < 2000) {
    updateRealm(game, 0.05);
    for (const enemy of game.enemies) if (enemy.hp > 0) game.hit(enemy, 100000);
    if (game.boss) game.hit(game.boss, 1000000);
  }
  assert.ok(guard < 2000, '关卡应在清完配额后结束');
}
// 模拟应用保存同一份永久成长和冻结的森林检查点。
function reload(game) {
  game.progress.patrol = capturePatrol(game);
  return new Game(JSON.parse(JSON.stringify(game.progress)), () => 0.45);
}

test('进入、失败和退出秘境不改变森林现场、波次、弹药、坐标或累计统计', () => {
  const g = new Game(); g.start(); g.wave = 9; g.kills = 53; g.chopped = 17; g.player.hp = 73;
  g.player.x = 550; g.magazines[0].ammo = 4;
  const player = g.player, trees = g.trees, vehicles = g.vehicles;
  const patrol = capturePatrol(g), damage = g.damage();
  g.enterRealm('rogue');
  assert.equal(g.enterRealm('tower'), false);
  assert.deepEqual(capturePatrol(g), patrol);
  equip(g);
  const expeditionDamage = g.damage();
  g.realm.buffs.power = 2; assert.ok(g.damage() > expeditionDamage);
  g.chooseRealmBlessing(g.realm.offers[0]);
  g.dismountVehicle(); // 此用例验证驾驶员阵亡，先主动下车。
  g.hurt(100000);
  assert.equal(g.realm.phase, 'lost');
  assert.equal(g.start(), undefined);
  assert.equal(g.state, 'realm');
  g.leaveRealm();
  assert.equal(g.player, player); assert.equal(g.trees, trees); assert.equal(g.vehicles, vehicles);
  assert.equal(g.wave, 9); assert.equal(g.kills, 53); assert.equal(g.chopped, 17);
  assert.equal(g.player.x, 550); assert.equal(g.player.hp, 73); assert.equal(g.magazines[0].ammo, 4);
  assert.equal(g.damage(), damage); assert.equal(g.state, 'playing');
});

for (const mode of Object.keys(REALMS).filter(mode=>!['football','fire','race'].includes(mode))) test(`${mode}：跨越旧终点仍可推进，奖励只发一次且不会增长森林击杀与材料保底`, () => {
  const g = create(mode), start = { coins: g.progress.coins, wood: g.progress.wood };
  const expected = { coins: 0, wood: 0, parts: 0, crystal: 0, core: 0 };
  for (let stage = 1; stage <= 12; stage++) {
    clear(g);
    for (const [key, amount] of Object.entries(realmReward(mode, stage, stage - 1))) expected[key] += amount;
    assert.equal(g.realm.cleared, stage);
    assert.equal(g.progress.realms.records[mode].best, stage);
  }
  assert.equal(g.realm.phase, mode === 'rogue' ? 'choice' : 'rest');
  assert.deepEqual(g.realm.earnings, expected);
  assert.equal(g.progress.coins, start.coins + expected.coins);
  assert.equal(g.progress.wood, start.wood + expected.wood);
  assert.equal(g.progress.materials.core, expected.core);
  assert.equal(g.kills, 0);
  assert.deepEqual(g.progress.materialPity, { parts: 0, crystal: 0 });
  assert.equal(g.progress.mastery[0], 0);
  // 爬塔现在会自动换层；重复更新只允许改变会话检查点，不得重发永久奖励。
  const before = JSON.stringify({ ...g.progress, realms: { ...g.progress.realms, run: null } });
  updateRealm(g, 10);
  assert.equal(JSON.stringify({ ...g.progress, realms: { ...g.progress.realms, run: null } }), before);
  const restored = reload(g);
  assert.equal(restored.realm.phase, g.realm.phase);
  assert.equal(restored.progress.realms.records[mode].best, 12);
  assert.equal(restored.progress.realms.records[mode].bosses, 2);
  assert.equal(restored.progress.materials.core, expected.core);
});

test('爬塔第五与第十层核心只在首次通过发放，重复通关保留基础收益', () => {
  for(const highest of [5,10]){
    const g = create('tower');
    for(let n=0;n<highest;n++)clear(g);
    const parts=g.progress.materials.parts;
    assert.equal(g.progress.materials.core,highest/5);
    g.leaveRealm();g.enterRealm('tower');
    assert.equal(g.realm.stage,highest);clear(g);
    assert.equal(g.progress.materials.core,highest/5);
    assert.equal(g.progress.realms.records.tower.bosses,highest/5+1);
    assert.equal(g.progress.materials.parts,parts+realmReward('tower',highest,highest).parts);
  }
});

test('随机祝福三项不同，必须完成选择才开战，非法选择和双击无效', () => {
  const g = create('rogue');
  assert.equal(new Set(g.realm.offers).size, 3);
  assert.equal(g.state, 'realm');
  g.pause(); g.start(); g.update(.05, { x: 1, y: 0 });
  assert.equal(g.state, 'realm');
  assert.equal(g.chooseRealmBlessing('not-a-blessing'), false);
  const offered = g.realm.offers[0];
  assert.ok(g.chooseRealmBlessing(offered));
  assert.equal(g.chooseRealmBlessing(offered), false);
  assert.equal(g.realm.buffs[offered], 1);
  assert.equal(g.realm.warning, 3);
});

test('女神遭受真实追击扑击，玩家远离也会失守，失败不触发森林死亡', () => {
  const g = create('guardian');
  g.realm.warning = 0; updateRealm(g, .01);
  const enemy = g.enemies[0];
  enemy.pathIndex = 5; enemy.x = g.realm.goddess.x + 60; enemy.y = g.realm.goddess.y;
  g.player.x = 1120; g.player.y = 800;
  const oldHp = g.player.hp;
  for (let i = 0; i < 30; i++) updateEnemies(g, .05, g.player);
  assert.ok(g.realm.goddess.hp < 600);
  assert.equal(g.player.hp, oldHp);
  hurtGoddess(g, 100000);
  assert.equal(g.realm.phase, 'lost');
  assert.equal(g.state, 'realm');
  assert.equal(g.progress.realms.records.guardian.clears, 0);
});

test('守护波间不再提供祝福，也不会额外治疗或强化', () => {
  const g = create('guardian'); g.realm.goddess.hp = 400;
  clear(g);
  assert.equal(g.realm.phase, 'rest'); assert.deepEqual(g.realm.offers, []);
  for (const key of ['mend','heal','power']) assert.equal(g.chooseRealmBlessing(key), false);
  assert.ok(g.continueRealm()); assert.equal(g.realm.goddess.hp, 400);
  assert.equal(g.realm.buffs.power || 0, 0);
});

test('祝福修正手持伤害生命、射速装填和射程，永久武器与等级保持不变', () => {
  const g = create('rogue'), base = { damage: g.damage(), hp: g.maxHp(), weapon: g.weapon() };
  const levels = [...g.progress.weapons];
  g.realm.buffs = { power: 1, vitality: 1, haste: 1, reach: 1, armor: 1 };
  assert.equal(g.maxHp(), base.hp + 30);
  assert.equal(g.damage(), Math.round(base.damage * 1.2));
  assert.equal(g.weapon().reloadTime, base.weapon.reloadTime * .88);
  assert.equal(g.weapon().range, base.weapon.range * 1.15);
  assert.deepEqual(g.progress.weapons, levels);
  assert.deepEqual(realmWeapon(base.weapon), base.weapon);
  g.chooseRealmBlessing(g.realm.offers[0]);
  g.dismountVehicle(); // 排除车体装甲，直接验证角色祝福减伤。
  g.hurt(10); assert.ok(g.player.hp > base.hp - 10);
});

test('暂停冻结刷怪与战斗，局内禁用森林领主、购买和换装', () => {
  const g = create('tower'); g.pause();
  for (let i = 0; i < 100; i++) g.update(.05, { x: 1, y: 0 });
  assert.equal(g.realm.warning, 3); assert.equal(g.enemies.length, 0);
  g.kills = 50; g.pause(); assert.equal(g.summonBoss(), false);
  assert.equal(g.transact('weapons', 0, 'upgrade'), false);
  assert.equal(g.upgradeVehicle(), false);
  assert.equal(g.configureFunnel(0, 0), false);
});

test('秘境边界不读取森林水面，飞行、步行和击退都不能飞离平台', () => {
  for (const flying of [false, true]) {
    const body = { ...REALM_ARENA, arena: REALM_ARENA, flying };
    moveBody(body, 2000, 2000, WORLD);
    assert.ok(Math.hypot(body.x - REALM_ARENA.x, body.y - REALM_ARENA.y) <= REALM_ARENA.radius - 12 + 1e-8);
    assert.equal(blocked(body.x, body.y, 12, [], body), false);
  }
});

test('刷新从关卡起点恢复且保留已结算奖励，返回森林波次不被秘境覆盖', () => {
  let g = new Game(); g.start(); g.wave = 12; g.kills = 90; g.enterRealm('guardian');
  clear(g); g.continueRealm();
  g.player.hp = 1; g.realm.goddess.hp = 1; updateRealm(g, .05);
  const coins = g.progress.coins;
  g = reload(g);
  assert.equal(g.state, 'paused'); assert.equal(g.realm.stage, 2);
  assert.equal(g.realm.goddess.hp, 600); assert.equal(g.player.hp, 120);
  assert.equal(g.realm.buffs.power || 0, 0); assert.equal(g.progress.coins, coins);
  g.pause(); clear(g);
  assert.equal(g.progress.coins, coins + realmReward('guardian', 2, 1).coins);
  g.leaveRealm();
  assert.equal(g.wave, 12); assert.equal(g.kills, 90);
});

test('选祝福和层间休整状态刷新后仍可继续，不重发该关奖励', () => {
  for (const mode of ['rogue', 'tower', 'guardian']) {
    const g = create(mode); clear(g);
    const restored = reload(g);
    assert.equal(restored.realm.phase, g.realm.phase);
    assert.equal(restored.realm.cleared, 1);
    assert.equal(restored.progress.coins, g.progress.coins);
    clear(restored);
    assert.equal(restored.realm.cleared, 2);
  }
});

test('旧档自动迁移；非法模式、矛盾清关、损坏祝福不恢复挑战', () => {
  const p = freshProgress(); delete p.realms;
  assert.equal(validateProgress(p).realms.records.tower.best, 0);
  for (const run of [
    { mode: '__proto__', phase: 'combat' },
    { mode: 'tower', phase: 'combat', stage: 1, cleared: 1 },
    { mode: 'rogue', phase: 'choice', offers: ['power', 'power', '<script>'] },
  ]) assert.equal(validateProgress({ ...p, realms: { run } }).realms.run, null);
});

test('清空进度移除秘境会话和冻结现场，准备状态进入退出不会自动开始巡游', () => {
  const g = new Game();
  assert.ok(g.enterRealm('tower')); g.leaveRealm();
  assert.equal(g.state, 'ready');
  g.enterRealm('rogue'); g.resetProgress();
  assert.equal(g.realm, null); assert.equal(g.forestState, null);
  assert.equal(g.progress.realms.run, null); assert.equal(g.state, 'ready');
});

test('浮游炮挂载同样获得射程祝福，不只修改手持枪的参数面板', () => {
  const p = freshProgress(); p.weapons[12] = 1; p.weapon = 12; p.funnelLoadout = [0, 0, 0];
  const g = new Game(p); g.enterRealm('rogue'); delete g.realm.loadout; g.realm.phase = 'choice'; g.chooseRealmBlessing(g.realm.offers[0]);
  g.trees = []; // 隔离射程断言，排除新场景中的可采集树木。
  g.realm.buffs.reach = 0;
  const enemy = g.spawnEnemy(0, 0, {x:g.player.x + 290, y:g.player.y});
  assert.ok(funnelTargets(g, g.weapon()).every(t => !t));
  g.realm.buffs.reach = 1;
  assert.ok(funnelTargets(g, g.weapon()).some(t => t === enemy));
  assert.equal(g.weapon(0).range, 299);
});

test('秘境载具独立承伤，飞行降落不读取森林地形，返回恢复原车耐久与驾驶状态', () => {
  const p = freshProgress(); p.vehicleHulls[2] = 1; p.vehicleIndex = 2;
  const g = new Game(p); g.start(); g.summonVehicle();
  const original = g.vehicle; original.hp = 80;
  g.enterRealm('guardian'); g.continueRealm(); g.summonVehicle();
  assert.equal(g.vehicle.active, true); assert.equal(g.player.flying, true);
  const driverHp = g.player.hp;
  g.hurt(30); assert.equal(g.player.hp, driverHp);
  assert.ok(g.vehicle.hp < g.vehicle.maxHp);
  assert.ok(g.dismountVehicle()); assert.equal(g.player.flying, false);
  g.leaveRealm();
  assert.equal(g.vehicle, original); assert.equal(g.vehicle.hp, 80);
  assert.equal(g.player.flying, true); assert.equal(g.vehicle.active, true);
});

// 高层仍递增，但同屏数量和追击速度有限，压力由总配额和属性提供。
test('三模式无尽难度递增且每五层领主，不能用切换遭遇降低基础生命', () => {
  for (const mode of ['rogue','tower','guardian']) {
    let previous=realmStageSpec(mode,1);
    for(let stage=2;stage<=200;stage++) {
      const next=realmStageSpec(mode,stage,stage%2?'elite':'hunters');
      assert.ok(next.total>previous.total && next.hp>previous.hp && next.damage>previous.damage);
      assert.ok(next.alive<=(mode==='guardian'?216:72) && next.speed<=115);
      assert.equal(next.boss,stage%5===0);previous=next;
    }
  }
});

// 只清杂兵不能偷过领主关；暂停、刷新与森林胜场均独立。
test('真实领主占用最后配额，击败才结算，不生成森林援兵或重复核心', () => {
  const g=create('tower');g.realm.stage=5;g.realm.cleared=4;beginRealmStage(g);
  for(let i=0;i<2000&&!g.boss;i++) {
    updateRealm(g,.05);for(const e of g.enemies)if(e.hp>0)g.hit(e,100000);
  }
  assert.equal(g.boss.type,'boss');assert.equal(g.boss.kind,'boar');
  assert.equal(g.realm.kills,g.realm.spec.total-1);
  updateRealm(g,10);assert.equal(g.realm.phase,'combat');
  const count=g.enemies.length;updateBossSupport(g,200);assert.equal(g.enemies.length,count);
  const restored=reload(g);assert.equal(restored.realm.stage,5);assert.equal(restored.state,'paused');
  assert.equal(restored.realm.kills,0);assert.equal(restored.progress.materials.core,0);
  const boss=g.boss;g.hit(boss,1000000);g.hit(boss,1000000);updateRealm(g,.05);
  assert.equal(g.realm.phase,'rest');assert.equal(g.progress.materials.core,1);
  assert.equal(g.progress.bosses,0);assert.equal(g.progress.realms.records.tower.bosses,1);
  assert.equal(g.boss,null);assert.equal(g.hazards.length,0);
});

// 五种领主复用真实技能，守护关需要玩家拦截，不能让领主只围着玩家转。
test('五种秘境领主的真实技能均可伤害女神，森林玩家不承受这份伤害', () => {
  const kinds=['boar','mushroom','owl','turtle','moss'];
  for(let n=0;n<5;n++) {
    const g=create('guardian');g.realm.stage=(n+1)*5;g.realm.cleared=g.realm.stage-1;beginRealmStage(g);
    g.realm.spawned=g.realm.spec.total-1;g.realm.warning=0;updateRealm(g,.1);
    assert.equal(g.boss.kind,kinds[n]);Object.assign(g.boss,{x:g.realm.goddess.x-150,y:g.realm.goddess.y,attack:0,pathIndex:5});
    Object.assign(g.player,{x:1100,y:800});const hp=g.player.hp;
    for(let i=0;i<200&&g.realm.goddess.hp===600;i++){updateBoss(g,.05);updateBossHazards(g,.05);}
    assert.ok(g.realm.goddess.hp<600,kinds[n]+'应伤害祭坛');assert.equal(g.player.hp,hp);
  }
});

// 旧版 won 记录已经发奖，只转换休整阶段；高层记录不再裁剪回原终点。
test('旧终点存档可继续且奖励保留，高层失败与检查点完整保存', () => {
  for(const [mode,stage]of Object.entries({rogue:5,tower:10,guardian:6})) {
    const p=freshProgress();p.materials.core=7;p.realms.records[mode]={best:stage,clears:2};
    p.realms.run={mode,stage,cleared:stage,phase:'won',buffs:{power:2},offers:[],startHp:120,goddessHp:600,earnings:{core:1}};
    const g=new Game(p,()=>.45);assert.equal(g.realm.phase,mode==='rogue'?'choice':'rest');
    assert.equal(g.progress.materials.core,7);assert.equal(g.progress.realms.records[mode].clears,2);
    if(mode!=='rogue')g.continueRealm();else g.chooseRealmBlessing(g.realm.offers[0]);
    assert.equal(g.realm.stage,stage+1);assert.equal(g.progress.materials.core,7);
  }
  const g=create('tower');g.realm.stage=120;g.realm.cleared=119;g.progress.realms.records.tower.best=119;beginRealmStage(g);
  const restored=reload(g);assert.equal(restored.realm.stage,120);assert.equal(restored.progress.realms.records.tower.best,119);
  restored.pause();restored.hurt(100000);const lost=reload(restored);
  assert.equal(lost.realm.phase,'lost');assert.equal(lost.realm.stage,120);
});

// 祭坛没有玩家受击无敌帧，近战领主贴身伤害也必须与帧率无关。
test('祭坛接触伤害有独立间隔，30与120帧承伤一致', () => {
  const results=[];
  for(const fps of [30,120]) {
    const g=create('guardian');g.realm.stage=25;g.realm.cleared=24;beginRealmStage(g);
    g.realm.spawned=g.realm.spec.total-1;g.realm.warning=0;updateRealm(g,.01);
    Object.assign(g.boss,{x:g.realm.goddess.x,y:g.realm.goddess.y-10,attack:999,damage:10,pathIndex:5});
    for(let i=0;i<fps;i++)updateBoss(g,1/fps);
    results.push(g.realm.goddess.hp);
  }
  assert.deepEqual(results,[580,580]);
});

// 秘境领主不改写正在挑战的森林领主，返回后继续同一场主线战斗。
test('秘境领主结算后森林领主现场和强度快照保持原样', () => {
  const g=new Game();g.start();g.kills=12;assert.ok(summonBossAtNode(g));
  const boss=g.boss;boss.hp-=100;const snapshot=JSON.stringify(g.progress.bossChallenge),hp=boss.hp;
  g.enterRealm('tower');g.realm.stage=5;g.realm.cleared=4;beginRealmStage(g);clear(g);
  assert.equal(g.progress.bosses,0);assert.equal(JSON.stringify(g.progress.bossChallenge),snapshot);
  g.leaveRealm();assert.equal(g.boss,boss);assert.equal(g.boss.hp,hp);
});

// 无尽化不额外削减远征与守护的重复挑战奖励，爬塔仍遵守原有首通规则。
test('周期核心保留各模式原有领取规则',()=>{
  assert.equal(realmReward('rogue',5,20).core,1);
  assert.equal(realmReward('guardian',10,20).core,1);
  assert.equal(realmReward('tower',10,20).core,0);
  assert.equal(realmReward('tower',25,20).core,1);
  assert.equal(realmReward('rogue',6,0).core,0);
});
