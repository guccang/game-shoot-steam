// 部件升级规则回归：正式计算、旧档、原子保存和运行中的弹药状态。
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { equipmentParts, partLevel } from '../src/config/equipment-parts.js';
import { effectiveWeapon, weaponDamage } from '../src/config/weapon-mods.js';
import { vehicleWeapon, vehicleSpeed } from '../src/config/vehicles.js';
import { workshopUpgrade, quoteWorkshop, applyPartPreview } from '../src/progression/workshop.js';
import { commitWorkshop } from '../src/core/workshop.js';
import { Game } from '../src/core/game.js';
import { expeditionEquipment } from '../src/config/expedition.js';
import { guardianProgress } from '../src/config/guardian-equipment.js';
import { createWorkshopTrial } from '../src/core/workshop-trial.js';
import { WEAPONS } from '../src/config/weapons.js';

// 全目录隔离进度，不访问浏览器存档或玩家资源。
function ready() { const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons=WEAPONS.map(w=>w.controller?0:1);p.vehicleHulls.fill(1);p.mastery.fill(40);p.coins=p.wood=100000;p.bosses=100;return p; }

test('部件旧档补齐、非法值收敛，旧伤害与装甲不改变',()=>{
  const raw=ready();raw.weapons[2]=17;raw.vehicleHulls[1]=13;delete raw.weaponParts;delete raw.turretParts;delete raw.vehicleParts;
  const p=validateProgress(raw);assert.equal(p.weapons[2],17);assert.equal(p.vehicleHulls[1],13);assert.equal(p.weaponParts[2].rate,1);
  p.weaponParts[2].rate=100;p.weaponParts[2].reload=NaN;p.turretParts[0].capacity=3;
  const repaired=validateProgress(p);assert.equal(repaired.weaponParts[2].rate,5);assert.equal(repaired.weaponParts[2].reload,1);assert.equal(repaired.turretParts[0].capacity,3);
  assert.deepEqual(validateProgress(repaired),repaired);
});
test('全型号逐部件报价、预览、扣费与独立等级一致，重复提交失败',()=>{
  for(const kind of ['weapons','turret','vehicle']) for(let i=0;i<(kind==='vehicle'?4:WEAPONS.length);i++) {
    if(kind==='turret'&&WEAPONS[i].controller)continue;
    for(const part of equipmentParts(kind,i)) {
      const g=new Game(ready()), plan=workshopUpgrade(g.progress,kind,i,part.key,0), old=JSON.stringify(g.progress);
      const quote=quoteWorkshop(g.progress,plan);assert.ok(quote.ok,`${kind}/${i}/${part.key}`);assert.equal(JSON.stringify(g.progress),old);
      const before=g.progress.coins;assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(partLevel(g.progress,kind,i,part.key),2);
      assert.equal(g.progress.coins,before-quote.rows.find(r=>r.key==='coins').need);
      assert.equal(commitWorkshop(g,plan,()=>{throw Error('重复保存');}).ok,false);
      if(kind==='turret')assert.equal(partLevel(g.progress,'weapons',i,part.key),1);
    }
  }
});
test('部件叠加套件与脉冲两段时钟一致，容量按基础型号计算',()=>{
  for(let i=0;i<WEAPONS.length;i++)for(const mod of [0,1,2]) {
    const p=ready();p.mods[i]=mod;const a=effectiveWeapon(p,i);
    for(const part of equipmentParts('weapons',i))if(part.max===5)p.weaponParts[i][part.key]=5;
    const b=effectiveWeapon(p,i);assert.ok(Math.abs(b.interval-a.interval/1.32)<1e-10);assert.ok(Math.abs(b.range-a.range*1.2)<1e-10);
    assert.equal(b.magazineSize,a.magazineSize+4*Math.max(1,Math.floor(WEAPONS[i].magazineSize*.1)));
    assert.equal(weaponDamage(p,i),weaponDamage({...p,weaponParts:[]},i));
    if(b.chargeTime)assert.ok(Math.abs(b.interval-b.chargeTime-b.cooldown)<1e-10);
  }
});
test('资源、所有权、上限、非法部件、错误载具和秘境均拒绝施工',()=>{
  const p=ready();p.coins=0;assert.equal(quoteWorkshop(p,workshopUpgrade(p,'weapons',0,'rate')).ok,false);
  p.coins=10000;p.weaponParts[0].rate=5;assert.equal(quoteWorkshop(p,workshopUpgrade(p,'weapons',0,'rate')).ok,false);
  assert.equal(quoteWorkshop(p,workshopUpgrade(p,'weapons',0,'accuracy')).ok,false);
  assert.equal(quoteWorkshop(p,workshopUpgrade(p,'turret',0,'rate',99)).ok,false);
  assert.equal(quoteWorkshop(p,workshopUpgrade(p,'weapons',0,'capacity'),true).ok,false);
  p.weapons[1]=0;assert.equal(quoteWorkshop(p,workshopUpgrade(p,'weapons',1,'rate')).ok,false);
});
test('保存失败不扣费，升级保留余弹、蓄力、冷却、装填和车体状态',()=>{
  const p=ready();p.vehicleLoadouts[2]=9;const g=new Game(p);g.magazines[0].ammo=2;g.magazines[0].remaining=.9;g.attackTimer=.7;
  g.vehicles[2].module.magazine.ammo=1;g.vehicles[2].module.cooldown=.6;g.vehicles[2].module.pulse.charge=.4;
  g.vehicles[2].hp*=.3;g.vehicles[2].cooldown=12;
  const plan=workshopUpgrade(g.progress,'weapons',0,'capacity'),before=JSON.stringify(g.progress),ammo=JSON.stringify(g.magazines);
  assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.equal(JSON.stringify(g.progress),before);
  assert.equal(commitWorkshop(g,plan,()=>{throw Error('quota');}).ok,false);
  assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(JSON.stringify(g.magazines),ammo);assert.equal(g.attackTimer,.7);
  const vehicle=JSON.stringify(g.vehicles[2]);assert.ok(commitWorkshop(g,workshopUpgrade(g.progress,'turret',19,'reload',2),()=>true).ok);assert.equal(JSON.stringify(g.vehicles[2]),vehicle);
  assert.ok(commitWorkshop(g,workshopUpgrade(g.progress,'vehicle',2,'armor'),()=>true).ok);assert.ok(Math.abs(g.vehicles[2].hp/g.vehicles[2].maxHp-.3)<1e-10);assert.equal(g.vehicles[2].cooldown,12);assert.equal(g.progress.vehicleIndex,0);
});
test('车速和炮塔读取自己的部件，秘境快照不继承永久成长',()=>{
  const p=ready();p.weaponParts[0].rate=5;p.turretParts[0].rate=3;p.vehicleParts[1].engine=5;
  assert.equal(vehicleWeapon(p,0).interval,WEAPONS[0].interval/1.16);assert.equal(vehicleSpeed(p,1),.78*1.2);
  const expedition=expeditionEquipment(p,{weapon:0,vehicle:1,turret:0,modules:[0,1,2]},1);
  assert.equal(effectiveWeapon(expedition,0).interval,WEAPONS[0].interval);assert.equal(vehicleSpeed(expedition,1),.78);
  const guardian=guardianProgress(p,{weaponIndex:0,level:1});assert.equal(effectiveWeapon(guardian,0).interval,WEAPONS[0].interval);
});
test('全部升级后的武器和专属主炮试射使用正式属性且不改变原始进度',()=>{
  const p=ready();for(let i=0;i<WEAPONS.length;i++)for(const part of equipmentParts('weapons',i))applyPartPreview(p,workshopUpgrade(p,'weapons',i,part.key));
  const saved=JSON.stringify(p);
  for(let i=0;i<WEAPONS.length;i++){const trial=createWorkshopTrial(p,'weapons',i);assert.deepEqual(trial.game.weapon().parts,effectiveWeapon(p,i).parts);for(let n=0;n<60;n++)trial.advance(1/30);}
  const trial=createWorkshopTrial(p,'vehicle',2);for(let n=0;n<120;n++)trial.advance(1/30);assert.equal(trial.game.vehicle.weaponIndex,19);
  assert.equal(JSON.stringify(p),saved);
});
