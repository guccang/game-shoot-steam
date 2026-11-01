// 远征补给回归：抽签事务、全目录实战、自动成长和永久存档隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress } from '../src/progression/progress.js';
import { validateRealms } from '../src/progression/realm-progress.js';
import { WEAPONS } from '../src/config/weapons.js';
import { COLLECTED_VEHICLES, vehicleDamage } from '../src/config/vehicles.js';
import { beginRealmStage, syncRealm } from '../src/core/realm-manager.js';
import { drawExpeditionItem, EXPEDITION_GUNS, EXPEDITION_TURRETS } from '../src/config/expedition.js';

// 保存时只序列化永久进度，运行时临时装备不得泄漏到所有权字段。
function restore(game) { return new Game(JSON.parse(JSON.stringify(game.progress)), () => .99); }
// 通过真实补给接口进入战斗。
function equip(game) {
  assert.ok(game.rollRealmEquipment('weapon'));
  assert.ok(game.rollRealmEquipment('vehicle'));
  assert.ok(game.rollRealmEquipment('turret'));
  assert.ok(game.readyRealm());
  assert.ok(game.chooseRealmBlessing(game.realm.offers[0]));
}

test('未领取三槽不能跳过准备，点击立即保存，刷新和连点不会重抽', () => {
  let g = new Game(); g.enterRealm('rogue');
  assert.equal(g.realm.phase, 'loadout');
  assert.equal(g.rollRealmEquipment('vehicle'), false);
  assert.equal(g.rollRealmEquipment('turret'), false);
  assert.equal(g.chooseRealmBlessing(g.realm.offers[0]), false);
  assert.equal(beginRealmStage(g), false);
  assert.equal(g.readyRealm(), false);
  assert.ok(g.rollRealmEquipment('weapon'));
  const gun = g.realm.loadout.weapon;
  assert.equal(g.rollRealmEquipment('weapon'), false);
  g = restore(g);
  assert.equal(g.realm.phase, 'loadout'); assert.equal(g.realm.loadout.weapon, gun);
  assert.equal(g.readyRealm(), false);
  assert.ok(g.rollRealmEquipment('vehicle'));
  assert.equal(g.realm.loadout.turret, null);
  assert.equal(g.vehicle.weaponIndex, null);
  assert.equal(g.readyRealm(), false); assert.equal(beginRealmStage(g), false);
  g = restore(g); assert.equal(g.realm.loadout.turret, null);
  assert.equal(g.realm.phase, 'loadout'); assert.equal(g.realm.loadout.weapon, gun);
  assert.ok(g.rollRealmEquipment('turret'));
  assert.equal(g.rollRealmEquipment('turret'), false);
  const loadout = structuredClone(g.realm.loadout);
  assert.equal(g.rollRealmEquipment('vehicle'), false);
  g = restore(g); assert.deepEqual(g.realm.loadout, loadout);
  assert.ok(g.readyRealm()); assert.equal(g.readyRealm(), false);
  g.chooseRealmBlessing(g.realm.offers[0]);
  assert.equal(g.state, 'playing'); assert.equal(g.loadout.weapon, gun);
  assert.equal(restore(g).state, 'paused');
});

// 初始祝福可刷新后再选，开战事务必须同时保存驾驶状态和已抽中的炮塔。
test('首次开战自动上车并装好炮塔，刷新保留驾驶，后续关卡尊重下车与损毁状态', () => {
  let g = new Game(freshProgress(), () => .99); g.enterRealm('rogue');
  for (const kind of ['weapon', 'vehicle', 'turret']) g.rollRealmEquipment(kind);
  assert.equal(g.vehicle.active, false);
  g.readyRealm(); g = restore(g);
  assert.equal(g.vehicle.active, false);
  const selected = structuredClone(g.realm.loadout);
  g.chooseRealmBlessing(g.realm.offers[0]);
  assert.equal(g.vehicle.active, true);
  assert.equal(g.vehicle.index, selected.vehicle);
  assert.equal(g.vehicle.weaponIndex, selected.turret);
  assert.ok(g.vehicle.module.magazine.ammo > 0);
  g = restore(g);
  assert.equal(g.state, 'paused'); assert.equal(g.vehicle.active, true);
  assert.equal(g.vehicle.weaponIndex, selected.turret);
  g.dismountVehicle(); syncRealm(g); g = restore(g);
  assert.equal(g.vehicle.active, false);
  g.realm.phase = 'choice'; g.realm.cleared = 1; g.realm.offers = ['power'];
  g.chooseRealmBlessing('power');
  assert.equal(g.realm.stage, 2); assert.equal(g.vehicle.active, false);
  g.summonVehicle(); g.hurt(100000);
  assert.equal(g.vehicle.active, false); assert.equal(g.vehicle.hp, 0);
  const cooldown = g.vehicle.cooldown;
  assert.ok(cooldown > 0);
  g.realm.phase = 'choice'; g.realm.cleared = 2; g.realm.offers = ['power'];
  g.chooseRealmBlessing('power');
  assert.equal(g.realm.stage, 3); assert.equal(g.vehicle.active, false);
  assert.equal(g.vehicle.hp, 0); assert.equal(g.vehicle.cooldown, cooldown);
});

test('未解锁枪械、独立炮塔和所有车体可实战，森林装备与钱包正常恢复', () => {
  for (let index = 0; index < WEAPONS.length; index++) {
    const g = new Game(freshProgress(), () => 0);
    const permanent = JSON.stringify([g.progress.weapons,g.progress.vehicleWeapons,g.progress.vehicleHulls,g.progress.funnelLoadout]);
    g.start(); const forestVehicle = g.vehicle; forestVehicle.hp = 77;
    g.enterRealm('rogue');
    g.random = () => (index + .1) / WEAPONS.length;
    equip(g);
    assert.equal(g.loadout.weapon, index); assert.equal(g.weapon().id, WEAPONS[index].id);
    assert.ok(g.damage() > 0); assert.equal(g.vehicle.active, true);
    assert.equal(g.vehicle.weaponIndex, g.realm.loadout.turret);
    const driverHp = g.player.hp;
    g.hurt(5); assert.equal(g.player.hp, driverHp);
    const enemy = g.spawnEnemy(0, 0, {x:g.player.x + 90,y:g.player.y});
    enemy.hp = enemy.maxHp = 100000;
    for (let n=0;n<160;n++) g.update(.05,{x:0,y:0});
    assert.ok(enemy.hp < 100000, WEAPONS[index].name + '应能实际攻击');
    assert.equal(JSON.stringify([g.progress.weapons,g.progress.vehicleWeapons,g.progress.vehicleHulls,g.progress.funnelLoadout]), permanent);
    const saved = restore(g); assert.equal(saved.loadout.weapon,index);
    g.leaveRealm(); assert.equal(g.vehicle,forestVehicle); assert.equal(g.vehicle.hp,77);
    assert.equal(g.loadout,g.progress);
  }
  for(let i=0;i<COLLECTED_VEHICLES.length;i++) {
    const g=new Game();g.enterRealm('rogue');g.rollRealmEquipment('weapon');g.random=()=> (i+.1)/COLLECTED_VEHICLES.length;
    g.rollRealmEquipment('vehicle');g.rollRealmEquipment('turret');g.readyRealm();g.chooseRealmBlessing(g.realm.offers[0]);
    assert.equal(g.vehicle.index,i);assert.equal(g.vehicle.active,true);
    assert.equal(g.vehicle.weaponIndex,g.realm.loadout.turret);
    assert.equal(g.player.flying,!!COLLECTED_VEHICLES[i].flying);
    assert.equal(g.player.amphibious,!!COLLECTED_VEHICLES[i].amphibious);
  }
});

test('每关同步提升枪械、挂载和载具，升级保留耐久比例、弹药与修复冷却', () => {
  const g = new Game(freshProgress(),()=>.85);g.enterRealm('rogue');equip(g);
  const gun=g.loadout.weapon, turret=g.vehicle.weaponIndex, damage=g.damage(), turretDamage=vehicleDamage(g.loadout,turret);
  g.dismountVehicle();g.vehicle.hp=g.vehicle.maxHp*.4; g.vehicle.cooldown=12;
  g.vehicle.module.magazine.ammo=1;
  g.realm.stage=25;g.realm.cleared=24;beginRealmStage(g);
  assert.equal(g.loadout.weapons[gun],25);assert.equal(g.loadout.vehicleHulls[g.loadout.vehicleIndex||0],25);
  assert.equal(g.loadout.vehicleWeapons[turret],25);
  assert.ok(g.damage()>damage);assert.ok(vehicleDamage(g.loadout,turret)>turretDamage);
  assert.ok(Math.abs(g.vehicle.hp/g.vehicle.maxHp-.4)<1e-8);
  assert.equal(g.vehicle.cooldown,12);assert.equal(g.vehicle.module.magazine.ammo,1);
  assert.ok(g.loadout.funnelLoadout.every(i=>g.loadout.weapons[i]===25));
  syncRealm(g);const loaded=restore(g);assert.equal(loaded.loadout.vehicleHulls[loaded.loadout.vehicleIndex||0],25);
  assert.equal(loaded.loadout.weapon,gun);assert.equal(loaded.progress.weapons[gun],0);
});

test('连续远征同槽不重复，退出和刷新后仍记住上次结果，抽池覆盖完整目录',()=>{
  let g=new Game(freshProgress(),()=>0);g.enterRealm('rogue');equip(g);
  let previous=structuredClone(g.realm.loadout);
  for(let n=0;n<5;n++) {
    g.leaveRealm();g=restore(g);g.enterRealm('rogue');equip(g);
    for(const key of ['weapon','vehicle','turret'])assert.notEqual(g.realm.loadout[key],previous[key]);
    previous=structuredClone(g.realm.loadout);
  }
  assert.deepEqual(EXPEDITION_GUNS.map((_,i)=>drawExpeditionItem(EXPEDITION_GUNS,null,()=> (i+.5)/WEAPONS.length)),EXPEDITION_GUNS);
});

test('损坏型号、倒序领取与跳关准备存档被拒绝，旧远征检查点仍可继续',()=>{
  const g=new Game();g.enterRealm('rogue');const run=g.progress.realms.run;
  for(const loadout of [{...run.loadout,weapon:999},{...run.loadout,vehicle:2,turret:0},{...run.loadout,modules:[12,12,12]}])
    assert.equal(validateRealms({run:{...run,loadout}}).run,null);
  assert.equal(validateRealms({run:{...run,stage:2}}).run,null);
  assert.equal(validateRealms({run:{...run,offers:[]}}).run,null);
  assert.equal(validateRealms({run:{...run,phase:'combat'}}).run,null);
  const old={...run,phase:'choice'};delete old.loadout;
  assert.equal(validateRealms({run:old}).run.phase,'choice');
});
// 合并秘境车库后，局内检查点只恢复随机装备，不能切回森林永久车库绕过抽签。
test('远征车库恢复未解锁车体的驾驶、炮塔供给与冷却，森林挂载独立',()=>{
  const p=freshProgress();p.vehicleHulls[2]=1;p.vehicleIndex=2;p.vehicleWeapons[0]=1;p.vehicleLoadouts[2]=0;
  let g=new Game(p,()=>.85);g.start();g.summonVehicle();g.vehicle.hp=77;
  g.enterRealm('rogue');equip(g);assert.notEqual(g.vehicle.index,2);
  assert.equal(g.selectVehicle(2),false);assert.equal(g.configureVehicle(0),false);
  assert.equal(g.vehicle.active,true);g.vehicle.hp=95;g.vehicle.module.magazine.ammo=2;
  syncRealm(g);g.vehicle.hp=10;g.vehicle.module.magazine.ammo=0;
  g=restore(g);assert.equal(g.vehicle.active,true);assert.equal(g.vehicle.hp,95);
  assert.equal(g.vehicle.module.magazine.ammo,2);assert.equal(g.loadout.vehicleIndex,g.realm.loadout.vehicle);
  assert.equal(g.progress.vehicleIndex,2);assert.equal(g.progress.vehicleHulls[g.vehicle.index],0);
  g.leaveRealm();assert.equal(g.vehicle.index,2);assert.equal(g.vehicle.hp,77);
  assert.equal(g.vehicle.active,true);assert.equal(g.progress.vehicleLoadouts[g.progress.vehicleIndex||0],0);
});

// 独立载具武器转轮覆盖所有合法炮塔，控制器不混入车载抽池，旧版完整结果照常恢复。
test('载具武器独立抽签覆盖全炮塔目录，旧完整补给存档不重新抽取',()=>{
  const g=new Game();g.enterRealm('rogue');equip(g);
  const legacy=structuredClone(g.realm.loadout);
  assert.deepEqual(restore(g).realm.loadout,legacy);
  const checkpoint=JSON.parse(JSON.stringify(g.progress));
  checkpoint.realms.run.phase='loadout';checkpoint.realms.run.stage=1;checkpoint.realms.run.cleared=0;
  checkpoint.realms.run.offers=['power','haste','armor'];checkpoint.realms.run.loadout.turret=null;
  checkpoint.realms.lastLoadout=null;
  for(let n=0;n<EXPEDITION_TURRETS.length;n++) {
    const run=new Game(checkpoint,()=> (n+.5)/EXPEDITION_TURRETS.length);
    assert.ok(run.rollRealmEquipment('turret'));
    assert.equal(run.realm.loadout.turret,EXPEDITION_TURRETS[n]);
    assert.equal(run.vehicle.weaponIndex,EXPEDITION_TURRETS[n]);
    assert.equal(WEAPONS[run.vehicle.weaponIndex].controller,undefined);
    assert.ok(run.vehicle.module.magazine.ammo>0);
  }
});
