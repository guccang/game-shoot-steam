// 金杯面包车的目录、逐只召唤、近战、补召与检查点均使用正式入口验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {updateCatCrew} from '../src/combat/cat-crew.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {hurtMechanical} from '../src/combat/mechanical.js';
import {vehicleCompanionContext} from '../src/combat/vehicle-companions.js';
import {transactVehicle} from '../src/progression/vehicles.js';
import {captureRealmVehicles,restoreRealmVehicles} from '../src/core/realm-vehicles.js';
import {validateRealmVehicles} from '../src/progression/realm-vehicles.js';
import {normalizeCampParking} from '../src/progression/camp-parking.js';
// 平台夹具隔离野外任务，但保留真实载具、伙伴、碰撞与命中处理。
function arena(){const p=freshProgress();p.arrival=null;p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};p.vehicleHulls[7]=1;p.vehicleIndex=7;const g=new Game(p,()=>.5);g.state='playing';g.workshopTrial=true;g.trees=[];g.enemies=[];g.boss=null;Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});g.summonVehicle();return g;}
// 小步推进正式车载模块，避免借全局波次掩盖供给与部署结果。
function step(g,seconds){for(let t=0;t<seconds;t+=1/60)updateVehicle(g,1/60);}
// 正式怪物仅冻结移动和伤害，近战仍需要真实追赶与接触。
function target(g,x,y,flying=false){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{x,y,hp:10000,maxHp:10000,speed:0,damage:0,arena:g.player.arena,flying});return e;}
test('金杯无任务门槛且附带独立小队，旧档不会免费获得新车',()=>{const p=freshProgress();p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};assert.ok(transactVehicle(p,'vehicle',7,'buy'));assert.equal(p.vehicleLoadouts[7],22);assert.equal(vehicleWeapon(p,22).summonCount,4);p.turretParts[22].coordination=5;assert.equal(vehicleWeapon(p,22).summonCount,8);p.turretParts[22].coordination=999;assert.equal(vehicleWeapon(p,22).summonCount,8);const old=freshProgress();old.vehicleHulls=old.vehicleHulls.slice(0,7);assert.equal(validateProgress(old).vehicleHulls[7],0);});
test('八辆车均有停放容量，北场满位时购买金杯可落入工坊泊位',()=>{let p=freshProgress();p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};p.vehicleHulls.fill(1);p.vehicleHulls[7]=0;p.vehicleIndex=5;p=validateProgress(p);p.campParking=normalizeCampParking(null,p);assert.ok(transactVehicle(p,'vehicle',7,'buy'));assert.equal(p.campParking.owned.length,7);assert.equal(new Set(p.campParking.owned.map(r=>r.spot)).size,7);});
test('逐只召唤并分配日常用品，共享补给只在召唤时扣除且不会发射子弹',()=>{const g=arena(),m=g.vehicle.module;updateVehicle(g,.01);assert.equal(m.companions.nodes.filter(n=>n.spawned).length,1);assert.equal(m.magazine.ammo,11);for(let i=0;i<240;i++)updateCatCrew(vehicleCompanionContext(g),1/60);assert.equal(m.companions.nodes.filter(n=>n.spawned).length,4);assert.deepEqual(m.companions.nodes.slice(0,4).map(n=>n.variant),[0,1,2,3]);assert.equal(m.magazine.ammo,8);step(g,3);assert.equal(m.magazine.ammo,10);assert.equal(g.projectiles.length,0);});
test('邻里猫追近地面目标挥击，飞行及远处目标不会被近战命中',()=>{const g=arena(),near=target(g,1060,750),far=target(g,1600,750),air=target(g,1020,710,true);step(g,9);assert.ok(near.hp<10000);assert.equal(far.hp,10000);assert.equal(air.hp,10000);assert.equal(g.vehicle.module.magazine.ammo,12);assert.equal(g.projectiles.length,0);assert.ok(g.vehicle.module.companions.nodes.some(n=>n.bodyAnimation.moveTime>0));});
test('倒下等待三秒后花一格补召，收车期间冻结且不影响手持机械猫',()=>{const g=arena();step(g,4);const m=g.vehicle.module,n=m.companions.nodes[0],hand=g.mechanical;hurtMechanical(vehicleCompanionContext(g),n,999);assert.equal(n.hp,0);const ammo=m.magazine.ammo;g.dismountVehicle();step(g,5);assert.equal(n.deadTime,3);assert.equal(m.magazine.ammo,ammo);g.summonVehicle();step(g,2);assert.equal(n.hp,0);step(g,1.2);assert.equal(n.hp,180);assert.equal(m.magazine.ammo,11);assert.notEqual(hand,m.companions);});
test('车门两侧堵塞不扣补给，检查点保留倒下状态和能源',()=>{const g=arena(),m=g.vehicle.module;g.player.worldBarriers=[{x:959,y:767,width:22,height:50},{x:841,y:767,width:22,height:50}];step(g,2);assert.equal(m.magazine.ammo,12);assert.equal(m.companions.nodes.filter(n=>n.spawned).length,0);g.player.worldBarriers=[];step(g,4);hurtMechanical(vehicleCompanionContext(g),m.companions.nodes[0],999);step(g,.5);const snapshot=captureRealmVehicles(g);assert.deepEqual(validateRealmVehicles(snapshot),snapshot);restoreRealmVehicles(g,snapshot);assert.equal(g.vehicle.weaponIndex,22);assert.equal(g.vehicle.module.magazine.ammo,m.magazine.ammo);assert.equal(g.vehicle.module.companions.nodes[0].hp,0);assert.equal(g.vehicle.module.companions.nodes[0].deadTime,m.companions.nodes[0].deadTime);step(g,3);assert.equal(g.vehicle.module.magazine.ammo,11);});

// 车门出口虽可站立，出口前的窄墙仍必须阻止出车。
test('出生短路径不能越过薄墙',()=>{const g=arena();g.player.worldBarriers=[{x:935,y:760,width:4,height:75},{x:865,y:760,width:4,height:75}];step(g,2);assert.equal(g.vehicle.module.magazine.ammo,12);assert.equal(g.vehicle.module.companions.nodes.filter(n=>n.spawned).length,0);});
// 工坊沿用真实小队数据，不能被玩家给机械猫配置的远程枪覆盖。
test('工坊显示四只邻里猫和真实生命，手持机械挂枪不改写小队属性',async()=>{const {renderWorkshopStats}=await import('../src/ui/workshop/stats.js');const g=arena(),p=g.progress;p.mechanicalLoadout=0;const elements=new Map(),root={getElementById(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:''});return elements.get(id);}};const current={progress:p,weapon:vehicleWeapon(p,22)};renderWorkshopStats({root,current,after:current,kind:'vehicle',index:7,maxHp:120});const html=elements.get('ws-stats').innerHTML;assert.ok(html.includes('邻里猫 / 只'));assert.ok(html.includes('挥击间隔/秒'));assert.ok(html.includes('180'));assert.ok(!html.includes('重装生命'));assert.ok(html.includes('0.85'));});
// 同步主分支的装备档案后，小队近战保持武器与车体两维来源。
test('邻里猫真实击杀归入小队和金杯战绩',()=>{const g=arena();g.workshopTrial=false;Object.assign(g.player,{x:350,y:1260,arena:{x:350,y:1260,radius:1000}});const e=target(g,500,1260);e.hp=1;step(g,4);assert.ok(e.hp<=0);assert.deepEqual(g.progress.statistics.equipment.weapons['cat-crew'],{kills:1,trees:0});assert.deepEqual(g.progress.statistics.equipment.vehicles['jinbei-van'],{kills:1,trees:0});});

// 归队目标必须可达；测试同时覆盖四只默认编制和八只满编，而非仅检查最终画面。
test('上方猫咪停车后稳定落脚，八只满编也不在车壳边缘左右折返',()=>{
 for(const count of [4,8]){
  const g=arena();g.progress.turretParts[22].coordination=count-3;
  step(g,15);const nodes=g.vehicle.module.companions.nodes.filter(n=>n.active);
  assert.equal(nodes.length,count);
  const before=nodes.map(n=>({x:n.x,y:n.y,angle:n.angle}));let travel=0;
  for(let i=0;i<180;i++){
   const previous=nodes.map(n=>({x:n.x,y:n.y}));updateVehicle(g,1/60);
   nodes.forEach((n,j)=>{travel+=Math.hypot(n.x-previous[j].x,n.y-previous[j].y);});
  }
  assert.ok(travel<.01,`停车后三秒仍移动${travel}`);
  nodes.forEach((n,j)=>{assert.equal(n.angle,before[j].angle);assert.ok(Math.hypot(n.x-g.player.x,n.y-g.player.y+10)>=68);});
 }
});
// 驾驶中连续追随与直角转弯后自然停止，动作不因反向重置或高频朝向切换。
test('小队随车转弯后再次稳定归队，接近落点的转向有速率限制',()=>{
 const g=arena();g.progress.turretParts[22].coordination=5;step(g,12);
 const nodes=g.vehicle.module.companions.nodes.filter(n=>n.active);
 for(const [dx,dy] of [[160,0],[0,-160],[-160,0],[0,160]])for(let i=0;i<60;i++){
  const angles=nodes.map(n=>n.angle);g.player.x+=dx/60;g.player.y+=dy/60;updateVehicle(g,1/60);
  nodes.forEach((n,j)=>assert.ok(Math.abs(Math.atan2(Math.sin(n.angle-angles[j]),Math.cos(n.angle-angles[j])))<=7/60+1e-8));
 }
 step(g,8);const before=nodes.map(n=>({x:n.x,y:n.y}));step(g,3);
 nodes.forEach((n,j)=>assert.ok(Math.hypot(n.x-before[j].x,n.y-before[j].y)<.01));
});
