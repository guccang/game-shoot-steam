// 车型专属主炮：独立获取、存档、正式弹道、部件事务与供给回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { transactProgress } from '../src/progression/economy/transactions.js';
import { transactVehicle } from '../src/progression/vehicles/vehicles.js';
import { VEHICLE_ARMAMENTS, nativeVehicleWeapon } from '../src/config/vehicle-armaments.js';
import { vehicleWeapon, vehicleDamage } from '../src/config/vehicles.js';
import { workshopUpgrade, workshopDraft, quoteWorkshop } from '../src/progression/workshop/workshop.js';
import { commitWorkshop } from '../src/core/workshop/workshop.js';
import { updateVehicle, vehicleMuzzle } from '../src/combat/vehicle.js';
import { updateRecoil } from '../src/combat/recoil.js';
import { createWorkshopTrial } from '../src/core/workshop/workshop-trial.js';
import { captureRealmVehicles, restoreRealmVehicles } from '../src/core/realms/realm-vehicles.js';

// 使用无波次开放场地，不读取正式用户存档。
function arena(hull=0) {
  const p=freshProgress();p.vehicleHulls.fill(1);p.vehicleIndex=hull;p.arrival=null;p.coins=p.wood=1000000;p.bosses=100;p.materials={parts:10000,crystal:10000,core:10000};
  const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};g.attack=()=>{};g.updateWeaponAbility=()=>{};
  Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});g.summonVehicle();return g;
}

test('角色购买不授予旧炮塔；四种主炮随车获得，气垫船自带潮汐炮',()=>{
  const g=arena(),p=freshProgress();p.arrival=null;p.coins=p.wood=1000000;p.bosses=100;p.materials={parts:10000,crystal:10000,core:10000};
  assert.ok(transactProgress(p,'weapons',1,'buy'));assert.equal(p.vehicleWeapons[1],0);
  assert.ok(transactVehicle(p,'turret',2,'buy'));assert.equal(p.weapons[2],0);
  for(let h=1;h<4;h++){assert.ok(transactVehicle(p,'vehicle',h,'buy'));const w=nativeVehicleWeapon(h);assert.equal(p.vehicleLoadouts[h],w?.weaponIndex??null);if(w)assert.equal(p.vehicleWeapons[w.weaponIndex],1);}
  assert.deepEqual(g.progress.vehicleLoadouts,[17,18,19,20,0,null,21,22]);assert.equal(g.vehicles[3].weaponIndex,20);
  for(const w of VEHICLE_ARMAMENTS.filter(w=>w.weaponIndex!==17))assert.equal(transactProgress(p,'weapons',w.weaponIndex,'buy'),false);
});

test('旧档双方所有权不再合并，旧付费等级保留；新主炮迁移幂等且不扣费',()=>{
  const p=freshProgress();p.vehicleHulls=[1,2,1,1];p.weapons[8]=9;p.vehicleWeapons[9]=7;p.vehicleLoadouts=[8,9,9,0];p.turretParts[9].rate=4;
  const next=validateProgress(p);assert.equal(next.vehicleWeapons[8],0);assert.equal(next.weapons[9],0);assert.equal(next.vehicleWeapons[9],7);assert.equal(next.turretParts[9].rate,4);
  assert.deepEqual(next.vehicleLoadouts,[17,9,9,20,null,null,null,null]);assert.equal(next.coins,p.coins);assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(next))),next);
});

test('主炮拒绝错车和秘境施工；保存失败回滚，成功一次扣费且不重置战斗状态',()=>{
  const g=arena(1),v=g.vehicle;v.hp*=.4;v.cooldown=4;v.module.magazine={ammo:0,remaining:1.1};v.module.cooldown=.7;
  const plan=workshopUpgrade(g.progress,'turret',18,'capacity',1),before=JSON.stringify(g.progress),runtime=JSON.stringify(v),main=JSON.stringify(g.magazines);
  assert.equal(quoteWorkshop(g.progress,{...plan,vehicleIndex:2}).ok,false);assert.equal(quoteWorkshop(g.progress,plan,true).ok,false);
  for(const save of [()=>false,()=>{throw Error('quota');}]){assert.equal(commitWorkshop(g,plan,save).ok,false);assert.equal(JSON.stringify(g.progress),before);}
  const q=quoteWorkshop(g.progress,plan);assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(JSON.stringify(v),runtime);assert.equal(JSON.stringify(g.magazines),main);
  for(const row of q.rows)assert.equal(g.progress[row.key],row.after);
  assert.equal(commitWorkshop(g,plan,()=>{throw Error('duplicate');}).ok,false);
  assert.equal(quoteWorkshop(g.progress,workshopDraft(g.progress,'vehicle',1,0)).ok,true);
});

test('三型正式伤害、容量、射速、射程独立于角色，部件逐项成长并遵守上限',()=>{
  const g=arena();
  for(const w of VEHICLE_ARMAMENTS){const i=w.weaponIndex,base=vehicleWeapon(g.progress,i),damage=vehicleDamage(g.progress,i);g.progress.weapons.fill(20);assert.equal(vehicleDamage(g.progress,i),damage);
    for(const part of ['damage','rate','capacity','reload','range']){const q=quoteWorkshop(g.progress,workshopUpgrade(g.progress,'turret',i,part,w.hullIndex));assert.ok(q.ok);g.progress=q.next;}
    const next=vehicleWeapon(g.progress,i);assert.ok(vehicleDamage(g.progress,i)>damage);assert.ok(next.interval<base.interval);assert.ok(next.magazineSize>base.magazineSize);assert.ok(next.reloadTime<base.reloadTime);assert.ok(next.range>base.range);
    g.progress.turretParts[i].rate=5;assert.equal(quoteWorkshop(g.progress,workshopUpgrade(g.progress,'turret',i,'rate',w.hullIndex)).ok,false);
  }
});

test('125炮真实弹头从同一枪口出发，贯穿击飞且后坐阻尼复位',()=>{
  const g=arena(1),e=g.spawnEnemy(0,0,{x:1070,y:755});Object.assign(e,{hp:10000,maxHp:10000,speed:0,flying:false,arena:g.player.arena});
  const muzzle=vehicleMuzzle(g.player,g.vehicle);updateVehicle(g,.01);const b=g.projectiles[0];assert.equal(b.kind,'tank-125');assert.ok(Math.hypot(b.originX-muzzle.x,b.originY-muzzle.y)<5);
  assert.ok(g.vehicle.recoil.kick>5);const kick=g.vehicle.recoil.kick;
  for(let i=0;i<30;i++)g.updateProjectiles(1/120);
  assert.ok(e.hp<10000);assert.ok(Math.hypot(e.pushX,e.pushY)>300);assert.ok(e.vz>0);assert.ok(g.fx.items.some(p=>p.kind==='pressure'));assert.ok(g.fx.items.some(p=>p.kind==='impact-flash'&&p.warm));
  for(let i=0;i<180;i++)updateRecoil(g.vehicle.recoil,18,1/120);
  assert.ok(Math.abs(g.vehicle.recoil.kick)<kick*.01);assert.equal(g.vehicle.module.magazine.ammo,0);
});

test('火神转子起转和停火减速，暂停冻结；四型试射不修改来源，气垫船正式水压弹',()=>{
  const g=arena(2);g.enemies=[{id:900,type:'enemy',x:1040,y:750,hp:10000,radius:14}];
  for(let i=0;i<60;i++)updateVehicle(g,1/60);assert.ok(g.vehicle.rotorSpeed>30);assert.ok(g.projectiles.length>8);
  const speed=g.vehicle.rotorSpeed;g.enemies=[];for(let i=0;i<60;i++)updateVehicle(g,1/60);assert.ok(g.vehicle.rotorSpeed<speed*.01);
  g.state='paused';const frozen=JSON.stringify(g.vehicle);updateVehicle(g,.5);assert.equal(JSON.stringify(g.vehicle),frozen);
  const p=g.progress,source=JSON.stringify(p);for(let h=0;h<4;h++){const t=createWorkshopTrial(p,'vehicle',h);for(let i=0;i<150;i++)t.advance(1/30);assert.ok(t.destroyed>0);}
  assert.equal(JSON.stringify(p),source);
});

test('主炮检查点保留独立供给，部件扩容后不会被截断回原容量',()=>{
  const g=arena(2);g.progress.turretParts[19].capacity=5;g.vehicle.module.magazine.ammo=160;g.vehicle.module.magazine.remaining=.8;
  const saved=captureRealmVehicles(g);restoreRealmVehicles(g,saved);assert.equal(g.vehicle.weaponIndex,19);assert.equal(g.vehicle.module.magazine.ammo,160);assert.equal(g.vehicle.module.magazine.remaining,.8);
});

// 同时观察真实发射时刻与装填，防止把单发炮的射速和装填重复相加。
test('125炮射击间隔与装填并行，固定/变动步长持续输出一致',()=>{
  for(const steps of [[1/120],[1/30,1/120,1/60]]){
    const g=arena(1);g.enemies=[{id:900,type:'enemy',x:1100,y:750,hp:1e9,radius:14}];let time=0,shots=[];
    g.onEvent=type=>{if(type==='shot')shots.push(time);};
    for(let i=0;time<8;i++){const dt=steps[i%steps.length];time+=dt;updateVehicle(g,dt);}
    assert.equal(shots.length,4);for(let i=1;i<shots.length;i++)assert.ok(Math.abs(shots[i]-shots[i-1]-2.2)<.06);
  }
});
// 配置入口也限制专属炮归属，不能通过外部事件给气垫船加主炮。
test('专属主炮不能跨车安装，气垫船拒绝其他车型专属炮',()=>{
  const g=arena(0);for(const i of [18,19])assert.equal(g.configureVehicle(i,0),false);
  for(const i of [17,18,19])assert.equal(g.configureVehicle(i,3),false);
});
