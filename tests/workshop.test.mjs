// 工坊事务回归：以真实 Game 和存档副本验证试装隔离、原子保存和独立车体。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { workshopDraft, quoteWorkshop, previewWorkshop } from '../src/progression/workshop/workshop.js';
import { commitWorkshop } from '../src/core/workshop/workshop.js';
import { createWorkshopTrial } from '../src/core/workshop/workshop-trial.js';
import { WEAPONS } from '../src/config/weapons.js';
import { workshopPart } from '../src/config/workshop-parts.js';
import { WORKSHOP, workshopAt } from '../src/world/workshop.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';

// 构造可负担所有装备的隔离进度，不读取玩家存档。
function ready() {
  const p = freshProgress();
  // 本组验证已取得购买资格的工坊事务，资格拦截由主线专项覆盖。
  p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
  // 交易用例已经到工坊内，补齐设施修复前置，避免被入口门槛拦截。
  p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
  p.coins = p.wood = 100000; p.bosses = 50;
  p.materials = { parts: 10000, crystal: 10000, core: 10000 };
  p.mastery.fill(40); p.weapons.fill(1); p.vehicleHulls.fill(1);
  return p;
}

test('免费试装包含真实效果，全部分支都有结构，原始进度保持不变', () => {
  const p = ready(), original = JSON.stringify(p);
  for (let i = 0; i < WEAPONS.length; i++) for (const choice of [1, 2]) {
    const preview = previewWorkshop(p, 'weapons', i, choice);
    assert.equal(preview.weapon.modChoice, choice);
    assert.ok(workshopPart(i, choice));
    assert.equal(quoteWorkshop(p, workshopDraft(p, 'weapons', i, choice)).ok, true);
  }
  assert.equal(JSON.stringify(p), original);
});
test('熟练度不足、余额不足、非法零件与秘境都无法提交且不保存', () => {
  const g = new Game(ready()); let writes = 0;
  const persist = () => { writes++; return true; };
  g.progress.mastery[0] = 0;
  assert.equal(commitWorkshop(g, workshopDraft(g.progress, 'weapons', 0, 1), persist).ok, false);
  g.progress.mastery[0] = 40; g.progress.coins = 0;
  assert.equal(commitWorkshop(g, workshopDraft(g.progress, 'weapons', 0, 1), persist).ok, false);
  assert.equal(commitWorkshop(g, workshopDraft(g.progress, 'vehicle', 0, 12), persist).ok, false);
  g.realm = { mode: 'tower' };
  assert.equal(commitWorkshop(g, { kind: 'turret', index: 0, action: 'buy' }, persist).ok, false);
  assert.equal(writes, 0);
});
test('保存失败及抛错保持资源、弹药和对象引用，重试只扣一次', () => {
  const g = new Game(ready()), p = g.progress;
  const draft = workshopDraft(p, 'weapons', 0, 1), before = JSON.stringify(p);
  const ammo = JSON.stringify(g.magazines);
  for (const persist of [() => false, () => { throw Error('quota'); }]) {
    assert.equal(commitWorkshop(g, draft, persist).ok, false);
    assert.equal(g.progress, p); assert.equal(JSON.stringify(p), before);
    assert.equal(JSON.stringify(g.magazines), ammo);
  }
  let saved;
  assert.equal(commitWorkshop(g, draft, next => { saved = JSON.stringify(next); return true; }).ok, true);
  assert.equal(g.progress.coins, p.coins);
  assert.equal(g.progress.coins, 99820);
  assert.equal(g.progress.mods[0], 1);
  assert.equal(JSON.stringify(g.magazines), ammo);
  assert.equal(validateProgress(JSON.parse(saved)).mods[0], 1);
  assert.equal(commitWorkshop(g, draft, () => { throw Error('不得二次保存'); }).ok, false);
});
test('原厂恢复免费且不补弹，重新改装重新收费', () => {
  const g = new Game(ready()); g.progress.mods[0] = 1; g.progress.coins = 0; g.magazines[0].ammo = 2;
  assert.equal(commitWorkshop(g, workshopDraft(g.progress, 'weapons', 0, 0), () => true).ok, true);
  assert.equal(g.progress.coins, 0); assert.equal(g.magazines[0].ammo, 2);
  assert.equal(quoteWorkshop(g.progress, workshopDraft(g.progress, 'weapons', 0, 2)).ok, false);
});
test('购买未选用车体同时得到专属炮，只保存一次且当前驾驶不变',()=>{
  const p=ready();p.vehicleHulls[1]=0;const g=new Game(p);g.start();g.summonVehicle();const current=g.vehicle;
  const plan={kind:'vehicle',index:1,action:'buy'};let writes=0;
  assert.ok(commitWorkshop(g,plan,()=>{writes++;return true;}).ok);assert.equal(writes,1);
  assert.equal(g.vehicle,current);assert.equal(current.active,true);assert.equal(g.vehicles[1].weaponIndex,18);assert.equal(g.progress.weapons[18],undefined);
});
test('自带主炮升级保留模块供给，车体升级保持耐久比例',()=>{
  const g=new Game(ready()),module=g.vehicles[1].module;module.magazine.ammo=0;module.magazine.remaining=.7;module.cooldown=.4;
  assert.ok(commitWorkshop(g,{kind:'turret',index:18,action:'upgrade'},()=>true).ok);
  assert.equal(g.vehicles[1].module,module);assert.equal(module.magazine.remaining,.7);assert.equal(module.cooldown,.4);
  g.vehicles[1].hp=g.vehicles[1].maxHp/2;
  assert.ok(commitWorkshop(g,{kind:'vehicle',index:1,action:'upgrade'},()=>true).ok);assert.equal(g.vehicles[1].hp/g.vehicles[1].maxHp,.5);
});
test('所有枪型和车载炮塔试射使用独立随机与弹药，超过十秒继续运行且不污染来源', () => {
  const p = ready(), original = JSON.stringify(p);
  for (let i = 0; i < WEAPONS.length; i++) {
    const preview = previewWorkshop(p, 'weapons', i, 1);
    const trial = createWorkshopTrial(preview.progress, 'weapons', i);
    assert.equal(trial.advance(0), true);
    for (let step = 0; step < 320; step++) trial.advance(1 / 30);
    assert.ok(Math.abs(trial.elapsed - 320 / 30) < 1e-9);
    assert.equal(trial.game.kills, 0);
    assert.ok(trial.game.enemies.every(e => Number.isFinite(e.x) && e.hp > 0));
  }
  const trial = createWorkshopTrial(previewWorkshop(p, 'vehicle', 2, 9).progress, 'vehicle', 2);
  for (let step = 0; step < 90; step++) trial.advance(1 / 30);
  assert.equal(trial.game.vehicle.active, true);
  assert.equal(JSON.stringify(p), original);
});
test('工坊主体可命中，附近麦田和道路不会误触', () => {
  assert.equal(workshopAt({ x: WORKSHOP.x, y: WORKSHOP.y - 50 }), true);
  assert.equal(workshopAt({ x: 900, y: 680 }), false);
  assert.equal(workshopAt({ x: 1100, y: 580 }), false);
});

// 靶标累计伤害后消失，索敌转向下一靶；击毁不产生奖励或改变任何正式进度。
test('试射可击毁靶标并连续换靶，剩余靶位不串位且无奖励', () => {
  const p = ready(); p.vehicleWeapons[0] = 1; p.vehicleLoadouts[0] = 0;
  const source = JSON.stringify(p);
  for (const [kind,index] of [['weapons',0],['weapons',13],['vehicle',0]]) {
    const trial = createWorkshopTrial(p,kind,index), g = trial.game;
    trial.advance(1/30); // 正式载具更新先同步旧版兼容字段，再核对击毁期间的完整进度。
    const progress = JSON.stringify(g.progress), positions = new Map(g.enemies.map(e=>[e.id,{x:e.x,y:e.y}]));
    const first = g.enemies[0];
    g.hit(first,10); trial.advance(1/30);
    assert.ok(first.hp<first.maxHp, '跨帧不回血');
    for (let step=0;step<320;step++) trial.advance(1/30);
    assert.ok(trial.destroyed>=2, `${kind}/${index} 应击毁并换靶`);
    assert.equal(g.enemies.some(e=>e.id===first.id),false);
    assert.equal(trial.total,5);
    for (const e of g.enemies) assert.ok([...positions.values()].some(p=>p.x===e.x&&p.y===e.y));
    assert.equal(JSON.stringify(g.progress),progress);
    assert.equal(g.kills,0); assert.equal(g.drops.length,0);
    assert.equal(trial.advance(1),true);
    const next = createWorkshopTrial(p,kind,index);
    assert.equal(next.destroyed,0);assert.equal(next.game.enemies.length,5);
    assert.ok(next.game.enemies.every(e=>e.hp===54));
  }
  assert.equal(JSON.stringify(p),source);
});

// 补靶只发生在整批清空之后，跨批保持会话状态并累计击破，超过十秒仍按相同规则补靶。
test('试射整批清空自动补靶，累计计数且不补弹或重置冷却', () => {
  const trial=createWorkshopTrial(ready(),'weapons',0), g=trial.game;
  const progress=JSON.stringify(g.progress), slots=g.enemies.map(e=>[e.x,e.y]);
  g.attackTimer=9;g.magazines[0].ammo=2;
  const firstIds=g.enemies.map(e=>e.id);
  g.hit(g.enemies[0],54);trial.advance(1/30);
  assert.equal(trial.batch,1);assert.equal(trial.destroyed,1);assert.equal(g.enemies.length,4);
  for(let round=1;round<=20;round++) {
    for(const e of g.enemies)g.hit(e,54);
    trial.advance(1/30);
    assert.equal(trial.batch,round+1);assert.equal(trial.destroyed,round*5);
    assert.equal(g.enemies.length,5);assert.ok(g.enemies.every(e=>e.hp===54&&!firstIds.includes(e.id)));
    assert.deepEqual(g.enemies.map(e=>[e.x,e.y]),slots);
    assert.equal(g.magazines[0].ammo,2);assert.ok(g.attackTimer>8);
    assert.equal(g.kills,0);assert.equal(g.drops.length,0);assert.equal(JSON.stringify(g.progress),progress);
  }
  g.attackTimer=20;
  while(trial.elapsed<10)trial.advance(1/30);
  const batch=trial.batch;
  for(const e of g.enemies)g.hit(e,54);
  assert.equal(trial.advance(1),true);assert.equal(trial.batch,batch+1);
  assert.equal(g.magazines[0].ammo,2); assert.ok(g.attackTimer>9);
  assert.deepEqual(g.enemies.map(e=>[e.x,e.y]),slots);
  assert.ok(g.enemies.every(e=>e.hp===54));
  const next=createWorkshopTrial(ready(),'weapons',0);
  assert.equal(next.batch,1);assert.equal(next.destroyed,0);
});

test('三类装备的购买与升级均先保存再生效，失败不改变所有权', () => {
  for (const [kind, index, field] of [['weapons', 8, 'weapons'], ['turret', 9, 'vehicleWeapons'], ['vehicle', 3, 'vehicleHulls']]) {
    const g = new Game(ready()); g.progress[field][index] = 0;
    const plan = { kind, index, action: 'buy' }, original = JSON.stringify(g.progress);
    assert.equal(commitWorkshop(g, plan, () => false).ok, false);
    assert.equal(JSON.stringify(g.progress), original);
    assert.equal(commitWorkshop(g, plan, () => true).ok, true);
    assert.equal(g.progress[field][index], 1);
    assert.equal(commitWorkshop(g, { ...plan, action: 'upgrade' }, () => true).ok, true);
    assert.equal(g.progress[field][index], 2);
  }
});

// 复现截图中的三级机械蜘蛛，越过十秒后继续计时、击破和补靶，零步长仍冻结。
test('三级机械蜘蛛持续试射三十秒，十秒后继续攻击且暂停不补算', () => {
  const p=ready(), index=WEAPONS.findIndex(w=>w.controller==='spider'); p.weapons[index]=3;
  const original=JSON.stringify(p), trial=createWorkshopTrial(p,'weapons',index);
  for(let n=0;n<600;n++)trial.advance(1/60);
  const first={elapsed:trial.elapsed,destroyed:trial.destroyed,batch:trial.batch};
  for(let n=0;n<1200;n++)assert.equal(trial.advance(1/60),true);
  assert.ok(Math.abs(trial.elapsed-30)<1e-8);
  assert.ok(trial.destroyed>first.destroyed); assert.ok(trial.batch>first.batch);
  assert.equal(trial.game.kills,0); assert.equal(trial.game.drops.length,0);
  const paused=JSON.stringify([trial.elapsed,trial.game.time,trial.destroyed,trial.batch,trial.game.spider]);
  for(let n=0;n<60;n++)trial.advance(0);
  assert.equal(JSON.stringify([trial.elapsed,trial.game.time,trial.destroyed,trial.batch,trial.game.spider]),paused);
  assert.equal(JSON.stringify(p),original);
});
