import { economyUpgradeCost } from '../src/config/economy.js';
// 机械核心规则与正式战斗回归：数量成长、接触攻击、共享能源、秘境隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { WEAPONS } from '../src/config/weapons.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
import { equipmentParts } from '../src/config/equipment-parts.js';
import { workshopUpgrade, quoteWorkshop, applyPartPreview } from '../src/progression/workshop/workshop.js';
import { commitWorkshop } from '../src/core/workshop/workshop.js';
import { updateMechanical } from '../src/combat/mechanical.js';
import { createWorkshopTrial } from '../src/core/workshop/workshop-trial.js';
import { expeditionEquipment } from '../src/config/expedition.js';
import { guardianProgress } from '../src/config/guardian-equipment.js';
import { prepareGuardianDefense, updateGuardianDefenses } from '../src/core/battle/guardian-defense.js';
import { blocked } from '../src/physics/motion.js';
import { worldDistance } from '../src/world/coordinates.js';

// 隔离全装备进度，保留正式校验与经济公式。
function ready() {
  const p=freshProgress();p.weapons.fill(1);p.weapon=15;p.coins=p.wood=100000;p.bosses=100;p.mastery.fill(40);
  return validateProgress(p);
}
// 平台夹具只排除森林布局干扰，移动、近战接触和能源仍使用正式模块。
function arena() {
  const g=new Game(ready(),()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};
  Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:700}});g.hurt=()=>{};return g;
}
// 静止高耐久目标，用正式生成入口保证命中特效与奖励字段完整。
function enemy(g,x=1100,y=750) {
  const e=g.spawnEnemy(0,100,{x,y});e.hp=e.maxHp=10000;e.speed=0;e.damage=0;return e;
}

test('固定编号与旧档兼容，协同模块八级对应三到十只，其他部件上限不变',()=>{
  assert.equal(WEAPONS[15].id,'mechanical-core');assert.equal(WEAPONS[14].id,'chainsaw');
  const old=ready();old.weapons=old.weapons.slice(0,15);delete old.weaponParts;
  const migrated=validateProgress(old);assert.equal(migrated.weapons[15],0);assert.equal(migrated.weaponParts[15].coordination,1);
  for(let level=1;level<=8;level++){const p=ready();p.weaponParts[15].coordination=level;assert.equal(effectiveWeapon(p).summonCount,level+2);}
  const p=ready();p.weaponParts[15].coordination=900;p.weaponParts[15].rate=900;
  assert.equal(validateProgress(p).weaponParts[15].coordination,8);assert.equal(validateProgress(p).weaponParts[15].rate,5);
  assert.ok(!equipmentParts('weapons',13).some(x=>x.key==='coordination'));
});

test('七次独立升级价格正确，试装免费、重复与上限拒绝、保存失败回滚',()=>{
  const g=arena();
  for(let level=1;level<8;level++) {
    const plan=workshopUpgrade(g.progress,'weapons',15,'coordination');const before=JSON.stringify(g.progress);
    const preview=structuredClone(g.progress);applyPartPreview(preview,plan);assert.equal(effectiveWeapon(preview).summonCount,level+3);
    assert.equal(JSON.stringify(g.progress),before);const q=quoteWorkshop(g.progress,plan);assert.ok(q.ok);
    assert.equal(q.rows.find(r=>r.key==='coins').need,economyUpgradeCost(g.progress,'weapons',15,level,'coordination').coins);assert.equal(q.rows.find(r=>r.key==='wood').need,economyUpgradeCost(g.progress,'weapons',15,level,'coordination').wood);
    assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.equal(JSON.stringify(g.progress),before);
    assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(commitWorkshop(g,plan,()=>true).ok,false);
  }
  assert.equal(effectiveWeapon(g.progress).summonCount,10);assert.equal(quoteWorkshop(g.progress,workshopUpgrade(g.progress,'weapons',15,'coordination')).ok,false);
  const p=ready(),plan=workshopUpgrade(p,'weapons',15,'coordination');p.coins=0;assert.equal(quoteWorkshop(p,plan).ok,false);
  assert.equal(quoteWorkshop(ready(),plan,true).ok,false);
});

test('两种套件与独立数量共存，恢复原厂不清除协同等级，局内装备隔离永久部件',()=>{
  const p=ready();p.weaponParts[15].coordination=8;
  for(const mod of [1,2,0]){p.mods[15]=mod;assert.equal(effectiveWeapon(p).summonCount,10);}
  assert.equal(effectiveWeapon(expeditionEquipment(p,{weapon:15,vehicle:0,turret:0,modules:[0,0,0]},1)).summonCount,3);
  assert.equal(effectiveWeapon(guardianProgress(p,{weaponIndex:15,level:1})).summonCount,3);
});

test('三只近战小猫先接近再命中，伤害归属核心，不生成远程弹丸',()=>{
  const g=arena(),e=enemy(g),hits=[];const hit=g.hit.bind(g);
  g.hit=(target,damage,critical,impact)=>{const near=g.mechanical.nodes.some(n=>n.active&&worldDistance(n,target)<=g.weapon().meleeReach+target.radius+.1);assert.ok(near);hits.push({damage,impact});hit(target,damage,critical,impact);};
  updateMechanical(g,.016);assert.equal(e.hp,10000);assert.equal(g.mechanical.nodes.filter(n=>n.active).length,1);
  // 重装爪移动更慢，给予足够的追敌时间，命中仍必须发生在近战范围内。
  for(let i=0;i<200;i++)updateMechanical(g,1/60);
  assert.ok(hits.length>=3);assert.equal(hits[0].damage,g.damage(15));assert.equal(hits[0].impact.weaponIndex,15);assert.equal(g.projectiles.length,0);
  assert.equal(g.magazines[15].ammo,36-hits.length);
});

test('地面猫不攻击空中单位或半径外目标，不穿树和湖岸，近战不能隔树结算',()=>{
  const g=arena(),e=enemy(g);e.flying=true;for(let i=0;i<120;i++)updateMechanical(g,1/60);assert.equal(e.hp,10000);
  e.flying=false;e.x=1600;for(let i=0;i<120;i++)updateMechanical(g,1/60);assert.equal(e.hp,10000);
  e.x=950;g.addTree(925,750,{radius:16});g.trees[0].hp=100000;
  for(let i=0;i<120;i++){updateMechanical(g,1/60);for(const n of g.mechanical.nodes.filter(n=>n.active))assert.equal(blocked(n.x,n.y,9,g.trees,n),false);}
  const forest=new Game(ready(),()=>.5);forest.trees=[];forest.enemies=[];forest.boss=null;Object.assign(forest.player,{x:1100,y:1100});
  const target=enemy(forest,1370,1100);for(let i=0;i<120;i++) {updateMechanical(forest,1/60);for(const n of forest.mechanical.nodes.filter(n=>n.ready))assert.equal(blocked(n.x,n.y,9,[],n),false);}
  assert.equal(target.hp,10000);
});

test('十猫共享能源、充能与暂停；升级和切换不补弹、不清冷却',()=>{
  const g=arena();g.progress.weaponParts[15].coordination=8;enemy(g,980);g.magazines[15].ammo=2;
  for(let i=0;i<660;i++)updateMechanical(g,1/60);
  assert.equal(g.mechanical.nodes.filter(n=>n.active).length,10);assert.equal(g.magazines[15].ammo,0);assert.equal(g.magazines[15].remaining,0);
  const plan=workshopUpgrade(g.progress,'weapons',15,'capacity'),ammo=JSON.stringify(g.magazines[15]);g.mechanical.nodes[0].cooldown=.73;
  assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(JSON.stringify(g.magazines[15]),ammo);assert.equal(g.mechanical.nodes[0].cooldown,.73);
  assert.ok(g.transact('weapons',0,'equip'));assert.ok(g.transact('weapons',15,'equip'));assert.equal(g.mechanical.nodes[0].cooldown,.73);assert.equal(JSON.stringify(g.magazines[15]),ammo);
  g.state='paused';const state=JSON.stringify(g.mechanical);g.update(1);assert.equal(JSON.stringify(g.mechanical),state);
});

test('试射可击破与补靶，三猫与十猫状态独立且不污染原始进度',()=>{
  const p=ready();const saved=JSON.stringify(p);const base=createWorkshopTrial(p,'weapons',15);
  for(let i=0;i<300;i++)base.advance(1/30);assert.ok(base.destroyed>0);assert.equal(base.game.mechanical.nodes.filter(n=>n.active).length,3);
  p.weaponParts[15].coordination=8;const trial=createWorkshopTrial(p,'weapons',15);
  for(let i=0;i<300;i++)trial.advance(1/30);assert.equal(trial.game.mechanical.nodes.filter(n=>n.active).length,10);assert.ok(trial.destroyed>0);
  p.weaponParts[15].coordination=1;assert.equal(JSON.stringify(p),saved);
});

test('守护支架有独立三猫状态、波间不攻击，重建保留位置且不引用玩家猫群',()=>{
  const g=arena();g.realm={mode:'guardian',phase:'combat',buffs:{},arena:{x:900,y:750,radius:700},defenses:[]};
  const tower={slot:0,kind:'weapon',index:15,weaponIndex:15,level:1};g.realm.defenses.push(tower);
  const local=prepareGuardianDefense(g,tower);assert.notEqual(local.mechanical,g.mechanical);assert.equal(local.weapon().summonCount,3);
  enemy(g,local.player.x+80,local.player.y);for(let i=0;i<300;i++)updateGuardianDefenses(g,1/60);
  assert.ok(local.mechanical.nodes.some(n=>n.targetId!==null));assert.ok(local.magazines[15].ammo<=36);const before=structuredClone(local.mechanical);
  prepareGuardianDefense(g,tower);assert.deepEqual(tower.runtime.mechanical,before);assert.notEqual(tower.runtime.mechanical,local.mechanical);
  g.realm.phase='rest';const ammo=tower.runtime.magazines[15].ammo;updateGuardianDefenses(g,2);assert.equal(tower.runtime.magazines[15].ammo,ammo);
});

// 将猫与敌人放在树干两侧，单次零位移步仅检验真实爪击遮挡，不能靠绕行通过。
test('树干截断爪击，周期地图另一侧的近邻仍能被正确接触',()=>{
  const g=arena(),e=enemy(g);Object.assign(e,{x:935,y:750,radius:14});
  g.addTree(915,750,{radius:8});
  for(const n of g.mechanical.nodes){Object.assign(n,{x:900,y:750,ready:true,cooldown:n.index?99:0});}
  updateMechanical(g,0);assert.equal(e.hp,10000);assert.equal(g.magazines[15].ammo,36);
  g.trees=[];g.player.arena=null;g.player.x=3595;e.x=15;
  for(const n of g.mechanical.nodes)Object.assign(n,{x:3595,y:750,arena:null,cooldown:n.index?99:0});
  updateMechanical(g,.12);assert.equal(e.hp,10000-g.damage(15));assert.equal(g.magazines[15].ammo,35);
});
