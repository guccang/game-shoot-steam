import { legacyVehicleGame } from './helpers/legacy-vehicle.mjs';
// 伙伴配置、承伤、编队与车载隔离的正式规则回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { freshProgress, validateProgress } from '../src/progression/progress.js';
import { canMountMechanical } from '../src/config/mechanical-loadout.js';
import { configureMechanical } from '../src/core/mechanical-loadout.js';
import { updateMechanical, hurtMechanical, resetMechanicalFormation } from '../src/combat/mechanical.js';
import { updateVehicle, configureVehicle } from '../src/combat/vehicle.js';
import { vehicleCompanionContext } from '../src/combat/vehicle-companions.js';
import { companionEnemyTarget } from '../src/combat/companion-targets.js';
import { updateEnemies } from '../src/core/enemy-manager.js';
import { quoteWorkshop, workshopDraft } from '../src/progression/workshop.js';
import { worldDistance } from '../src/world/coordinates.js';
import { expeditionEquipment } from '../src/config/expedition.js';
import { guardianProgress } from '../src/config/guardian-equipment.js';
// 使用开放平台测试正式移动与攻击；全部装备仅属于此夹具。
function arena(weapon=15,vehicle=null,index=0) {
  const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);
  p.weapon=weapon;p.weaponParts[15].coordination=8;p.turretParts[15].coordination=8;
  p.vehicleIndex=index;p.vehicleLoadouts[index]=vehicle;p.coins=p.wood=999999;p.bosses=100;p.materials={parts:9999,crystal:9999,core:999};
  const g=legacyVehicleGame(p,()=>.5);g.trees=[];g.enemies=[];g.boss=null;g.state='playing';g.updateWaves=()=>{};
  Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:700}});
  g.vehicle.active=vehicle!==null;return g;
}
// 静止高耐久地面敌人不会因为测试时间内死亡干扰锁敌检查。
function foe(g,x=1050,y=750) {const e=g.spawnEnemy(0,100,{x,y});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,damage:0,flying:false,arena:g.player.arena});return e;}
// 固定小步模拟，防止测试借大步跳过前摇。
function step(g,seconds,fn=updateMechanical){for(let i=0;i<seconds*60;i++)fn(g,1/60);}

test('共用枪槽校验、旧档迁移、失败回滚与秘境隔离',()=>{
 const g=arena();assert.equal(validateProgress({...g.progress,mechanicalLoadout:undefined}).mechanicalLoadout,null);
 for(const i of [12,13,14,15,-1,100])assert.equal(canMountMechanical(g.progress,i),false);
 assert.equal(configureMechanical(g,9,()=>false).ok,false);assert.equal(g.progress.mechanicalLoadout,null);
 assert.equal(configureMechanical(g,9,()=>true).ok,true);assert.equal(validateProgress(g.progress).mechanicalLoadout,9);
 assert.equal(expeditionEquipment(g.progress,{weapon:15,vehicle:0,turret:0,modules:[0,0,0]},1).mechanicalLoadout,null);
 assert.equal(guardianProgress(g.progress,{weaponIndex:15,level:1}).mechanicalLoadout,null);
 g.realm={};assert.equal(configureMechanical(g,0,()=>true).ok,false);
});

test('十猫均分五个目标，并有预备、挥爪、归队与分离距离',()=>{
 const g=arena();for(let i=0;i<5;i++)foe(g,1040+(i%2)*60,650+i*42);
 const modes=new Set();for(let i=0;i<720;i++){updateMechanical(g,1/60);g.mechanical.nodes.forEach(n=>modes.add(n.mode));}
 const claims=new Map();g.mechanical.nodes.forEach(n=>claims.set(n.targetId,(claims.get(n.targetId)||0)+1));
 assert.equal(claims.size,5);assert.deepEqual([...claims.values()],[2,2,2,2,2]);assert.ok(modes.has('windup'));assert.ok(modes.has('strike'));
 g.enemies=[];step(g,4);assert.ok(g.mechanical.nodes.every(n=>['idle','return'].includes(n.mode)));
 for(const a of g.mechanical.nodes)for(const b of g.mechanical.nodes)if(a!==b)assert.ok(worldDistance(a,b)>28);
});

test('怪物主动锁定猫并造成独立伤害，攻击途中不切换受害者',()=>{
 const g=arena();updateMechanical(g,.01);const n=g.mechanical.nodes[0];const e=foe(g,n.x+35,n.y);e.damage=25;
 assert.equal(companionEnemyTarget(g,e).node,n);const hp=g.player.hp;
 for(let i=0;i<70;i++)updateEnemies(g,1/60,g.player);
 assert.equal(n.hp,275);assert.equal(g.player.hp,hp);
 e.assault.phase='windup';e.companionTarget=n;n.hp=0;assert.equal(companionEnemyTarget(g,e).node,n);
});

test('死亡后延迟扣六能量补召，暂停收起不能回血，欠能量等待逐格恢复',()=>{
 const g=arena();updateMechanical(g,.01);const n=g.mechanical.nodes[0],m=g.magazines[15];
 hurtMechanical(g,n,999);assert.equal(n.hp,0);const ammo=m.ammo;
 step(g,1);assert.equal(n.hp,0);assert.equal(m.ammo,ammo);
 updateMechanical(g,5,false);assert.equal(n.hp,0);
 resetMechanicalFormation(g.mechanical);step(g,1.1);assert.equal(n.hp,300);assert.equal(m.ammo,ammo-6);
 hurtMechanical(g,n,999);m.ammo=2;step(g,2.1);assert.equal(n.hp,0);assert.equal(m.remaining,0);
});

test('十二种远程枪复用正式攻击，猫保持跟随且手持弹药不受影响',()=>{
 for(const index of [0,1,2,3,4,5,6,7,8,9,10,11]){
  const g=arena();g.progress.mechanicalLoadout=index;foe(g,1040,750);
  const original=JSON.stringify(g.magazines[index]);let hits=0;g.hit=()=>{hits++;};
  for(let i=0;i<600;i++)g.update(1/60);
  assert.equal(JSON.stringify(g.magazines[index]),original,'手持供给 '+index);
  assert.ok(g.mechanical.nodes.slice(0,3).every(n=>n.gun?.weapon.weaponIndex===index));
  assert.ok(g.mechanical.nodes.slice(3).every(n=>!n.gun&&n.maxHp===300));
  assert.ok(g.projectiles.length||g.shots.length||hits,'正式攻击 '+index);
  assert.ok(g.mechanical.nodes.slice(0,3).every(n=>worldDistance(n,g.player)<140));
 }
});

test('背枪切换保留每猫每枪弹仓与蓄能，生命不重置',()=>{
 const g=arena();g.progress.mechanicalLoadout=9;updateMechanical(g,.1);const n=g.mechanical.nodes[0],gun=n.gun;
 gun.magazine.ammo=2;gun.magazine.remaining=1.4;gun.pulse.charge=.3;n.hp=20;
 configureMechanical(g,null,()=>true);updateMechanical(g,.1);assert.equal(n.gun,null);
 configureMechanical(g,9,()=>true);updateMechanical(g,0);assert.equal(n.gun,gun);assert.equal(n.hp,20);assert.equal(gun.magazine.remaining,1.4);assert.equal(gun.pulse.charge,.3);
});

test('四种车体均可挂三类召唤武器，正式更新攻击且状态不引用手持队伍',()=>{
 for(let hull=0;hull<4;hull++)for(const index of [12,13,15]){
  const g=arena(0,index,hull);foe(g);const before=JSON.stringify([g.funnel,g.drone,g.mechanical,g.magazines[index]]);
  for(let i=0;i<300;i++)updateVehicle(g,1/60);
  const local=vehicleCompanionContext(g),state=local[local.weapon().controller];assert.ok(state.nodes.some(n=>n.targetId));
  assert.equal(JSON.stringify([g.funnel,g.drone,g.mechanical,g.magazines[index]]),before);
  assert.ok(g.projectiles.length||g.shots.length||g.enemies[0].hp<1e6);
  g.vehicle.active=false;const frozen=JSON.stringify(g.vehicle.module);step(g,1,updateVehicle);assert.equal(JSON.stringify(g.vehicle.module),frozen);
 }
});

test('车载模块换装保留猫生命，独立核心与枪械槽共享但供给分离',()=>{
 const g=arena(15,15);g.progress.mechanicalLoadout=0;updateMechanical(g,.01);updateVehicle(g,.01);
 const m=g.vehicle.module,n=m.companions.nodes[0];n.hp=12;m.magazine.ammo=7;
 assert.notEqual(n,g.mechanical.nodes[0]);assert.notEqual(n.gun.magazine,g.mechanical.nodes[0].gun.magazine);
 assert.ok(configureVehicle(g,13));assert.ok(configureVehicle(g,15));assert.equal(g.vehicle.module,m);assert.equal(n.hp,12);assert.equal(m.magazine.ammo,7);
});

test('三类控制器可作为独立挂载，未提交前仍保留原主炮',()=>{
 const g=arena(0);g.progress.vehicleWeapons.fill(0);
 for(const index of [12,13,15]) {const q=quoteWorkshop(g.progress,workshopDraft(g.progress,'vehicle',2,index));assert.equal(q.ok,true);assert.equal(validateProgress(g.progress).vehicleLoadouts[2],19);}
});


test('车载浮游炮初始弹仓按各挂枪容量构造，更换枪只启用空仓且保留原槽',()=>{
 const p=arena(0,12).progress;p.funnelLoadout=[0,9,12];
 const g=legacyVehicleGame(p,()=>.5);g.state='playing';g.vehicle.active=true;
 const m=g.vehicle.module;assert.deepEqual(m.magazine.modules.map(n=>n.ammo),[18,4,18]);
 updateVehicle(g,0);const nodes=m.companions.nodes,old=nodes[0].magazine;old.ammo=2;
 g.progress.funnelLoadout[0]=1;updateVehicle(g,0);assert.equal(nodes[0].magazine.ammo,0);assert.ok(nodes[0].magazine.remaining>0);
 g.progress.funnelLoadout[0]=0;updateVehicle(g,0);assert.equal(nodes[0].magazine,old);assert.equal(old.ammo,2);
});

// 同一正式更新入口比较驾驶和步行，保证只扩大跟随，不改变近战接敌。
test('驾驶和步行自然驻点保持近身、分离与车壳空隙',()=>{
 for(const count of [3,10])for(const riding of [false,true]){
  const g=arena();g.progress.weaponParts[15].coordination=count-2;g.progress.mechanicalLoadout=0;g.vehicle.active=riding;
  step(g,12);const nodes=g.mechanical.nodes.slice(0,count);
  for(const n of nodes){
   const d=worldDistance(n,g.player);assert.ok(d>(riding?76:30)&&d<(riding?210:140));
   for(const other of nodes)if(other!==n)assert.ok(worldDistance(n,other)>28);
  }
 }
});
