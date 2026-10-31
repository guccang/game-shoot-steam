// 地块移除回归：验证原子保存、作物确认、任务恢复与真实农活队列。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {farmAction,queueFarmWork,setFarmTool,updateFarmWork,FARM_ACTION_TIMING} from '../src/core/farm.js';
import {farmApproach} from '../src/world/farm-land.js';
// 地图草地夹具只提供一格田，其他进度使用正式新档结构。
function scene(crop=null){const progress=freshProgress();progress.farm.wildMaps=['forest'];progress.farm.plots=[{id:7,mapId:'forest',x:1005,y:672,crop,plantedAt:crop===null?0:1000,readyAt:crop===null?0:61000,watered:false}];progress.farm.nextId=8;return {state:'playing',mapId:'forest',player:{x:1005,y:710,hp:100},trees:[],enemies:[],progress:validateProgress(progress),onEvent:()=>{},livingPersist:()=>true};}
// 同一茬作物的确认快照；不允许一份确认清除后来种下的另一茬。
function consent(g){const p=g.progress.farm.plots[0];return {crop:p.crop,plantedAt:p.plantedAt};}
// 与正式游戏一致逐帧推进，到达工作位后才触发移除命中。
function finish(g){for(let n=0;n<60&&(g.farmWork.job||g.farmWork.queue.length);n++){const j=g.farmWork.job||g.farmWork.queue[0];if(!j.elapsed)Object.assign(g.player,farmApproach(g,j.point));updateFarmWork(g,.05,{x:0,y:0});}}

test('空田移除后重载不复活，原地可重新开垦且编号不复用',()=>{
 const g=scene();assert.ok(farmAction(g,'remove',{plot:7}).ok);assert.equal(g.progress.farm.plots.length,0);g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.farm.plots.length,0);assert.equal(g.progress.farm.nextId,8);
 assert.ok(farmAction(g,'dig',{point:{x:1005,y:672,mapId:'forest'}}).ok);assert.equal(g.progress.farm.plots[0].id,8);
});

test('非空田须确认同一茬，移除不返种、不发金币经验或收成',()=>{
 const g=scene(0);assert.equal(farmAction(g,'remove',{plot:7}).ok,false);const before=structuredClone(g.progress.farm),coins=g.progress.coins;
 assert.ok(farmAction(g,'remove',{plot:7,removal:consent(g)}).ok);assert.equal(g.progress.farm.plots.length,0);assert.equal(g.progress.coins,coins);
 for(const key of ['seeds','xp','harvested','planted','watered','lessonRewarded'])assert.deepEqual(g.progress.farm[key],before[key]);
 assert.equal(farmAction(g,'remove',{plot:7}).ok,false);
});

test('移除保存失败保留整块田及任务记录，重试仅结算一次',()=>{
 const g=scene(0),removal=consent(g);g.progress.mainline.gardening={taskId:'neighbor-garden',plotId:7,planted:1,watered:0};const before=structuredClone(g.progress);g.livingPersist=()=>false;
 assert.equal(farmAction(g,'remove',{plot:7,removal}).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>{throw Error('写入失败');};assert.equal(farmAction(g,'remove',{plot:7,removal}).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'remove',{plot:7,removal}).ok);assert.equal(g.farmSignals.length,1);
});

test('距离、地图、暂停及已消失地块均拒绝移除',()=>{
 for(const change of [g=>g.player.x+=200,g=>g.mapId='jiuzhaigou',g=>g.state='paused',g=>g.progress.farm.plots=[]]){const g=scene();change(g);const before=structuredClone(g.progress);assert.equal(farmAction(g,'remove',{plot:7}).ok,false);assert.deepEqual(g.progress,before);}
 const g=scene();g.mapId='jiuzhaigou';assert.equal(queueFarmWork(g,'remove',{plot:7}).ok,false);
});

test('走近和命中前保留田块，移除后清理同田待办，其他田队列保留',()=>{
 const g=scene();g.progress.farm.plots.push({...g.progress.farm.plots[0],id:8,x:1061});g.progress.farm.nextId=9;setFarmTool(g,'remove');assert.ok(queueFarmWork(g,'remove',{plot:7}).ok);assert.ok(queueFarmWork(g,'remove',{plot:7}).ok);assert.equal(g.farmWork.queue.length,1);
 Object.assign(g.player,farmApproach(g,g.farmWork.queue[0].point));updateFarmWork(g,FARM_ACTION_TIMING.remove.hit-.01,{x:0,y:0});assert.equal(g.progress.farm.plots.length,2);
 queueFarmWork(g,'plant',{plot:7});queueFarmWork(g,'remove',{plot:8});updateFarmWork(g,.02,{x:0,y:0});assert.equal(g.progress.farm.plots.some(p=>p.id===7),false);assert.deepEqual(g.farmWork.queue.map(j=>j.id),[8]);finish(g);assert.equal(g.progress.farm.plots.length,0);
});

test('排队期间作物变化使旧确认失效，主动移动可取消未命中的移除',()=>{
 const g=scene(0);setFarmTool(g,'remove');queueFarmWork(g,'remove',{plot:7,removal:consent(g)});g.progress.farm.plots[0].plantedAt=2000;finish(g);assert.equal(g.progress.farm.plots.length,1);assert.equal(g.farmWork.result.ok,false);
 setFarmTool(g,'remove');queueFarmWork(g,'remove',{plot:7,removal:consent(g)});updateFarmWork(g,.05,{x:1,y:0});assert.equal(g.farmWork.queue.length,0);assert.equal(g.progress.farm.plots.length,1);
});

test('删除任务田后未照料可重种，已经浇水的任务完成事实保留',()=>{
 for(const watered of [0,1]){const g=scene(1);g.progress.mainline.gardening={taskId:'neighbor-garden',plotId:7,planted:1,watered};assert.ok(farmAction(g,'remove',{plot:7,removal:consent(g)}).ok);const lesson=g.progress.mainline.gardening;assert.equal(lesson.plotId,null);assert.equal(lesson.planted,watered?1:0);assert.equal(lesson.watered,watered);}
});

test('野外田可移除但不重置地图生成记录',()=>{
 const g=scene();g.progress.farm.plots[0].wild=true;assert.ok(farmAction(g,'remove',{plot:7}).ok);assert.deepEqual(validateProgress(g.progress).farm.wildMaps,['forest']);
});
