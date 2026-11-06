// 有限弹药回归：整轮正式怪物预算、真实携重、购买去向与换弹消耗共用运行配置。
import {enterClearing} from './helpers/clearing-scene.mjs';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {waveDifficulty} from '../src/config/waves.js';
import {clearingBossHealth} from '../src/config/clearing-boss.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {vehicleDamage,vehicleWeapon} from '../src/config/vehicles.js';
import {AMMO_TYPES,ammoKind,AMMO_SHOP} from '../src/config/supplies.js';
import {catLoad,vehicleLoad} from '../src/progression/load-weight.js';
import {tradeSupply} from '../src/core/supplies.js';
import {takeSupplyAmmo,supplyAmmoCount} from '../src/combat/supply-ammo.js';
import {advanceReload,consumeRound} from '../src/combat/magazine.js';
// 采用同轮成长装备，基础手枪和五种耗弹主炮均单独承担整轮，不借另一武器分摊。
function setup(round=0,hull=null){const p=freshProgress();p.bosses=round;p.heroes[0]=p.weapons[0]=Math.min(20,round+1);if(hull!==null){p.vehicleIndex=hull;p.vehicleHulls[hull]=1;grantVehicleArmament(p,hull);p.vehicleWeapons[p.vehicleLoadouts[hull]]=Math.min(20,round+1);}return new Game(p,()=>.5);}
// 逐只使用正式怪物工厂与领主预算，不把贯穿、爆炸和暴击收益用于达标。
function targets(g){const hp=[],round=g.progress.bosses;for(let wave=round*5+1;wave<=round*5+5;wave++){g.wave=wave;for(let n=0;n<waveDifficulty(wave).total;n++){g.enemies=[];g.waveSpawned=n;hp.push(g.spawnEnemy(0,0,{x:g.player.x+100,y:g.player.y}).hp);}}hp.push(clearingBossHealth(round,g.progress));return hp;}
test('首轮完整五波及领主在有限初始库存内完成，失准仍留赶路余量',()=>{
 const g=setup(),w=g.weapon(),m=g.magazines[0],hp=targets(g),initial=g.progress.supplies.hand.light;let fired=0;
 for(let health of hp)while(health>0){advanceReload(m,w,w.reloadTime+1,null,n=>takeSupplyAmmo(g,w,n),supplyAmmoCount(g,w));assert.ok(consumeRound(m,w),'整轮尚未完成就已断弹');fired++;if(fired%3!==0)health-=g.damage();}
 assert.equal(hp.length,52);assert.ok(initial-fired>=initial*.5,'至少保留半数初始弹量供赶路、援军和走位损耗');assert.equal(g.progress.supplies.hand.light+m.ammo,initial-fired);assert.equal(catLoad(g).overloaded,false);
 console.log(JSON.stringify({firstRoundTargets:hp.length,initial,fired,remaining:initial-fired}));
});
test('第1至31轮抽样：按成长整备与车内备弹，携带整轮弹药后仍保留至少15%载重',()=>{
 const rows=[];
 for(const round of [0,2,7,12,20,30])for(const hull of [null,0,1,2,3,6]){
  const g=setup(round,hull);let roll=0;g.random=()=>((roll++*.61803398875)%1);const w=hull===null?g.weapon():vehicleWeapon(g.progress,g.vehicle.weaponIndex),damage=hull===null?g.damage():vehicleDamage(g.progress,g.vehicle.weaponIndex);
  // 65%命中、额外25%援军与耗损余量，按单目标命中估算；整包向上购买。
  const shots=Math.ceil(targets(g).reduce((n,h)=>n+Math.ceil(h/(damage*w.pellets)),0)*1.25/.65),key=ammoKind(w),rule=AMMO_TYPES[key],stock=hull===null?g.progress.supplies.hand:g.progress.supplies.vehicles[hull];stock[key]=Math.ceil(shots/rule.pack)*rule.pack;
  // 后期炮弹携重随实际发动机升级，不假定原厂底盘可以无限装满高轮次所需弹药。
  if([1,6].includes(hull)&&round>=12){g.progress.logistics.builds[hull].engine=2;g.progress.logistics.builds[hull].engines=[0,2];}
  // 猫猫留出战利品空间，多出的通用子弹放入随行载具，沿用已实现的车内备用弹规则。
  const carried=stock[key];if(hull===null){stock[key]=0;const base=catLoad(g);stock[key]=Math.min(carried,Math.max(0,Math.floor((base.capacity*.85-base.weight-1e-6)/rule.mass)));g.progress.supplies.vehicles[g.vehicle.index][key]=carried-stock[key];const vehicle=vehicleLoad(g,g.vehicle.index,{driver:true});assert.ok(vehicle.payload<vehicle.capacity*.85,'猫猫车内备弹也必须计重');}
  const load=hull===null?catLoad(g):vehicleLoad(g,hull,{driver:true}),weight=load.weight??load.payload;
  assert.ok(weight<load.capacity*.85,`${round+1}轮 ${w.id}: ${weight}/${load.capacity}`);rows.push({round:round+1,weapon:w.id,rounds:carried,weight:Number(weight.toFixed(2)),capacity:load.capacity});
 }
 console.log(JSON.stringify({budgetCases:rows.length,lateRound:rows.filter(r=>r.round===31)}));
});
test('批量购买按整包计价、车仓及小屋入库与保存失败保持事务性',()=>{
 const g=setup(0,1);g.state='playing';g.vehicle.active=false;g.livingPersist=()=>true;g.progress.coins=100000;g.cottage={kind:'ammo',outside:{x:AMMO_SHOP.x,y:AMMO_SHOP.y+80}};g.progress.campParking.owned=[{hull:1,spot:null,mapId:'forest',...g.cottage.outside,hp:1,ammo:0}];
 const hand=g.progress.supplies.hand.light,coins=g.progress.coins;assert.ok(tradeSupply(g,{kind:'ammo',id:'shell',target:'vehicle',batches:20}).ok);assert.equal(g.progress.supplies.vehicles[1].shell,1000);assert.equal(g.progress.coins,coins-2000);assert.equal(g.progress.supplies.hand.light,hand);assert.equal(vehicleLoad(g,1,{driver:true}).overloaded,false);
 assert.ok(tradeSupply(g,{kind:'ammo',id:'light',target:'hand',batches:5}).ok);assert.equal(g.progress.supplies.hand.light,hand);assert.equal(g.progress.supplies.vehicles[1].light,1500);
 g.progress.logistics.bagWood=45;
 // 背包已满后弹药转入货舱，将车辆剩余载重压到半批弹药，验证货舱无法容纳整批时转入小屋。
 const load=vehicleLoad(g,1,{driver:true}),mass=AMMO_TYPES.light.mass*AMMO_TYPES.light.pack*20;
 g.progress.logistics.builds[1].wood=Math.floor((load.capacity-load.payload-mass/2)/WOOD_ITEM.mass);
 const before=structuredClone(g.progress),request={kind:'ammo',id:'light',target:'hand',batches:20};g.livingPersist=()=>false;assert.equal(tradeSupply(g,request).ok,false);assert.deepEqual(g.progress,before);assert.equal(tradeSupply(g,{...request,batches:21}).ok,false);
 g.livingPersist=()=>true;assert.ok(tradeSupply(g,request).ok);assert.equal(g.progress.warehouse.ammo.light,6000);
});

// 固定站位隔离走位损耗，五波、索敌、弹道、命中、换弹和领主结算走正式帧循环。
test('正式帧循环完成首轮五波和领主，弹药保持有限且没有中途注入',()=>{
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';const g=new Game(p,()=>.5);g.start();g.mainlineTalkDelay=99999;g.mainlineSpeech=null;enterClearing(g);g.trees=[];g.hurt=()=>{};g.vehicle.active=false;g.setViewport(960,720);
 const origin={x:g.player.x,y:g.player.y},initial=g.progress.supplies.hand.light;let ticks=0,shots=0;g.onEvent=type=>{if(type==='shot')shots++;};
 while(g.progress.bosses===0&&ticks<9000){Object.assign(g.player,origin,{vx:0,vy:0,pushX:0,pushY:0});for(const e of g.enemies){e.x=origin.x+120;e.y=origin.y;e.speed=0;e.vx=e.vy=e.pushX=e.pushY=0;}if(g.boss){g.boss.x=origin.x+120;g.boss.y=origin.y;g.boss.speed=0;}g.update(1/30);ticks++;}
 assert.equal(g.progress.bosses,1);assert.equal(g.wave,5);assert.ok(shots>0&&shots<initial);assert.equal(g.progress.supplies.hand.light+g.magazines[0].ammo,initial-shots);console.log(JSON.stringify({simulationShots:shots,remaining:initial-shots,seconds:Number((ticks/30).toFixed(2))}));
});
