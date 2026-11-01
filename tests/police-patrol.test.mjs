// 警察猫与警车的真实交易、存档、试驾和轮动回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {HEROES} from '../src/config/heroes.js';
import {COLLECTED_VEHICLES,vehicleMaxHp,vehicleSpeed} from '../src/config/vehicles.js';
import {transactVehicle} from '../src/progression/vehicles.js';
import {createVehicle,canMountVehicleWeapon} from '../src/combat/vehicle.js';
import {advanceVehicleWheels} from '../src/combat/vehicle-motion.js';
import {createWeaponTrialScene} from '../src/core/weapon-trial-scene.js';
import {heroTalent} from '../src/config/hero-talents.js';
import {campPurchasePrice} from '../src/progression/camp-level.js';
import {equipmentRecipe} from '../src/progression/equipment-goals.js';
import {MACHINE_SOUNDS,machineEngineSample} from '../src/platform/audio-machines.js';
import {RECOMMENDED_ECONOMY,validateEconomy} from '../src/config/economy.js';

// 已修好工坊的测试档只提供资源，不预先授予新增装备。
function funded(){const p=freshProgress();p.arrival=null;p.restoration.repaired=['garage'];p.coins=p.wood=100000;p.materials.parts=1000;return p;}

test('警察猫招募扣除正式价格，独立升级并保留旧猫编号',()=>{
 const g=new Game(funded(),()=>.5),before=g.progress.coins,price=campPurchasePrice(g.progress,HEROES[6]);
 assert.equal(HEROES[6].id,'police');assert.ok(g.transact('heroes',6,'buy'));assert.equal(g.progress.coins,before-price.coins);
 assert.equal(g.progress.hero,6);assert.equal(g.maxHp(),140);assert.equal(heroTalent(g.progress).stat,'handReload');
 assert.ok(g.transact('heroes',6,'upgrade'));const restored=validateProgress(JSON.parse(JSON.stringify(g.progress)));
 assert.equal(restored.heroes[6],2);assert.equal(restored.heroes[0],1);assert.equal(restored.hero,6);
});

test('购买警车进入停车场，升级增长耐久且保存无炮塔状态',()=>{
 const p=funded(),cost=equipmentRecipe('vehicle',8,p),before={coins:p.coins,parts:p.materials.parts};
 assert.equal(COLLECTED_VEHICLES[8].id,'police-car');assert.ok(transactVehicle(p,'vehicle',8,'buy'));
 assert.equal(p.coins,before.coins-cost.coins);assert.equal(p.materials.parts,before.parts-cost.parts);
 assert.ok(p.campParking.owned.some(v=>v.hull===8));assert.equal(p.vehicleLoadouts[8],null);
 p.vehicleIndex=8;p.vehicleHulls[p.vehicleIndex||0]=p.vehicleHulls[8];const hp=vehicleMaxHp(p,140);
 assert.ok(transactVehicle(p,'vehicle',8,'upgrade'));p.vehicleHulls[p.vehicleIndex||0]=p.vehicleHulls[8];assert.ok(vehicleMaxHp(p,140)>hp);assert.ok(vehicleSpeed(p)>1);
 const restored=validateProgress(JSON.parse(JSON.stringify(p))),v=createVehicle(restored,8);
 assert.equal(restored.vehicleHulls[8],2);assert.ok(restored.campParking.owned.some(v=>v.hull===8));assert.equal(v.weaponIndex,null);assert.equal(v.module,null);assert.equal(canMountVehicleWeapon(restored,0,8),false);
});

test('旧六猫八车存档扩容为未拥有的新角色和警车',()=>{
 const p=funded();p.heroes=p.heroes.slice(0,6);p.vehicleHulls=p.vehicleHulls.slice(0,8);
 const next=validateProgress(p);assert.equal(next.heroes[6],0);assert.equal(next.vehicleHulls[8],0);assert.equal(next.vehicleLoadouts[8],null);
});

test('旧八车自定义价格导入只补警车，原车型价格保持不变',()=>{
 const previous=structuredClone(RECOMMENDED_ECONOMY);previous.vehicles.length=8;previous.vehicles[7].coins=12345;
 const migrated=validateEconomy(previous);assert.equal(migrated.vehicles.length,9);assert.equal(migrated.vehicles[7].coins,12345);
 assert.deepEqual(migrated.vehicles[8],RECOMMENDED_ECONOMY.vehicles[8]);
});

test('警车演练由骑手真实开枪，车轮支持前进倒车与停车保持',()=>{
 const p=funded();p.vehicleHulls[8]=1;p.weapons[0]=1;p.weapon=0;
 const trial=createWeaponTrialScene(p,'vehicle',8);for(let i=0;i<180;i++)trial.advance(1/30);
 assert.equal(trial.game.vehicle.index,8);assert.ok(trial.damage>0);assert.equal(p.vehicleHulls[8],1);
 const v={index:8,active:true,wheelPhase:0};advanceVehicleWheels(v,{x:12,y:0},{x:0,y:0});assert.equal(v.wheelPhase,1);
 advanceVehicleWheels(v,{x:12,y:0},{x:12,y:0});assert.equal(v.wheelPhase,1);
 advanceVehicleWheels(v,{x:0,y:0},{x:12,y:0});assert.equal(v.wheelPhase,0);
 v.active=false;advanceVehicleWheels(v,{x:12,y:0},{x:0,y:0});assert.equal(v.wheelPhase,0);
});

test('警车正式移动尊重场地边界，停车与暂停保持轮姿',()=>{
 const p=funded();p.vehicleHulls[8]=1;p.vehicleIndex=8;
 const g=new Game(p,()=>.5);g.start();g.workshopTrial=true;g.trees=[];g.enemies=[];g.updateWaves=()=>{};
 Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:200},vx:0,vy:0});g.vehicle.active=true;
 g.update(.05,{x:1,y:0});assert.ok(g.player.x>900);assert.ok(g.vehicle.wheelPhase>0);
 g.player.vx=g.player.vy=0;const stopped=g.vehicle.wheelPhase;g.update(.05);assert.equal(g.vehicle.wheelPhase,stopped);
 g.pause();g.update(.05,{x:1,y:0});assert.equal(g.vehicle.wheelPhase,stopped);
 g.start();g.player.x=1088-1e-6;g.player.vx=0;const blocked=g.vehicle.wheelPhase;
 for(let i=0;i<12;i++)g.update(.05,{x:1,y:0});assert.equal(g.vehicle.wheelPhase,blocked);
});

test('警车起停音效已注册，发动机音色有界且不使用警笛循环',()=>{
 assert.ok(MACHINE_SOUNDS['vehicle-start-8']);assert.ok(MACHINE_SOUNDS['vehicle-stop-8']);
 const samples=Array.from({length:100},(_,i)=>machineEngineSample(8,i/22050));
 assert.ok(samples.some(v=>v!==0));assert.ok(samples.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
});
