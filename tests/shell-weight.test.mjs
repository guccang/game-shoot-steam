// 炮弹重量专项：正式库存、弹仓、购买预览与移动共用同一质量，装填不增减总重。
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {AMMO_TYPES,AMMO_SHOP,ammoKind} from '../src/config/supplies.js';
import {itemDefinition} from '../src/config/items.js';
import {vehicleLoad,catLoad,movementLoadFactor} from '../src/progression/load-weight.js';
import {tradeSupply} from '../src/core/supplies.js';
import {takeSupplyAmmo,supplyAmmoCount,syncSupplyAmmo} from '../src/combat/supply-ammo.js';
import {advanceReload,consumeRound} from '../src/combat/magazine.js';

// 使用原厂坦克或红狼和已完成入职的独立存档，不放大容量以绕开实际限重。
function scene(hull){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[hull]=1;p.vehicleIndex=hull;grantVehicleArmament(p,hull);p.coins=10000;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=true;g.livingPersist=()=>true;return g;}
// 浮点重量以千克比较，允许原有背包小件产生的机器精度误差。
function near(actual,expected){assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);}

test('两类炮弹加重后保持每包数量与价格，库存目录显示同一单位重量',()=>{
 for(const [id,mass,pack,coins] of [['shell',1,50,100],['heavy',2,30,180]]){assert.equal(AMMO_TYPES[id].mass,mass);assert.equal(itemDefinition('ammo:'+id).mass,mass);assert.equal(AMMO_TYPES[id].pack,pack);assert.equal(AMMO_TYPES[id].coins,coins);}
 assert.equal(AMMO_TYPES.light.mass,.004);assert.equal(AMMO_TYPES.water.mass,.1);
});
test('十分钟连续射击备弹有明确重量，原厂车仍留至少三成载荷供其他物品',()=>{
 for(const [hull,rounds,ammoMass] of [[1,300,300],[6,240,480]]){const g=scene(hull),w=vehicleWeapon(g.progress,g.vehicle.weaponIndex),key=ammoKind(w);g.progress.supplies.vehicles[hull][key]=rounds;const load=vehicleLoad(g,hull,{driver:true});near(load.ammo,ammoMass);assert.ok(rounds*Math.max(w.interval,w.reloadTime)>=600);assert.ok(load.payload<load.capacity*.7);assert.equal(movementLoadFactor(g),1);console.log(JSON.stringify({hull,rounds,ammoMass,payload:load.payload,capacity:load.capacity,spare:load.capacity-load.payload}));}
});
test('备用弹装入炮膛不重复计重，开火按单发减重，保存重建保持一致',()=>{
 for(const hull of [1,6]){const g=scene(hull),w=vehicleWeapon(g.progress,g.vehicle.weaponIndex),key=ammoKind(w),m=g.vehicle.module.magazine,unit=AMMO_TYPES[key].mass;g.progress.supplies.vehicles[hull][key]=11;const before=vehicleLoad(g).ammo;
  advanceReload(m,w,10,null,n=>takeSupplyAmmo(g,w,n,hull),supplyAmmoCount(g,w,hull));assert.equal(m.ammo,1);assert.equal(g.progress.supplies.vehicles[hull][key],10);near(vehicleLoad(g).ammo,before);assert.ok(consumeRound(m,w));near(vehicleLoad(g).ammo,before-unit);
  syncSupplyAmmo(g);const restored=new Game(structuredClone(g.progress),()=>.5);near(vehicleLoad(restored,hull).ammo,before-unit);
 }
});
test('一批采购同时更新货舱重量，超载预览不扣款，保存失败不兑现',()=>{
 for(const hull of [1,6]){const g=scene(hull),id=hull===1?'shell':'heavy',rule=AMMO_TYPES[id];g.vehicle.active=false;const outside={x:AMMO_SHOP.x,y:AMMO_SHOP.y+80};g.cottage={kind:'ammo',outside};g.progress.campParking.owned=[{hull,spot:null,mapId:'forest',...outside,hp:1,ammo:0}];const before=vehicleLoad(g,hull,{driver:true}).payload,bag=catLoad(g).weight;assert.ok(tradeSupply(g,{kind:'ammo',id,target:'vehicle'}).ok);near(vehicleLoad(g,hull,{driver:true}).payload-before,rule.mass*rule.pack);near(catLoad(g).weight,bag);
  const load=vehicleLoad(g,hull,{driver:true});g.progress.logistics.builds[hull].wood=Math.floor((load.capacity-load.payload-rule.mass*rule.pack/2)/WOOD_ITEM.mass);const original=structuredClone(g.progress),request={kind:'ammo',id,target:'vehicle'},quote=tradeSupply(g,request);assert.equal(quote.needsLoadConfirmation,true);near(quote.load.after-quote.load.before,rule.mass*rule.pack);assert.deepEqual(g.progress,original);g.livingPersist=()=>false;assert.equal(tradeSupply(g,{...request,loadConfirmation:quote.confirmation}).ok,false);assert.deepEqual(g.progress,original);
 }
});
