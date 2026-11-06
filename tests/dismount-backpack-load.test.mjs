// 下车满载回归：猫猫可负重缓行，物品和弹药守恒，载具超载仍停驶。
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {LOAD_RULES} from '../src/config/vehicle-load.js';
import {catLoad,vehicleLoad,movementLoadFactor} from '../src/progression/load-weight.js';
import {summonVehicle,dismountVehicle} from '../src/combat/vehicle.js';
import {syncSupplyAmmo} from '../src/combat/supply-ammo.js';
import {interiorLayout} from '../src/config/workshop-interiors.js';

// 真实巡游状态，清空干扰物，仅停用额外刷怪和主线对白。
function scene(hull=5){const p=freshProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[hull]=1;p.vehicleIndex=hull;p.logistics.bagWood=300;const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.mainlineTalkDelay=g.fireClock=999999;g.updateWaves=()=>{};g.trees=[];g.enemies=[];g.boss=null;Object.assign(g.player,{x:893,y:2814,vx:0,vy:0});return g;}
// 经过正式帧更新验证实际位移，而不只检查倍率配置。
function walk(g){const x=g.player.x;for(let i=0;i<10;i++)g.update(.05,{x:1,y:0});return Math.abs(g.player.x-x);}

test('猫猫带木头登上接近满载的电动车，可以正常开走，下车后两份库存各归原处',()=>{
 const g=scene(),bag=g.progress.logistics,car=bag.builds[5];
 bag.bagWood=20;
 const parked=vehicleLoad(g);
 car.wood=Math.floor((parked.capacity-parked.payload-1)/WOOD_ITEM.mass);
 const cargoWood=car.wood,load=vehicleLoad(g);
 assert.equal(catLoad(g).overloaded,false);
 assert.equal(load.overloaded,false);
 assert.ok(load.payload+catLoad(g).weight>=load.capacity);
 assert.ok(summonVehicle(g));
 assert.equal(vehicleLoad(g).payload,load.payload);
 assert.equal(movementLoadFactor(g),1);
 assert.ok(walk(g)>1);
 assert.ok(dismountVehicle(g));
 assert.equal(g.progress.logistics.bagWood,20);
 assert.equal(g.progress.logistics.builds[5].wood,cargoWood);
});

for(const hull of [0,5,6])test(`车型${hull}下车后背包满载仍能行走，不清空背包或货舱`,()=>{
 const g=scene(hull);assert.ok(summonVehicle(g));assert.ok(catLoad(g).overloaded);assert.equal(vehicleLoad(g).overloaded,false);assert.ok(dismountVehicle(g));
 const wood=g.progress.logistics.bagWood,stock=structuredClone(g.progress.supplies.vehicles[hull]);assert.ok(movementLoadFactor(g)>0&&movementLoadFactor(g)<1);assert.ok(walk(g)>1);assert.equal(g.progress.logistics.bagWood,wood);assert.deepEqual(g.progress.supplies.vehicles[hull],stock);
 g.progress.logistics.bagWood=0;assert.equal(movementLoadFactor(g),1);
});
test('载具与背包同时超载，车不能行驶但下车仍可走到仓库',()=>{
 const g=scene();g.progress.logistics.builds[5].wood=10000;assert.ok(summonVehicle(g));assert.equal(movementLoadFactor(g),0);assert.equal(walk(g),0);assert.ok(dismountVehicle(g));assert.ok(walk(g)>1);assert.equal(g.progress.logistics.builds[5].wood,10000);
});
test('电动车扩容余弹下车后守恒，缓行不消耗弹药，保存重建仍可移动',()=>{
 const g=scene();assert.ok(summonVehicle(g));g.magazines[0].ammo=g.weapon(0).magazineSize;const total=g.progress.supplies.hand.light+g.magazines[0].ammo,weight=catLoad(g).weight;
 assert.ok(dismountVehicle(g));assert.equal(g.progress.supplies.hand.light+g.magazines[0].ammo,total);assert.ok(Math.abs(catLoad(g).weight-weight)<1e-6);assert.ok(walk(g)>1);
 syncSupplyAmmo(g);const restored=new Game(structuredClone(g.progress));assert.ok(movementLoadFactor(restored)>0);assert.equal(restored.progress.supplies.hand.light+restored.magazines[0].ammo,total);
});
test('室内满载也可缓行，暂停不走动，满载边界使用同一倍率',()=>{
 const g=scene(),layout=interiorLayout({kind:'ammo'});g.cottage={kind:'ammo',outside:{x:893,y:2814}};Object.assign(g.player,layout.spawn);assert.ok(walk(g)>1);g.state='paused';assert.equal(walk(g),0);
 const capacity=LOAD_RULES.catCapacity;try{g.state='playing';LOAD_RULES.catCapacity=catLoad(g).weight;assert.ok(catLoad(g).overloaded);assert.ok(movementLoadFactor(g)>0&&movementLoadFactor(g)<1);}finally{LOAD_RULES.catCapacity=capacity;}
});
