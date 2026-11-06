// 猫猫弹药自动分流与车载备用：验证真实重量、交易原子性和换弹库存守恒。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {LOAD_RULES} from '../src/config/vehicle-load.js';
import {tradeSupply} from '../src/core/supplies.js';
import {catLoad,vehicleLoad} from '../src/progression/load-weight.js';
import {supplyAmmoCount,takeSupplyAmmo,syncSupplyAmmo} from '../src/combat/supply-ammo.js';
import {advanceReload,consumeRound} from '../src/combat/magazine.js';

// 当前自有坦克停在远处，柜台交易不能依赖距离；弹匣从空仓开始。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 p.vehicleHulls.fill(0);p.vehicleHulls[1]=1;p.vehicleIndex=1;p.weapon=0;p.weapons[0]=1;p.coins=p.wood=10000;p.materials.parts=100;
 const g=new Game(p,()=>0);g.state='playing';g.vehicle.active=false;g.cottage={kind:'ammo',outside:{x:500,y:500}};g.progress.campParking.owned=[{hull:1,spot:null,mapId:'forest',x:3000,y:3000,hp:1,ammo:0,reload:0,wheel:0,track:0}];g.livingPersist=()=>true;g.magazines[0]={ammo:0,remaining:0};return g;
}
// 精确设置本次测试的余量，结束后恢复配置，避免临界小数依赖其他物品版本。
function withRoom(g,room,run){const original=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight+room;run();}finally{LOAD_RULES.catCapacity=original;}}
// 走正式换弹时钟与库存查询，不能绕过空仓时的提前返回分支。
function reload(g){const w=g.weapon(),m=g.magazines[0];advanceReload(m,w,w.reloadTime+1,null,n=>takeSupplyAmmo(g,w,n),supplyAmmoCount(g,w));return m;}

test('制作按整发分流，含已装填重量，远处当前货舱收余量且保存重建守恒',()=>{
 {const craft=true;const g=scene();g.magazines[0].ammo=7;const hand=g.progress.supplies.hand.light,car=vehicleLoad(g).payload,coins=g.progress.coins,wood=g.progress.wood;
  withRoom(g,.101,()=>{const r=tradeSupply(g,{kind:'ammo',id:'light',target:'hand',craft});assert.ok(r.ok,r.message);assert.match(r.message,/背包 25 发、当前载具仓库 275 发/);assert.equal(g.progress.supplies.hand.light,hand+25);assert.equal(g.progress.supplies.vehicles[1].light,275);assert.equal(catLoad(g).overloaded,false);assert.ok(Math.abs(vehicleLoad(g).payload-car-1.1)<1e-6);assert.equal(g.progress.coins,coins-(craft?0:30));assert.equal(g.progress.wood,wood-(craft?2:0));
   const restored=new Game(structuredClone(g.progress));assert.equal(restored.progress.supplies.hand.light,hand+25);assert.equal(restored.progress.supplies.vehicles[1].light,275);assert.equal(restored.magazines[0].ammo,7);
  });
 }
});
test('购买按整批交付，远车不能代收，背包不足时进小屋仓库',()=>{
 for(const room of [.6,0,-1]){const g=scene(),hand=g.progress.supplies.hand.light;
  withRoom(g,room,()=>{const r=tradeSupply(g,{kind:'ammo',id:'light',target:'hand',batches:20});assert.ok(r.ok,r.message);assert.match(r.message,/小屋仓库/);assert.equal(g.progress.warehouse.ammo.light,6000);assert.equal(g.progress.supplies.hand.light,hand);assert.equal(g.progress.supplies.vehicles[1].light,0);});
 }
});
test('无自有载具且背包已满时不写入未拥有车辆',()=>{
 const g=scene();g.progress.vehicleHulls.fill(0);withRoom(g,.1,()=>{const before=structuredClone(g.progress);assert.ok(tradeSupply(g,{kind:'ammo',id:'light',target:'hand'}).ok);assert.equal(g.progress.supplies.hand.light,before.supplies.hand.light);assert.equal(g.progress.warehouse.ammo.light,300);assert.deepEqual(g.progress.supplies.vehicles,before.supplies.vehicles);});
});
test('库存上限、费用不足和保存失败均不扣费、不产生部分入库',()=>{
 for(const mode of ['stock','coins','save','throw']){const g=scene();if(mode==='stock')g.progress.warehouse.ammo.light=100000;if(mode==='coins')g.progress.coins=0;if(mode==='save')g.livingPersist=()=>false;if(mode==='throw')g.livingPersist=()=>{throw Error('保存失败');};
  withRoom(g,.101,()=>{const before=structuredClone(g.progress);assert.equal(tradeSupply(g,{kind:'ammo',id:'light',target:'hand'}).ok,false);assert.deepEqual(g.progress,before);});
 }
});
test('换弹先用背包，耗尽后从远处载具补足；射空全部库存后停止装填并保存余量',()=>{
 const g=scene(),w=g.weapon();g.cottage=null;g.progress.supplies.hand.light=3;g.progress.supplies.vehicles[1].light=20;
 const m=reload(g);assert.equal(m.ammo,w.magazineSize);assert.equal(g.progress.supplies.hand.light,0);assert.equal(g.progress.supplies.vehicles[1].light,23-w.magazineSize);
 for(let i=0;i<w.magazineSize;i++)assert.ok(consumeRound(m,w));reload(g);assert.equal(m.ammo,23-w.magazineSize);assert.equal(g.progress.supplies.vehicles[1].light,0);
 syncSupplyAmmo(g);const restored=new Game(structuredClone(g.progress));assert.equal(restored.magazines[0].ammo,m.ammo);assert.equal(restored.progress.supplies.vehicles[1].light,0);
 while(m.ammo)assert.ok(consumeRound(m,w));reload(g);assert.equal(m.ammo,0);assert.equal(m.remaining,0);assert.equal(consumeRound(m,w),false);
});
test('自动取弹受真实背包余量限制，备用入弹匣不重复释放空间，满载时保持待补给',()=>{
 const g=scene();g.progress.supplies.hand.light=3;g.progress.supplies.vehicles[1].light=30;
 withRoom(g,.011,()=>{const m=reload(g);assert.equal(m.ammo,5);assert.equal(g.progress.supplies.vehicles[1].light,28);assert.equal(catLoad(g).overloaded,false);assert.equal(supplyAmmoCount(g,g.weapon()),0);});
 withRoom(g,0,()=>{const before=structuredClone(g.progress.supplies);assert.equal(supplyAmmoCount(g,g.weapon()),0);assert.equal(takeSupplyAmmo(g,g.weapon(),12),0);assert.deepEqual(g.progress.supplies,before);});
});
test('当前车、其他车和临时活动隔离；载具主炮不反向取用猫猫背包',()=>{
 const g=scene(),w=g.weapon();g.progress.supplies.hand.light=0;g.progress.vehicleHulls[0]=1;g.progress.supplies.vehicles[0].light=50;assert.equal(supplyAmmoCount(g,w),0);assert.equal(takeSupplyAmmo(g,w,12),0);
 g.progress.supplies.vehicles[1].light=20;g.progress.vehicleHulls[1]=0;assert.equal(takeSupplyAmmo(g,w,12),0);g.progress.vehicleHulls[1]=1;
 for(const flag of ['realm','story','campDefense','fireActive','workshopTrial','arrivalCinematic']){const activity={progress:g.progress,vehicle:g.vehicle,[flag]:{}};const before=structuredClone(g.progress.supplies);assert.equal(supplyAmmoCount(activity,w),Infinity);assert.equal(takeSupplyAmmo(activity,w,12),12);assert.deepEqual(g.progress.supplies,before);}
 g.progress.supplies.hand.light=40;g.progress.supplies.vehicles[1].light=2;assert.equal(takeSupplyAmmo(g,w,12,1),2);assert.equal(g.progress.supplies.hand.light,40);assert.equal(g.progress.supplies.vehicles[0].light,50);
});
