// 行驶队形、母体枪架与二十小蛛的正式战斗回归，不依赖浏览器存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {updateMechanical,hurtMechanical} from '../src/combat/mechanical.js';
import {updateSpider} from '../src/combat/spider.js';
import {configureSpider} from '../src/core/spider-loadout.js';
import {canMountSpider,spiderGunDamage,spiderGunWeapon} from '../src/config/spider-loadout.js';
import {effectiveWeapon,weaponDamage} from '../src/config/weapon-mods.js';
import {vehicleWeapon,vehicleDamage} from '../src/config/vehicles.js';
import {vehicleCompanionContext} from '../src/combat/vehicle-companions.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {guardianProgress} from '../src/config/guardian-equipment.js';
import {expeditionEquipment} from '../src/config/expedition.js';
import {createWorkshopTrial} from '../src/core/workshop-trial.js';
import {worldDistance} from '../src/world/coordinates.js';
// 开放平台隔离自然地形，直接检验真实移动、枪仓和攻击模块。
function arena(index=16){const p=freshProgress();p.weapons.fill(1);p.vehicleWeapons.fill(1);p.vehicleHulls.fill(1);p.weapon=index;const g=new Game(p,()=>.5);g.state='playing';g.enemies=[];g.trees=[];g.updateWaves=()=>{};Object.assign(g.player,{x:2000,y:2000,arena:{x:2000,y:2000,radius:5000}});return g;}
// 固定步长推进，确保断言包含逐帧避让而非只检查最后落点。
function step(g,seconds,fn=updateSpider){for(let i=0;i<Math.ceil(seconds*60);i++)fn(g,1/60);}
// 固定敌人生命以便记录不同炮型的真实命中。
function target(g){const e=g.spawnEnemy(0,0,{x:g.player.x+160,y:g.player.y+40});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,flying:false,arena:g.player.arena});return e;}

test('三只及十只驾驶急转逐帧避开车身，停车平滑散开且供给不重置',()=>{
 for(const count of [3,10])for(const hull of [0,1,2,3]){
  const g=arena(15);g.progress.weaponParts[15].coordination=count-2;g.progress.mechanicalLoadout=0;g.vehicle.active=true;g.vehicle.index=hull;
  step(g,12,updateMechanical);let min=Infinity,maxStep=0;
  for(const [dx,dy] of [[240,0],[0,240],[-240,0],[0,-240],[240,0],[-240,0]])for(let i=0;i<75;i++){
   const previous=g.mechanical.nodes.map(n=>({x:n.x,y:n.y}));g.player.x+=dx/60;g.player.y+=dy/60;updateMechanical(g,1/60);
   for(const n of g.mechanical.nodes.filter(n=>n.active)){min=Math.min(min,Math.hypot(n.x-g.player.x,n.y-g.player.y+10));maxStep=Math.max(maxStep,worldDistance(n,previous[n.index]));}
  }
  assert.ok(min>=67.5,`车壳安全圈 ${count}/${hull}: ${min}`);assert.ok(maxStep<20,`不能瞬移 ${maxStep}`);
  assert.ok(g.mechanical.follow.blend>.8);step(g,6,updateMechanical);assert.ok(g.mechanical.follow.blend<.01);
  const nodes=g.mechanical.nodes.filter(n=>n.active);for(const a of nodes)for(const b of nodes)if(a!==b)assert.ok(worldDistance(a,b)>28);
  assert.ok(Math.max(...nodes.flatMap(a=>nodes.map(b=>worldDistance(a,b))))>90,'停车自然散开，不强制交换到左右槽位');
 }
});

test('蜘蛛旧档默认原生，单槽校验、保存失败及秘境不继承永久配置',()=>{
 const g=arena();assert.equal(validateProgress({...g.progress,spiderLoadout:undefined}).spiderLoadout,null);
 for(const index of [12,13,14,15,16,-1,100])assert.equal(canMountSpider(g.progress,index),false);
 const old=JSON.stringify(g.spider);assert.equal(configureSpider(g,0,()=>false).ok,false);assert.equal(g.progress.spiderLoadout,null);
 assert.equal(configureSpider(g,0,()=>{throw Error('save');}).ok,false);assert.equal(JSON.stringify(g.spider),old);
 assert.equal(configureSpider(g,0,()=>true).ok,true);assert.equal(validateProgress(g.progress).spiderLoadout,0);
 assert.equal(expeditionEquipment(g.progress,{weapon:16,vehicle:null,turret:null,modules:[0,0,0]},1).spiderLoadout,null);
 assert.equal(guardianProgress(g.progress,{weaponIndex:16,level:2}).spiderLoadout,null);
 g.realm={};assert.equal(configureSpider(g,1,()=>true).ok,false);
});

test('母体十二种合法挂枪使用正式属性及一次1.5增伤，孵化能源和手持弹药独立',()=>{
 for(const index of [0,1,2,3,4,5,6,7,8,9,10,11]){
  const g=arena();g.progress.spiderLoadout=index;g.progress.weapons[index]=4;g.progress.weaponParts[index].rate=3;g.progress.weaponParts[index].capacity=2;
  target(g);let hits=0;g.hit=()=>{hits++;};const saved=JSON.stringify(g.magazines[index]);step(g,12,(x,dt)=>x.update(dt));
  const gun=g.spider.gun,w=effectiveWeapon(g.progress,index);assert.equal(gun.weapon.weaponIndex,index);assert.equal(gun.weapon.interval,w.interval);
  assert.equal(gun.damage,Math.round(weaponDamage(g.progress,index)*1.5));assert.equal(JSON.stringify(g.magazines[index]),saved);
  assert.notEqual(gun.magazine,g.magazines[16]);assert.equal(gun.ownerIndex,16);assert.ok(hits>0,`炮型${index}真实命中`);
 }
});

test('母体换枪往返保持每枪弹仓、装填、蓄力、冷却和受损生命',()=>{
 const g=arena();g.progress.spiderLoadout=9;updateSpider(g,0);const gun=g.spider.gun;
 Object.assign(gun.magazine,{ammo:2,remaining:.7});gun.cooldown=.6;gun.pulse.charge=.8;gun.cycle.charge=.4;g.spider.mother.hp=127;
 const old=JSON.stringify(gun);configureSpider(g,0,()=>true);updateSpider(g,0);assert.equal(g.spider.gun.magazine.ammo,0);
 configureSpider(g,9,()=>true);updateSpider(g,0);assert.equal(g.spider.gun,gun);assert.equal(JSON.stringify(gun),old);assert.equal(g.spider.mother.hp,127);
 hurtMechanical(g,g.spider.mother,999);const before=JSON.stringify(gun.magazine);updateSpider(g,.5);assert.equal(JSON.stringify(gun.magazine),before);
});

test('四种载具母体独立枪仓，外接枪使用手持成长且伤害不重复叠加车载等级',()=>{
 for(let hull=0;hull<4;hull++){
  const g=arena(0);g.progress.spiderLoadout=9;g.progress.weapons[9]=3;g.progress.vehicleWeapons[9]=19;g.progress.vehicleWeapons[16]=7;
  g.progress.vehicleIndex=hull;g.progress.vehicleLoadouts[hull]=16;g.reset();g.state='playing';g.trees=[];g.enemies=[];g.vehicle.active=true;updateVehicle(g,0);
  const local=vehicleCompanionContext(g);assert.notEqual(local.spider,g.spider);assert.equal(local.spider.gun.damage,Math.round(weaponDamage(g.progress,9)*1.5));
  assert.equal(local.spider.gun.weapon.interval,effectiveWeapon(g.progress,9).interval);
  configureSpider(g,null,()=>true);updateVehicle(g,0);assert.equal(local.spider.gun.damage,Math.round(vehicleDamage(g.progress,16)*1.5));
 }
});

test('原生与外接枪在正式试射和面板计算一致，二十小蛛名额固定有界',()=>{
 for(const index of [null,0,9]){
  const g=arena();g.progress.spiderLoadout=index;g.progress.weaponParts[16].coordination=13;const saved=JSON.stringify(g.progress),trial=createWorkshopTrial(g.progress,'weapons',16);
  for(let i=0;i<60*60;i++)trial.advance(1/60);
  assert.equal(trial.game.spider.nodes.length,20);assert.equal(trial.game.spider.nodes.filter(n=>n.spawned&&n.hp>0).length,20);assert.ok(trial.destroyed>0);
  const gun=trial.game.spider.gun;assert.equal(gun.damage,spiderGunDamage(g.progress,weaponDamage(g.progress,16)));
  assert.equal(gun.weapon.weaponIndex,spiderGunWeapon(g.progress,effectiveWeapon(g.progress,16)).weaponIndex);assert.equal(JSON.stringify(g.progress),saved);
 }
});
