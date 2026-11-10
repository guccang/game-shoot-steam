// 任务、回家和驿站互斥；关闭只影响导航，不修改任务完成记录。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {travelToWaystation,updateWaystationTravel,stopWaystationTravel} from '../src/core/navigation/waystations.js';
import {taskNavigationEnabled,setTaskNavigationEnabled,toggleTaskNavigation} from '../src/core/navigation/task-navigation.js';
import {requestWorldNavigation,requestMainlineNavigation,worldNavigationDiagnostics} from '../src/core/navigation/world-navigation.js';
import {storyRouteState,storyRouteDiagnostics} from '../src/core/navigation/story-route.js';
import {livingRouteStates} from '../src/core/navigation/living-route.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {navigatePhone} from '../src/core/battle/patrol-phone.js';
// 只保留自由探索和两个确定站点，使用正式导航业务与物理查询。
function scene(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(t=>t.id);p.restoration.cottageRested=true;
 const events=[],g=new Game(p,()=>.5,(type,data)=>events.push({type,data}));g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.trees=[];Object.assign(g.player,{x:2000,y:1600,vx:0,vy:0});g.progress.waystations.sites=[{id:1,name:'测试驿站',mapId:'forest',x:2600,y:1600}];return {g,events};
}
test('驿站接管任务搜索并清除临时目标，插值画面也只看到一个导航',()=>{
 const {g}=scene();requestWorldNavigation(g,{x:2200,y:1800},'测试访问',{direct:true});storyRouteState(g);assert.ok(storyRouteDiagnostics(g));
 const view=createRenderInterpolation().sample(g,.5);assert.equal(travelToWaystation(g,1).ok,true);assert.equal(taskNavigationEnabled(g),false);assert.equal(taskNavigationEnabled(view),false);assert.equal(worldNavigationDiagnostics(g).intent,null);
 assert.equal(storyRouteState(g),null);assert.equal(storyRouteDiagnostics(g),null);assert.deepEqual(livingRouteStates(g),[]);
 for(let i=0;i<3;i++)updateWaystationTravel(g,.04,{x:0,y:0});assert.ok(g.waystationTravel?.session);assert.equal(storyRouteDiagnostics(g),null);
});
test('回小屋立即取消正在规划的驿站，旧搜索不再推进，任务开关仍可关闭',()=>{
 const {g}=scene();travelToWaystation(g,1);updateWaystationTravel(g,.04,{x:0,y:0});const trip=g.waystationTravel,steps=trip.session.search.steps;
 g.player.vx=30;assert.equal(navigatePhone(g,'home').ok,true);assert.equal(g.waystationTravel,null);assert.equal(g.player.vx,0);assert.equal(taskNavigationEnabled(g),true);assert.equal(worldNavigationDiagnostics(g).intent.site.id,'cottage');
 updateWaystationTravel(g,.04,{x:0,y:0});assert.equal(trip.session.search.steps,steps);
 const tasks=structuredClone(g.progress.mainline);g.state='paused';toggleTaskNavigation(g);assert.equal(taskNavigationEnabled(g),false);assert.deepEqual({...g.progress.mainline,navigationEnabled:tasks.navigationEnabled},tasks);assert.equal(validateProgress(structuredClone(g.progress)).mainline.navigationEnabled,false);
});
test('关闭任务后停止驿站不会暗中重开旧任务；显式开启或前往任务才接管',()=>{
 const {g}=scene();travelToWaystation(g,1);stopWaystationTravel(g);assert.equal(taskNavigationEnabled(g),false);
 travelToWaystation(g,1);toggleTaskNavigation(g);assert.equal(taskNavigationEnabled(g),true);assert.equal(g.waystationTravel,null);
 travelToWaystation(g,1);requestMainlineNavigation(g);assert.equal(g.waystationTravel,null);assert.equal(taskNavigationEnabled(g),true);
});
test('无效驿站不取消当前任务；兼容旧状态中偏好已开但驿站仍运行',()=>{
 const {g}=scene();requestWorldNavigation(g,{x:2200,y:1800},'有效目标',{direct:true});assert.equal(travelToWaystation(g,999).ok,false);assert.equal(taskNavigationEnabled(g),true);assert.equal(worldNavigationDiagnostics(g).intent.label,'有效目标');
 travelToWaystation(g,1);g.progress.mainline.navigationEnabled=true;setTaskNavigationEnabled(g,true);assert.equal(g.waystationTravel,null);assert.equal(taskNavigationEnabled(g),true);
});

// 任务选择保持原有先保存后切换语义，保存失败不能意外停止正在运行的驿站。
test('主动选择任务仅在保存成功后取消驿站',async()=>{
 const {selectMainlineTask}=await import('../src/core/story/mainline-selection.js');const {g}=scene();g.progress.mainline.completed=MAINLINE_IDS.slice(0,2);g.progress.living.patrolActive=false;g.boss=null;travelToWaystation(g,1);const trip=g.waystationTravel;
 g.mainlinePersist=()=>false;assert.equal(selectMainlineTask(g,MAINLINE_IDS[2]),false);assert.equal(g.waystationTravel,trip);
 g.mainlinePersist=()=>true;assert.equal(selectMainlineTask(g,MAINLINE_IDS[2]),true);assert.equal(g.waystationTravel,null);assert.equal(taskNavigationEnabled(g),true);
});

// 手机取消是一次性任务操作，持久化成功后同时撤销卡片、路线和追踪。
test('取消回家任务后无当前任务，重复取消和重新开启寻路都不恢复旧目标',async()=>{
 const {currentNavigationTask,cancelCurrentTask}=await import('../src/core/navigation/current-navigation-task.js');const {g}=scene();assert.equal(navigatePhone(g,'home').ok,true);assert.equal(currentNavigationTask(g).label,'回巡林小屋');
 const completed=[...g.progress.mainline.completed];let saved;g.mainlinePersist=p=>{saved=structuredClone(p);return true;};g.state='paused';assert.equal(cancelCurrentTask(g).ok,true);
 assert.equal(currentNavigationTask(g),null);assert.equal(worldNavigationDiagnostics(g).intent,null);assert.equal(taskNavigationEnabled(g),false);assert.equal(saved.mainline.navigationEnabled,false);assert.equal(saved.mainline.trackingPaused,true);assert.deepEqual(saved.taskTracking,{kind:'none'});assert.deepEqual(g.progress.mainline.completed,completed);
 assert.equal(cancelCurrentTask(g).ok,false);setTaskNavigationEnabled(g,true);assert.equal(currentNavigationTask(g),null);
 assert.equal(navigatePhone(g,'home').ok,true);assert.equal(currentNavigationTask(g).label,'回巡林小屋');
});
// 保存失败不能只撤掉画面，原行程和搜索必须仍然完整可用。
test('取消驿站先保存，失败保留目标和速度，成功停止自动行进',async()=>{
 const {currentNavigationTask,cancelCurrentTask}=await import('../src/core/navigation/current-navigation-task.js');const {g}=scene();travelToWaystation(g,1);const trip=g.waystationTravel;g.player.vx=25;g.mainlinePersist=()=>false;const before=structuredClone(g.progress);
 assert.equal(cancelCurrentTask(g).ok,false);assert.equal(g.waystationTravel,trip);assert.equal(g.player.vx,25);assert.deepEqual(g.progress,before);
 g.mainlinePersist=()=>true;assert.equal(cancelCurrentTask(g).ok,true);assert.equal(g.waystationTravel,null);assert.equal(g.player.vx,0);assert.equal(currentNavigationTask(g),null);assert.equal(taskNavigationEnabled(g),false);
});
