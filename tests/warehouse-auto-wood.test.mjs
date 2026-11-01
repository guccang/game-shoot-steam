// 自动入库走正式库存事务与游戏时钟，验证守恒、失败、范围及动画目标。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {WORLD} from '../src/world/coordinates.js';
import {updateWarehouseWood,transferWarehouse} from '../src/core/warehouse.js';
import {resourcePickupPoses} from '../src/combat/resource-pickup.js';
import {updateCombatTraces} from '../src/combat/transient-effects.js';
import {movementLoadFactor} from '../src/progression/load-weight.js';

// 只准备场景和存档回调，存量、资格和飞行均使用正式实现。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(1);p.vehicleIndex=0;p.wood=0;p.logistics.bagWood=8;p.logistics.builds[0].wood=12;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999;g.enemies=[];g.trees=[];Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+105,vx:0,vy:0});g.progress.campParking.owned=g.vehicles.map(v=>({hull:v.index,spot:null,mapId:'forest',x:WAREHOUSE.x+(v.index?600:95),y:WAREHOUSE.y+80,hp:1,ammo:0}));const saved=[];g.livingPersist=p=>{saved.push(structuredClone(p));return true;};return {g,saved};}

test('进入附近后背包和近车整笔入库，只写一次，飞行结束不重复到账',()=>{const {g,saved}=scene();g.progress.supplies.hand.heavy=7;g.progress.farm.seeds[0]=3;updateWarehouseWood(g,.05);assert.equal(g.progress.wood,20);assert.equal(g.progress.logistics.bagWood,0);assert.equal(g.progress.logistics.builds[0].wood,0);assert.equal(g.progress.supplies.hand.heavy,7);assert.equal(g.progress.farm.seeds[0],3);assert.equal(saved.length,1);assert.equal(g.drops.filter(d=>d.warehouseWood).length,2);for(let i=0;i<25;i++){updateWarehouseWood(g,.05);updateCombatTraces(g,.05);}assert.equal(g.progress.wood,20);assert.equal(saved.length,1);assert.equal(g.drops.length,0);assert.equal(new Game(saved[0]).progress.wood,20);});

test('驾驶与超载均可卸木减重，远车、跨图及救援维修车保持原库存',()=>{const {g}=scene();g.vehicle.active=true;g.progress.logistics.bagWood=200;g.progress.logistics.builds[g.vehicle.index].wood=10000;assert.equal(movementLoadFactor(g),0);for(const i of [1,2,3,4])g.progress.logistics.builds[i].wood=17;g.progress.campParking.owned[2].mapId='jiuzhaigou';for(const i of [3,4]){g.progress.campParking.owned[i].x=WAREHOUSE.x;g.progress.vehicleService[i]={phase:i===3?'towing':'repairing',mapId:'forest',position:{x:WAREHOUSE.x,y:WAREHOUSE.y+80},truck:{x:WAREHOUSE.x,y:WAREHOUSE.y+80}};}updateWarehouseWood(g,.05);assert.equal(g.progress.wood,10200);assert.ok(movementLoadFactor(g)>0);for(const i of [1,2,3,4])assert.equal(g.progress.logistics.builds[i].wood,17);});

test('离开仓库、屋内、跨地图、暂停、演出及死亡不自动入库',()=>{for(const mutate of [g=>g.player.x+=300,g=>g.cottage={kind:'cottage'},g=>g.mapId='jiuzhaigou',g=>g.state='paused',g=>g.progress.arrival.phase='handover',g=>g.mainlineSpeech={},g=>g.boss={},g=>g.realm={},g=>g.player.hp=0]){const {g,saved}=scene();mutate(g);updateWarehouseWood(g,.05);assert.equal(g.progress.wood,0);assert.equal(g.progress.logistics.bagWood,8);assert.equal(saved.length,0);assert.equal(g.drops.length,0);}});

test('保存失败无扣货无动画、重试限频，恢复保存后只入库一次',()=>{for(const throws of [false,true]){const {g,saved}=scene(),before=structuredClone(g.progress);let attempts=0;g.livingPersist=()=>{attempts++;if(throws)throw Error('磁盘失败');return false;};updateWarehouseWood(g,.05);for(let i=0;i<20;i++)updateWarehouseWood(g,.05);assert.equal(attempts,1);assert.deepEqual(g.progress,before);assert.equal(g.drops.length,0);assert.equal(g.numbers.length,1);g.livingPersist=p=>{saved.push(structuredClone(p));return true;};for(let i=0;i<50;i++)updateWarehouseWood(g,.05);assert.equal(g.progress.wood,20);assert.equal(saved.length,1);}});

test('仓库容量不足仅接收余量，满仓不反复保存或扣除剩余木头',()=>{const {g,saved}=scene();g.progress.wood=RESOURCE_CAP-10;updateWarehouseWood(g,.05);assert.equal(g.progress.wood,RESOURCE_CAP);assert.equal(g.progress.logistics.bagWood,0);assert.equal(g.progress.logistics.builds[0].wood,10);assert.equal(g.drops.reduce((n,d)=>n+d.wood,0),10);for(let i=0;i<50;i++)updateWarehouseWood(g,.05);assert.equal(saved.length,1);assert.equal(g.progress.logistics.builds[0].wood,10);});

test('手动取出木头本次停留保留，离开再回来自动收取，失败取出不屏蔽自动入库',()=>{const {g}=scene();updateWarehouseWood(g,.05);g.state='paused';assert.ok(transferWarehouse(g,'bag','material:wood',3,'withdraw').ok);assert.ok(transferWarehouse(g,0,'material:wood',4,'withdraw').ok);g.state='playing';for(let i=0;i<30;i++)updateWarehouseWood(g,.05);assert.equal(g.progress.logistics.bagWood,3);assert.equal(g.progress.logistics.builds[0].wood,4);g.player.x+=300;updateWarehouseWood(g,.05);g.player.x-=300;updateWarehouseWood(g,.05);assert.equal(g.progress.wood,20);assert.equal(g.progress.logistics.bagWood,0);g.livingPersist=()=>false;assert.equal(transferWarehouse(g,'bag','material:wood',3,'withdraw').ok,false);assert.deepEqual(g.warehouseAutoWood.held,[]);});

test('新手任务读取已存入木材并更新阶段；重建游戏清除临时停留状态',()=>{const {g}=scene();g.progress.arrival.phase='gather';g.progress.logistics.bagWood=200;updateWarehouseWood(g,.05);assert.equal(g.progress.arrival.phase,'repair');g.warehouseAutoWood.held=['bag'];g.reset();assert.equal(g.warehouseAutoWood,null);});

test('仓库飞行终点固定、循环世界镜像正确，原拾取仍飞向猫猫，暂停冻结',()=>{const {g}=scene();g.player.x+=WORLD.width;updateWarehouseWood(g,.05);const d=g.drops[0];assert.deepEqual(d.destination,{x:WAREHOUSE.x,y:WAREHOUSE.y-16});d.age=.2;const first=resourcePickupPoses([d],g.player);assert.ok(first.length>0);assert.ok(first.every(p=>Math.abs(p.x-g.player.x)<200));d.age=.32;const near=resourcePickupPoses([d],g.player);assert.ok(near.some(p=>p.y<first[0].y));const original={...d};delete original.destination;assert.notDeepEqual(resourcePickupPoses([original],g.player),near);const x=d.x;updateCombatTraces(g,.05);assert.ok(Math.abs(d.x-g.player.x)<200||d.x!==x);const age=d.age;g.state='paused';g.update(.05);assert.equal(d.age,age);});
