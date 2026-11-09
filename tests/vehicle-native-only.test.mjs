// 载具固定主武器回归：旧档迁移、运行时防绕过、工坊事务及远征检查点。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {Game} from '../src/core/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {createVehicle,configureVehicle,canMountVehicleWeapon,updateVehicle} from '../src/combat/vehicle.js';
import {transactVehicle} from '../src/progression/vehicles/vehicles.js';
import {quoteWorkshop,workshopDraft,workshopUpgrade,previewWorkshop} from '../src/progression/workshop/workshop.js';
import {captureRealmVehicles,restoreRealmVehicles} from '../src/core/realms/realm-vehicles.js';
import {validateRealmVehicles} from '../src/progression/realms/realm-vehicles.js';
import {validateRealms} from '../src/progression/realms/realm-progress.js';
import {expeditionEquipment} from '../src/config/expedition.js';
import {fireEquipment} from '../src/config/fire-rescue.js';
import {guardianProgress} from '../src/config/guardian-equipment.js';

// 使用已修复营地与自有车体，测试不依赖教学购买门槛。
function progress(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};
 p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(s=>s.id);
 p.vehicleHulls.fill(1);p.vehicleIndex=0;p.weapons.fill(1);p.vehicleWeapons.fill(3);
 for(const k of ['coins','wood','parts','crystal','core'])p[k]=1000000;
 return validateProgress(p);
}
// 开放场地只移除环境障碍，攻击和弹道使用正式逻辑。
function game(hull=0){const p=progress();p.vehicleIndex=hull;p.campParking.owned=p.campParking.owned.filter(r=>r.hull!==hull);const g=new Game(p,()=>.4);g.state='playing';g.trees=[];g.enemies=[];Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});assert.ok(g.summonVehicle());return g;}

test('旧挂载恢复车型主炮，旧付费等级与角色装备保留且重复读档幂等',()=>{
 const p=progress();p.vehicleLoadouts.fill(9);p.vehicleWeapons[9]=7;p.turretParts[9].rate=4;
 const next=validateProgress(p);
 assert.deepEqual(next.vehicleLoadouts,[17,18,19,20,null,null,21,22,null]);
 assert.equal(next.vehicleWeapons[9],7);assert.equal(next.turretParts[9].rate,4);assert.deepEqual(next.weapons,p.weapons);assert.equal(next.coins,p.coins);
 assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(next))),next);
});
test('运行时、试装和交易均拒绝喵喵枪械或跨车型主炮，失败不扣费',()=>{
 const g=game(),p=g.progress,before=JSON.stringify(p);
 for(let hull=0;hull<p.vehicleHulls.length;hull++){
  for(const weapon of [0,9,12,15,16]){assert.equal(canMountVehicleWeapon(p,weapon,hull),false);assert.equal(configureVehicle(g,weapon,hull),false);assert.equal(quoteWorkshop(p,workshopDraft(p,'vehicle',hull,weapon)).ok,false);}
  const raw={...p,vehicleLoadouts:p.vehicleLoadouts.map(()=>9)};
  assert.equal(createVehicle(raw, hull).weaponIndex,nativeVehicleWeapon(hull)?.weaponIndex??null);
  assert.equal(previewWorkshop(raw,'vehicle',hull,9).weapon?.weaponIndex??null,nativeVehicleWeapon(hull)?.weaponIndex??null);
 }
 assert.equal(configureVehicle(g,18,0),false);assert.equal(transactVehicle(p,'turret',9,'upgrade'),false);assert.equal(transactVehicle(p,'turret',8,'buy'),false);
 assert.equal(quoteWorkshop(p,workshopUpgrade(p,'turret',9,'rate',0)).ok,false);assert.equal(JSON.stringify(p),before);
});
test('原生主武器仍可升级并发射，非法运行时挂载不发弹',()=>{
 const g=game(1),p=g.progress,w=nativeVehicleWeapon(1);
 assert.equal(quoteWorkshop(p,workshopUpgrade(p,'turret',w.weaponIndex,'damage',1)).ok,true);
 g.enemies=[{id:900,type:'enemy',x:1040,y:750,hp:10000,radius:14}];
 for(let i=0;i<90;i++)updateVehicle(g,1/60);assert.ok(g.projectiles.length>0);
 g.projectiles=[];g.vehicle.weaponIndex=9;for(let i=0;i<90;i++)updateVehicle(g,1/60);assert.equal(g.projectiles.length,0);
});
test('检查点只恢复该车型主炮供给，旧枪械模块不会复活',()=>{
 const g=game(2);g.vehicle.module.magazine.ammo=37;g.vehicle.module.magazine.remaining=.8;
 const saved=captureRealmVehicles(g);saved.hulls[2].modules[9]={magazine:{ammo:999,remaining:0}};
 restoreRealmVehicles(g,saved);assert.equal(g.vehicle.weaponIndex,19);assert.deepEqual(Object.keys(g.vehicle.modules),['19']);assert.equal(g.vehicle.module.magazine.ammo,37);assert.equal(g.vehicle.module.magazine.remaining,.8);
 saved.hulls[2].weaponIndex=9;assert.equal(validateRealmVehicles(saved).hulls[2].weaponIndex,19);
});
test('远征车体自动配套主炮，不再抽取角色枪械炮塔，无炮车型可正常开局',()=>{
 for(const random of [.1,.5,.6,.95]){
  const g=new Game(progress(),()=>random);assert.ok(g.enterRealm('rogue'));
  assert.ok(g.rollRealmEquipment('weapon'));assert.ok(g.rollRealmEquipment('vehicle'));assert.equal(g.rollRealmEquipment('turret'),false);
  const l=g.realm.loadout;assert.equal(l.turret,nativeVehicleWeapon(l.vehicle)?.weaponIndex??null);assert.equal(g.vehicle.weaponIndex,l.turret);assert.ok(g.readyRealm());assert.ok(g.chooseRealmBlessing(g.realm.offers[0]));
  assert.ok(validateRealms(g.progress.realms).run);assert.equal(g.vehicle.weaponIndex,l.turret);
 }
});
test('旧远征装备迁移不改角色与模块，消防车不再借用手枪',()=>{
 const p=progress(),l={weapon:1,vehicle:1,turret:9,modules:[0,1,2]};
 const e=expeditionEquipment(p,l,4);assert.equal(e.vehicleLoadouts[1],18);assert.equal(e.vehicleWeapons[18],4);assert.equal(e.vehicleWeapons[9],0);assert.equal(e.weapon,1);assert.deepEqual(e.funnelLoadout,[0,1,2]);
 assert.equal(fireEquipment(p).vehicleLoadouts[4],null);assert.equal(createVehicle(fireEquipment(p), 4).weaponIndex,null);
 const g=new Game(p,()=>.1);g.enterRealm('rogue');g.rollRealmEquipment('weapon');g.rollRealmEquipment('vehicle');g.readyRealm();g.chooseRealmBlessing(g.realm.offers[0]);
 const saved=JSON.parse(JSON.stringify(g.progress.realms));saved.run.loadout.turret=9;
 const migrated=validateRealms(saved);assert.ok(migrated.run);assert.equal(migrated.run.loadout.turret,nativeVehicleWeapon(saved.run.loadout.vehicle)?.weaponIndex??null);assert.equal(migrated.run.stage,saved.run.stage);
});
test('电动车和警车继续使用角色手持武器，守护固定支架不受驾驶载具限制',()=>{
 for(const hull of [5,8]){const g=game(hull);g.enemies=[{id:900,type:'enemy',x:960,y:750,hp:10000,radius:14}];assert.equal(g.vehicle.weaponIndex,null);assert.ok(g.attack());assert.ok(g.projectiles.length>0);}
 const p=guardianProgress(progress(),{kind:'weapon',weaponIndex:1,level:1});assert.equal(createVehicle(p, 0).weaponIndex,1);
});
