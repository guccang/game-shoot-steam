// 任务正文与路点显隐解耦：覆盖清缴赶路、临时访问、关闭后抵达及插值画面。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {worldTaskObjective,worldNavigationObjective,requestWorldNavigation} from '../src/core/navigation/world-navigation.js';
import {toggleTaskNavigation} from '../src/core/navigation/task-navigation.js';
import {storyRouteState} from '../src/core/navigation/story-route.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {clearingSite,clearingNavigationSite} from '../src/progression/story/clearing-site.js';
import {MAINLINE_SITES} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 自由探索没有主线卡兜底，才能复现关闭清缴或访问路点后整张卡消失的问题。
function scene(){const p=freshProgress();p.mainline.trackingPaused=true;p.taskTracking={kind:'none'};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;const g=new Game(p,()=>.5);g.start();g.vehicle.active=false;g.enemies=[];g.boss=null;return g;}
// 切换开关只改变显示偏好，正文目标、操作、任务追踪与完成记录都保留。
function assertToggle(g){
 const before=structuredClone(g.progress),target=worldTaskObjective(g);assert.ok(target);assert.deepEqual(worldNavigationObjective(g),target);
 toggleTaskNavigation(g);assert.deepEqual(worldTaskObjective(g),target);assert.deepEqual(worldTaskObjective(createRenderInterpolation().sample(g,.5)),target);
 assert.equal(worldNavigationObjective(g),null);assert.equal(storyRouteState(g),null);assert.equal(storyGuidanceState(g).target,null);
 assert.deepEqual({...g.progress,mainline:{...g.progress.mainline,navigationEnabled:true}},before);
 toggleTaskNavigation(g);assert.deepEqual(worldNavigationObjective(g),target);assert.deepEqual(g.progress,before);
}
test('清缴赶路关闭后保留站牌任务正文，重开恢复同一目标',()=>{
 const g=scene();g.progress.living.patrolActive=true;const site=clearingSite(g.progress);Object.assign(g.player,{x:site.x+600,y:site.y});
 assert.equal(worldTaskObjective(g).key,'boss-clearing');assert.equal(worldTaskObjective(g).label,'前往清缴场站牌附近');assertToggle(g);
});
test('临时访问关闭后移除任务卡，重新开启不复活已取消的目的地',()=>{
 const g=scene();Object.assign(g.player,MAINLINE_SITES.camp);const action={type:'camp-defense',gate:'left'};
 requestWorldNavigation(g,MAINLINE_SITES.westGate,'前往西门',{direct:true,action});assert.equal(worldTaskObjective(g).key,'visit');assert.deepEqual(worldTaskObjective(g).action,action);
 const before=structuredClone(g.progress);toggleTaskNavigation(g);assert.equal(worldTaskObjective(g),null);assert.equal(worldTaskObjective(createRenderInterpolation().sample(g,.5)),null);assert.equal(storyRouteState(g),null);
 assert.deepEqual({...g.progress,mainline:{...g.progress.mainline,navigationEnabled:true}},before);
 toggleTaskNavigation(g);assert.equal(worldTaskObjective(g),null);assert.equal(worldNavigationObjective(g),null);
 requestWorldNavigation(g,MAINLINE_SITES.westGate,'前往西门',{direct:true,action});assert.equal(worldTaskObjective(g).key,'visit');
});
test('路点关闭时到达临时目的地仍撤销访问卡，重新开启不复活旧目标',()=>{
 const g=scene();Object.assign(g.player,MAINLINE_SITES.camp);requestWorldNavigation(g,MAINLINE_SITES.garage,'前往载具工坊',{direct:true});toggleTaskNavigation(g);
 Object.assign(g.player,MAINLINE_SITES.garage);assert.equal(worldTaskObjective(g),null);toggleTaskNavigation(g);assert.equal(worldNavigationObjective(g),null);
});
test('清缴赶路关闭后仍随抵达、离场及取消任务更新正文',()=>{
 const g=scene();g.progress.living.patrolActive=true;const site=clearingSite(g.progress);Object.assign(g.player,{x:site.x+600,y:site.y});toggleTaskNavigation(g);
 Object.assign(g.player,clearingNavigationSite(g.progress));assert.equal(worldTaskObjective(g),null);
 Object.assign(g.player,{x:site.x+600,y:site.y});assert.equal(worldTaskObjective(g).key,'boss-clearing');assert.equal(worldNavigationObjective(g),null);
 g.progress.living.patrolActive=false;assert.equal(worldTaskObjective(g),null);
});
