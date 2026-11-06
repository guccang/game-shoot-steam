// 新枪和红狼覆盖真实弹道、牵引、存档身份及购买升级隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {landGravityField,updateGravityFields,currentGravityFields} from '../src/combat/gravity-field.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {transactProgress} from '../src/progression/transactions.js';
import {transactVehicle} from '../src/progression/vehicles.js';
import {awardAttackMastery} from '../src/progression/mastery.js';
import {guardianOwnsWeapon} from '../src/config/guardian.js';
import {guardianWeaponStats} from '../src/config/guardian-equipment.js';
import {equipmentRecipe} from '../src/progression/equipment-goals.js';
import {workshopUpgrade,quoteWorkshop} from '../src/progression/workshop.js';
import {RECOMMENDED_ECONOMY,validateEconomy} from '../src/config/economy.js';
// 隔离测试场保留正式攻击和目标对象，只移除任务、波次与外部存档。
function arena(){const p=freshProgress();p.arrival=null;p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};p.weapons[17]=1;p.weapon=17;p.vehicleHulls[6]=1;p.vehicleIndex=6;p.vehicleWeapons[21]=1;p.vehicleLoadouts[6]=21;p.supplies.vehicleMags[6]={weapon:21,ammo:1,remaining:0};const g=new Game(p,()=>.5);g.state='playing';g.workshopTrial=true;g.trees=[];g.enemies=[];g.boss=null;g.updateWaves=()=>{};Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});return g;}
// 高耐久靶用于观察一次命中后的真实位置和范围伤害。
function target(g,x,y,type='enemy'){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{x,y,type,hp:10000,maxHp:10000,speed:0,damage:0,arena:g.player.arena});return e;}
test('引力弹真实命中后生成限时场，普通怪聚拢、领主抗拉、场外目标不动',()=>{const g=arena(),e=target(g,1060,750),side=target(g,1150,800),outside=target(g,1450,750),boss=target(g,1150,800,'boss');g.boss=boss;g.enemies=g.enemies.filter(t=>t!==boss);g.player.x=750;assert.ok(g.attack());for(let i=0;i<120;i++)g.updateProjectiles(1/120);assert.equal(g.gravityFields.length,1);const a=side.x,b=boss.x,o=outside.x;updateGravityFields(g,.01);assert.ok(side.x<a);assert.ok(boss.x<b);assert.ok(a-side.x>b-boss.x,JSON.stringify({a,side:side.x,b,boss:boss.x,types:[side.type,boss.type],fields:g.gravityFields}));assert.equal(outside.x,o);updateGravityFields(g,4);assert.equal(g.gravityFields.length,0);assert.ok([e,side,boss].some(t=>t.hp<10000));});
test('单弹不重复建场、最多三场、切场失效，牵引不重复伤害',()=>{const g=arena(),e=target(g,1100,750),b={x:1200,y:750,gravityRadius:190,gravityDuration:3,gravityPull:230};landGravityField(g,b);landGravityField(g,b);assert.equal(g.gravityFields.length,1);for(let i=0;i<8;i++)landGravityField(g,{...b,fieldCreated:false});assert.equal(g.gravityFields.length,3);const hp=e.hp;updateGravityFields(g,.2);assert.equal(e.hp,hp);g.mapId='jiuzhaigou';assert.equal(currentGravityFields(g).length,0);});
test('红狼正式主炮与范围伤害只结算一次，旧主炮编号稳定',()=>{const g=arena(),direct=target(g,1070,755),side=target(g,1080,825),far=target(g,1400,900);g.summonVehicle();assert.equal(g.vehicle.weaponIndex,21);updateVehicle(g,.01);assert.equal(g.projectiles[0].kind,'wolf-256');assert.ok(g.vehicle.recoil.kick>0);for(let i=0;i<60;i++)g.updateProjectiles(1/120);assert.equal(10000-direct.hp,700);assert.equal(10000-side.hp,560);assert.equal(far.hp,10000);assert.equal(g.progress.mastery[17],0);});
test('新装备无任务和营地等级门槛，购买升级与旧机枪所有权隔离',()=>{let p=freshProgress();p.arrival=null;p.coins=p.wood=99990000;p.materials={parts:99999,crystal:99999,core:99999};assert.equal(guardianOwnsWeapon(p,17),false);assert.ok(transactProgress(p,'weapons',17,'buy'));assert.equal(p.vehicleWeapons[17],0);assert.ok(transactVehicle(p,'vehicle',6,'buy'));assert.equal(p.vehicleLoadouts[6],21);assert.equal(p.vehicleWeapons[21],1);assert.equal(equipmentRecipe('turret',17,p),null);p=validateProgress(p);for(const [kind,index,hull] of [['weapons',17,null],['vehicle',6,null],['turret',21,6]]){const q=quoteWorkshop(p,workshopUpgrade(p,kind,index,kind==='vehicle'?'armor':'damage',hull));assert.ok(q.ok,q.reason);}awardAttackMastery(p,{kind:'vehicle-machinegun',weaponIndex:17},'enemy');assert.equal(p.mastery[17],0);awardAttackMastery(p,{kind:'gravity-gun',weaponIndex:17},'enemy');assert.equal(p.mastery[17],4);assert.equal(guardianWeaponStats(p,{weaponIndex:17,level:1,kind:'weapon'}).weapon.id,'gravity-gun');});
test('旧档补齐但不赠送新装备，旧经济方案仍能恢复',()=>{const raw=freshProgress();raw.weapons=raw.weapons.slice(0,17);raw.vehicleHulls=raw.vehicleHulls.slice(0,6);raw.vehicleWeapons[17]=7;const p=validateProgress(raw);assert.equal(p.weapons[17],0);assert.equal(p.vehicleHulls[6],0);assert.equal(p.vehicleWeapons[17],7);assert.deepEqual(validateProgress(p),p);const c=structuredClone(RECOMMENDED_ECONOMY);c.weapons.pop();c.vehicles.pop();assert.equal(validateEconomy(c).weapons.length,RECOMMENDED_ECONOMY.weapons.length);});
// 牵引经过正式障碍检测；共享代理场地与实际停驻相位不丢失。
test('引力不穿障碍，代理近距离落点共享；红狼停止与反向履带连续',async()=>{
 const g=arena(),e=target(g,350,1260);e.arena={x:450,y:1260,radius:500,terrain:'forest'};e.worldBarriers=[{x:410,y:1260,width:20,height:200}];
 const proxy=Object.create(g);landGravityField(proxy,{x:500,y:1260,gravityRadius:190,gravityDuration:3,gravityPull:230});assert.equal(g.gravityFields.length,1);
 for(let i=0;i<120;i++)updateGravityFields(g,1/60);assert.ok(e.x>350&&e.x<400);
 const {advanceVehicleWheels}=await import('../src/combat/vehicle-motion.js');const v={index:6,active:true,wheelPhase:0};advanceVehicleWheels(v,{x:12,y:0},{x:0,y:0});const phase=v.wheelPhase;advanceVehicleWheels(v,{x:12,y:0},{x:12,y:0});assert.equal(v.wheelPhase,phase);advanceVehicleWheels(v,{x:0,y:0},{x:12,y:0});assert.equal(v.wheelPhase,0);
});
