// 雨水通过真实农活事务、消防生命周期和存档续接处理，不绕过奖励与暂停边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {farmAction,updateFarmRain} from '../src/core/farm.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {beginGardeningLesson} from '../src/progression/mainline-gardening.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {updateFireRescue,requestFireParking,fireObjective} from '../src/core/fire-rescue.js';
import {FIRE_EXIT,FIRE_PARKING} from '../src/world/fire-navigation.js';
import {fireTransferOpacity} from '../src/core/fire-transit.js';
import {worldDistance} from '../src/world/coordinates.js';
// 室外田地包含空地、成长、成熟、手浇和另一张地图，使用固定时间排除墙钟误差。
function farm(){const p=freshProgress();p.arrival=null;p.farm.seeds[0]=2;p.farm.plots=[0,1,2,3,4].map(id=>({id,x:2000+id*40,y:2000,mapId:id===4?'jiuzhaigou':'forest',crop:id===0?null:0,plantedAt:id===0?0:1000,readyAt:id===0?0:id===2?5000:id===3?46000:61000,watered:id===3}));return {state:'playing',mapId:'forest',livingWeather:'rain',progress:p,player:{x:2040,y:2000},trees:[],livingPersist:()=>true};}
// 消防测试明确开放已修复设施，避免旧夹具在接警前即被权限拦截。
function fire(){const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';const g=new Game(p,()=>.4);g.start();g.livingWeather='sun';return g;}
// 只推进既有转场与消防更新，真实碰撞、连续路径和交接结算仍由正式代码执行。
function transit(g){for(let i=0;i<5000&&g.fireTransit;i++)updateFireRescue(g,.05);assert.equal(g.fireTransit,false);}
// 通过正式借车流程建立活动救援，不直接构造火场或结算状态。
function activeFire(){const g=fire();assert.ok(g.requestFireRescue());assert.ok(g.startFireRescue());transit(g);assert.equal(g.fireRescue.phase,'active');return g;}
test('雨与雷雨湿润当前地图所有田地，空田也保存，成熟和已浇作物不重复加速',()=>{
 for(const weather of ['rain','thunder']){const g=farm();g.livingWeather=weather;assert.ok(updateFarmRain(g,10000));const plots=g.progress.farm.plots;assert.deepEqual(plots.map(p=>p.watered),[true,true,true,true,false]);assert.deepEqual(plots.map(p=>p.readyAt),[0,46000,5000,46000,61000]);const once=structuredClone(g.progress);assert.equal(updateFarmRain(g,11000),false);assert.deepEqual(g.progress,once);g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.farm.plots[0].watered,true);assert.equal(updateFarmRain(g,12000),false);assert.ok(farmAction(g,'water',{plot:1,now:12000}).ok);assert.equal(g.progress.farm.plots[1].readyAt,46000);}
});
test('晴天阴天雪天、暂停与副本不浇田，保存失败回滚并限频重试',()=>{
 for(const weather of ['sun','cloud','snow']){const g=farm();g.livingWeather=weather;assert.equal(updateFarmRain(g,10000),false);assert.equal(g.progress.farm.plots[1].watered,false);}
 const g=farm();g.state='paused';assert.equal(updateFarmRain(g,10000),false);g.state='playing';g.realm={mode:'tower'};assert.equal(updateFarmRain(g,10000),false);g.realm=null;const before=structuredClone(g.progress);let saves=0;g.livingPersist=()=>{saves++;return false;};assert.equal(updateFarmRain(g,10000),false);assert.deepEqual(g.progress,before);updateFarmRain(g,10500);assert.equal(saves,1);g.livingPersist=()=>true;assert.ok(updateFarmRain(g,11000));
});
test('雨中播种即时湿润，园艺浇水目标完成，收割重种仍每茬只加速一次',()=>{
 const g=farm();g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('neighbor-garden'));g.progress.mainline.currentId='neighbor-garden';g.progress.mainline.phase='doing';beginGardeningLesson(g.progress);g.progress.farm.plots=[{id:0,x:2040,y:2000,mapId:'forest',crop:null,plantedAt:0,readyAt:0,watered:true}];g.progress.farm.seeds[1]=2;
 assert.ok(farmAction(g,'plant',{plot:0,crop:1,now:10000}).ok);assert.equal(g.progress.mainline.gardening.watered,1);assert.equal(g.progress.farm.plots[0].readyAt,10000+FARM_CROPS[1].seconds*750);
 const ready=g.progress.farm.plots[0].readyAt;assert.ok(farmAction(g,'harvest',{plot:0,now:ready}).ok);assert.equal(g.progress.mainline.gardening.harvested,1);assert.equal(g.progress.farm.plots[0].watered,true);assert.ok(farmAction(g,'plant',{plot:0,crop:1,now:ready+1}).ok);assert.equal(g.progress.farm.plots[0].readyAt,ready+1+FARM_CROPS[1].seconds*750);
});

// 雨停、天气切换与读档不能让撒种动作抹掉空田已经获得的水分。
test('湿润空田播种继承水分，雨停与读档后仍只享受一次本茬加速',()=>{
 for(const weather of ['sun','cloud','rain','thunder']){
  const g=farm();assert.ok(updateFarmRain(g,10000));g.livingWeather=weather;
  g.progress=validateProgress(structuredClone(g.progress));
  const watered=g.progress.farm.watered,seed=g.progress.farm.seeds[0];
  assert.ok(farmAction(g,'plant',{plot:0,crop:0,now:11000}).ok);
  const p=g.progress.farm.plots[0],ready=11000+FARM_CROPS[0].seconds*750;
  assert.equal(p.watered,true,weather);assert.equal(p.readyAt,ready);assert.equal(g.progress.farm.watered,watered+1);assert.equal(g.progress.farm.seeds[0],seed-1);
  g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.farm.plots[0].watered,true);
  assert.ok(farmAction(g,'water',{plot:0,now:12000}).ok);assert.equal(g.progress.farm.plots[0].readyAt,ready);assert.equal(g.progress.farm.watered,watered+1);
 }
});

// 只继承当前田的水分，不能在非雨天顺带浇湿其他干田；保存失败保留种子和任务事实。
test('湿田播种事务失败不扣种子，晴天干田和其他田块不被顺带浇湿',()=>{
 const g=farm();g.livingWeather='sun';g.progress.farm.plots[0].watered=true;
 const before=structuredClone(g.progress);g.livingPersist=()=>false;
 assert.equal(farmAction(g,'plant',{plot:0,crop:0,now:10000}).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'plant',{plot:0,crop:0,now:10000}).ok);
 assert.equal(g.progress.farm.plots[0].watered,true);assert.equal(g.progress.farm.plots[1].watered,false);
 const dry=farm();dry.livingWeather='sun';assert.ok(farmAction(dry,'plant',{plot:0,crop:0,now:10000}).ok);
 assert.equal(dry.progress.farm.plots[0].watered,false);assert.equal(dry.progress.farm.plots[0].readyAt,10000+FARM_CROPS[0].seconds*1000);
});

// 湿土已经满足新苗的用水需求，园艺委托和一次性赠种必须与手浇、降雨一致。
test('雨停后湿田播种同步完成照料目标，入门种子只发一次',()=>{
 const g=farm();g.livingWeather='sun';g.progress.farm.plots=[{id:0,x:2040,y:2000,mapId:'forest',crop:null,plantedAt:0,readyAt:0,watered:true}];g.progress.farm.dug=1;g.progress.farm.seeds[1]=1;
 Object.assign(g.progress.mainline,{currentId:'neighbor-garden',phase:'doing'});beginGardeningLesson(g.progress);
 const result=farmAction(g,'plant',{plot:0,crop:1,now:10000});assert.ok(result.ok);assert.equal(result.lesson,true);assert.equal(g.progress.mainline.gardening.watered,1);assert.equal(g.progress.farm.seeds[1],2);
 assert.ok(farmAction(g,'water',{plot:0,now:11000}).ok);assert.equal(g.progress.farm.seeds[1],2);assert.equal(g.progress.farm.watered,1);
});
test('未接火警雨中自然解除，不发奖励也不在雨天反复产生随机火警',()=>{
 const g=fire();g.requestFireRescue();g.livingWeather='rain';const coins=g.progress.coins;for(let i=0;i<125;i++)updateFireRescue(g,.05);assert.equal(g.fireRescue,null);assert.equal(g.progress.coins,coins);assert.equal(g.progress.realms.records.fire.clears,0);g.fireClock=0;updateFireRescue(g,1);assert.equal(g.fireRescue,null);g.livingWeather='sun';updateFireRescue(g,1);assert.equal(g.fireRescue.phase,'offered');
});
// 雨灭保留原车与野外位置，返程可以暂停和重载，入库完成前不得发奖。
test('雨水逐步灭火后原地驾驶返站，暂停读档不瞬移且交接只奖励一次',()=>{
 const g=activeFire(),r=g.fireRescue,water=r.water,before=g.progress.coins,truck=g.vehicle;
 const position={x:2000,y:1900};Object.assign(g.player,position);g.livingWeather='rain';r.spread=.01;
 const count=r.fires.filter(f=>f.ever).length;updateFireRescue(g,1);
 assert.equal(r.fires.find(f=>f.lit).hp,55);assert.equal(r.fires.filter(f=>f.ever).length,count);assert.equal(r.water,water);
 g.pause();updateFireRescue(g,20);assert.equal(r.fires.find(f=>f.lit).hp,55);g.start();g.enemies.push({fireEvent:true,hp:30});
 for(let i=0;i<105&&!r.rainExtinguished;i++)updateFireRescue(g,.05);
 assert.ok(r.rainExtinguished);assert.equal(g.enemies.some(e=>e.fireEvent),false);assert.equal(r.phase,'returning');
 assert.equal(g.fireTransit,false);assert.equal(fireTransferOpacity(g),0);assert.equal(g.vehicle,truck);assert.ok(truck.active);
 assert.deepEqual({x:g.player.x,y:g.player.y},position);assert.equal(g.progress.coins,before);assert.equal(g.progress.realms.records.fire.clears,0);
 assert.deepEqual(fireObjective(g).point,FIRE_PARKING);assert.equal(requestFireParking(g),false,'野外不能提前结算');
 g.pause();updateFireRescue(g,20);g.syncFireRescue();
 const restored=new Game(validateProgress(structuredClone(g.progress)),()=>.4);assert.equal(restored.fireRescue.phase,'returning');
 assert.equal(restored.state,'paused');assert.ok(restored.vehicle.active);assert.deepEqual({x:restored.player.x,y:restored.player.y},position);
 restored.start();restored.livingWeather='sun';updateFireRescue(restored,20);assert.equal(restored.fireRescue.phase,'returning');assert.equal(restored.progress.coins,before);
 Object.assign(restored.player,FIRE_PARKING);assert.ok(requestFireParking(restored));assert.equal(restored.progress.coins,before);
 transit(restored);assert.equal(restored.fireRescue.phase,'won');assert.equal(restored.progress.realms.records.fire.clears,1);assert.equal(restored.progress.campLevel.xp,50);
 assert.ok(restored.progress.coins>before);assert.ok(worldDistance(restored.player,FIRE_EXIT)<1);assert.equal(restored.vehicle.active,false);assert.ok(restored.fireGarageParked);
 const paid=restored.progress.coins;updateFireRescue(restored,20);restored.syncFireRescue();const loaded=new Game(validateProgress(structuredClone(restored.progress)));
 assert.equal(loaded.progress.coins,paid);assert.equal(loaded.progress.realms.records.fire.clears,1);
});
// 出车前的雨灭只标记火情已解除，仍完成登车与出库，再由玩家驾车交接。
test('雷雨在出车途中灭火，读档后仍登车驶出并等待驾车返站',()=>{
 const g=fire();g.requestFireRescue();g.startFireRescue();g.livingWeather='thunder';
 for(let i=0;i<125&&!g.fireRescue.rainExtinguished;i++)updateFireRescue(g,.05);
 assert.ok(g.fireRescue.rainExtinguished);g.syncFireRescue();const restored=new Game(validateProgress(structuredClone(g.progress)),()=>.4);
 assert.ok(restored.fireRescue.rainExtinguished);restored.start();restored.livingWeather='sun';transit(restored);updateFireRescue(restored,.05);
 assert.equal(restored.fireRescue.phase,'returning');assert.ok(restored.vehicle.active);assert.equal(restored.progress.realms.records.fire.clears,0);
 assert.ok(requestFireParking(restored));transit(restored);assert.equal(restored.fireRescue.phase,'won');assert.equal(restored.progress.realms.records.fire.clears,1);
});
test('晴天原火场仍需人工灭火，死亡和超时不会被雨天判作成功',()=>{
 const g=activeFire();Object.assign(g.player,{x:2000,y:1900});const hp=g.fireRescue.fires[0].hp;updateFireRescue(g,1);assert.equal(g.fireRescue.fires[0].hp,hp);g.fireRescue.remaining=.01;g.livingWeather='rain';updateFireRescue(g,.05);assert.equal(g.fireRescue.phase,'lost');assert.equal(g.progress.realms.records.fire.clears,0);
 const dead=activeFire();dead.state='dead';dead.livingWeather='rain';updateFireRescue(dead,1);assert.equal(dead.fireRescue.phase,'lost');assert.equal(dead.progress.realms.records.fire.clears,0);
});
