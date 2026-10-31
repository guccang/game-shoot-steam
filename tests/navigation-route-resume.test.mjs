// 清缴首帧与隐藏恢复专项：走正式接单事务、真实森林碰撞和地面光点生成。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {acceptClearingPost} from '../src/core/clearing-guide.js';
import {storyRouteState,visibleRouteDots,prepareStoryRoute} from '../src/core/story-route.js';
import {worldNavigationObjective,requestWorldNavigation} from '../src/core/world-navigation.js';
import {setTaskNavigationEnabled} from '../src/core/task-navigation.js';
import {questLineClear,planQuestRoute} from '../src/physics/quest-route.js';
import {worldDistance,WORLD} from '../src/world/coordinates.js';
import {SpatialGrid} from '../src/world/spatial-grid.js';
import {livingRouteStates} from '../src/core/living-route.js';
import {updateLivingWorld,acceptNextClearing} from '../src/core/living-world.js';
import {updateMainline,recordMainlineEvent} from '../src/core/mainline-manager.js';

// 已完成教学的历史档，在真实告示牌前接取；种子6覆盖原先数秒空白的长路线。
function scene(seed=6){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.bosses=1;
 const g=new Game(p,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));g.start();g.mainlineSpeech=null;g.vehicle.active=false;
 Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});return g;
}
// 模拟手机世界视野，镜头不参与任务或碰撞判断。
function view(g){return {x:g.player.x-320,y:g.player.y-400,w:640,h:800,zoom:1};}
// 验证显示端实际有光点，且每段都通过正式碰撞，不接受穿墙占位路线。
function safe(g,r){
 assert.ok(r?.reachable);assert.ok(visibleRouteDots(r,view(g)).length);
 const body={...g.player,mapId:g.mapId,livingCollision:true},grid=new SpatialGrid(g.trees);
 for(let i=1;i<r.points.length;i++)assert.ok(questLineClear(r.points[i-1],r.points[i],body,grid));
}
// 只有必要的重新规划才推进模拟时间，首帧和恢复测试禁止先等待。
function ready(g){for(let i=0;i<3000;i++){g.time+=1/60;const r=storyRouteState(g,view(g));if(r?.reachable)return r;}throw Error('正式路线未完成');}

// 正式五波和领主结算更新教学记录，测试不能把“结束”伪装成重新接取。
function completeClearing(g){
 g.onEvent=type=>recordMainlineEvent(g,type);
 const site=g.progress.living.clearingSite;Object.assign(g.player,{x:site.x,y:site.y});
 for(let i=0;i<1200&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}
 assert.ok(g.boss);g.hit(g.boss,1e9);updateMainline(g,0);g.state='paused';
}

test('清缴结束或关闭结算后原地首帧显示交付路线，不等待移动和游戏时钟推进',()=>{
 for(const seed of [1,6,19]){
  const g=scene(seed);g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-patrol'));g.progress.mainline.currentId='first-patrol';g.progress.mainline.phase='doing';
  assert.ok(acceptClearingPost(g).ok);storyRouteState(g,view(g));completeClearing(g);
  assert.equal(g.progress.mainline.phase,'report');const goal=worldNavigationObjective(g),position={x:g.player.x,y:g.player.y},time=g.time,before=structuredClone(g.progress);
  const prepared=prepareStoryRoute(g);safe(g,prepared);assert.equal(storyRouteState(g,view(g)),null);
  g.state='playing';const first=storyRouteState(g,view(g));safe(g,first);assert.equal(first.planning,false);assert.equal(first.searchStarts,0);
  assert.ok(worldDistance(first.points.at(-1),goal.site)<.001);assert.equal(g.time,time);assert.deepEqual({x:g.player.x,y:g.player.y},position);assert.deepEqual(g.progress,before);
 }
});

test('范围外续接与关闭寻路使用各自最终目标，不能显示上一份结算路线',()=>{
 const g=scene();assert.ok(acceptClearingPost(g).ok);completeClearing(g);
 const site=g.progress.living.clearingSite;Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});
 assert.ok(acceptNextClearing(g,g.pendingClearingRound).ok);safe(g,prepareStoryRoute(g));g.state='playing';const first=storyRouteState(g,view(g));safe(g,first);assert.ok(worldDistance(first.points.at(-1),site)<.001);
 g.state='paused';setTaskNavigationEnabled(g,false);assert.equal(prepareStoryRoute(g),null);g.state='playing';assert.equal(storyRouteState(g,view(g)),null);
});

test('清缴保存成功后的事件刷新与首帧均直接显示已验证路线',()=>{
 for(const seed of [1,6,19]){
  const g=scene(seed);let eventRoute;
  g.onEvent=type=>{if(type==='living-change')eventRoute=storyRouteState(g,view(g));};
  assert.ok(acceptClearingPost(g).ok);safe(g,eventRoute);assert.equal(eventRoute.searchStarts,0);
  const r=storyRouteState(g,view(g));safe(g,r);assert.equal(r.planning,false);assert.equal(r.searchStarts,0);
  assert.ok(worldDistance(r.points.at(-1),g.progress.living.clearingSite)<.001);
  assert.equal('points' in g.progress.living.clearingSite,false);
 }
});

test('暂停、对白和寻路开关只隐藏，原地恢复同一帧已有光点',()=>{
 const g=scene();assert.ok(acceptClearingPost(g).ok);const first=storyRouteState(g,view(g));safe(g,first);
 for(const mode of ['pause','speech','toggle']){
  if(mode==='pause')g.state='paused';else if(mode==='speech')g.mainlineSpeech={};else setTaskNavigationEnabled(g,false);
  for(let i=0;i<3;i++)assert.equal(storyRouteState(g,view(g)),null);
  g.state='playing';g.mainlineSpeech=null;setTaskNavigationEnabled(g,true);
  const r=storyRouteState(g,view(g));safe(g,r);assert.equal(r.searchStarts,0);assert.equal(r.planning,false);assert.deepEqual(r.points,first.points);
 }
});

test('暂停期间目标切换、停车障碍和飞行能力变化必须作废旧路线',()=>{
 for(const change of ['target','parking','flight','treePass']){
  const g=scene();assert.ok(acceptClearingPost(g).ok);const first=storyRouteState(g,view(g));safe(g,first);
  g.state='paused';storyRouteState(g);
  if(change==='target')requestWorldNavigation(g,{id:'new-target',mapId:'forest',x:1200,y:400},'前往新目标',{direct:true});
  if(change==='parking'){const p=first.points[3];g.player.parkingBarriers=[{x:p.x,y:p.y,width:72,height:60}];}
  if(change==='flight')g.player.flying=true;
  if(change==='treePass')g.player.treePass=true;
  g.state='playing';const r=storyRouteState(g,view(g));assert.equal(r.searchStarts,1);
  if(r.points.length)safe(g,r);
  if(change==='target')assert.equal(r.site,'visit');
 }
});

test('暂停期间主路或远处新增树均不重新规划，已有路点立即恢复',()=>{
 for(const near of [false,true]){
  const g=scene();assert.ok(acceptClearingPost(g).ok);const first=storyRouteState(g,view(g));
  g.state='paused';storyRouteState(g);const point=near?first.points.find(p=>worldDistance(p,g.player)>180):{x:8000,y:6000};
  g.trees=[...g.trees,{...point,type:'tree',radius:22,hp:55}];g.state='playing';const r=storyRouteState(g,view(g));
  assert.equal(r.searchStarts,0);assert.ok(r.reachable);assert.deepEqual(r.points,first.points);
 }
});

test('远处停车访客轮换不清空清缴主路，车体移到路线后立即失效',()=>{
 const g=scene();assert.ok(acceptClearingPost(g).ok);const first=storyRouteState(g,view(g));safe(g,first);
 g.player.parkingBarriers=[{x:8000,y:6000,width:72,height:60}];let r=storyRouteState(g,view(g));safe(g,r);assert.equal(r.searchStarts,0);
 g.player.parkingBarriers[0].x=first.points[4].x;g.player.parkingBarriers[0].y=first.points[4].y;
 r=storyRouteState(g,view(g));assert.equal(r.searchStarts,1);assert.equal(r.points.length,0);
});

test('保存失败不移交预计算路线，读档新游戏不继承旧会话缓存',()=>{
 const failed=scene();failed.livingPersist=()=>false;assert.equal(acceptClearingPost(failed).ok,false);assert.equal(storyRouteState(failed),null);
 const g=scene();assert.ok(acceptClearingPost(g).ok);safe(g,storyRouteState(g,view(g)));
 const loaded=new Game(structuredClone(g.progress),()=>.5);loaded.start();loaded.mainlineSpeech=null;Object.assign(loaded.player,{x:g.player.x,y:g.player.y});
 assert.equal(storyRouteState(loaded,view(loaded)).searchStarts,1);
});

test('采木路线终点位于树干外，原树目标和标记身份保持不变',()=>{
 const g=scene();g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-patrol'));g.progress.mainline.currentId='first-patrol';g.progress.mainline.phase='doing';g.progress.restoration.repaired=[];g.progress.wood=0;
 const body={...g.player,mapId:'forest',livingCollision:true},grid=new SpatialGrid(g.trees);let objective;
 for(const tree of g.trees){
  const start={x:tree.x+180,y:tree.y};if(!questLineClear(start,start,body,grid))continue;Object.assign(g.player,start);
  const o=worldNavigationObjective(g);if(o?.site.x===tree.x&&o.site.y===tree.y){objective=o;break;}
 }
 assert.ok(objective);assert.equal(questLineClear(objective.site,objective.site,body,grid),false);
 const r=ready(g);safe(g,r);const goal=r.points.at(-1);assert.ok(worldDistance(goal,objective.site)>objective.site.radius+12);assert.ok(worldDistance(goal,objective.site)<85);
 assert.deepEqual(worldNavigationObjective(g).site,objective.site);
});

test('供缓存使用的直达预计算路线也逐段验证短边和跨世界镜像',()=>{
 const body={x:WORLD.width-150,y:100,flying:true},goal={x:180,y:100};
 const route=planQuestRoute(body,goal,[],16000,{shortEdges:true});assert.ok(route.reachable);assert.ok(route.points.length>2);
 for(let i=1;i<route.points.length;i++){assert.ok(Math.hypot(route.points[i].x-route.points[i-1].x,route.points[i].y-route.points[i-1].y)<=64);assert.ok(questLineClear(route.points[i-1],route.points[i],body,[]));}
});

test('邻里路线同样在暂停和对白后立即恢复已验证光点',()=>{
 const g=scene();updateLivingWorld(g,.05);g.progress.living.requests['neighbors-lunch'].stage=0;g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};
 let first;for(let i=0;i<3000;i++){g.time+=1/60;[first]=livingRouteStates(g,view(g));if(first?.reachable)break;}
 safe(g,first);
 g.state='paused';assert.deepEqual(livingRouteStates(g,view(g)),[]);g.state='playing';g.mainlineSpeech={};assert.deepEqual(livingRouteStates(g,view(g)),[]);g.mainlineSpeech=null;
 const [resumed]=livingRouteStates(g,view(g));safe(g,resumed);assert.equal(resumed.planning,false);assert.equal(resumed.searchStarts,first.searchStarts);assert.deepEqual(resumed.points,first.points);
});
