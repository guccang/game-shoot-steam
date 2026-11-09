// 专项回归道路镜像与全部邻里委托导航，使用正式世界和碰撞数据。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {livingRouteStates} from '../src/core/navigation/living-route.js';
import {livingRequestTarget,updateLivingWorld,residentFor} from '../src/core/camp/living-world.js';
import {LIVING_REQUESTS,LIVING_ROADS} from '../src/config/living-world.js';
import {visibleLivingRoads} from '../src/world/living-road-view.js';
import {questLineClear} from '../src/physics/quest-route.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
// 普通历史档进入生活圈，确定性树木与作息保持可重现。
function world(){const g=new Game(freshProgress(),()=>.5);g.start();updateLivingWorld(g,.05);Object.assign(g.player,{x:690,y:1100});return g;}
// 推进正式分帧规划，其他游戏状态固定，避免把异步规划当作即时结果。
function readyRoutes(g){let result;for(let i=0;i<4000;i++){g.time+=1/60;result=livingRouteStates(g);if(result.every(r=>!r.planning))return result;}throw new Error('路线未在预算内完成');}
test('移动经过镜像阈值时道路各段保持原有长度，不出现竖直假路',()=>{
 for(let y=-1500;y<=4400;y+=37)for(const x of [-1700,700,2500,4300]){
  for(const road of visibleLivingRoads({x:x-400,y:y-400,w:800,h:800})){
   const original=LIVING_ROADS.find(r=>r.length===road.length&&r.every((p,i)=>i===0||Math.abs(p.x-r[0].x-road[i].x+road[0].x)<.001&&Math.abs(p.y-r[0].y-road[i].y+road[0].y)<.001));
   assert.ok(original,'整条路必须是同一个原始折线的平移');
  }
 }
 assert.deepEqual(visibleLivingRoads({x:550,y:0,w:450,h:250}),[]);
 const view={x:400,y:700,w:600,h:1400},first=visibleLivingRoads(view),wrapped=visibleLivingRoads({...view,x:view.x+WORLD.width,y:view.y-WORLD.height});
 assert.deepEqual(wrapped,first.map(r=>r.map(p=>({x:p.x+WORLD.width,y:p.y-WORLD.height}))));
});
test('三个委托全部十五阶段均生成可通行路径并同步切换终点',()=>{
 const g=world();
 for(const spec of LIVING_REQUESTS){
  for(const q of Object.values(g.progress.living.requests))q.stage=-1;
  for(let stage=0;stage<spec.steps.length;stage++){
   g.progress.living.requests[spec.id].stage=stage;
   const [r]=readyRoutes(g);assert.equal(r.id,spec.id);assert.equal(r.reachable,true,spec.id+' '+stage);
   assert.ok(worldDistance(r.points.at(-1),livingRequestTarget(g,spec))<100);
   for(let i=1;i<r.points.length;i++)assert.ok(questLineClear(r.points[i-1],r.points[i],{...g.player,mapId:g.mapId,livingCollision:true},g.trees));
  }
 }
});
test('同时接取、移动居民、同名替代、抵达和生命周期都不残留旧路径',()=>{
 const g=world(),[lunch,night]=LIVING_REQUESTS;
 g.progress.living.requests[lunch.id].stage=2;g.progress.living.requests[night.id].stage=0;
 assert.equal(livingRouteStates(g).length,1);
 g.progress.taskTracking={kind:'living',id:night.id};
 const bat=residentFor(g,'bat');Object.assign(bat,{x:650,y:1750});
 const moved=readyRoutes(g).find(r=>r.id===night.id);assert.equal(moved.target.x,650);assert.ok(worldDistance(moved.points.at(-1),bat)<100);
 Object.assign(g.player,{x:bat.x,y:bat.y});assert.equal(livingRouteStates(g).find(r=>r.id===night.id).points.length,0);
 g.state='paused';assert.deepEqual(livingRouteStates(g),[]);g.state='playing';
 g.progress.living.requests[night.id].completed=true;assert.equal(livingRouteStates(g).length,1);
 g.realm={};assert.deepEqual(livingRouteStates(g),[]);g.realm=null;g.mapId='jiuzhaigou';assert.deepEqual(livingRouteStates(g),[]);
 g.mapId='forest';g.progress.hero=1;assert.equal(residentFor(g,'mint').id,'snow');
});
