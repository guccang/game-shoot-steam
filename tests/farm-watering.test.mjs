// 水壶回归覆盖数量、范围、重复浇水上限、原子保存与动作命中时机。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {farmAction,farmWaterTargets,setFarmTool,queueFarmWork,updateFarmWork} from '../src/core/farm.js';
import {farmGrowth,validateFarm} from '../src/progression/farm.js';
import {farmCell,FARM_CROPS} from '../src/config/farm.js';
import {farmApproach} from '../src/world/farm-land.js';
// 营地测试田只用作初始夹具，结算均调用正式事务。
function scene(){const progress=freshRangerProgress();progress.farm.seeds[0]=1;progress.farm.plots=Array.from({length:8},(_,id)=>({...farmCell(id),mapId:'forest',crop:0,plantedAt:1000,readyAt:61000,watered:false}));progress.farm.nextId=8;return {state:'playing',mapId:'forest',progress,player:{...farmCell(1),hp:100,mapId:'forest'},trees:[],vehicles:[],livingPersist:()=>true};}
test('一次只浇点击的田块，邻田、其他地图和远田不受影响',()=>{
 const g=scene();g.progress.farm.plots.push({...g.progress.farm.plots[1],id:20,mapId:'jiuzhaigou'});
 const ids=farmWaterTargets(g.progress.farm,1,'forest',10000).map(p=>p.id);assert.deepEqual(ids,[1]);
 const r=farmAction(g,'water',{plot:1,now:10000});assert.ok(r.ok);assert.equal(r.wateredPlots.length,1);
 for(const p of g.progress.farm.plots){assert.equal(p.readyAt,ids.includes(p.id)?46000:61000);assert.equal(p.watered,ids.includes(p.id));}
 assert.equal(g.progress.coins,0);assert.equal(g.progress.farm.harvested,0);
});
test('重复浇水与重载不再减时，空田、成熟田和远处操作被拒绝',()=>{
 const g=scene();assert.ok(farmAction(g,'water',{plot:1,now:10000}).ok);g.progress=validateProgress(structuredClone(g.progress));const before=structuredClone(g.progress);
 const repeat=farmAction(g,'water',{plot:1,now:11000});assert.equal(repeat.ok,true);assert.equal(repeat.wateredPlots[0].savedSeconds,0);assert.deepEqual(g.progress,before);
 g.progress.farm.plots[3].crop=null;assert.equal(farmAction(g,'water',{plot:3,now:11000}).ok,false);
 Object.assign(g.player,farmCell(7));assert.equal(farmAction(g,'water',{plot:7,now:62000}).ok,false);
 g.player.x+=300;assert.equal(farmAction(g,'water',{plot:7,now:11000}).ok,false);
});
test('每种作物按原始时长减25%，晚浇最多提前至现在，不提前发金币',()=>{
 for(let crop=0;crop<FARM_CROPS.length;crop++){const g=scene(),p=g.progress.farm.plots[1],duration=FARM_CROPS[crop].seconds*1000;p.crop=crop;p.readyAt=p.plantedAt+duration;
  const early=scene();early.progress.farm.plots[1]={...p};assert.ok(farmAction(early,'water',{plot:1,now:10000}).ok);assert.equal(early.progress.farm.plots[1].readyAt,p.readyAt-duration*.25);
  const r=farmAction(g,'water',{plot:1,now:p.readyAt-1000});assert.ok(r.ok);const after=g.progress.farm.plots[1];assert.equal(after.readyAt,p.readyAt-1000);assert.equal(farmGrowth(after,p.readyAt-1000),1);assert.equal(g.progress.coins,0);
 }
});
test('地图接缝不扩散到邻田，无效目标不会改浇其他田',()=>{
 const g=scene();g.progress.farm.plots=[{id:0,mapId:'forest',x:10,y:100,crop:0,plantedAt:1000,readyAt:61000},{id:1,mapId:'forest',x:10770,y:100,crop:0,plantedAt:1000,readyAt:61000},{id:2,mapId:'forest',x:90,y:100,crop:0,plantedAt:1000,readyAt:61000},{id:3,mapId:'forest',x:91,y:100,crop:0,plantedAt:1000,readyAt:61000}];
 assert.deepEqual(farmWaterTargets(g.progress.farm,0,'forest',10000).map(p=>p.id),[0]);g.progress.farm.plots[1].watered=true;g.progress.farm.plots[2].readyAt=9000;assert.deepEqual(farmWaterTargets(g.progress.farm,0,'forest',10000).map(p=>p.id),[0]);g.progress.farm.plots[0].crop=null;assert.deepEqual(farmWaterTargets(g.progress.farm,0,'forest',10000),[]);
});
test('保存失败回滚单田，收获重种重置本茬浇水资格，旧档默认未浇水',()=>{
 const g=scene(),before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(farmAction(g,'water',{plot:1,now:10000}).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;farmAction(g,'water',{plot:1,now:10000});assert.ok(farmAction(g,'harvest',{plot:1,now:46000}).ok);assert.equal(g.progress.farm.plots[1].watered,false);
 assert.ok(farmAction(g,'plant',{plot:1,now:47000}).ok);assert.ok(farmAction(g,'water',{plot:1,now:48000}).ok);assert.equal(g.progress.farm.plots[1].readyAt,92000);
 // 当前支持的v6旧记录缺少浇水字段时补false；更早版本遵循现行重置合同。
 const old=validateFarm({version:6,plots:[{...farmCell(0),mapId:'forest',id:0,crop:0,plantedAt:1000,readyAt:61000}]});assert.equal(old.plots[0].watered,false);assert.equal(validateFarm({version:2}).plots.length,0);
});
test('走近动作落水才修改单田，移动取消不加速，队列重复点击只做一次',()=>{
 const g=scene(),now=Date.now();for(const p of g.progress.farm.plots){p.plantedAt=now;p.readyAt=now+60000;}setFarmTool(g,'water');queueFarmWork(g,'water',{plot:1});queueFarmWork(g,'water',{plot:1});assert.equal(g.farmWork.queue.length,1);
 // 使用浇水专属操作位，夹具不执行实际寻路；结算时刻与取消断言保持不变。
 Object.assign(g.player,farmApproach(g,g.progress.farm.plots[1],'water'));updateFarmWork(g,.1,{x:0,y:0});assert.equal(g.progress.farm.plots.filter(p=>p.watered).length,0);
 updateFarmWork(g,.1,{x:1,y:0});assert.equal(g.farmWork.job,null);assert.equal(g.progress.farm.plots.filter(p=>p.watered).length,0);
 queueFarmWork(g,'water',{plot:1});for(let i=0;i<20;i++)updateFarmWork(g,.05,{x:0,y:0});assert.equal(g.progress.farm.plots.filter(p=>p.watered).length,1);assert.equal(g.farmSignals.filter(s=>s.action==='water').length,1);
});
