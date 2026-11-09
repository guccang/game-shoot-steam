// 转速、潮汐炮和车载弹仓回归：观察真实发射及供给，防止只改展示。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress,validateProgress } from '../src/progression/progress.js';
import { turnWeapon } from '../src/combat/weapon-turn.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
import { vehicleWeapon } from '../src/config/vehicles.js';
import { updateVehicle } from '../src/combat/vehicle.js';
import { advanceReload,consumeRound } from '../src/combat/magazine.js';
import { captureRealmVehicles,restoreRealmVehicles } from '../src/core/realms/realm-vehicles.js';
import { shotSolution } from '../src/combat/aim.js';

// 隔离地图波次，所有目标保持不动，用正式 Game、武器和碰撞状态。
function arena(index=0,hull=3,mounted=20) {
  const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);
  p.weapon=index;p.vehicleIndex=hull;p.vehicleLoadouts[hull]=mounted;
  const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};
  Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});return g;
}
// 敌人足点与圆心使用正式生成数据，额外质量阻止试验目标被击退离场。
function target(g,x,y) {
  const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0,football:true,mass:10000,flying:false,arena:g.player.arena});return e;
}

test('最短弧转向限制每秒角度，跨π不绕远、不同步长同结果、零时间冻结',()=>{
  for(const steps of [[.1,.1,.1],[.05,.15,.1]]) {
    const holder={angle:Math.PI-.3,aimInitialized:true};
    for(const dt of steps)turnWeapon(holder,-Math.PI+.5,dt,2);
    assert.ok(Math.abs(holder.angle-(Math.PI+.3))<1e-8);
    const a=holder.angle;assert.equal(turnWeapon(holder,-Math.PI+.5,0,2),false);assert.equal(holder.angle,a);
    assert.equal(turnWeapon(holder,-Math.PI+.5,1,2),true);assert.ok(Math.abs(holder.angle-(Math.PI+.5))<1e-8);
  }
});

test('手持换目标先转枪再发射，转向期间不扣弹，暂停不移动角度',()=>{
  const g=arena(),a=target(g,1020,750);assert.equal(g.attack(),true);
  a.hp=0;target(g,780,790);const initial=g.player.angle,ammo=g.magazines[0].ammo;
  assert.equal(g.attack(),false);assert.equal(g.magazines[0].ammo,ammo);
  g.update(.02,{x:0,y:0});assert.ok(Math.abs(g.player.angle-initial)<=.24+1e-8);assert.equal(g.magazines[0].ammo,ammo);
  g.state='paused';const frozen=g.player.angle;g.update(.5,{x:0,y:0});assert.equal(g.player.angle,frozen);g.state='playing';
  for(let i=0;i<40;i++)g.update(.02,{x:0,y:0});assert.ok(g.magazines[0].ammo<ammo);assert.ok(Math.abs(g.player.angle)>2);
});

test('榴弹与脉冲已完成蓄力不会因转向丢失，瞄准后正确释放',()=>{
  for(const index of [6,9]) {
    const g=arena(index),e=target(g,1010,750),w=g.weapon();g.player.aimInitialized=true;g.player.angle=Math.PI;
    if(w.grenade){g.weaponCycle.firing=true;g.weaponCycle.charge=w.grenade.charge-.01;g.updateWeaponAbility(.1);assert.equal(g.weaponCycle.charge,w.grenade.charge-.01);}
    else {g.pulse.charge=w.chargeTime;g.updateWeaponAbility(.1);assert.equal(g.pulse.charge,w.chargeTime);}
    assert.equal(g.projectiles.length,0);const ammo=g.magazines[index].ammo;
    turnWeapon(g.player,shotSolution(g.player,e,index,g.aimLock).angle,1,12);g.updateWeaponAbility(.1);
    if(w.grenade)assert.ok(g.projectiles.some(p=>p.kind==='grenade-bomb'));
    else {assert.equal(g.magazines[index].ammo,ammo-1);assert.equal(g.pulse.charge,0);}
  }
});

test('潮汐炮免费迁移且保留自选挂载，每次双喷口发两颗真实水压弹只扣一发',()=>{
  const p=freshProgress();p.vehicleHulls[3]=1;p.vehicleLoadouts[3]=null;const next=validateProgress(p);
  assert.equal(next.vehicleWeapons[20],1);assert.equal(next.vehicleLoadouts[3],20);assert.deepEqual(validateProgress(next),next);
  const g=arena();g.summonVehicle();const e=target(g,1040,755);e.football=false;updateVehicle(g,.01);
  assert.equal(g.projectiles.length,1);updateVehicle(g,.12);
  assert.equal(g.projectiles.length,2);assert.ok(g.projectiles.every(p=>p.kind==='water'&&p.weaponIndex===20));
  assert.equal(g.vehicle.module.magazine.ammo,17);assert.ok(Math.abs(g.projectiles[0].y-g.projectiles[1].y)>5);
  for(let i=0;i<45;i++)g.updateProjectiles(1/120);
  assert.ok(e.hp<e.maxHp);assert.ok(e.wet>0);assert.ok(Math.hypot(e.pushX,e.pushY)>0);
});

test('载具换靶有转速限制，转到目标前不发射，不改角色弹药',()=>{
  const g=arena(0,3,2);g.summonVehicle();const a=target(g,1040,755);updateVehicle(g,.01);a.hp=0;target(g,760,755);
  const v=g.vehicle,initial=v.angle,ammo=v.module.magazine.ammo,hand=JSON.stringify(g.magazines);
  updateVehicle(g,.02);assert.ok(Math.abs(v.angle-initial)<=.12+1e-8);assert.equal(v.module.magazine.ammo,ammo);
  for(let i=0;i<40&&v.module.magazine.ammo===ammo;i++)updateVehicle(g,.02);
  assert.equal(v.module.magazine.ammo,ammo-1);updateVehicle(g,.01);assert.equal(v.module.magazine.ammo,ammo-1);assert.equal(JSON.stringify(g.magazines),hand);
});

test('外接弹匣在部件后乘1.5，升级不补弹，切换和检查点保留剩余弹药及装填',()=>{
  const g=arena(2,3,2),p=g.progress;assert.equal(vehicleWeapon(p,2).magazineSize,120);assert.equal(effectiveWeapon(p,2).magazineSize,80);
  assert.equal(vehicleWeapon(p,20).magazineSize,18);p.turretParts[2].capacity=5;assert.equal(vehicleWeapon(p,2).magazineSize,168);
  const m=g.vehicle.module.magazine;m.ammo=137;m.remaining=.8;m.rotor=2;m.rotorSpeed=18;m.rotorDrive=.1;
  const saved=captureRealmVehicles(g);restoreRealmVehicles(g,saved);assert.equal(g.vehicle.module.magazine.ammo,137);assert.equal(g.vehicle.module.magazine.remaining,.8);assert.equal(g.vehicle.module.magazine.rotor,2);
  assert.ok(g.configureVehicle(20,3));assert.ok(g.configureVehicle(2,3));assert.equal(g.vehicle.module.magazine.ammo,137);
  assert.equal(validateProgress(p).vehicleLoadouts[3],2);assert.equal(g.magazines[2].ammo,80);
});

test('加特林真实消耗驱动转子，停火惯性减速、零时间冻结，装填时不持续高速',()=>{
  const g=arena(2),w=g.weapon(),m=g.magazines[2];
  for(let i=0;i<40;i++){if(i%6===0)consumeRound(m,w);advanceReload(m,w,1/60);}
  assert.ok(m.rotorSpeed>25);assert.ok(m.rotor>0);const frozen=JSON.stringify(m);advanceReload(m,w,0);assert.equal(JSON.stringify(m),frozen);
  const ammo=m.ammo;for(let i=0;i<120;i++)advanceReload(m,w,1/60);assert.ok(m.rotorSpeed<.01);assert.equal(m.ammo,ammo);
  m.rotorSpeed=30;m.rotorDrive=.15;m.remaining=2;advanceReload(m,w,.5);assert.ok(m.rotorSpeed<1);assert.equal(m.remaining,1.5);
});
