// 邻居交接的内容选择覆盖当前追踪、共享委托人、完成保留和目录可发现性。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {focusedResidentRequest,visibleResidentRequests} from '../src/ui/living-request-view.js';
import {residentFor,interactLivingRequest,livingRequestTarget} from '../src/core/living-world.js';
import {LIVING_REQUESTS} from '../src/config/living-world.js';
// 使用正式进度和居民工厂，不替换事务或任务目标。
function scene(){const g=new Game(freshProgress(),()=>.5);g.start();g.mainlineSpeech=null;return g;}

test('午餐交接只显示午餐，同居民的集市委托与日常闲聊不抢占',()=>{
 const g=scene();g.progress.living.requests['neighbors-lunch'].stage=2;g.progress.living.requests['neighbors-market'].stage=3;g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};
 const focus=focusedResidentRequest(g,'boar');assert.equal(focus.id,'neighbors-lunch');assert.deepEqual(visibleResidentRequests(g,'boar',focus.id).map(q=>q.id),['neighbors-lunch']);
 g.progress.taskTracking={kind:'living',id:'neighbors-market'};assert.equal(focusedResidentRequest(g,'boar').id,'neighbors-market');
});
test('未接取时只展示可接请求，完整目录仍可发现其他委托',()=>{
 const g=scene();assert.deepEqual(visibleResidentRequests(g,'cook').map(q=>q.id),['neighbors-lunch']);assert.equal(visibleResidentRequests(g,null).length,3);
});
test('三个委托完成后本次面板仍聚焦原任务，不自动切到新请求',()=>{
 for(const spec of LIVING_REQUESTS){const g=scene(),record=g.progress.living.requests[spec.id];record.stage=spec.steps.length-1;g.progress.taskTracking={kind:'living',id:spec.id};
 const target=livingRequestTarget(g,spec);Object.assign(g.player,{x:target.x,y:target.y});const person=residentFor(g,target.step.resident||spec.host).id,focus=focusedResidentRequest(g,person);
 assert.equal(focus.id,spec.id);assert.ok(interactLivingRequest(g,spec.id).ok);assert.ok(g.progress.living.requests[spec.id].completed);
 assert.deepEqual(visibleResidentRequests(g,person,focus.id).map(q=>q.id),[spec.id]);
 }
});
test('保存失败仍保留同一步骤和当前任务',()=>{
 const g=scene(),spec=LIVING_REQUESTS[0];g.progress.living.requests[spec.id].stage=2;g.progress.taskTracking={kind:'living',id:spec.id};Object.assign(g.player,livingRequestTarget(g,spec));g.livingPersist=()=>false;
 assert.equal(interactLivingRequest(g,spec.id).ok,false);assert.equal(g.progress.living.requests[spec.id].stage,2);assert.equal(focusedResidentRequest(g,'boar').id,spec.id);
});
test('无关居民只保留闲聊，目录不沿用人物交接的聚焦状态',()=>{
 const g=scene();g.progress.living.requests['neighbors-lunch'].stage=2;g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};
 assert.equal(focusedResidentRequest(g,'bat'),null);assert.deepEqual(visibleResidentRequests(g,'bat'),[]);
 assert.equal(focusedResidentRequest(g,'mint'),null);assert.deepEqual(visibleResidentRequests(g,'mint'),[]);
 assert.equal(visibleResidentRequests(g,null,'neighbors-lunch').length,3);
});
