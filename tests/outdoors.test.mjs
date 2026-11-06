// 以正式湖水、存档和动作入口验证露营垂钓，避免直接置位鱼获冒充操作。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {fishingShores,campPlacement} from '../src/world/outdoor-sites.js';
import {touchesLandform} from '../src/world/natural-terrain.js';
import {blocked} from '../src/physics/motion.js';
import {catLoad,vehicleLoad} from '../src/progression/load-weight.js';
import {backpackEntries} from '../src/progression/backpack.js';
import {outdoorFishingView} from '../src/rendering/outdoors.js';
import {requestWorldNavigation,worldNavigationObjective} from '../src/core/world-navigation.js';
import {OUTDOOR_RULES,FISH_SPECIES} from '../src/config/outdoors.js';
import {worldDistance} from '../src/world/coordinates.js';
import {livingSafePoint} from '../src/world/living-spaces.js';
import {selectOutdoorGlider,buyOutdoorGear,sellOutdoorFish,deployCamp,packCamp,unloadCampKit,sleepAtCamp,beginFishing,fishingControl,finishFishing,updateOutdoors} from '../src/core/outdoors.js';

// 只准备自由巡林档与保存回调，装备与鱼获仍通过真实业务提交。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.restoration.repaired=TOWN_RESTORATIONS.map(r=>r.id);p.restoration.cottageRested=true;p.mainline.completed=[...MAINLINE_IDS];p.coins=1000;p.vehicleHulls[0]=1;p.vehicleIndex=0;
 const g=new Game(p,()=>.4);g.state='playing';g.livingPersist=g.mainlinePersist=()=>true;g.enemies=[];g.boss=null;g.vehicle.active=false;g.progress.campParking.owned=[];g.progress.living.patrolActive=false;g.cottage=null;g.mainlineSpeech=null;g.mainlineTalkDelay=g.spawnTimer=g.fireClock=99999;return g;
}
// 采购全套物品后站到由正式地形搜索得到的可通行湖岸。
function angler(){const g=scene();g.cottage={kind:'outdoor'};for(const id of ['tent','rod','bait'])assert.equal(buyOutdoorGear(g,id).ok,true);g.cottage=null;Object.assign(g.player,fishingShores(g)[0]);return g;}
// 固定步长推进状态机，暂停时也调用以检查状态机自身的保护。
function tick(g,seconds){for(let t=0;t<seconds;t+=.04)updateOutdoors(g,.04);}
// 完整抛投到黑漂，中途不会直接改写状态。
function cast(g){assert.equal(beginFishing(g).ok,true);fishingControl(g,'press');tick(g,1.2);fishingControl(g,'release');tick(g,7.48);assert.equal(g.fishing.phase,'bite');}
// 找一块经过正式碰撞采样的野外空地，保留原有树木与水界。
function wilderness(g){for(let y=1900;y<7000;y+=300)for(let x=1900;x<9000;x+=300){if(blocked(x,y,16,g.trees,{mapId:g.mapId,livingCollision:true}))continue;Object.assign(g.player,{x,y});if(campPlacement(g))return;}throw Error('没有可用空地');}

test('旧档迁移与非法营地、负数鱼饵和鱼种清理',()=>{
 const p=freshProgress();assert.equal(p.outdoors.tent,false);delete p.outdoors;assert.equal(validateProgress(p).outdoors.bait,0);
 p.outdoors={bait:-8,fish:{carp:999,unknown:2},camp:{x:NaN,y:3,mapId:'forest',mode:'tent'}};const o=validateProgress(p).outdoors;assert.equal(o.bait,0);assert.equal(o.camp,null);assert.equal(o.fish.carp,60);assert.equal(o.fish.unknown,undefined);
});
test('柜台购买原子保存、重复拥有与背包重量一致',()=>{
 const g=scene();assert.equal(buyOutdoorGear(g,'tent').ok,false);g.cottage={kind:'outdoor'};const weight=catLoad(g).weight;
 g.livingPersist=()=>false;assert.equal(buyOutdoorGear(g,'tent').ok,false);assert.equal(g.progress.coins,1000);assert.equal(g.progress.outdoors.tent,false);
 g.livingPersist=()=>true;assert.equal(buyOutdoorGear(g,'tent').ok,true);assert.equal(catLoad(g).weight-weight,6);assert.equal(buyOutdoorGear(g,'tent').ok,false);assert.equal(g.progress.coins,820);
 const item=backpackEntries(g).find(i=>i.id==='outdoor:tent');assert.ok(item.description&&item.use&&item.icon);g.progress.logistics.bagWood=999;assert.ok(buyOutdoorGear(g,'rod').ok);assert.equal(g.progress.shopStock.home['outdoor:rod'],1);assert.equal(buyOutdoorGear(g,'rod').ok,false);
});
test('两张地图湖岸可站立，浮漂落在真实水域，非湖岸不能抛竿',()=>{
 const g=angler();for(const mapId of ['forest','jiuzhaigou']){g.mapId=mapId;const shores=fishingShores(g);assert.ok(shores.length);for(const s of shores){assert.equal(blocked(s.x,s.y,16,g.trees,{mapId,livingCollision:mapId==='forest'}),false);assert.equal(touchesLandform(s.lake,s.water.x,s.water.y),true);}}
 g.mapId='forest';Object.assign(g.player,scene().player);assert.equal(beginFishing(g).ok,false);
});

test('未结束的远处清缴和已脱战领主不阻止湖边钓鱼，回来接战仍中断',()=>{
 const g=angler(),shore=fishingShores(g).find(s=>!livingSafePoint(s));assert.ok(shore,'使用营地安全区外的湖岸检查重新接战');Object.assign(g.player,{x:shore.x,y:shore.y});g.progress.living.patrolActive=true;
 g.progress.living.clearingSite={x:shore.x+1800,y:shore.y,radius:300,origin:{x:shore.x+1800,y:shore.y+400}};
 g.boss={id:999,x:shore.x+1500,y:shore.y,hp:321,disengaged:true};
 assert.equal(beginFishing(g).ok,true);tick(g,.1);assert.ok(g.fishing);assert.equal(g.progress.living.patrolActive,true);assert.equal(g.boss.hp,321);
 g.boss.x=shore.x+100;tick(g,.1);assert.equal(g.fishing,null);assert.equal(beginFishing(g).ok,false);
 g.boss=null;g.progress.living.clearingSite={...g.progress.living.clearingSite,...shore};assert.equal(beginFishing(g).ok,false);
 g.progress.living.clearingSite.x+=1800;g.enemies=[{hp:10,...shore}];assert.equal(beginFishing(g).ok,false);
});

test('两张地图钓鱼导航在可抛竿范围内才算抵达，不提前撤掉路点',()=>{
 const g=angler();
 for(const mapId of ['forest','jiuzhaigou']){
  g.mapId=mapId;const shore=fishingShores(g)[0],dx=shore.x-shore.water.x,dy=shore.y-shore.water.y,d=Math.hypot(dx,dy);
  Object.assign(g.player,{x:shore.x+dx/d*88,y:shore.y+dy/d*88});
  requestWorldNavigation(g,shore,'前往湖岸钓鱼',{direct:true,arrivalRadius:OUTDOOR_RULES.castReach});
  assert.ok(fishingShores(g)[0].distance>OUTDOOR_RULES.castReach,'测试位置仍在抛竿范围外');
  assert.equal(worldNavigationObjective(g)?.site.id,shore.id,'尚不能钓鱼时保留终点');
  Object.assign(g.player,{x:shore.x+dx/d*80,y:shore.y+dy/d*80});
  assert.ok(worldDistance(g.player,shore)<=OUTDOOR_RULES.castReach);assert.equal(worldNavigationObjective(g),null);assert.equal(beginFishing(g).ok,true);fishingControl(g,'cancel');
 }
});
test('营地放置、跨读档与收营保持唯一装备及重量',()=>{
 const g=angler();wilderness(g);const weight=catLoad(g).weight;assert.equal(deployCamp(g).ok,true);assert.ok(Math.abs(catLoad(g).weight-(weight-6))<1e-9);assert.equal(deployCamp(g).ok,false);
 const c=g.progress.outdoors.camp;assert.deepEqual(validateProgress(g.progress).outdoors.camp,c);Object.assign(g.player,c);g.livingPersist=()=>false;assert.equal(packCamp(g).ok,false);assert.ok(g.progress.outdoors.camp);
 g.livingPersist=()=>true;assert.equal(packCamp(g).ok,true);assert.equal(catLoad(g).weight,weight);assert.equal(packCamp(g).ok,false);
});
test('战车驻营要求附近自有完好车辆，无套装也可搭行军床',()=>{
 const g=scene();wilderness(g);Object.assign(g.vehicle,g.player);g.vehicle.mapId=g.mapId;g.vehicle.hp=g.vehicle.maxHp;assert.equal(deployCamp(g,'vehicle').ok,true);assert.equal(g.progress.outdoors.camp.kit,false);Object.assign(g.player,g.progress.outdoors.camp);assert.equal(packCamp(g).ok,true);
 g.progress.vehicleHulls[0]=0;assert.equal(deployCamp(g,'vehicle').ok,false);
});
test('收营跳过满车，套装随可用货舱保存，仅在车旁可取出或重新展开',()=>{
 const g=angler();wilderness(g);assert.ok(deployCamp(g).ok);
 const camp=g.progress.outdoors.camp;Object.assign(g.player,camp);
 g.progress.vehicleHulls[1]=1;
 g.progress.campParking.owned=[0,1].map(hull=>({...camp,spot:null,hull,x:camp.x+20+hull*25,hp:1}));
 g.progress.logistics.builds[0].wood=9999;
 const bag=catLoad(g).weight,cargo=vehicleLoad(g,1).cargo;
 g.livingPersist=()=>false;
 assert.equal(packCamp(g).ok,false);assert.deepEqual(g.progress.outdoors.camp,camp);
 assert.equal(vehicleLoad(g,1).cargo,cargo);
 g.livingPersist=()=>true;assert.ok(packCamp(g).ok);g.progress=validateProgress(g.progress);
 assert.equal(g.progress.outdoors.tentHull,1);assert.equal(vehicleLoad(g,1).cargo,cargo+6);assert.equal(catLoad(g).weight,bag);
 const car=g.progress.campParking.owned.find(r=>r.hull===1);car.x+=800;
 assert.equal(deployCamp(g).ok,false);assert.equal(unloadCampKit(g,1).ok,false);
 car.x-=800;assert.ok(deployCamp(g).ok);assert.equal(vehicleLoad(g,1).cargo,cargo);
 Object.assign(g.player,g.progress.outdoors.camp);car.x=g.player.x+30;car.y=g.player.y;
 assert.ok(packCamp(g).ok);assert.equal(g.progress.outdoors.tentHull,1);assert.ok(unloadCampKit(g,1).ok);
 assert.equal(catLoad(g).weight,bag+6);assert.equal(vehicleLoad(g,1).cargo,cargo);
});
test('货舱和背包都满时保留营地，清理背包后重试只收一份套装',()=>{
 const g=angler();wilderness(g);assert.ok(deployCamp(g).ok);
 const camp=g.progress.outdoors.camp;Object.assign(g.player,camp);
 g.progress.campParking.owned=[{...camp,hull:0,spot:null,hp:1}];g.progress.logistics.builds[0].wood=9999;
 g.progress.logistics.bagWood=999;const result=packCamp(g);
 assert.equal(result.ok,false);assert.match(result.message,/清理/);assert.deepEqual(g.progress.outdoors.camp,camp);
 g.progress.logistics.bagWood=0;assert.ok(packCamp(g).ok);assert.equal(g.progress.outdoors.tentHull,null);
 assert.equal(backpackEntries(g).find(r=>r.id==='outdoor:tent').count,1);assert.equal(packCamp(g).ok,false);
});
test('睡眠只在现场提交回血和时间，保存失败与危险中断均不兑现',()=>{
 const g=angler();wilderness(g);assert.equal(deployCamp(g).ok,true);Object.assign(g.player,g.progress.outdoors.camp);g.player.hp=20;
 assert.equal(sleepAtCamp(g).ok,true);const target={...g.campSleep.target};g.state='paused';tick(g,3);assert.equal(g.campSleep.elapsed,0);g.state='playing';g.livingPersist=()=>false;tick(g,3);assert.equal(g.player.hp,20);
 g.livingPersist=()=>true;assert.equal(sleepAtCamp(g).ok,true);tick(g,3);assert.equal(g.player.hp,g.maxHp());assert.deepEqual(g.progress.living.calendar,target);
 assert.equal(sleepAtCamp(g).ok,true);g.enemies.push({x:g.player.x,y:g.player.y,hp:10});tick(g,.1);assert.equal(g.campSleep,null);
});
test('鱼饵在成功抛竿时扣除，失败可重试；暂停与取消不多扣',()=>{
 const g=angler();assert.equal(beginFishing(g).ok,true);fishingControl(g,'press');tick(g,.8);g.livingPersist=()=>false;fishingControl(g,'release');assert.equal(g.progress.outdoors.bait,20);assert.equal(g.fishing.phase,'ready');
 g.livingPersist=()=>true;fishingControl(g,'press');tick(g,1);fishingControl(g,'release');assert.equal(g.progress.outdoors.bait,19);assert.equal(touchesLandform(g.fishing.shore.lake,g.fishing.water.x,g.fishing.water.y),true);
 g.state='paused';tick(g,10);assert.equal(g.fishing.phase,'casting');g.state='playing';fishingControl(g,'cancel');assert.equal(g.progress.outdoors.bait,19);
});
test('过早扬竿、错过黑漂、硬拉断线均不产生鱼获',()=>{
 const g=angler();assert.equal(beginFishing(g).ok,true);fishingControl(g,'press');fishingControl(g,'release');tick(g,1);fishingControl(g,'press');assert.equal(g.fishing.phase,'missed');tick(g,3);
 cast(g);tick(g,2);assert.equal(g.fishing.phase,'missed');tick(g,3);
 cast(g);fishingControl(g,'press');tick(g,15);assert.equal(g.fishing,null);assert.equal(g.progress.outdoors.caught,0);
});
test('真实收放线可钓起鱼；保存失败不重复结算，柜台出售计入钱包',()=>{
 const g=angler();cast(g);fishingControl(g,'press');
 for(let n=0;n<1800&&g.fishing?.phase==='fight';n++){const f=g.fishing;fishingControl(g,'lean',-(f.direction||1));if(f.tension>.72)fishingControl(g,'release');else if(f.tension<.38)fishingControl(g,'press');updateOutdoors(g,.04);}
 assert.equal(g.fishing.phase,'landed');const caughtFish=FISH_SPECIES[g.fishing.species];g.livingPersist=()=>false;assert.equal(finishFishing(g,true).ok,false);assert.equal(g.progress.outdoors.caught,0);
 g.livingPersist=()=>true;assert.equal(finishFishing(g,true).ok,true);assert.equal(g.progress.outdoors.caught,1);assert.equal(finishFishing(g,true).ok,false);assert.equal(sellOutdoorFish(g).ok,false);
 g.cottage={kind:'outdoor'};const coins=g.progress.coins;assert.equal(sellOutdoorFish(g).ok,true);assert.equal(g.progress.coins,coins+caughtFish.coins);assert.equal(g.progress.outdoors.fish[caughtFish.id],0);assert.equal(g.progress.outdoors.caught,1);
});
test('正式游戏更新锁住移动与开火，离岸和重置会取消钓鱼',()=>{
 const g=angler();assert.equal(beginFishing(g).ok,true);const before={x:g.player.x,y:g.player.y};g.update(.04,{x:1,y:1});assert.equal(g.player.x,before.x);assert.equal(g.player.y,before.y);assert.equal(g.attack(),false);
 g.player.x+=40;tick(g,.1);assert.equal(g.fishing,null);Object.assign(g.player,before);assert.equal(beginFishing(g).ok,true);g.reset();assert.equal(g.fishing,null);
});
test('独立玩法在暂停状态也清理旧钓竿，睡眠被驾驶打断',()=>{
 const g=angler();assert.equal(beginFishing(g).ok,true);g.state='realm';g.realm={mode:'race'};updateOutdoors(g,.04);assert.equal(g.fishing,null);
 g.realm=null;g.state='playing';wilderness(g);assert.equal(deployCamp(g).ok,true);Object.assign(g.player,g.progress.outdoors.camp);assert.equal(sleepAtCamp(g).ok,true);g.vehicle.active=true;tick(g,.1);assert.equal(g.campSleep,null);
});
test('短屏各种湖岸方向都把角色和浮漂留在上下操作区之间',()=>{
 const g=angler();assert.equal(beginFishing(g).ok,true);
 for(const [width,height] of [[320,568],[390,844]])for(let i=0;i<8;i++){const angle=i*Math.PI/4;g.fishing.shore.water={x:g.player.x+Math.cos(angle)*150,y:g.player.y+Math.sin(angle)*150};const v=outdoorFishingView(g,{zoom:.85},width,height);
  for(const p of [g.player,g.fishing.shore.water]){const x=(p.x-v.x)*v.zoom,y=(p.y-v.y)*v.zoom;assert.ok(x>15&&x<width-15);assert.ok(y>136&&y<height-300);}
 }
});

// 验证购伞、免费换装和存档失败时的钱包及所有权。
test('户外店购伞后保留型号，换装免费，失败不扣款',()=>{
 const g=scene();g.cottage={kind:'outdoor'};
 assert.equal(g.progress.outdoors.selectedGlider,'basic');
 g.livingPersist=()=>false;
 assert.equal(selectOutdoorGlider(g,'swift').ok,false);
 assert.equal(g.progress.coins,1000);
 assert.deepEqual(g.progress.outdoors.gliders,['basic']);
 g.livingPersist=()=>true;
 assert.ok(selectOutdoorGlider(g,'swift').ok);
 assert.equal(g.progress.coins,520);
 assert.equal(validateProgress(g.progress).outdoors.selectedGlider,'swift');
 assert.equal(selectOutdoorGlider(g,'voyager').ok,false);
 assert.ok(selectOutdoorGlider(g,'basic').ok);
 assert.ok(selectOutdoorGlider(g,'swift').ok);
 assert.equal(g.progress.coins,520);
 g.progress.coins=960;
 assert.ok(selectOutdoorGlider(g,'voyager').ok);
 assert.equal(g.progress.coins,0);
 assert.deepEqual(validateProgress(g.progress).outdoors.gliders,['basic','swift','voyager']);
});
