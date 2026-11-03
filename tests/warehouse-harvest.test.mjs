// 仓库结算使用真实物品售价、来源和存档事务，飞行只验证表现而不代替到账。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {WORLD} from '../src/world/coordinates.js';
import {updateWarehouseHarvest} from '../src/core/warehouse-harvest.js';
import {warehouseRows,transferWarehouse,updateWarehouseWood} from '../src/core/warehouse.js';
import {catLoad,vehicleLoad} from '../src/progression/load-weight.js';
import {resourcePickupPoses} from '../src/combat/resource-pickup.js';
import {updateCombatTraces} from '../src/combat/transient-effects.js';
import {sellCrops} from '../src/core/cargo.js';
import {FARM_SEED_DOOR} from '../src/config/farm.js';
import {farmAction} from '../src/core/farm.js';

// 只准备仓库附近的真实来源，保存回调捕获可用于重建游戏的正式进度。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(1);p.vehicleIndex=0;p.coins=100;p.farm.inventory[0]=3;p.farm.inventory[1]=2;p.logistics.builds[0].cargo[3]=4;p.logistics.builds[1].cargo[0]=7;
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999;g.enemies=[];g.trees=[];
 Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+105,vx:0,vy:0});
 g.progress.campParking.owned=g.vehicles.map(v=>({hull:v.index,spot:null,mapId:'forest',x:WAREHOUSE.x+(v.index?600:95),y:WAREHOUSE.y+80,hp:1,ammo:0}));
 const saved=[];g.livingPersist=p=>{saved.push(structuredClone(p));return true;};return {g,saved};
}
const total=3*FARM_CROPS[0].value+2*FARM_CROPS[1].value+4*FARM_CROPS[3].value;

test('正式收割先进入背包，回到仓库才兑换金币并保留收获统计',()=>{
 const {g}=scene();g.progress.farm.inventory.fill(0);g.progress.logistics.builds.forEach(b=>b.cargo.fill(0));g.vehicles=[];g.player.x+=400;
 g.progress.farm.plots=[{id:0,x:g.player.x,y:g.player.y,mapId:'forest',crop:1,plantedAt:1,readyAt:2,watered:false}];g.progress.farm.nextId=1;
 const harvested=g.progress.farm.harvested;assert.equal(farmAction(g,'harvest',{plot:0,now:1000}).ok,true);assert.equal(g.progress.coins,100);assert.equal(g.progress.farm.inventory[1],1);updateWarehouseHarvest(g,.05);assert.equal(g.progress.coins,100);
 g.player.x-=400;g.update(.05);assert.equal(g.progress.coins,100+FARM_CROPS[1].value);assert.equal(g.progress.farm.inventory[1],0);assert.equal(g.progress.farm.harvested,harvested+1);
});

test('背包和仓库旁车辆的收获物按现价一次兑换，负重降低而种子保留',()=>{
 const {g,saved}=scene();g.progress.farm.seeds[0]=8;const bag=catLoad(g).weight,car=vehicleLoad(g,0,{driver:false}).payload;
 updateWarehouseHarvest(g,.05);assert.equal(g.progress.coins,100+total);assert.equal(g.progress.farm.inventory[0],0);assert.equal(g.progress.farm.inventory[1],0);assert.equal(g.progress.logistics.builds[0].cargo[3],0);assert.equal(g.progress.logistics.builds[1].cargo[0],7);assert.equal(g.progress.farm.seeds[0],8);
 assert.ok(catLoad(g).weight<bag);assert.ok(vehicleLoad(g,0,{driver:false}).payload<car);assert.equal(saved.length,1);assert.equal(g.progress.economyLog.income['farm:sale:coins'],total);
 assert.equal(g.drops.length,3);for(let i=0;i<25;i++){updateWarehouseHarvest(g,.05);updateCombatTraces(g,.05);}assert.equal(saved.length,1);assert.equal(g.progress.coins,100+total);assert.equal(g.drops.length,0);
 const loaded=new Game(saved[0]);assert.equal(loaded.progress.coins,100+total);assert.equal(loaded.progress.farm.inventory[0],0);
});
test('远处、跨图、室内、演出、战斗与暂停均不自动出售',()=>{
 for(const change of [g=>g.player.x+=300,g=>g.mapId='jiuzhaigou',g=>g.cottage={kind:'cottage'},g=>g.state='paused',g=>g.mainlineSpeech={},g=>g.boss={},g=>g.realm={},g=>g.player.hp=0,g=>g.progress.arrival.phase='handover']){const {g,saved}=scene();change(g);updateWarehouseHarvest(g,.05);assert.equal(saved.length,0);assert.equal(g.progress.coins,100);assert.equal(g.progress.farm.inventory[0],3);assert.equal(g.drops.length,0);}
});
test('驾驶超载能交货；跨地图或救援维修中的车辆不远程售货',()=>{
 const {g}=scene();g.vehicle.active=true;g.progress.logistics.builds[0].cargo[3]=10000;assert.equal(vehicleLoad(g,0).overloaded,true);
 for(const i of [1,2,3]){g.progress.logistics.builds[i].cargo[0]=7;g.progress.campParking.owned[i].x=WAREHOUSE.x;}
 g.progress.campParking.owned[1].mapId='jiuzhaigou';for(const i of [2,3])g.progress.vehicleService[i]={phase:i===2?'towing':'repairing',mapId:'forest',position:{x:WAREHOUSE.x,y:WAREHOUSE.y+80},truck:{x:WAREHOUSE.x,y:WAREHOUSE.y+80}};
 updateWarehouseHarvest(g,.05);assert.equal(g.progress.logistics.builds[0].cargo[3],0);assert.equal(vehicleLoad(g,0).overloaded,false);for(const i of [1,2,3])assert.equal(g.progress.logistics.builds[i].cargo[0],7);
});
test('金币接近上限时只卖完整份数，余额满后不吞掉余货或反复保存',()=>{
 const {g,saved}=scene();g.progress.coins=RESOURCE_CAP-65;updateWarehouseHarvest(g,.05);assert.equal(g.progress.coins,RESOURCE_CAP-5);assert.equal(g.progress.farm.inventory[0],1);assert.equal(g.progress.farm.inventory[1],2);assert.equal(g.progress.logistics.builds[0].cargo[3],4);
 for(let i=0;i<100;i++)updateWarehouseHarvest(g,.05);assert.equal(saved.length,1);assert.equal(g.progress.farm.inventory[0],1);g.progress.coins-=30;for(let i=0;i<45;i++)updateWarehouseHarvest(g,.05);assert.equal(g.progress.farm.inventory[0],0);assert.equal(g.progress.coins,RESOURCE_CAP-5);
});
test('保存失败或抛错保持作物、金币和账本，限频重试后只入账一次',()=>{
 for(const throwing of [true,false]){const {g,saved}=scene(),before=structuredClone(g.progress);let attempts=0;g.livingPersist=()=>{attempts++;if(throwing)throw Error('写盘失败');return false;};for(let i=0;i<20;i++)updateWarehouseHarvest(g,.05);assert.equal(attempts,1);assert.deepEqual(g.progress,before);assert.equal(g.drops.length,0);assert.equal(g.numbers.length,1);
  g.livingPersist=p=>{saved.push(structuredClone(p));return true;};for(let i=0;i<50;i++)updateWarehouseHarvest(g,.05);assert.equal(saved.length,1);assert.equal(g.progress.coins,100+total);
 }
});
test('木材仍原样入库，手动售卖与自动结算不会重复出售',()=>{
 const {g}=scene();g.progress.logistics.bagWood=8;const wood=g.progress.wood;updateWarehouseWood(g,.05);updateWarehouseHarvest(g,.05);assert.equal(g.progress.wood,wood+8);assert.equal(g.progress.coins,100+total);
 Object.assign(g.player,FARM_SEED_DOOR);g.progress.logistics.builds[1].cargo[0]=0;assert.equal(sellCrops(g).ok,false);g.progress.farm.inventory[0]=1;assert.equal(sellCrops(g).ok,true);Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+105});updateWarehouseHarvest(g,.05);assert.equal(g.progress.coins,100+total+FARM_CROPS[0].value);
});
test('金币物品格实时读取钱包，零余额也有条目，禁止重复存取并且不增加负重',()=>{
 const {g}=scene();const weight=catLoad(g).weight,coin=()=>warehouseRows(g).find(r=>r.id==='currency:coins');assert.equal(coin().stored,100);assert.equal(coin().carried,0);assert.equal(coin().mass,0);assert.equal(coin().readonly,true);
 assert.equal(transferWarehouse(g,'bag','currency:coins',1,'withdraw').ok,false);g.progress.coins=0;assert.equal(coin().stored,0);g.progress.coins=900;assert.equal(warehouseRows(g,0).find(r=>r.id==='currency:coins').stored,900);assert.equal(catLoad(g).weight,weight);
});
test('飞行保留真实作物、门口终点及循环世界镜像，暂停不会推进或重复加币',()=>{
 const {g}=scene();g.player.x+=WORLD.width;updateWarehouseHarvest(g,.05);const d=g.drops[0];assert.deepEqual(d.destination,{x:WAREHOUSE.x,y:WAREHOUSE.y-16});d.age=.2;const poses=resourcePickupPoses([d],g.player);assert.ok(poses.length);assert.ok(poses.every(p=>p.kind==='crop'&&p.crop===0&&Math.abs(p.x-g.player.x)<200));assert.equal(resourcePickupPoses([d],g.player,true).length,1);
 g.state='paused';g.update(.05);assert.equal(d.age,.2);assert.equal(g.progress.coins,100+total);g.reset();assert.equal(g.warehouseAutoHarvest,null);
});
