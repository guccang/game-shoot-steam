import {clearingSite} from '../src/progression/clearing-site.js';
// 清缴教学专项：只覆盖入口位置、接取事务、当前目标与波次激活边界。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_TASKS,MAINLINE_SITES} from '../src/config/mainline.js';
import {CLEARING_POST,CLEARING_APPROACH} from '../src/config/clearing.js';
import {BOSS_CLEARING} from '../src/config/settlements.js';
import {mainlineObjective} from '../src/core/mainline-manager.js';
import {worldNavigationObjective,requestWorldNavigation} from '../src/core/world-navigation.js';
import {clearingStage,canUseClearingPost,acceptClearingPost} from '../src/core/clearing-guide.js';
import {livingWaveAllowed} from '../src/core/living-safety.js';
import {livingSafePoint} from '../src/world/living-spaces.js';
import {storyRouteState} from '../src/core/story-route.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 从正式主线表推进到清缴教学，保留真实森林、树木与寻路碰撞。
function scene(id='first-patrol'){
 const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=999;
 g.progress.mainline.completed=MAINLINE_TASKS.slice(0,MAINLINE_TASKS.findIndex(t=>t.id===id)).map(t=>t.id);g.progress.mainline.phase='doing';Object.assign(g.player,{x:1030,y:850});return g;
}
test('接取教学指向独立告示牌，覆盖旧NPC意图且路线可达',()=>{
 const g=scene();requestWorldNavigation(g,MAINLINE_SITES.camp,'去找青芽');
 assert.equal(mainlineObjective(g).key,'clearing-post');assert.deepEqual(worldNavigationObjective(g).site,CLEARING_APPROACH);
 // 正式路线现在分帧搜索，等待规划完成后再断言可达。
 let route;for(let i=0;i<5000;i++){g.time+=1/60;route=storyRouteState(g);if(!route.planning)break;}
 assert.equal(route.reachable,true);assert.ok(livingSafePoint(CLEARING_POST));assert.ok(!livingSafePoint(BOSS_CLEARING));
 assert.equal(canUseClearingPost(g),false);assert.equal(acceptClearingPost(g).ok,false);assert.equal(g.progress.living.patrolActive,false);
});
test('现场接取后自动转清缴场，重复确认不取消也不赠装备',()=>{
 const g=scene(),before=structuredClone(g.progress.weapons);Object.assign(g.player,CLEARING_APPROACH);
 assert.ok(acceptClearingPost(g).ok);assert.equal(clearingStage(g),'travel');assert.equal(worldNavigationObjective(g).site,clearingSite(g.progress));assert.equal(livingWaveAllowed(g),false);
 assert.ok(acceptClearingPost(g).ok);assert.equal(g.progress.living.patrolActive,true);assert.deepEqual(g.progress.weapons,before);
 Object.assign(g.player,{x:clearingSite(g.progress).x,y:clearingSite(g.progress).y});assert.equal(livingWaveAllowed(g),true);assert.equal(clearingStage(g),'waves');assert.equal(worldNavigationObjective(g),null);
 g.bossReady=true;assert.equal(mainlineObjective(g).label,'领主即将登场');
});
test('接取存储失败不改变清缴与原任务追踪',()=>{
 const g=scene();Object.assign(g.player,CLEARING_APPROACH);g.livingPersist=()=>false;const before=structuredClone(g.progress);
 assert.equal(acceptClearingPost(g).ok,false);assert.deepEqual(g.progress,before);
});
test('接取聚焦巡护但保留邻里进度，整组完成前保留清缴目标',()=>{
 const g=scene();g.progress.living.requests['neighbors-lunch']={stage:0,completed:false};g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};
 Object.assign(g.player,CLEARING_APPROACH);assert.ok(acceptClearingPost(g).ok);assert.equal(g.progress.taskTracking.kind,'mainline');assert.equal(g.progress.living.requests['neighbors-lunch'].stage,0);
 requestWorldNavigation(g,clearingSite(g.progress),'前往本次清缴地点');g.progress.mainline.phase='report';assert.deepEqual(worldNavigationObjective(g).site,clearingSite(g.progress));g.progress.living.patrolActive=false;assert.deepEqual(worldNavigationObjective(g).site,MAINLINE_SITES.camp);
});
test('首次Boss教学同样从告示牌开始，专属活动不出现接取入口',()=>{
 // 先满足现有升级步骤，再验证真正的清缴教学入口。
 const g=scene('first-boss');g.progress.weapons[0]=5;g.progress.heroes[0]=5;assert.equal(mainlineObjective(g).key,'clearing-post');Object.assign(g.player,CLEARING_APPROACH);g.realm={};assert.equal(canUseClearingPost(g),false);
});

test('已接清缴可主动返回告示牌管理，暂停后教学恢复接取步骤',()=>{
 const g=scene();Object.assign(g.player,CLEARING_APPROACH);assert.ok(acceptClearingPost(g).ok);Object.assign(g.player,{x:1030,y:850});requestWorldNavigation(g,CLEARING_APPROACH,'回告示牌');assert.equal(worldNavigationObjective(g).site.id,'clearing-post');
 g.progress.living.patrolActive=false;assert.equal(mainlineObjective(g).clearingStage,'accept');
});
