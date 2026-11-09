// 快递只补已解锁品种；覆盖空解锁池、耗尽库存、旧包裹与保存回滚。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {updateFarmDelivery,claimFarmParcel} from '../src/core/farming/farm-delivery.js';
import {FARM_CROPS,FARM_DELIVERY} from '../src/config/farm.js';
// 只准备柜台位置与随机来源，发件和领取均经过正式事务。
function scene(){return {state:'playing',mapId:'forest',player:{...FARM_DELIVERY,hp:100},progress:freshProgress(),onEvent:()=>{},livingPersist:()=>true,random:()=>.5};}

test('无解锁品种时不寄送、不消耗序号，首次解锁后开始调度',()=>{
 const g=scene(),before=structuredClone(g.progress);updateFarmDelivery(g,1000);assert.deepEqual(g.progress,before);
 g.progress.farm.unlocked[0]=true;updateFarmDelivery(g,7000);assert.equal(g.progress.farm.delivery.nextAt,37000);
 updateFarmDelivery(g,37000);assert.equal(g.progress.farm.delivery.parcels[0].crop,0);assert.equal(g.progress.farm.delivery.serial,1);
});
test('稀疏解锁池覆盖随机边界，零库存和高等级不会改变解锁范围',()=>{
 for(const roll of [0,.2,.499999,.5,.75,.999999]){
  const g=scene();g.random=()=>roll;g.progress.farm.unlocked[1]=g.progress.farm.unlocked[6]=true;g.progress.farm.xp=999999;g.progress.farm.delivery.nextAt=1;
  updateFarmDelivery(g,1000);const p=g.progress.farm.delivery.parcels[0];assert.equal(p.crop,roll<.5?1:6);assert.ok(claimFarmParcel(g,p.id).ok);assert.deepEqual(g.progress.farm.unlocked,FARM_CROPS.map((_,i)=>[1,6].includes(i)));
 }
});
test('旧包裹不解锁新品种，保留到正常解锁后领取且不能重复领',()=>{
 const g=scene();g.progress.farm.delivery.parcels=[{id:1,crop:7,count:3,sender:0,arrivedAt:1}];const before=structuredClone(g.progress);
 assert.equal(claimFarmParcel(g,1).ok,false);assert.deepEqual(g.progress,before);
 g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.farm.unlocked[7],false);g.progress.farm.unlocked[7]=true;
 assert.ok(claimFarmParcel(g,1).ok);assert.equal(g.progress.farm.seeds[7],3);assert.equal(claimFarmParcel(g,1).ok,false);
});
test('新品种解锁后加入寄送池，发件和领取存储失败保持原进度',()=>{
 const g=scene();g.progress.farm.unlocked[0]=true;g.progress.farm.delivery.nextAt=1;g.livingPersist=()=>false;const before=structuredClone(g.progress);
 updateFarmDelivery(g,1000);assert.deepEqual(g.progress,before);
 g.progress.farm.unlocked[4]=true;g.random=()=>.99;g.livingPersist=()=>true;updateFarmDelivery(g,7000);const p=g.progress.farm.delivery.parcels[0];assert.equal(p.crop,4);
 const arrived=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(claimFarmParcel(g,p.id).ok,false);assert.deepEqual(g.progress,arrived);
});
