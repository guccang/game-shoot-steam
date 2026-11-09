// 隔离进度检验双向移物守恒、载荷边界、存档往返和失败原子性。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {transferInventoryItem as move,transferQuantity as count,vehicleCargoEntries,previewInventoryTransfer,transferVehicles} from '../src/core/inventory/inventory-transfer.js';
import {catLoad,vehicleLoad} from '../src/progression/inventory/load-weight.js';
import {CARGO_GOODS,shopSlot} from '../src/progression/economy/shop-stock.js';
import {industryStore} from '../src/progression/industry/industry.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';

// 普通巡林，马车实际停在玩家身旁，库存轻载且不改用户本地存档。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls.fill(0);p.vehicleHulls[13]=1;p.vehicleIndex=13;p.supplies.hand.light=0;const g=new Game(p,()=>.5);g.state='paused';g.mainlineSpeech=null;g.vehicle.active=false;g.livingPersist=()=>true;g.magazines.forEach(m=>m.ammo=0);Object.assign(g.player,{x:900,y:800});g.progress.campParking.owned=[{hull:13,spot:null,mapId:'forest',x:940,y:800,hp:1,ammo:0}];return g;}

test('矿石别名、工业制品、木头、作物双向转移后数量和重量守恒',()=>{
 for(const [id,key,carId] of [['ore:stone','rawStone','industry:rawStone'],['ore:copper','rawCopper','industry:rawCopper'],['ore:iron','rawIron','industry:rawIron'],['ore:rareMetal','rawRare','industry:rawRare'],['industry:iron','iron','industry:iron'],['industry:rawStone','rawStone','industry:rawStone'],['material:wood','wood','material:wood'],['crop:0',null,'crop:0']]){
  const g=scene();if(key){const [s,k]=industryStore(g.progress,key,'bag',true);s[k]=4;}else g.progress.farm.inventory[0]=4;
  const total=catLoad(g).weight+vehicleLoad(g,13).payload,before=JSON.stringify(g.progress);assert.ok(previewInventoryTransfer(g,id,13,2,'load').ok,id);assert.equal(JSON.stringify(g.progress),before);
  assert.ok(move(g,id,13,2,'load').ok,id);assert.equal(count(g,id),2);assert.equal(count(g,carId,13),2);assert.ok(Math.abs(catLoad(g).weight+vehicleLoad(g,13).payload-total)<1e-6);
  g.progress=validateProgress(structuredClone(g.progress));assert.ok(move(g,carId,13,2,'unload').ok,id);assert.equal(count(g,id),4);assert.equal(count(g,carId,13),0);
 }
});

test('种子补给鱼获牧草及野外装备沿用真实字段，重载不丢货或复制',()=>{
 const ids=['seed:0','supply:medkit','ammo:light','material:sweet-grass','outdoor:rod','outdoor:bait','metal-detector',Object.keys(CARGO_GOODS).find(id=>id.startsWith('fish:'))];
 for(const id of ids){const g=scene(),item=CARGO_GOODS[id],[s,k]=shopSlot(g.progress,item,'bag');s[k]=item.cap===1?true:3;const n=item.cap===1?1:2,total=catLoad(g).weight+vehicleLoad(g,13).payload;
  assert.ok(move(g,id,13,n,'load').ok,id);assert.equal(count(g,id,13),n);assert.ok(vehicleCargoEntries(g,13).some(r=>r.id===id&&r.count===n));assert.ok(Math.abs(catLoad(g).weight+vehicleLoad(g,13).payload-total)<1e-6,id);
  g.progress=validateProgress(structuredClone(g.progress));assert.equal(count(g,id,13),n);assert.ok(move(g,id,13,n,'unload').ok,id);assert.equal(count(g,id),item.cap===1?1:3);
 }
});

test('帐篷沿用位置字段，部署后不能移动，购买货格也能取回',()=>{
 const g=scene();g.progress.outdoors.tent=true;assert.ok(move(g,'outdoor:tent',13,1,'load').ok);assert.equal(g.progress.outdoors.tentHull,13);assert.equal(count(g,'outdoor:tent'),0);g.progress=validateProgress(g.progress);assert.ok(move(g,'outdoor:tent',13,1,'unload').ok);assert.equal(g.progress.outdoors.tentHull,null);
 g.progress.outdoors.camp={mapId:'forest',mode:'tent',x:900,y:800,kit:true};assert.equal(move(g,'outdoor:tent',13,1,'load').ok,false);
 g.progress.outdoors.camp=null;g.progress.outdoors.tent=false;g.progress.shopStock[13]={'outdoor:tent':1};assert.ok(move(g,'outdoor:tent',13,1,'unload').ok);assert.equal(count(g,'outdoor:tent'),1);assert.equal(count(g,'outdoor:tent',13),0);
});

test('枪械等级和已装填弹匣随枪保存，当前装备受保护',()=>{
 const g=scene();g.progress.weapons[1]=3;g.magazines[1].ammo=7;const total=catLoad(g).weight+vehicleLoad(g,13).payload;
 assert.ok(move(g,'weapon:1',13,1,'load').ok);assert.equal(g.progress.weapons[1],3);assert.equal(g.progress.supplies.handMags[1].ammo,7);assert.equal(g.magazines[1].ammo,7);assert.ok(Math.abs(catLoad(g).weight+vehicleLoad(g,13).payload-total)<1e-6);
 g.progress=validateProgress(g.progress);assert.equal(count(g,'weapon:1'),0);assert.ok(move(g,'weapon:1',13,1,'unload').ok);assert.equal(g.magazines[1].ammo,7);assert.equal(move(g,'weapon:'+g.progress.weapon,13,1,'load').ok,false);
 g.progress.supplies.hand.light=2;assert.equal(move(g,'ammo:light',13,3,'load').ok,false);assert.ok(move(g,'ammo:light',13,2,'load').ok);assert.equal(g.magazines[1].ammo,7);
});

test('目标超重、非法数量、距离变化与保存失败完全回滚，超载来源可减负',()=>{
 const g=scene();g.progress.logistics.bagWood=500;let before=JSON.stringify(g.progress);g.livingPersist=()=>false;assert.equal(move(g,'material:wood',13,10,'load').ok,false);assert.equal(JSON.stringify(g.progress),before);g.livingPersist=()=>{throw Error('磁盘失败');};assert.equal(move(g,'material:wood',13,10,'load').ok,false);assert.equal(JSON.stringify(g.progress),before);g.livingPersist=()=>true;
 for(const n of [0,-1,.5,NaN,Infinity,1000])assert.equal(move(g,'material:wood',13,n,'load').ok,false);
 assert.ok(move(g,'material:wood',13,10,'load').ok);assert.equal(move(g,'material:wood',13,1,'unload').ok,false);g.progress.logistics.bagWood=0;g.progress.logistics.builds[13].wood=50000;assert.ok(move(g,'material:wood',13,1,'unload').ok);assert.equal(move(g,'material:wood',13,1,'load').ok,false);
 g.progress.campParking.owned[0].x=1400;assert.deepEqual(transferVehicles(g),[]);before=JSON.stringify(g.progress);assert.equal(move(g,'material:wood',13,1,'unload').ok,false);assert.equal(JSON.stringify(g.progress),before);
 g.progress.campParking.owned[0].x=940;g.progress.campParking.owned[0].mapId='jiuzhaigou';assert.deepEqual(transferVehicles(g),[]);
});

test('目标数量上限、活动工具及未拥有车辆不能转移',()=>{
 const g=scene();g.progress.farm.forage=2;g.progress.shopStock[13]={'material:sweet-grass':999};assert.equal(move(g,'material:sweet-grass',13,1,'load').ok,false);g.progress.outdoors.rod=true;g.fishing={};assert.equal(move(g,'outdoor:rod',13,1,'load').ok,false);g.progress.treasure.detector=true;g.detectorActive=true;assert.equal(move(g,'metal-detector',13,1,'load').ok,false);assert.equal(move(g,'tool:hoe',13,1,'load').ok,false);assert.equal(move(g,'material:sweet-grass',19,1,'load').ok,false);
});
