import {PEN_GATE} from '../src/config/pasture.js';
import {tendPasture} from '../src/core/farming/farm-production.js';
import {advanceVehicleWheels} from '../src/combat/vehicle-motion.js';
import {creditOre} from '../src/core/mining/mine-transactions.js';
// 精简运输车型使用正式交易入口，覆盖加工件、旧档与存储失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {ERA_VEHICLES} from '../src/config/vehicle-eras.js';
import {vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {equipmentRecipe} from '../src/progression/workshop/equipment-goals.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 旧档没有金属、马匹或新车槽位，已有停车与驾驶选择必须正常恢复。
function scene(){
 const raw=freshProgress();raw.arrival={version:3,phase:'complete',keys:true};
 raw.vehicleHulls=raw.vehicleHulls.slice(0,11);raw.vehicleIndex=5;raw.materials={parts:500,core:50,crystal:100};
 raw.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);raw.wood=1000;
 const g=new Game(validateProgress(raw));g.state='playing';g.livingPersist=()=>true;
 return g;
}
test('只打造木制自行车与木马车，停车、载荷与旧档使用同一槽位',()=>{
 const g=scene();Object.assign(g.progress.materials,{copperVehicle:2,draftHorse:1});
 for(const model of ERA_VEHICLES.filter(v=>!v.retired)){
  const price=equipmentRecipe('vehicle',model.index,g.progress),wood=g.progress.wood;
  assert.ok(g.buyVehicle(model.index),model.name);assert.equal(g.progress.wood,wood-price.wood);
  assert.equal(vehicleLoad(g,model.index).capacity,model.payload);assert.ok(g.progress.campParking.owned.some(r=>r.hull===model.index));
  assert.equal(g.buyVehicle(model.index),false);assert.equal(validateProgress(g.progress).vehicleHulls[model.index],1);
 }
 assert.equal(g.progress.materials.copperVehicle,0);assert.equal(g.progress.materials.draftHorse,0);
 for(const old of ERA_VEHICLES.filter(v=>v.retired))assert.equal(g.buyVehicle(old.index),false);
});
test('马车缺少加工件或写盘失败不改变进度，自行车可作为运输起步',()=>{
 const g=scene();assert.ok(g.buyVehicle(19));g.progress.materials.draftHorse=1;
 let before=structuredClone(g.progress);assert.equal(g.buyVehicle(13),false);assert.deepEqual(g.progress,before);
 g.progress.materials.copperVehicle=2;g.livingPersist=()=>false;before=structuredClone(g.progress);
 assert.equal(g.buyVehicle(13),false);assert.deepEqual(g.progress,before);
});

test('四种矿物分别入库，牧栏现场领马并随车交付',()=>{
 const g=scene();g.vehicle.active=false;
 for(const key of ['stone','copper','iron','rareMetal'])creditOre(g.progress,key,5);
 assert.equal(g.progress.mining.ore,5);assert.deepEqual(['copper','iron','rareMetal'].map(key=>g.progress.industry.raw[key]),[5,5,5]);
 Object.assign(g.player,PEN_GATE);g.progress.coins=200;g.livingPersist=()=>false;
 assert.equal(tendPasture(g,'adopt-horse').ok,false);assert.equal(g.progress.coins,200);
 g.livingPersist=()=>true;assert.ok(tendPasture(g,'adopt-horse').ok);assert.equal(g.progress.coins,20);
 assert.equal(tendPasture(g,'adopt-horse').ok,false);g.progress.materials.copperVehicle=2;
 assert.ok(g.buyVehicle(13));
 assert.equal(g.progress.materials.draftHorse,0);
});
test('牵引马行走和停车衔接同源连续帧，停车仍呼吸，暂停保持姿势',()=>{
 const v={index:13,active:true},pos={x:100,y:100};
 const frames=new Set();
 for(let i=0;i<14;i++){
  const before={...pos};pos.y+=7;
  advanceVehicleWheels(v,pos,before,.05);frames.add(v.horseFrame);
 }
 assert.equal(v.horseMode,'walk');assert.ok(frames.size>6);
 const wheel=v.wheelPhase;frames.clear();
 for(let i=0;i<30;i++){advanceVehicleWheels(v,pos,pos,.05);frames.add(v.horseFrame);}
 assert.equal(v.horseMode,'idle');assert.ok(frames.size>2);assert.equal(v.wheelPhase,wheel);
 const frame=v.horseFrame;advanceVehicleWheels(v,pos,pos,0);assert.equal(v.horseFrame,frame);
});
