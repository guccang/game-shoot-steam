import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 当前任务专项：选择、主线冲突、存档、完成、交互和路线共用同一追踪。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {trackedLivingRequest} from '../src/core/task-tracking.js';
import {acceptLivingRequest,trackLivingRequest,interactLivingRequest,livingRequestTarget,nearbyLivingInteraction,updateLivingWorld} from '../src/core/living-world.js';
import {mainlineObjective,updateMainline,canTalkMainline} from '../src/core/mainline-manager.js';
import {livingRouteStates} from '../src/core/living-route.js';
import {storyRouteState} from '../src/core/story-route.js';
import {LIVING_REQUESTS} from '../src/config/living-world.js';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {taskCatalog} from '../src/ui/task-catalog.js';
// 主线保持未完成，复现此前被测试跳过的主线与邻里同时进行场景。
function world(){
 // 任务追踪专项使用已修复委托板，设施解锁由修复专项验证。
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.5);g.start();g.livingPersist=()=>true;updateLivingWorld(g,.05);
 Object.assign(g.player,{x:650,y:1840});return g;
}
test('最新接取接管卡片来源与路线，主线不自动插入对白，主动切回主线仍可继续',()=>{
 const g=world();assert.ok(mainlineObjective(g));
 assert.ok(acceptLivingRequest(g,'neighbors-lunch').ok);assert.ok(acceptLivingRequest(g,'neighbors-night').ok);
 assert.equal(trackedLivingRequest(g).id,'neighbors-night');assert.equal(mainlineObjective(g),null);assert.equal(storyRouteState(g),null);
 assert.deepEqual(livingRouteStates(g).map(r=>r.id),['neighbors-night']);
 Object.assign(g.player,MAINLINE_SITES.camp);g.mainlineTalkDelay=0;updateMainline(g,.1);
 assert.equal(canTalkMainline(g),false);assert.equal(g.mainlineSpeech,null);
 assert.ok(trackLivingRequest(g).ok);assert.equal(trackedLivingRequest(g),null);assert.ok(mainlineObjective(g));assert.deepEqual(livingRouteStates(g),[]);
 assert.ok(trackLivingRequest(g,'neighbors-lunch').ok);assert.equal(trackedLivingRequest(g).id,'neighbors-lunch');
});
// 目录只读同一份账本，浏览不会把已领取任务变成可接取或抢走当前追踪。
test('统一目录区分当前主线、已领取邻里和已完成旧故事，浏览不改追踪',()=>{
 const g=world();acceptLivingRequest(g,'neighbors-lunch');acceptLivingRequest(g,'neighbors-night');
 let catalog=taskCatalog(g);assert.equal(catalog.current.id,'neighbors-night');
 assert.equal(catalog.neighbors.find(q=>q.id==='neighbors-lunch').state,'已领取');
 const before=JSON.stringify(g.progress);taskCatalog(g);assert.equal(JSON.stringify(g.progress),before);
 trackLivingRequest(g);catalog=taskCatalog(g);assert.equal(catalog.current.id,MAINLINE_IDS[0]);
 assert.equal(catalog.neighbors.find(q=>q.id==='neighbors-night').state,'已领取');
 g.progress.story.chapters['neighbors-lunch'].completed=true;g.progress=validateProgress(g.progress);
 assert.equal(taskCatalog(g).neighbors.find(q=>q.id==='neighbors-lunch').state,'已完成');
});
test('追踪选择刷新恢复，旧档只选一项，非法或完成目标安全回退',()=>{
 const g=world();acceptLivingRequest(g,'neighbors-lunch');acceptLivingRequest(g,'neighbors-night');
 let p=validateProgress(JSON.parse(JSON.stringify(g.progress)));assert.equal(p.taskTracking.id,'neighbors-night');
 delete p.taskTracking;g.progress=validateProgress(p);assert.equal(trackedLivingRequest(g).id,'neighbors-lunch');
 g.progress.taskTracking={kind:'living',id:'not-a-request'};g.progress=validateProgress(g.progress);assert.equal(trackedLivingRequest(g).id,'neighbors-lunch');
 trackLivingRequest(g);g.progress=validateProgress(g.progress);assert.equal(trackedLivingRequest(g),null);
});
test('完成后恢复主线并存档，其他委托保留进度且只能手动切回，报酬不会重复',()=>{
 const g=world(),lunch=LIVING_REQUESTS[0];acceptLivingRequest(g,lunch.id);
 acceptLivingRequest(g,'neighbors-night');g.progress.living.requests['neighbors-night'].stage=1;
 trackLivingRequest(g,lunch.id);const other=structuredClone(g.progress.living.requests['neighbors-night']);
 g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('neighbors'));g.progress.mainline.phase='doing';
 while(!g.progress.living.requests[lunch.id].completed){
  const target=livingRequestTarget(g,lunch);Object.assign(g.player,{x:target.x,y:target.y});
  assert.equal(nearbyLivingInteraction(g)?.id,lunch.id);assert.ok(interactLivingRequest(g,lunch.id).ok);
 }
 assert.equal(trackedLivingRequest(g),null);updateMainline(g,0);assert.equal(mainlineObjective(g).phase,'report');
 assert.deepEqual(g.progress.taskTracking,{kind:'mainline'});
 assert.deepEqual(g.progress.living.requests['neighbors-night'],other);
 g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));
 assert.equal(trackedLivingRequest(g),null);assert.ok(mainlineObjective(g));assert.deepEqual(livingRouteStates(g),[]);
 const coins=g.progress.coins;assert.equal(interactLivingRequest(g,lunch.id).ok,false);assert.equal(g.progress.coins,coins);
 assert.ok(trackLivingRequest(g,'neighbors-night').ok);assert.equal(trackedLivingRequest(g).id,'neighbors-night');
 assert.deepEqual(g.progress.living.requests['neighbors-night'],other);
});
test('保存失败不改变追踪；章节与秘境暂时接管，退出恢复；附近请求不抢当前任务',()=>{
 const g=world();acceptLivingRequest(g,'neighbors-lunch');acceptLivingRequest(g,'neighbors-night');
 g.livingPersist=()=>false;assert.equal(trackLivingRequest(g,'neighbors-lunch').ok,false);assert.equal(trackedLivingRequest(g).id,'neighbors-night');
 g.story={};assert.equal(trackedLivingRequest(g),null);g.story=null;g.realm={};assert.equal(trackedLivingRequest(g),null);g.realm=null;
 assert.equal(trackedLivingRequest(g).id,'neighbors-night');g.livingPersist=()=>true;
 const target=livingRequestTarget(g,LIVING_REQUESTS[0]);Object.assign(g.player,{x:target.x,y:target.y});
 assert.notEqual(nearbyLivingInteraction(g)?.id,'neighbors-lunch');
});
