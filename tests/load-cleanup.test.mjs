// 满载提醒与背包、货舱清理通过真实Game和保存事务验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {cleanupEntries,discardLoad,planLoadCleanup,discardForMobility,cleanupLoad,cleanupUnitMass} from '../src/core/load-cleanup.js';
import {updateLoadWarning} from '../src/core/load-warning.js';
import {catLoad,vehicleLoad,movementLoadFactor} from '../src/progression/load-weight.js';
import {LOAD_RULES} from '../src/config/vehicle-load.js';
import {RANGER} from '../src/config/ranger-arrival.js';

// 只准备普通巡林及保存函数，移动、弹匣和清理继续使用正式状态。
function scene(){const p=ownedPineProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.weapons.fill(0);p.weapons[0]=p.weapons[1]=1;p.weapon=0;const events=[],g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999;g.enemies=[];g.trees=[];g.progress.campParking.owned=[];g.vehicle.active=false;g.onEvent=(type,data)=>events.push({type,data});g.livingPersist=()=>true;Object.assign(g.player,{x:900,y:800,vx:0,vy:0});return {g,events};}

test('角色满载不能移动，提示节流，清理后立即恢复并可再次提醒',()=>{
 const {g,events}=scene();g.progress.logistics.bagWood=100;const x=g.player.x;for(let i=0;i<20;i++)g.update(.05,{x:1,y:0});assert.equal(g.player.x,x);assert.equal(movementLoadFactor(g),0);assert.equal(events.filter(e=>e.type==='story-hint').length,1);assert.match(events.find(e=>e.type==='story-hint').data.text,/载荷已满.*清理背包/);
 assert.ok(discardLoad(g,{id:'material:wood',count:100}).ok);assert.ok(movementLoadFactor(g)>0);for(let i=0;i<6;i++)g.update(.05,{x:1,y:0});assert.ok(g.player.x>x);g.progress.logistics.bagWood=100;g.update(.05);assert.equal(events.filter(e=>e.type==='story-hint').length,2);
 const before=events.length;g.state='paused';updateLoadWarning(g,20,{x:1,y:0});assert.equal(events.length,before);
});
test('达到上限即停止，驾驶只按车辆总载荷判断，故障不误报满载',()=>{
 const {g,events}=scene(),capacity=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight;assert.equal(catLoad(g).overloaded,true);assert.equal(movementLoadFactor(g),0);}finally{LOAD_RULES.catCapacity=capacity;}
 g.vehicle.active=true;g.progress.logistics.builds[0].wood=4000;assert.equal(movementLoadFactor(g),0);updateLoadWarning(g,.05,{x:1,y:0});assert.match(events.at(-1).data.text,/载具载荷已满/);assert.ok(discardLoad(g,{hull:0,id:'material:wood',count:4000}).ok);assert.equal(vehicleLoad(g).overloaded,false);g.progress.supplies.engineFaults[0]=100;updateLoadWarning(g,10,{x:1,y:0});assert.equal(events.length,1);
});
test('数量、当前装备、农具和重要物品受保护，远车与活动不能清理',()=>{
 const {g}=scene();g.progress.farm.inventory[0]=10;const before=structuredClone(g.progress);
 for(const count of [0,-1,.5,NaN,11])assert.equal(discardLoad(g,{id:'crop:0',count}).ok,false);
 for(const id of ['weapon:0','tool:hoe','patrol-phone','magazine','bad'])assert.equal(discardLoad(g,{id,count:1}).ok,false);assert.deepEqual(g.progress,before);
 g.progress.vehicleHulls[1]=1;g.progress.logistics.builds[1].wood=10;g.progress.campParking.owned.push({hull:1,spot:null,mapId:'forest',x:2000,y:2000,hp:1,ammo:0,reload:0,wheel:0,track:0});assert.equal(discardLoad(g,{hull:1,id:'material:wood',count:1}).ok,false);
 g.story={};assert.equal(cleanupEntries(g).length,0);assert.equal(discardLoad(g,{id:'crop:0',count:1}).ok,false);
});
test('清理物品与种子保留仓库及其他车辆，保存失败完整回滚',()=>{
 const {g}=scene();g.progress.wood=100;g.progress.farm.seeds[0]=10;g.progress.supplies.items.medkit=3;g.progress.farm.inventory[0]=20;g.progress.logistics.builds[0].wood=40;const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(discardLoad(g,{id:'crop:0',count:5}).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>{throw Error('保存失败');};assert.equal(discardLoad(g,{id:'seed:0',count:5}).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;
 for(const id of ['crop:0','seed:0','supply:medkit'])assert.ok(discardLoad(g,{id,count:2}).ok);assert.equal(g.progress.farm.inventory[0],18);assert.equal(g.progress.farm.seeds[0],8);assert.equal(g.progress.supplies.items.medkit,1);assert.equal(g.progress.wood,100);assert.equal(g.progress.logistics.builds[0].wood,40);
});
test('备用和已装填弹药一起清理，失败不改运行弹匣，读档不会恢复子弹',()=>{
 for(const hull of [null,0]){const {g}=scene();if(hull!==null)g.vehicle.active=true;const stock=hull===null?g.progress.supplies.hand:g.progress.supplies.vehicles[0],mag=hull===null?g.magazines[0]:g.vehicle.module.magazine;stock.light=3;mag.ammo=4;const entry=cleanupEntries(g,hull).find(r=>r.id==='ammo:light');assert.equal(entry.count,7);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(discardLoad(g,{hull,id:'ammo:light',count:6}).ok,false);assert.equal(mag.ammo,4);assert.deepEqual(g.progress,before);let saved;g.livingPersist=p=>{saved=structuredClone(p);return true;};assert.ok(discardLoad(g,{hull,id:'ammo:light',count:6}).ok);assert.equal(mag.ammo,1);const restored=new Game(saved);assert.equal((hull===null?restored.magazines[0]:restored.vehicles[0].module.magazine).ammo,1);}
});
test('未装备武器可清理，弹药退回背包，当前及教学武器保留',()=>{
 const {g}=scene();assert.notEqual(RANGER.saw,1);g.magazines[1].ammo=3;const ammo=g.progress.supplies.hand.light,weight=catLoad(g).weight,expectedMass=cleanupUnitMass(cleanupEntries(g).find(r=>r.id==='weapon:1'));assert.ok(discardLoad(g,{id:'weapon:1',count:1}).ok);assert.equal(g.progress.weapons[1],0);assert.equal(g.progress.weapons[0],1);assert.equal(g.magazines[1].ammo,0);assert.equal(g.progress.supplies.hand.light,ammo+3);assert.ok(Math.abs(weight-catLoad(g).weight-expectedMass)<1e-6);assert.equal(discardLoad(g,{id:'weapon:1',count:1}).ok,false);
});

test('丢弃武器不能挤掉满库弹药，停驻车辆清理同步车位弹药记录',()=>{
 const {g}=scene();g.magazines[1].ammo=3;g.progress.supplies.hand.light=100000;const before=structuredClone(g.progress);assert.equal(discardLoad(g,{id:'weapon:1',count:1}).ok,false);assert.deepEqual(g.progress,before);assert.equal(g.magazines[1].ammo,3);
 g.vehicle.module.magazine.ammo=4;g.progress.supplies.vehicles[0].light=2;g.progress.campParking.owned=[{hull:0,spot:null,mapId:'forest',x:g.player.x+50,y:g.player.y,hp:1,ammo:4,reload:0,wheel:0,track:0}];assert.ok(discardLoad(g,{hull:0,id:'ammo:light',count:5}).ok);assert.equal(g.progress.campParking.owned[0].ammo,1);assert.equal(g.vehicle.module.magazine.ammo,1);
});

// 快捷方案只减去恢复移动所需的整数份，严格低于边界，不整包清空。
test('自动清理优先木材并保留余量，达到上限也会减重',()=>{
 const {g}=scene();g.progress.logistics.bagWood=100;g.progress.farm.inventory[0]=10;const plan=planLoadCleanup(g);assert.equal(plan.ok,true);assert.equal(plan.changes.length,1);assert.equal(plan.changes[0].id,'material:wood');assert.ok(plan.changes[0].count<100);assert.ok(plan.after<plan.capacity);assert.ok(plan.after+.5>=plan.capacity);assert.equal(discardForMobility(g,plan).ok,true);assert.equal(g.progress.farm.inventory[0],10);assert.ok(movementLoadFactor(g)>0);
 const capacity=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight;const exact=planLoadCleanup(g);assert.equal(exact.ok,true);assert.equal(exact.changes[0].count,1);}finally{LOAD_RULES.catCapacity=capacity;}
});
// 整车载荷包含随身背包，清理顺序跨来源优先木头，不误清其他载具。
test('车辆快捷清理包含背包，跨物品一次保存，失败完整保留',()=>{
 const {g}=scene();g.vehicle.active=true;g.progress.logistics.builds[0].wood=100;g.progress.logistics.bagWood=1500;g.progress.farm.inventory[0]=5;const before=structuredClone(g.progress),mags=g.magazines.map(m=>m.ammo),plan=planLoadCleanup(g,0);assert.equal(plan.ok,true);assert.ok(plan.changes.some(c=>c.hull===0));assert.ok(plan.changes.some(c=>c.hull===null));let calls=0;g.livingPersist=()=>{calls++;return false;};assert.equal(discardForMobility(g,plan).ok,false);assert.deepEqual(g.progress,before);assert.deepEqual(g.magazines.map(m=>m.ammo),mags);assert.equal(calls,1);g.livingPersist=()=>{calls++;return true;};assert.equal(discardForMobility(g,plan).ok,true);assert.equal(calls,2);assert.ok(cleanupLoad(g,0).weight<cleanupLoad(g,0).capacity);assert.ok(movementLoadFactor(g)>0);
});
// 确认时仍验证库存及最终重量，不根据过期预览偷偷替换待丢弃物品。
test('快捷清理拒绝过期方案、远处车辆和不足以移动的方案',()=>{
 const {g}=scene();assert.equal(planLoadCleanup(g).ok,false);g.progress.logistics.bagWood=100;const plan=planLoadCleanup(g);g.progress.logistics.bagWood=1;const before=structuredClone(g.progress);assert.equal(discardForMobility(g,plan).ok,false);assert.deepEqual(g.progress,before);g.progress.logistics.bagWood=100;const next=planLoadCleanup(g);g.progress.farm.inventory[0]=1000;const changed=structuredClone(g.progress);assert.equal(discardForMobility(g,next).ok,false);assert.deepEqual(g.progress,changed);assert.equal(planLoadCleanup(g,1).ok,false);
 const capacity=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=.01;const blocked=planLoadCleanup(g);assert.equal(blocked.ok,false);assert.equal(blocked.changes.length,0);assert.equal(g.progress.weapons[0],1);assert.equal(g.progress.weapons[1],1);}finally{LOAD_RULES.catCapacity=capacity;}
});
