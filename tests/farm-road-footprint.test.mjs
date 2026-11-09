// 路面禁种只按土壤矩形与真实路宽检查，覆盖草缘、斜路、湖谷与周期边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {farmOverlapsRoad} from '../src/world/farm-roads.js';
import {farmLandReason} from '../src/world/farm-land.js';
import {farmAction,queueFarmWork} from '../src/core/farming/farm.js';
import {freshProgress} from '../src/progression/progress.js';
import {WORLD} from '../src/world/coordinates.js';

// 道路测试使用空树世界，建筑和地形仍调用正式判定。
function scene(){return {state:'playing',mapId:'forest',player:{x:803.25,y:643.5,hp:100},progress:freshProgress(),trees:[]};}
// 便于直观写出田块中心和地图，尺寸使用正式50×36土壤。
function at(x,y,mapId='forest'){return {x,y,mapId};}

test('森林主路与支路禁种，营地小田及紧邻路面的草地可种',()=>{
 for(const p of [at(837,724),at(500,650),at(1800,729),at(1800,770)])assert.equal(farmOverlapsRoad(p),true,JSON.stringify(p));
 for(const p of [at(803.25,643.5),at(1800,774),at(1800,684)])assert.equal(farmOverlapsRoad(p),false,JSON.stringify(p));
 const g=scene();assert.equal(farmLandReason(g,at(803.25,643.5)),null);
});

test('湖谷垂直道路按15半宽和25土壤半宽，恰好相切允许，斜路连续检查',()=>{
 assert.equal(farmOverlapsRoad(at(1320,2400,'jiuzhaigou')),true);
 assert.equal(farmOverlapsRoad(at(1359.5,2400,'jiuzhaigou')),true);
 assert.equal(farmOverlapsRoad(at(1360.5,2400,'jiuzhaigou')),false);
 assert.equal(farmOverlapsRoad(at(2660,980,'jiuzhaigou')),true);
 assert.equal(farmOverlapsRoad(at(2740,980,'jiuzhaigou')),false);
});

test('相同田块跨周期与负坐标判定一致，接缝路面不漏判',()=>{
 for(const p of [at(837,724),at(803.25,643.5),at(5,729),at(WORLD.width-5,729)]){
  const expected=farmOverlapsRoad(p);for(const k of [-1,1])assert.equal(farmOverlapsRoad({...p,x:p.x+k*WORLD.width,y:p.y-k*WORLD.height}),expected);
 }
 assert.equal(farmOverlapsRoad(at(-5,729)),true);
});

test('路面点击与实际落锄双重拒绝，失败不创建田块或扣费；草地照常落锄',()=>{
 const g=scene(),point=at(837,724),before=structuredClone(g.progress);Object.assign(g.player,point);
 const queued=queueFarmWork(g,'dig',{point});assert.equal(queued.ok,false);assert.match(queued.message,/路面/);assert.equal(farmAction(g,'dig',{point}).ok,false);assert.deepEqual(g.progress,before);
 Object.assign(g.player,{x:803.25,y:643.5});assert.ok(farmAction(g,'dig',{point:at(803.25,643.5)}).ok);assert.equal(g.progress.farm.plots.length,1);
});
