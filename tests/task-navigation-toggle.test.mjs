import {mainlineCondition,mainlineStep,mainlineTask,mainlineSteps,updateMainline} from '../src/core/story/mainline-manager.js';
// 寻路显示开关回归：默认开启、跨步骤/重载保留、路线缓存和实际任务独立。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {validateMainline} from '../src/progression/story/mainline-progress.js';
import {taskNavigationEnabled,setTaskNavigationEnabled,toggleTaskNavigation} from '../src/core/navigation/task-navigation.js';
import {worldNavigationObjective,requestMainlineNavigation,requestWorldNavigation} from '../src/core/navigation/world-navigation.js';
import {storyRouteState} from '../src/core/navigation/story-route.js';
import {livingRouteStates} from '../src/core/navigation/living-route.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {acceptLivingRequest,trackLivingRequest,updateLivingWorld,residentFor} from '../src/core/camp/living-world.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {RANGER} from '../src/config/ranger-arrival.js';
// 使用已修复工坊的实际升级目标，避免用假的目标对象验证默认导航。
function world(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=MAINLINE_IDS.slice(0,2);p.mainline.phase='doing';const g=new Game(p,()=>.5);g.start();Object.assign(g.player,{x:800,y:900});return g;}

test('新旧存档默认开启，只有明确false关闭，读档和重建保留选择',()=>{
 for(const value of [undefined,null,{}, {navigationEnabled:true},{navigationEnabled:'false'}])assert.equal(validateMainline(value).navigationEnabled,true);
 const g=world();assert.equal(taskNavigationEnabled(g),true);setTaskNavigationEnabled(g,false);
 const loaded=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))));loaded.start();loaded.reset();assert.equal(taskNavigationEnabled(loaded),false);
});

test('无需点击默认显示当前路线，关闭清除光点目标且不改任务，推进步骤不重开',()=>{
 const g=world();assert.ok(worldNavigationObjective(g));assert.ok(storyRouteState(g));assert.ok(storyGuidanceState(g).target);
 const tasks=structuredClone(g.progress.mainline),tracking=g.progress.taskTracking;let writes=0;g.onEvent=type=>{if(type==='navigation-change')writes++;};
 setTaskNavigationEnabled(g,false);setTaskNavigationEnabled(g,false);assert.equal(writes,1);assert.equal(worldNavigationObjective(g),null);assert.equal(storyRouteState(g),null);assert.equal(storyGuidanceState(g).target,null);
 assert.deepEqual({...g.progress.mainline,navigationEnabled:true},tasks);assert.equal(g.progress.taskTracking,tracking);
 g.progress.weapons[0]=3;g.progress.heroes[0]=2;g.progress.mainline.phase='report';assert.equal(worldNavigationObjective(g),null);
 requestMainlineNavigation(g);assert.equal(writes,2);assert.ok(worldNavigationObjective(g));assert.ok(storyRouteState(g));
});

test('手动查看新的场景路线可以恢复指引，暂停不修改关闭偏好',()=>{
 const g=world();setTaskNavigationEnabled(g,false);g.pause();assert.equal(storyRouteState(g),null);g.pause();assert.equal(taskNavigationEnabled(g),false);
 requestWorldNavigation(g,MAINLINE_SITES.westGate,'前往西门',{direct:true});assert.equal(taskNavigationEnabled(g),true);assert.equal(worldNavigationObjective(g).key,'visit');setTaskNavigationEnabled(g,false);assert.equal(worldNavigationObjective(g),null);
});

test('入职修复和首枪目标关闭后不会强制恢复，也不影响当前阶段',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:RANGER.repairWood});p.wood=RANGER.repairWood;const g=new Game(p);g.start();assert.ok(worldNavigationObjective(g));setTaskNavigationEnabled(g,false);assert.equal(worldNavigationObjective(g),null);assert.equal(g.progress.arrival.phase,'repair');g.progress.arrival.phase='craft';assert.equal(storyRouteState(g),null);requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g));
});

test('邻里追踪和路线显示独立，关闭时切换委托不重开、不删除委托',()=>{
 // 完成新增的小屋休息前置，避免教学导航按优先级盖过本测试的邻里目标。
 // 居民会按作息移动，接取应站到真实委托人身边，不能依赖旧地图的固定坐标。
 const g=world();g.progress.restoration.cottageRested=true;updateLivingWorld(g,.05);const host=residentFor(g,'cook');Object.assign(g.player,{x:host.x,y:host.y});assert.ok(acceptLivingRequest(g,'neighbors-lunch').ok);assert.ok(livingRouteStates(g).length);
 setTaskNavigationEnabled(g,false);const before=structuredClone(g.progress.living.requests);assert.deepEqual(livingRouteStates(g),[]);assert.ok(trackLivingRequest(g,'neighbors-lunch').ok);assert.deepEqual(livingRouteStates(g),[]);assert.deepEqual(g.progress.living.requests,before);
 setTaskNavigationEnabled(g,true);assert.ok(livingRouteStates(g).length);
});

// 使用正式章节定义的目标，关闭导航保留战斗边界，不能改变任务或碰撞范围。
test('故事路线与终点同步关闭，战斗边界和阶段保持原样',()=>{
 const g=world();g.story={chapterId:'sunleaf-01',phase:'active',runId:'navigation-test',stageId:'briefing'};
 g.storyObjective=()=>({site:'CAMP'});g.player.arena={x:800,y:900,radius:400};
 assert.ok(Number.isFinite(storyGuidanceState(g).target?.x));const run=structuredClone(g.story),arena=structuredClone(g.player.arena);setTaskNavigationEnabled(g,false);
 assert.equal(storyRouteState(g),null);assert.equal(storyGuidanceState(g).target,null);assert.deepEqual(storyGuidanceState(g).arena,arena);assert.deepEqual(g.story,run);
});

// 寻路只介绍用途；保留开关两种偏好都能正常完成认路任务。
test('首个任务无需切换寻路，查看地图并探索后直接进入交付',()=>{
 const p=freshProgress();p.mainline.phase='doing';const g=new Game(p);g.start();const task=mainlineTask(g);
 assert.equal(task.id,'first-map');assert.equal(mainlineSteps(g).length,2);
 assert.equal(mainlineCondition(g,task.goal),false);
 g.progress.mainline.seen.map=1;g.progress.mainline.distance=79;assert.equal(mainlineCondition(g,task.goal),false);
 g.progress.mainline.distance=80;assert.equal(mainlineCondition(g,task.goal),true);assert.equal(mainlineStep(g),null);
 updateMainline(g,.05);assert.equal(g.progress.mainline.phase,'report');
 assert.equal(g.progress.mainline.seen.navigation,0);assert.equal(taskNavigationEnabled(g),true);
});

// 玩家主动关闭后，任务完成与读档都不能替玩家重新打开寻路。
test('主动关闭寻路不会阻挡首个任务，也不会因任务推进自动开启',()=>{
 const p=freshProgress();p.mainline.phase='doing';const g=new Game(p);g.start();
 toggleTaskNavigation(g);assert.equal(taskNavigationEnabled(g),false);
 g.progress.mainline.seen.map=1;g.progress.mainline.distance=80;updateMainline(g,.05);
 assert.equal(g.progress.mainline.phase,'report');assert.equal(taskNavigationEnabled(g),false);
 const loaded=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.equal(loaded.mainline.navigationEnabled,false);
});
