import {WORLD} from '../src/world/coordinates.js';
// 长途导航使用正式碰撞与缓存，确定性检查每帧工作上限和途中复用，避免依赖机器速度。
import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestRouteSearch,questLineClear} from '../src/physics/quest-route.js';
import {createRouteSession,advanceRouteSession} from '../src/core/navigation/quest-navigation-cache.js';
import {SpatialGrid} from '../src/world/spatial-grid.js';
import {Game,freshProgress} from '../src/game.js';
import {storyRouteState} from '../src/core/navigation/story-route.js';
import {requestWorldNavigation} from '../src/core/navigation/world-navigation.js';

test('1500单位绕河路线分帧完成，重复绘制同一帧不推进，所有边可通行',()=>{
 const body={x:1600,y:400,mapId:'forest',livingCollision:true},goal={x:700,y:1600};
 const search=createQuestRouteSearch(body,goal,[],16000);let result;
 for(let frame=0;frame<5000&&!result;frame++){
  const before=search.steps;result=search.advance(frame,{steps:80,now:()=>0});assert.ok(search.steps-before<=80);
  const after=search.steps;search.advance(frame);assert.equal(search.steps,after);
 }
 assert.ok(search.slices>1);assert.equal(result.reachable,true);
 for(let i=1;i<result.points.length;i++)assert.ok(questLineClear(result.points[i-1],result.points[i],body,[]));
});

test('时间预算能提前停止，目标堵塞与搜索耗尽不会伪造路径',()=>{
 const body={x:700,y:900,mapId:'forest'},goal={x:900,y:900},trees=[{x:800,y:900,radius:35,hp:1}];
 const search=createQuestRouteSearch(body,goal,trees,1);let clock=0;
 search.advance(0,{now:()=>clock+=1});assert.ok(search.steps<=2);assert.equal(search.result,null);
 for(let i=1;i<1000&&!search.result;i++)search.advance(i,{now:()=>0});
 assert.equal(search.result.reachable,false);assert.deepEqual(search.result.points,[]);
});

test('沿路线移动及原地等待不会每半秒重新搜索，镜像转换保持连接',()=>{
 const body={x:1600,y:400,mapId:'forest',livingCollision:true},session=createRouteSession(body,{x:700,y:1600},new SpatialGrid([]),0);
 let time=0,state;
 for(let i=0;i<5000;i++){time+=1/60;state=advanceRouteSession(session,body,time);if(!state.planning)break;}
 assert.equal(state.reachable,true);const points=state.points;
 for(let i=1;i<points.length;i++)assert.ok(questLineClear(points[i-1],points[i],body,[]));
 for(const point of points.slice(0,-1)){
  Object.assign(body,point);time+=.6;state=advanceRouteSession(session,body,time);assert.equal(state.searchStarts,1);assert.equal(state.reachable,true);
 }
 for(let i=0;i<40;i++){time+=1;assert.equal(advanceRouteSession(session,body,time).searchStarts,1);}
 body.x+=WORLD.width;const wrapped=advanceRouteSession(session,body,++time);assert.equal(wrapped.searchStarts,1);assert.ok(wrapped.points.every(p=>p.x>WORLD.width));
});

test('桥角附近小数起点的最终短边仍逐段可通行，不在缓存中二次切段漏检',()=>{
 const body={x:1600,y:400.7796058501829,mapId:'forest',livingCollision:true};
 const session=createRouteSession(body,{x:700,y:1600},new SpatialGrid([]),0);let state;
 for(let i=0;i<3000;i++){state=advanceRouteSession(session,body,i/60);if(!state.planning)break;}
 assert.equal(state.reachable,true);
 for(let i=1;i<state.points.length;i++)assert.ok(questLineClear(state.points[i-1],state.points[i],body,[]));
});

test('偏离路线后隐藏旧连接并重新规划，不沿缓存穿过实体',()=>{
 const body={x:700,y:900,mapId:'forest'},trees=[],session=createRouteSession(body,{x:900,y:900},new SpatialGrid(trees),0);
 let state;for(let i=0;i<100;i++){state=advanceRouteSession(session,body,i/60);if(!state.planning)break;}
 assert.equal(state.reachable,true);body.y+=300;
 state=advanceRouteSession(session,body,3);assert.equal(state.searchStarts,2);assert.deepEqual(state.points,[]);
});

test('真实战场逐帧更新保持路线，树再生和砍伐不再触发重算',()=>{
 const g=new Game(freshProgress(),()=>.5);g.start();g.progress.arrival={version:2,phase:'complete',keys:true};g.arrivalScene=null;g.mainlineSpeech=null;
 g.progress.living.patrolActive=false;g.enemies=[];g.trees=[];Object.assign(g.player,{x:700,y:900});
 requestWorldNavigation(g,{id:'navigation-test',x:2100,y:1300},'路线验收',{direct:true});
 const trees=g.trees;let result;
 for(let i=0;i<2000;i++){
  g.update(1/60);assert.equal(g.trees,trees);result=storyRouteState(g);if(result?.reachable)break;
 }
 assert.equal(result?.reachable,true);assert.equal(result.searchStarts,1);
 for(let i=0;i<180;i++){g.update(1/60);assert.equal(storyRouteState(g).searchStarts,1);}
 const first=result.points[1];g.addTree(first.x,first.y);g.time+=.1;
 const obstructed=storyRouteState(g);assert.equal(obstructed.searchStarts,1);assert.deepEqual(obstructed.points,result.points);
 // 按开始规划时的无树快照验证，途中新增树木不改变已算路线和角色实际碰撞。
 for(let i=1;i<obstructed.points.length;i++)assert.ok(questLineClear(obstructed.points[i-1],obstructed.points[i],{...g.player,mapId:g.mapId,livingCollision:true},[]));
 g.trees[0].hp=0;g.update(1/60);assert.notEqual(g.trees,trees);assert.equal(g.trees.length,0);
 assert.equal(storyRouteState(g).searchStarts,1);
});
