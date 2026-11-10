// 木材直接飞入、整批满载跳过与持久化使用正式Game验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import {LOAD_RULES} from '../src/config/vehicle-load.js';
import {collectAutomaticWood,woodPickupCapacity} from '../src/core/inventory/wood-pickup.js';
import {catLoad,vehicleLoad,movementLoadFactor} from '../src/progression/inventory/load-weight.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {arrivalWorkshopObjective} from '../src/core/camp/ranger-arrival.js';
import {resourcePickupPoses} from '../src/combat/resource-pickup.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {updateCombatTraces} from '../src/combat/transient-effects.js';
import {updateLoadWarning} from '../src/core/inventory/load-warning.js';
// 完成非相关剧情，阻止生成怪物和自动攻击，只保留正常移动与拾取。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls[0]=1;p.vehicleIndex=0;const events=[],g=new Game(p,()=>.5,(type,data)=>events.push({type,data}));g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=g.attackTimer=999;g.trees=[];g.enemies=[];g.progress.campParking.owned=[];g.parkingVisitTimer=999;g.livingPersist=()=>true;Object.assign(g.player,{x:900,y:800,vx:0,vy:0});return {g,events};}

// 用真实死亡入口保证同一棵树只能结算一次，飞行不重复增加库存。
test('远处砍树当帧入包并飞入，没有地面物品和倒计时，重复命中不增殖',()=>{
 const {g}=scene(),before=catLoad(g).weight;g.addTree(1150,800);const tree=g.trees[0];g.hit(tree,9999);g.hit(tree,9999);
 assert.equal(g.progress.logistics.bagWood,8);assert.ok(Math.abs(catLoad(g).weight-before-8*WOOD_ITEM.mass)<1e-6);assert.equal(g.progress.woodDrops,undefined);assert.equal(playerActionCountdown(g),null);assert.equal(g.drops.filter(d=>d.wood===8).length,1);assert.equal(g.progress.economyLog.income['forest:tree:wood'],8);
 g.drops[0].age=.18;assert.ok(resourcePickupPoses(g.drops,g.player).some(p=>p.kind==='wood'));for(let i=0;i<20;i++)g.update(.05);assert.equal(g.progress.logistics.bagWood,8);assert.equal(g.drops.length,0);
});
test('驾驶直接进入当前车舱，包含驾驶员负重且不误入背包或远车',()=>{
 const {g}=scene();g.vehicle.active=true;const before=vehicleLoad(g).payload;g.addTree(1150,800);g.hit(g.trees[0],9999);assert.equal(g.progress.logistics.builds[0].wood,8);assert.equal(g.progress.logistics.bagWood,0);assert.ok(Math.abs(vehicleLoad(g).payload-before-8*WOOD_ITEM.mass)<1e-6);assert.equal(g.progress.logistics.builds[5].wood,0);assert.equal(g.progress.woodDrops,undefined);
});
test('木制自行车装入八十份任务木材后可行驶，整批装不下和满载提示均跟车停留',()=>{
 const {g}=scene(),hull=RANGER.giftHull;
 g.progress.vehicleHulls[hull]=1;g.progress.vehicleIndex=hull;g.vehicle=g.vehicles[hull];g.vehicle.active=true;
 for(let i=0;i<10;i++){g.addTree(1150,800);g.hit(g.trees.at(-1),9999);}
 const load=vehicleLoad(g);
 assert.equal(load.capacity,50);assert.equal(load.payload,8);
 assert.equal(g.progress.logistics.builds[hull].wood,80);assert.ok(movementLoadFactor(g)>0);
 const fullCount=Math.round(load.capacity/WOOD_ITEM.mass);
 g.progress.logistics.builds[hull].wood=fullCount-4;
 assert.equal(collectAutomaticWood(g,{type:'tree',x:1150,y:800},8),false);
 const first=g.numbers.find(n=>n.vehicleLoadNotice);assert.match(first.text,/这批木材/);
 g.player.x+=72;updateCombatTraces(g,2.5);assert.ok(first.life>.5);assert.equal(first.x,g.player.x);
 g.progress.logistics.builds[hull].wood=fullCount;updateLoadWarning(g,.05,{x:1,y:0});
 assert.match(first.text,/满载/);assert.equal(g.numbers.filter(n=>n.vehicleLoadNotice).length,1);
 updateCombatTraces(g,3);assert.equal(first.life,.5);updateCombatTraces(g,.5);
 assert.ok(!g.numbers.includes(first));
});
test('拾取会满载则整批跳过，无入账无动画无地面木材，仍可移动',()=>{
 for(const driving of [false,true]){const {g}=scene();g.vehicle.active=driving;const load=driving?vehicleLoad(g):catLoad(g),stock=driving?g.progress.logistics.builds[0]:g.progress.logistics,key=driving?'wood':'bagWood';stock[key]=Math.floor((load.capacity-(load.payload??load.weight)-3*WOOD_ITEM.mass)/WOOD_ITEM.mass);const before=stock[key];assert.ok(woodPickupCapacity(g)>0&&woodPickupCapacity(g)<8);g.addTree(1150,800);g.hit(g.trees[0],9999);assert.equal((driving?g.progress.logistics.builds[0].wood:g.progress.logistics.bagWood),before);assert.equal(g.drops.length,0);assert.equal(g.progress.woodDrops,undefined);assert.ok(movementLoadFactor(g)>0);}
});
test('恰好满载也不收，清理后只接收新采集的木材，不补领之前跳过的木材',()=>{
 const {g}=scene(),cap=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight+8*WOOD_ITEM.mass;g.addTree(1150,800);g.hit(g.trees[0],9999);assert.equal(g.progress.logistics.bagWood,0);assert.equal(g.drops.length,0);LOAD_RULES.catCapacity=cap;g.update(.05);assert.equal(g.progress.logistics.bagWood,0);g.addTree(1150,800);g.hit(g.trees.at(-1),9999);assert.equal(g.progress.logistics.bagWood,8);}finally{LOAD_RULES.catCapacity=cap;}
});
test('连续采集立即预占重量，后一笔装不下则跳过；已入库木材不直接增加',()=>{
 const {g}=scene(),cap=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight+10*WOOD_ITEM.mass;const wood=g.progress.wood;for(const x of [1150,1150]){g.addTree(x,800);g.hit(g.trees.at(-1),9999);}assert.equal(g.progress.logistics.bagWood,8);assert.equal(g.progress.wood,wood);assert.equal(g.drops.length,1);assert.ok(movementLoadFactor(g)>0);}finally{LOAD_RULES.catCapacity=cap;}
});
test('保存失败不入账不飞行，成功保存包含木材库存与任务统计',()=>{
 for(const fail of [()=>false,()=>{throw Error('保存失败');}]){const {g}=scene(),before=structuredClone(g.progress);g.livingPersist=fail;assert.equal(collectAutomaticWood(g,{x:1100,y:800,type:'tree'},8),false);assert.deepEqual(g.progress,before);assert.equal(g.drops.length,0);g.livingPersist=()=>true;assert.equal(collectAutomaticWood(g,{x:1100,y:800,type:'tree'},8),true);const saved=validateProgress(structuredClone(g.progress));assert.equal(saved.logistics.bagWood,8);assert.equal(saved.woodDrops,undefined);assert.equal(saved.economyLog.income['forest:tree:wood'],8);}
});
test('屋内、死亡、暂停、借用玩法和已超载均不收取，不创造等待中的地面木材',()=>{
 for(const mutate of [g=>g.cottage={kind:'cottage'},g=>g.player.hp=0,g=>g.state='paused',g=>g.realm={},g=>g.story={},g=>g.progress.logistics.bagWood=1000]){const {g}=scene();mutate(g);const before=structuredClone(g.progress);assert.equal(collectAutomaticWood(g,{x:1100,y:800,type:'tree'},8),false);assert.deepEqual(g.progress,before);assert.equal(g.drops.length,0);}
});
test('新手采集立即计入记录，余量不足时指向仓库而非地面木材',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'gather',keys:true,parked:false});const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.livingPersist=()=>true;g.trees=[];const before=g.progress.arrival.wood;g.addTree(1150,800);g.hit(g.trees[0],9999,false,{weaponIndex:RANGER.saw});assert.equal(g.progress.arrival.wood,before+8);const cap=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight+WOOD_ITEM.mass;assert.equal(arrivalWorkshopObjective(g).key,'arrival-wood-store');}finally{LOAD_RULES.catCapacity=cap;}
});

// 正式存储拒绝后原事务所有可写分支不变；重试与刷新包含背包、统计和任务。
test('增量存档配额失败不污染共享分支，成功后刷新不漏木材',async()=>{
 const {createSaveStore}=await import('../src/platform/storage.js');const map=new Map();let denied=false;
 const storage={getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem(k,v){if(denied)throw Error('配额不足');map.set(k,v);}},store=createSaveStore(()=>storage);
 const {g}=scene();g.woodPersist=store.saveWoodProgress;const target={x:1100,y:800,type:'tree'};
 assert.equal(collectAutomaticWood(g,target,8),true);const before=structuredClone(g.progress);denied=true;
 assert.equal(collectAutomaticWood(g,target,8),false);assert.deepEqual(g.progress,before);assert.equal(g.drops.length,1);
 denied=false;assert.equal(collectAutomaticWood(g,target,8),true);const restored=createSaveStore(()=>storage).loadProgress();assert.equal(restored.logistics.bagWood,16);assert.equal(restored.economyLog.income['forest:tree:wood'],16);assert.equal(restored.statistics.resources.wood,16);
});
