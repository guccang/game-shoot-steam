import {PEN_GATE} from '../src/config/pasture.js';
import {tendPasture} from '../src/core/farm-production.js';
import {advanceVehicleWheels} from '../src/combat/vehicle-motion.js';
import {creditOre} from '../src/core/mine-transactions.js';
// 升阶使用正式交易入口，覆盖两条路线、旧档与存储失败。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {ERA_VEHICLES,eraDonor} from '../src/config/vehicle-eras.js';
import {vehicleLoad} from '../src/progression/load-weight.js';
import {equipmentRecipe} from '../src/progression/equipment-goals.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 旧档没有金属、马匹或新车槽位，已有停车与驾驶选择必须正常恢复。
function scene(){
 const raw=freshProgress();raw.arrival={version:3,phase:'complete',keys:true};
 raw.vehicleHulls=raw.vehicleHulls.slice(0,11);raw.vehicleIndex=5;raw.materials={parts:500,core:50,crystal:100};
 raw.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);raw.wood=1000;
 const g=new Game(validateProgress(raw));g.state='playing';g.livingPersist=()=>true;
 return g;
}
test('两条路线逐代打造，货物、车位、载荷、耐久与当前车都可恢复',()=>{
 const g=scene();assert.equal(g.progress.materials.iron,0);assert.equal(g.vehicles.length,23);
 Object.assign(g.progress.materials,{copper:300,iron:300,rareMetal:100,draftHorse:1});
 for(const model of ERA_VEHICLES){
  const old=eraDonor(model),prior=g.progress.campParking.owned.find(r=>r.hull===old?.index);
  if(old){g.progress.logistics.builds[old.index].wood=2;g.progress.vehicleIndex=old.index;g.vehicle=g.vehicles[old.index];g.vehicle.hp=g.vehicle.maxHp*.6;}
  const price=equipmentRecipe('vehicle',model.index,g.progress),wood=g.progress.wood;
  assert.equal(g.buyVehicle(model.index),true,model.name);assert.equal(g.progress.wood,wood-price.wood);
  assert.equal(vehicleLoad(g,model.index).capacity,model.payload);
  const parked=g.progress.campParking.owned.find(r=>r.hull===model.index);assert.ok(parked);
  if(old){assert.equal(parked.spot,prior.spot);assert.equal(g.progress.vehicleHulls[old.index],0);
   assert.equal(g.progress.logistics.builds[model.index].wood,2);assert.equal(g.vehicle.index,model.index);
   assert.ok(Math.abs(g.vehicle.hp/g.vehicle.maxHp-.6)<1e-9);}
  assert.equal(g.buyVehicle(model.index),false);assert.equal(validateProgress(g.progress).vehicleHulls[model.index],1);
 }
 assert.equal(g.progress.materials.draftHorse,0);
});
test('缺少原车、材料、停车或写盘失败不改变进度',()=>{
 const g=scene();assert.equal(g.buyVehicle(12),false);assert.equal(g.buyVehicle(11),true);
 let before=structuredClone(g.progress);assert.equal(g.buyVehicle(12),false);assert.deepEqual(g.progress,before);
 g.progress.materials.copper=8;g.livingPersist=()=>false;before=structuredClone(g.progress);
 assert.equal(g.buyVehicle(12),false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;g.vehicles[11].active=true;assert.equal(g.buyVehicle(12),false);assert.deepEqual(g.progress,before);
});

test('矿层分别产铜、铁与稀有金属，牧栏现场领马并随车交付',()=>{
 const g=scene();g.vehicle.active=false;
 for(const depth of [1,2,3,4])creditOre(g.progress,depth,5);
 assert.deepEqual(['copper','iron','rareMetal'].map(key=>g.progress.materials[key]),[5,5,10]);
 Object.assign(g.player,PEN_GATE);g.progress.coins=200;g.livingPersist=()=>false;
 assert.equal(tendPasture(g,'adopt-horse').ok,false);assert.equal(g.progress.coins,200);
 g.livingPersist=()=>true;assert.ok(tendPasture(g,'adopt-horse').ok);assert.equal(g.progress.coins,20);
 assert.equal(tendPasture(g,'adopt-horse').ok,false);g.progress.materials.copper=8;
 for(const i of [11,12,13])assert.ok(g.buyVehicle(i));
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
