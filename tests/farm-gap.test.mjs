// 开垦补位回归：偏移旧田、正常网格、狭窄田埂和循环世界使用实际可种植地形。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {farmDigTarget} from '../src/world/farm-land.js';
import {queueFarmWork,farmAction} from '../src/core/farming/farm.js';
import {WORLD} from '../src/world/coordinates.js';
// 旧档田格围住一块完整空地，整体相对全局网格偏移20单位。
function scene(offset=20){
 const center={x:893+offset,y:2752+offset,mapId:'forest'},progress=freshProgress();
 progress.farm.plots=[[0,-52],[-56,0],[56,0],[0,52]].map(([dx,dy],id)=>({id,mapId:'forest',x:center.x+dx,y:center.y+dy,crop:null,plantedAt:0,readyAt:0,watered:false}));progress.farm.nextId=4;
 return {state:'playing',mapId:'forest',player:{...center,hp:100},progress,trees:[],center,livingPersist:()=>true};
}
test('偏移旧田中完整空格可补齐，排队和实际落锄使用同一位置',()=>{
 const g=scene(),view={x:750,y:2600,w:350,h:400};
 const target=farmDigTarget(g,g.center,view);assert.equal(target.reason,null);assert.deepEqual(target.point,g.center);
 const queued=queueFarmWork(g,'dig',{point:g.center,view});assert.equal(queued.ok,true);assert.equal(g.farmWork.queue[0].point.x,g.center.x);assert.equal(g.farmWork.queue[0].point.y,g.center.y);
 assert.equal(farmAction(g,'dig',{point:g.farmWork.queue[0].point}).ok,true);assert.equal(g.progress.farm.plots.length,5);
});
test('正常网格空格仍可开垦，点中土壤仍准确拒绝重复开垦',()=>{
 const g=scene(0);assert.equal(farmDigTarget(g,g.center).reason,null);
 assert.match(farmDigTarget(g,g.progress.farm.plots[0]).reason,/已有田块/);
});
test('窄田埂不冒充整块空地，也不误提示手指处已有田块',()=>{
 const g=scene(0);const p=g.progress.farm.plots[0];assert.match(farmDigTarget(g,{x:p.x,y:p.y+20}).reason,/空隙放不下/);
});
test('循环世界另一幅镜像点击同一空位得到相同补位位置',()=>{
 const g=scene();const result=farmDigTarget(g,{x:g.center.x+WORLD.width,y:g.center.y-WORLD.height});assert.equal(result.reason,null);assert.deepEqual(result.point,g.center);
});
