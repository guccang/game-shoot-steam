// 收获去向、满载确认与队列共用正式事务，拒绝和保存失败都保留整茬作物。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {farmAction,setFarmTool,queueFarmWork,updateFarmWork,resolveHarvestLoad} from '../src/core/farm.js';
import {harvestDestination} from '../src/core/farm-harvest-load.js';
import {catLoad,vehicleLoad} from '../src/progression/load-weight.js';
import {farmApproach} from '../src/world/farm-land.js';
import {itemDefinition} from '../src/config/items.js';
import {WORLD} from '../src/world/coordinates.js';

// 设置两块成熟田和固定停车点，场景无临时活动或自动售货范围。
function scene(car=true){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.farm.wildMaps=['forest','jiuzhaigou'];p.vehicleHulls.fill(0);if(car)p.vehicleHulls[0]=1;
 p.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:893+id*56,y:2752,crop:0,plantedAt:1,readyAt:2,watered:false}));p.farm.nextId=2;
 const g=new Game(p,()=>.4);g.state='playing';g.vehicle.active=false;g.enemies=[];g.trees=[];g.boss=null;g.mainlineSpeech=null;g.livingPersist=()=>true;Object.assign(g.player,{x:893,y:2814});g.progress.campParking.owned=car?[{hull:0,spot:null,mapId:'forest',x:900,y:2840,hp:1,ammo:0}]:[];return g;
}
// 每一步仍使用正式农活更新，只把测试角色放到合法动作位以免等待寻路。
function advance(g,until){for(let i=0;i<150;i++){const job=g.farmWork?.job||g.farmWork?.queue[0];if(job&&!job.hit&&!job.loadRequest)Object.assign(g.player,farmApproach(g,job.point,job.action));updateFarmWork(g,.04,{x:0,y:0});if(until())return;}throw Error('农活没有到达预期状态');}
// 用实际负重算出临界点，避免测试依赖初始弹药或装备重量常量。
function nearLimit(g,hull){const load=hull===null?catLoad(g):vehicleLoad(g,hull,{driver:true}),remaining=load.capacity-(load.weight??load.payload)-.25;if(hull!==null){const mass=itemDefinition('material:wood').mass,n=Math.max(0,Math.floor(remaining/mass));g.progress.logistics.builds[hull].wood+=n;const rest=remaining-n*mass;g.progress.supplies.vehicles[hull].light+=Math.max(0,Math.ceil(rest/.002));}else g.progress.supplies.hand.light+=Math.max(0,Math.ceil(remaining/.002));}

test('收获优先进入附近载具，无车或车不在附近时进入背包',()=>{
 const g=scene();assert.equal(farmAction(g,'harvest',{plot:0}).ok,true);assert.equal(g.progress.logistics.builds[0].cargo[0],1);assert.equal(g.progress.farm.inventory[0],0);
 g.progress.campParking.owned[0].x+=500;g.player.x+=56;assert.equal(farmAction(g,'harvest',{plot:1}).ok,true);assert.equal(g.progress.farm.inventory[0],1);
 const foot=scene(false);assert.equal(farmAction(foot,'harvest',{plot:0}).ok,true);assert.equal(foot.progress.farm.inventory[0],1);
});
test('多车选择最近可用车，跨图、维修及报废车不作为收获目标',()=>{
 const g=scene();g.progress.vehicleHulls[1]=1;g.progress.campParking.owned.push({hull:1,spot:null,mapId:'forest',x:g.player.x,y:g.player.y+5,hp:1,ammo:0});assert.equal(harvestDestination(g).hull,1);
 g.progress.campParking.owned[1].mapId='jiuzhaigou';assert.equal(harvestDestination(g).hull,0);g.progress.vehicleService[0]={phase:'repairing'};assert.equal(harvestDestination(g).hull,null);g.progress.vehicleService[0]=null;g.vehicles[0].hp=0;assert.equal(harvestDestination(g).hull,null);
});
for(const hull of [null,0])test((hull===null?'背包':'货舱')+'本次收获触及上限时先确认，取消或保存失败不扣作物不发经验',()=>{
 const g=scene(hull!==null);nearLimit(g,hull);const before=structuredClone(g.progress),r=farmAction(g,'harvest',{plot:0});assert.equal(r.ok,false);assert.equal(r.needsLoadConfirmation,true);assert.equal(r.load.hull,hull);assert.ok(r.load.before<r.load.capacity&&r.load.after>=r.load.capacity);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>false;assert.equal(farmAction(g,'harvest',{plot:0,loadConfirmation:r.confirmation}).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.equal(farmAction(g,'harvest',{plot:0,loadConfirmation:r.confirmation}).ok,true);assert.equal(g.progress.farm.plots[0].crop,null);assert.equal((hull===null?g.progress.farm.inventory:g.progress.logistics.builds[hull].cargo)[0],1);assert.equal(g.progress.farm.harvested,before.farm.harvested+1);assert.equal(farmAction(g,'harvest',{plot:0,loadConfirmation:r.confirmation}).ok,false);
});
test('负重或收获目标变化使旧确认失效，不把满载货舱悄悄改投背包',()=>{
 const g=scene();nearLimit(g,0);const first=farmAction(g,'harvest',{plot:0});g.progress.logistics.builds[0].wood++;const second=farmAction(g,'harvest',{plot:0,loadConfirmation:first.confirmation});assert.equal(second.needsLoadConfirmation,true);assert.notEqual(first.confirmation,second.confirmation);assert.equal(g.progress.farm.inventory[0],0);
 g.player.x+=56;const other=farmAction(g,'harvest',{plot:1,loadConfirmation:second.confirmation});assert.equal(other.needsLoadConfirmation,true);assert.equal(g.progress.farm.plots[1].crop,0);
});
test('刚好达到上限也要确认，改换收货来源不沿用旧授权',()=>{
 const g=scene(false);g.progress.farm.lessonRewarded=true;nearLimit(g,null);g.progress.supplies.hand.light-=125;const exact=farmAction(g,'harvest',{plot:0});assert.equal(exact.load.after,exact.load.capacity);assert.equal(exact.needsLoadConfirmation,true);
 const car=scene();nearLimit(car,0);const old=farmAction(car,'harvest',{plot:0});car.progress.campParking.owned[0].x+=500;nearLimit(car,null);const changed=farmAction(car,'harvest',{plot:0,loadConfirmation:old.confirmation});assert.equal(changed.load.hull,null);assert.equal(changed.needsLoadConfirmation,true);assert.equal(car.progress.farm.plots[0].crop,0);
});
test('批量收割在临界一份暂停，取消保留当前和后续田块；确认仅放行一份',()=>{
 const g=scene();nearLimit(g,0);setFarmTool(g,'harvest');for(const plot of [0,1])assert.equal(queueFarmWork(g,'harvest',{plot}).ok,true);advance(g,()=>!!g.farmWork.job?.loadRequest);const job=g.farmWork.job;assert.equal(g.farmWork.queue.length,1);
 for(let i=0;i<40;i++)updateFarmWork(g,.04,{x:0,y:0});assert.equal(g.progress.farm.harvested,0);assert.equal(resolveHarvestLoad(g,job,false).ok,false);assert.equal(g.farmWork.job,null);assert.equal(g.farmWork.queue.length,0);assert.equal(g.progress.farm.plots[0].crop,0);
 for(const plot of [0,1])queueFarmWork(g,'harvest',{plot});advance(g,()=>!!g.farmWork.job?.loadRequest);assert.equal(resolveHarvestLoad(g,g.farmWork.job,true).ok,true);advance(g,()=>g.progress.farm.harvested===1);advance(g,()=>!!g.farmWork.job?.loadRequest);assert.equal(g.progress.farm.plots[1].crop,0);assert.equal(g.progress.logistics.builds[0].cargo[0],1);
});
test('循环地图距离仍选近车，换工具取消旧农活确认',()=>{
 const g=scene();g.player.x+=WORLD.width;assert.equal(harvestDestination(g).hull,0);nearLimit(g,0);setFarmTool(g,'harvest');queueFarmWork(g,'harvest',{plot:0});advance(g,()=>!!g.farmWork.job?.loadRequest);const job=g.farmWork.job;setFarmTool(g,'hoe');assert.equal(resolveHarvestLoad(g,job,true).ok,false);assert.equal(g.progress.farm.plots[0].crop,0);
});
