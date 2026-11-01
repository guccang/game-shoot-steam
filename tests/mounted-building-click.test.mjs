// 骑乘建筑服务与农具操作分开授权，使用正式领取、购买和附近入口逻辑。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {FARM_DELIVERY,FARM_SEED_DOOR} from '../src/config/farm.js';
import {BUILDING_ENTRIES} from '../src/config/building-entries.js';
import {vehicleModel} from '../src/config/vehicles.js';
import {canUseFarmDelivery,claimFarmParcel,updateFarmDelivery} from '../src/core/farm-delivery.js';
import {canUseFarm,farmAction} from '../src/core/farm.js';
import {buyFarmSeeds} from '../src/core/farm-seeds.js';
import {nearbyInteraction} from '../src/core/nearby-interaction.js';
import {canInspectBuilding} from '../src/core/building-entry.js';
import {canEnterCottage} from '../src/core/cottage.js';

// 柜台夹具保留存档事务和载具状态，避免把领取变成隐式上下车。
function scene(index=0){
 const progress=freshProgress();progress.farm.unlocked[0]=true;progress.coins=1000;
 progress.farm.delivery.parcels=[{id:1,crop:0,count:3,sender:0,arrivedAt:1}];
 return {progress,state:'playing',mapId:'forest',player:{x:FARM_DELIVERY.x,y:FARM_DELIVERY.y,flying:!!vehicleModel(index).flying},
  vehicle:{active:true,index,hp:83,cooldown:0,module:{magazine:{ammo:2,reloading:.4}}},enemies:[],onEvent(){},livingPersist:()=>true,random:()=>.5};
}

test('九种载具均可领取快递，保持驾驶、耐久、弹药与装填进度且不能重复领',()=>{
 for(let i=0;i<9;i++){
  const g=scene(i),vehicle=g.vehicle,before=structuredClone(vehicle),seeds=g.progress.farm.seeds[0];
  assert.equal(canUseFarmDelivery(g),true);assert.equal(canUseFarm(g),false);
  assert.ok(claimFarmParcel(g,1).ok);assert.equal(g.progress.farm.seeds[0],seeds+3);
  assert.equal(g.vehicle,vehicle);assert.deepEqual(g.vehicle,before);assert.equal(claimFarmParcel(g,1).ok,false);
 }
});

test('领取仍验证距离、游玩状态和活动权限，过期点击不发奖励',()=>{
 const changes=[g=>g.player.x+=116,g=>g.state='paused',g=>g.state='dead',g=>g.mapId='jiuzhaigou',
  ...['realm','cottage','arrivalCinematic','workshopTrial','campDefense','fireActive','mainlineSpeech','livingBattle'].map(key=>g=>g[key]={}),
  g=>g.story={phase:'dialogue'}];
 for(const change of changes){const g=scene();change(g);const before=structuredClone(g.progress);assert.equal(claimFarmParcel(g,1).ok,false);assert.deepEqual(g.progress,before);}
});

test('驾驶期间正常收到已解锁种子，保存失败仍不丢失包裹',()=>{
 const g=scene(2);g.progress.farm.delivery.parcels=[];g.progress.farm.delivery.nextAt=1;
 updateFarmDelivery(g,1000);assert.equal(g.progress.farm.delivery.parcels.length,1);
 const before=structuredClone(g.progress);g.livingPersist=()=>false;
 assert.equal(claimFarmParcel(g,g.progress.farm.delivery.parcels[0].id).ok,false);assert.deepEqual(g.progress,before);
});

test('骑乘可结算柜台旧收成，但不能开垦、播种、浇水或收割',()=>{
 const g=scene();g.progress.farm.inventory[0]=2;const coins=g.progress.coins;
 assert.ok(farmAction(g,'legacy').ok);assert.ok(g.progress.coins>coins);assert.equal(g.vehicle.active,true);
 for(const action of ['dig','plant','water','harvest','remove'])assert.equal(farmAction(g,action).ok,false);
});

test('其他建筑与告示的附近点击入口在步行、地面驾驶和飞行骑乘时一致',()=>{
 for(const entry of BUILDING_ENTRIES)for(const index of [-1,0,2]){
  const g=scene(Math.max(0,index));g.vehicle.active=index>=0;Object.assign(g.player,{x:entry.x,y:entry.y});
  assert.equal(canInspectBuilding(g),true);assert.equal(nearbyInteraction(g)?.id,entry.id,entry.id+' / '+index);
  assert.equal(g.cottage,undefined);
 }
});

test('骑乘允许门口候停入屋，其他活动依旧拦截普通建筑入口',()=>{
 const g=scene();assert.equal(canEnterCottage(g),true);g.vehicle.active=false;assert.equal(canEnterCottage(g),true);
 for(const key of ['realm','story','cottage','arrivalCinematic','campDefense','fireActive','workshopTrial','boss','livingBattle','mainlineSpeech']){
  const g=scene();g[key]={};assert.equal(canInspectBuilding(g),false,key);
 }
});

test('种子小屋骑乘购种继续有效，暂停面板可购买且不改变车辆',()=>{
 const g=scene(2);Object.assign(g.player,{x:FARM_SEED_DOOR.x,y:FARM_SEED_DOOR.y});g.state='paused';
 const vehicle=structuredClone(g.vehicle);assert.ok(buyFarmSeeds(g,0,1).ok);assert.deepEqual(g.vehicle,vehicle);
});
