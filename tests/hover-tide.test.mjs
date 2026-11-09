// 高压双发从正式载具入口验证：独立后坐、延迟发射、击退、供给与存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {captureRealmVehicles,restoreRealmVehicles} from '../src/core/realms/realm-vehicles.js';
import {tideKick} from '../src/config/tide-cannon.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {stepImpulse} from '../src/physics/motion.js';

// 静止高血量靶位隔离波次，保留真实枪口、碰撞和耗弹。
function arena(){
 const p=freshProgress();p.vehicleHulls[3]=1;p.vehicleIndex=3;p.vehicleWeapons[0]=1;
 const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};g.attack=()=>false;g.updateWeaponAbility=()=>{};
 Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});g.summonVehicle();
 const e=g.spawnEnemy(0,0,{x:1040,y:755});Object.assign(e,{hp:10000,maxHp:10000,speed:0,mass:1,flying:false,arena:g.player.arena});return g;
}

test('双发错开0.12秒，各自后坐，一次扣弹；下一组交换先手',()=>{
 const g=arena();updateVehicle(g,.01);const m=g.vehicle.module.magazine;
 assert.equal(g.projectiles.length,1);assert.equal(m.ammo,17);assert.deepEqual(m.tide.ages,[0,1]);
 updateVehicle(g,.06);assert.equal(g.projectiles.length,1);assert.ok(tideKick(m.tide.ages[0])>0);assert.equal(tideKick(m.tide.ages[1]),0);
 updateVehicle(g,.06);assert.equal(g.projectiles.length,2);assert.equal(m.ammo,17);assert.equal(m.tide.ages[1],0);assert.ok(tideKick(m.tide.ages[0])<tideKick(m.tide.ages[1]));
 for(let i=0;i<54;i++)updateVehicle(g,.01);assert.equal(m.ammo,16);assert.ok(m.tide.ages[1]<.03);assert.ok(m.tide.ages[0]>.5);
 assert.equal(g.vehicle.recoil.kick,0);
});

test('双喷口分别在实际发射时播放水压声，暂停不提前播放第二声',()=>{
 const g=arena(),sounds=[];g.onEvent=(type,data)=>{if(type==='weapon-sound')sounds.push(data.kind);};
 updateVehicle(g,.01);assert.deepEqual(sounds,['hover-tide']);
 updateVehicle(g,.06);assert.equal(sounds.length,1);
 g.state='paused';updateVehicle(g,1);assert.equal(sounds.length,1);
 g.state='playing';updateVehicle(g,.06);assert.deepEqual(sounds,['hover-tide','hover-tide']);
 updateVehicle(g,.01);assert.equal(sounds.length,2);
});

test('末组装填、目标死亡、移动和转向不会丢失已付费的第二发',()=>{
 const g=arena(),m=g.vehicle.module.magazine;m.ammo=1;updateVehicle(g,.01);
 const first=g.projectiles[0];g.enemies=[];g.player.x+=40;g.vehicle.angle=Math.PI/2;
 updateVehicle(g,.12);assert.equal(g.projectiles.length,2);assert.equal(m.ammo,0);assert.ok(m.remaining>2);
 const second=g.projectiles[1];assert.ok(second.x>first.x-5);assert.ok(second.y>first.y+25);assert.ok(second.dy>.99);
 assert.equal(second.amount,first.amount);updateVehicle(g,.02);assert.equal(g.projectiles.length,2);
});

test('暂停、换模块和检查点保留半组，恢复不重扣弹或重复释放',()=>{
 const g=arena();updateVehicle(g,.01);const before=JSON.stringify(g.vehicle.module.magazine);
 g.state='paused';updateVehicle(g,.3);assert.equal(JSON.stringify(g.vehicle.module.magazine),before);g.state='playing';
 g.configureVehicle(0,3);updateVehicle(g,.2);g.configureVehicle(20,3);assert.equal(JSON.stringify(g.vehicle.module.magazine),before);
 const saved=captureRealmVehicles(g);restoreRealmVehicles(g,saved);const m=g.vehicle.module.magazine;
 assert.equal(m.tide.pending.amount,g.projectiles[0].amount);updateVehicle(g,.12);assert.equal(m.ammo,17);assert.equal(m.tide.pending,null);assert.equal(g.projectiles.length,2);
 updateVehicle(g,.01);assert.equal(g.projectiles.length,2);
});

test('发射后升级不修改半组快照；30/120Hz均只释放两发且减少动态不改变伤害',()=>{
 for(const dt of [1/30,1/120])for(const reduced of [false,true]){
  const g=arena();g.reducedMotion=reduced;updateVehicle(g,.01);const first=g.projectiles[0];g.progress.turretParts[20].range=5;g.progress.vehicleWeapons[20]=20;
  for(let t=0;t<.2;t+=dt)updateVehicle(g,dt);assert.equal(g.projectiles.length,2);assert.equal(g.projectiles[1].amount,first.amount);assert.equal(g.projectiles[1].remaining,first.remaining);
  assert.equal(g.vehicle.module.magazine.ammo,17);
 }
});

test('水压弹命中产生定向水冠及真实位移，重怪/领主抗性仍有效，普通水枪不使用专属特效',()=>{
 const speeds=[];
 for(const mass of [1,4]){
  const g=arena(),e=g.enemies[0];e.mass=mass;const w=vehicleWeapon(g.progress,20);
  fireBallistics(g,{...w,id:'water',pellets:1,effectKind:'hover-tide',spread:0},{x:1000,y:747},{x:1,y:0},32,false,true);
  for(let i=0;i<18;i++)g.updateProjectiles(1/120);
  assert.equal(e.hp,9968);assert.ok(e.wet>0);speeds.push(e.pushX);assert.ok(g.fx.items.some(p=>p.kind==='tide-splash'&&p.angle===0));
  const old=e.x;stepImpulse(e,.1,{width:3600,height:2400},[]);assert.ok(e.x>old+(mass===1?45:30));assert.ok(e.x<old+65);assert.ok(e.z>0);
  assert.equal(g.fx.items.filter(p=>p.kind==='tide-splash').length,1);
 }
 assert.equal(speeds[0],620);assert.ok(speeds[1]<speeds[0]);
 const g=arena(),e=g.enemies[0];e.type='boss';e.mass=6;g.hit(e,1,false,{kind:'hover-tide',impulse:340,water:true,direction:{x:1,y:0}});assert.ok(e.pushX<=55);
 g.fx.items=[];g.hit(e,1,false,{kind:'water',impulse:20,water:true,direction:{x:1,y:0}});assert.ok(!g.fx.items.some(p=>p.kind==='tide-splash'));
});

