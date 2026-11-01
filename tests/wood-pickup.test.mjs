// 木材落地、半秒候停与载荷保护均使用真实Game和持久化数据验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import {LOAD_RULES} from '../src/config/vehicle-load.js';
import {dropGroundWood,updateWoodPickup,woodPickupCapacity,nearestGroundWood} from '../src/core/wood-pickup.js';
import {catLoad,vehicleLoad,movementLoadFactor} from '../src/progression/load-weight.js';
import {playerActionCountdown} from '../src/rendering/player-action-countdown.js';
import {arrivalWorkshopObjective} from '../src/core/ranger-arrival.js';
import {WORLD} from '../src/world/coordinates.js';
// 完成非相关剧情，阻止生成怪物和自动攻击，只保留正常移动与拾取。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls[0]=1;p.vehicleIndex=0;const events=[],g=new Game(p,()=>.5,(type,data)=>events.push({type,data}));g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=g.attackTimer=999;g.trees=[];g.enemies=[];g.progress.campParking.owned=[];g.parkingVisitTimer=999;g.livingPersist=()=>true;Object.assign(g.player,{x:900,y:800,vx:0,vy:0});return {g,events};}
// 首次位置采样不消耗时间，随后推进固定步长，避免把靠近前一帧计入等待。
function wait(g,seconds){updateWoodPickup(g,0);for(let t=0;t<seconds-1e-9;t+=.05)updateWoodPickup(g,Math.min(.05,seconds-t));}
// 真实地面木堆的测试入口，不直接增加背包或货舱。
function drop(g,count=8,x=g.player.x,y=g.player.y){dropGroundWood(g,{type:'tree',x,y},count,{weaponIndex:14});return nearestGroundWood(g);}

test('伐木先落地且远处不吸附，靠近0.5秒才入包，重复命中不会多发',()=>{const {g}=scene();g.addTree(1100,800);const tree=g.trees[0],mass=catLoad(g).weight;g.hit(tree,9999);g.hit(tree,9999);assert.equal(g.progress.logistics.bagWood,0);assert.equal(g.progress.woodDrops.piles[0].count,8);assert.equal(g.drops.some(d=>d.wood>0),false);wait(g,2);assert.equal(g.progress.logistics.bagWood,0);Object.assign(g.player,{x:1100,y:800});g.update(0);for(let i=0;i<9;i++)g.update(.05);assert.equal(g.progress.logistics.bagWood,0);assert.equal(playerActionCountdown(g).icon,'wood');g.update(.05);assert.equal(g.progress.logistics.bagWood,8);assert.equal(catLoad(g).weight-mass,4);assert.equal(g.progress.woodDrops.piles.length,0);assert.equal(g.progress.economyLog.income['forest:tree:wood'],8);assert.equal(g.drops.filter(d=>d.wood===8).length,1);});

test('离开范围、切换木堆和换乘都会从零计时，暂停不推进',()=>{const {g}=scene();drop(g);wait(g,.3);g.player.x+=100;wait(g,.05);assert.equal(g.woodPickup,null);g.player.x-=100;wait(g,.45);assert.equal(g.progress.logistics.bagWood,0);g.state='paused';wait(g,5);assert.equal(g.woodPickup.elapsed,.44999999999999996);g.state='playing';g.vehicle.active=true;updateWoodPickup(g,.05);assert.equal(g.woodPickup.elapsed,0);wait(g,.5);assert.equal(g.progress.logistics.builds[0].wood,8);g.vehicle.active=false;drop(g,3,900,800);drop(g,4,970,800);wait(g,.3);g.player.x=970;updateWoodPickup(g,.05);assert.equal(g.woodPickup.elapsed,0);wait(g,.45);assert.equal(g.progress.logistics.bagWood,0);wait(g,.05);assert.equal(g.progress.logistics.bagWood,4);});

test('步行与驾驶整堆拾取会满载时全部跳过，库存不变且仍能移动',()=>{for(const driving of [false,true]){const {g}=scene();g.vehicle.active=driving;const load=driving?vehicleLoad(g):catLoad(g),weight=driving?load.payload:load.weight,stock=driving?g.progress.logistics.builds[0]:g.progress.logistics,key=driving?'wood':'bagWood';stock[key]=Math.floor((load.capacity-weight-1.2)/WOOD_ITEM.mass);const before=stock[key],capacity=woodPickupCapacity(g);assert.ok(capacity>0&&capacity<8);drop(g);wait(g,2);assert.equal((driving?g.progress.logistics.builds[0].wood:g.progress.logistics.bagWood),before);assert.equal(g.progress.woodDrops.piles[0].count,8);assert.equal(g.woodPickup,null);assert.ok(movementLoadFactor(g)>0);const x=g.player.x;for(let i=0;i<8;i++)g.update(.05,{x:1,y:0});assert.ok(g.player.x>x);}});

test('恰好填满的一堆也不拾取，载荷不足提醒节流，清理后可重拾',()=>{const {g,events}=scene(),original=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight+4;drop(g);wait(g,1);assert.equal(g.progress.logistics.bagWood,0);assert.equal(g.progress.woodDrops.piles[0].count,8);assert.equal(events.filter(e=>e.type==='story-hint').length,1);assert.match(events.find(e=>e.type==='story-hint').data.text,/载荷满.*跳过/);LOAD_RULES.catCapacity=original;wait(g,.5);assert.equal(g.progress.logistics.bagWood,8);}finally{LOAD_RULES.catCapacity=original;}});

test('保存失败或异常保留木堆和库存，重试不重复统计和收入',()=>{for(const fail of [()=>false,()=>{throw Error('失败');}]){const {g}=scene();drop(g);const before=structuredClone(g.progress);g.livingPersist=fail;wait(g,.5);assert.deepEqual(g.progress,before);assert.equal(g.drops.length,0);g.livingPersist=()=>true;wait(g,1.55);assert.equal(g.progress.logistics.bagWood,8);assert.equal(g.progress.woodDrops.piles.length,0);assert.equal(g.progress.economyLog.income['forest:tree:wood'],8);}});

test('地面余量跨存档和地图保留，周期镜像可以拾取，同处掉落合堆',()=>{const {g}=scene();drop(g,5);drop(g,3);assert.equal(g.progress.woodDrops.piles.length,1);g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.woodDrops.piles[0].count,8);g.mapId='jiuzhaigou';wait(g,1);assert.equal(g.progress.logistics.bagWood,0);drop(g,4);assert.equal(g.progress.woodDrops.piles.length,2);g.mapId='forest';g.player.x+=WORLD.width;wait(g,.5);assert.equal(g.progress.logistics.bagWood,8);assert.equal(g.progress.woodDrops.piles.length,1);assert.equal(g.progress.woodDrops.piles[0].mapId,'jiuzhaigou');});

test('屋内、死亡和借用玩法不拾取森林物品，负重满时也不入包',()=>{for(const mutate of [g=>g.cottage={kind:'cottage'},g=>g.player.hp=0,g=>g.realm={},g=>g.story={},g=>g.progress.logistics.bagWood=1000]){const {g}=scene();drop(g);mutate(g);const count=g.progress.logistics.bagWood;wait(g,1);assert.equal(g.progress.logistics.bagWood,count);assert.equal(g.progress.woodDrops.piles[0].count,8);assert.equal(g.woodPickup,null);}});

test('新手先导航地面木材，实际拾取后才累计伐木记录，读档不继承倒计时',()=>{const p=freshRangerProgress();Object.assign(p.arrival,{phase:'gather',keys:true,parked:false});const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.livingPersist=()=>true;Object.assign(g.player,{x:900,y:800});const before=g.progress.arrival.wood;drop(g);assert.equal(arrivalWorkshopObjective(g).key,'arrival-wood-pickup');wait(g,.25);assert.equal(g.progress.arrival.wood,before);const restored=new Game(validateProgress(structuredClone(g.progress)));assert.equal(restored.woodPickup,null);assert.equal(restored.progress.woodDrops.piles[0].count,8);wait(g,.25);assert.equal(g.progress.arrival.wood,before+8);});

// 合堆不把多棵树变成无法携带的大堆，导航只选当前能装下的物品。
test('同处多棵树保持小堆，导航跳过装不下的木堆，倒计时中变重立即取消',()=>{const {g}=scene();drop(g,8);drop(g,8);assert.equal(g.progress.woodDrops.piles.length,2);const original=LOAD_RULES.catCapacity;try{LOAD_RULES.catCapacity=catLoad(g).weight+2;drop(g,2,970,800);assert.equal(nearestGroundWood(g,true).count,2);assert.equal(nearestGroundWood(g).count,8);LOAD_RULES.catCapacity=original;wait(g,.3);assert.ok(g.woodPickup);LOAD_RULES.catCapacity=catLoad(g).weight+4;wait(g,.25);assert.equal(g.woodPickup,null);assert.equal(g.progress.logistics.bagWood,0);assert.equal(g.progress.woodDrops.piles.length,3);}finally{LOAD_RULES.catCapacity=original;}});
