// 装备战绩覆盖正式发射、迟到命中、召唤归属、车体维度及旧档迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {WEAPONS} from '../src/config/weapons.js';
import {effectiveWeapon} from '../src/config/weapon-mods.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {statisticsSource} from '../src/combat/statistics-source.js';
import {recordDefeat,validateGameStatistics} from '../src/progression/game-statistics.js';
import {fireBallistics,updateBallistics} from '../src/combat/ballistics.js';
import {emitWeaponAttack} from '../src/combat/weapon-fire.js';
import {launchGrenade,explodeGrenade} from '../src/combat/grenades.js';
import {createVehicle,updateVehicle} from '../src/combat/vehicle.js';
import {vehicleCompanionContext} from '../src/combat/vehicle-companions.js';
import {explodeSpiderling} from '../src/combat/spider-death.js';
import {validateTideState} from '../src/config/tide-cannon.js';
import {advanceTidePair} from '../src/combat/tide-cannon.js';
import {explodeHeavyShell} from '../src/combat/gravity-field.js';

// 静态靶位使用正式游戏实例与实际命中规则，不推进随机刷怪。
function scene(){
 const g=new Game(freshProgress(),()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;
 Object.assign(g.player,{x:900,y:700,angle:0,arena:{x:900,y:700,radius:1000}});return g;
}
// 单个低生命目标确保一次命中就进入正式死亡结算。
function enemy(g,x=1050,y=700){const e=g.spawnEnemy(0,0,{x,y});e.hp=1;return e;}
// 固定直线发射消除散布随机性，仍保留正式弹道、碰撞与伤害。
function shot(g,w){fireBallistics(g,{...w,spread:0}, {x:930,y:692},{x:1,y:0},1e5,false,true);}

test('旧档保留总数但不捏造装备明细，新档与坏值、重复读档安全',()=>{
 const p=freshProgress();assert.equal(p.statistics.equipment.partial,false);
 delete p.statistics.equipment;p.statistics.kills=37;p.statistics.trees=12;
 const loaded=validateProgress(p);assert.equal(loaded.statistics.kills,37);assert.equal(loaded.statistics.equipment.partial,true);
 assert.deepEqual(loaded.statistics.equipment.weapons,{});assert.deepEqual(validateProgress(loaded).statistics,loaded.statistics);
 const s=validateGameStatistics({version:1,equipment:{version:1,weapons:{pistol:{kills:2.8,trees:-3},bad_key:{kills:99}},vehicles:{'heavy-tank':{kills:Infinity,trees:1e25}}}});
 assert.deepEqual(s.equipment.weapons,{pistol:{kills:2,trees:0}});assert.equal(s.equipment.vehicles['heavy-tank'].trees,Number.MAX_SAFE_INTEGER);
});

test('子弹在切枪后杀怪仍归发射武器，重复死亡和无来源命中不冒领',()=>{
 const g=scene(),e=enemy(g);shot(g,g.weapon());g.progress.weapon=1;updateBallistics(g,.4);g.hit(e,1e9);
 assert.deepEqual(g.progress.statistics.equipment.weapons.pistol,{kills:1,trees:0});assert.equal(g.progress.statistics.kills,1);
 g.hit(enemy(g),1e9);assert.equal(g.progress.statistics.kills,2);assert.equal(g.progress.statistics.equipment.weapons.pistol.kills,1);
 const dummy=enemy(g);dummy.workshopTarget=true;shot(g,g.weapon(0));updateBallistics(g,.4);assert.equal(g.progress.statistics.kills,2);
 assert.deepEqual(validateProgress(g.progress).statistics,g.progress.statistics);
});

test('伐木只在树倒时入账，非致命攻击和试射不改变装备战绩',()=>{
 const g=scene();g.addTree(1020,700);shot(g,g.weapon());updateBallistics(g,.4);
 assert.deepEqual(g.progress.statistics.equipment.weapons.pistol,{kills:0,trees:1});
 g.workshopTrial=true;enemy(g);shot(g,g.weapon());updateBallistics(g,.4);assert.equal(g.progress.statistics.equipment.weapons.pistol.kills,0);
});

test('车载正式发射快照车型及主炮，下车换车后命中仍归原车',()=>{
 const g=scene();g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;grantVehicleArmament(g.progress,0);g.vehicle=createVehicle(g.progress,g.maxHp(),0);g.vehicle.active=true;
 enemy(g);updateVehicle(g,.05);assert.ok(g.projectiles.length>0);
 g.vehicle=createVehicle({...g.progress,vehicleHulls:[1,1,0,0,0,1]},g.maxHp(),1);g.vehicle.active=false;
 updateBallistics(g,.4);assert.deepEqual(g.progress.statistics.equipment.vehicles['pine-tank'],{kills:1,trees:0});
 assert.equal(g.progress.statistics.equipment.weapons['vehicle-machinegun'].kills,1);assert.equal(g.progress.statistics.equipment.vehicles['heavy-tank'],undefined);
 assert.equal(g.progress.statistics.kills,1);
});

test('电动车手持攻击计入两种维度，普通手持及友军不误计车型',()=>{
 const g=scene();g.vehicle.index=5;g.vehicle.active=true;enemy(g);shot(g,g.weapon());g.vehicle.active=false;updateBallistics(g,.4);
 assert.equal(g.progress.statistics.equipment.vehicles['ranger-scooter'].kills,1);assert.equal(g.progress.statistics.equipment.weapons.pistol.kills,1);
 g.statisticsExcluded=true;enemy(g);shot(g,g.weapon());updateBallistics(g,.4);assert.equal(g.progress.statistics.equipment.weapons.pistol.kills,1);
 assert.deepEqual(statisticsSource({vehicle:{active:true,index:0}},g.weapon()),{weapon:'pistol',vehicle:undefined});
});

test('机械猫和浮游炮挂枪归核心，车载召唤物带车型，支架代理不冒认车体',()=>{
 const g=scene();g.progress.vehicleHulls[0]=1;g.progress.vehicleWeapons[15]=1;g.progress.vehicleLoadouts[0]=15;
 g.vehicle=createVehicle(g.progress,g.maxHp(),0);g.vehicle.active=true;const local=vehicleCompanionContext(g);assert.ok(local);
 enemy(g);shot(local,{...g.weapon(),masteryOwnerIndex:15});g.vehicle.active=false;updateBallistics(g,.4);
 assert.equal(g.progress.statistics.equipment.weapons[WEAPONS[15].id].kills,1);assert.equal(g.progress.statistics.equipment.vehicles['pine-tank'].kills,1);
 assert.equal(g.progress.statistics.equipment.weapons.pistol,undefined);
 for(const index of [13,14,15,16])assert.equal(statisticsSource(g,{...g.weapon(),masteryOwnerIndex:index}).weapon,WEAPONS[index].id);
 local.statisticsVehicleIndex=null;assert.equal(statisticsSource(local,g.weapon()).vehicle,undefined);
});

test('榴弹爆炸、激光与电锯沿用实际来源，树木与怪物分别计数',()=>{
 const g=scene(),e=enemy(g);const w={...g.weapon(),masteryOwnerIndex:15,grenade:{speed:300,damage:1,radius:100,impulse:10}};
 launchGrenade(g,w,{x:930,y:692},e,1e5);const grenade=g.projectiles[0];grenade.x=e.x;grenade.y=e.y-8;
 g.progress.weapon=1;explodeGrenade(g,grenade);explodeGrenade(g,grenade);assert.equal(g.progress.statistics.equipment.weapons[WEAPONS[15].id].kills,1);
 g.projectiles=[];enemy(g);shot(g,{...effectiveWeapon(g.progress,1),chain:1});assert.equal(g.progress.statistics.equipment.weapons.laser.kills,1);
 g.enemies=[];g.addTree(960,700);const index=WEAPONS.findIndex(w=>w.attackKind==='melee');
 emitWeaponAttack(g,effectiveWeapon(g.progress,index),{x:940,y:692},{x:1,y:0},1e5,false,true);
 assert.equal(g.progress.statistics.equipment.weapons[WEAPONS[index].id].trees,1);
});

test('潮汐第二发存档快照保留原车型，小蜘蛛死亡爆炸归蜘蛛核心',()=>{
 const g=scene();g.progress.vehicleHulls[3]=1;g.progress.vehicleIndex=3;grantVehicleArmament(g.progress,3);g.vehicle=createVehicle(g.progress,g.maxHp(),3);g.vehicle.active=true;
 enemy(g,1040,705);updateVehicle(g,.01);const m=g.vehicle.module.magazine;
 assert.ok(m.tide.pending);m.tide=validateTideState(JSON.parse(JSON.stringify(m.tide)));
 g.vehicle.active=false;g.projectiles=[];advanceTidePair(g,m,.2,{x:940,y:697},{x:1,y:0});
 assert.equal(g.projectiles[0].statisticsSource.vehicle,'hovercraft');updateBallistics(g,.4);
 assert.equal(g.progress.statistics.equipment.weapons['hover-tide'].kills,1);
 const e=enemy(g,960,700);g.progress.weapon=16;g.progress.weapons[16]=1;
 explodeSpiderling(g,{x:e.x,y:e.y,spider:true});assert.equal(g.progress.statistics.equipment.weapons[WEAPONS[16].id].kills,1);
});

test('各车型稳定编号分别累计，旧总数和保存往返保持一致',()=>{
 const p=freshProgress();for(const v of COLLECTED_VEHICLES){recordDefeat(p,'tree',{vehicle:v.id});recordDefeat(p,'enemy',{vehicle:v.id});}
 assert.equal(p.statistics.kills,COLLECTED_VEHICLES.length);assert.equal(p.statistics.trees,COLLECTED_VEHICLES.length);
 for(const v of COLLECTED_VEHICLES)assert.deepEqual(p.statistics.equipment.vehicles[v.id],{kills:1,trees:1});
 assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(p))).statistics,p.statistics);
});

test('新引力枪与旧车炮同编号仍按稳定 ID 区分，红狼范围伤害继承弹丸归属',()=>{
 const g=scene();g.progress.weapons[17]=1;enemy(g);shot(g,g.weapon(17));updateBallistics(g,.4);
 assert.equal(g.progress.statistics.equipment.weapons['gravity-gun'].kills,1);assert.equal(g.progress.statistics.equipment.weapons['vehicle-machinegun'],undefined);
 const target=enemy(g,960,700);target.arena={terrain:'arena'};
 const bullet={x:target.x,y:target.y-8,amount:1e5,blastRatio:.65,blastRadius:120,impulse:1500,weaponIndex:21,statisticsSource:{weapon:'wolf-256',vehicle:'red-wolf'}};
 explodeHeavyShell(g,bullet,null);explodeHeavyShell(g,bullet,null);
 assert.equal(g.progress.statistics.equipment.weapons['wolf-256'].kills,1);assert.equal(g.progress.statistics.equipment.vehicles['red-wolf'].kills,1);
});
