// 清缴站牌导航回归：场地边界不能提前截断目标，抵达与手动关闭仍可收起。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {clearingSite,clearingNavigationSite} from '../src/progression/clearing-site.js';
import {worldNavigationObjective} from '../src/core/world-navigation.js';
import {storyRouteState} from '../src/core/story-route.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {livingWaveAllowed,clearingCombatActive} from '../src/core/living-safety.js';
import {settlementObjects} from '../src/rendering/settlements.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
// 使用正式游戏实例，保留真实树木用于站牌终点可达性验证。
function scene(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=MAINLINE_IDS.slice();p.mainline.phase='complete';p.living.patrolActive=true;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;return g;}

test('显示范围和战斗范围内仍有路线，沿可通行路径到站牌前方',()=>{
 const g=scene(),site=clearingSite(g.progress),target=clearingNavigationSite(g.progress),sign=settlementObjects(g).find(s=>s.label==='清缴场');
 assert.equal(worldDistance(sign,target),55);
 for(const distance of [451,450,375,300,150,80]){Object.assign(g.player,{x:site.x+distance,y:site.y});assert.ok(worldNavigationObjective(g),String(distance));assert.deepEqual(storyGuidanceState(g).target,target);assert.equal(clearingCombatActive(g),distance<=450);assert.equal(livingWaveAllowed(g),distance<=300);}
 let route;for(let i=0;i<5000;i++){g.time+=.04;route=storyRouteState(g);if(!route.planning)break;}
 assert.equal(route.reachable,true);assert.equal(route.near,false);assert.ok(route.points.length>0);
 Object.assign(g.player,{x:target.x+61,y:target.y});assert.ok(worldNavigationObjective(g));assert.equal(storyRouteState(g).near,false);
 Object.assign(g.player,{x:target.x+60,y:target.y});assert.equal(worldNavigationObjective(g),null);assert.equal(storyRouteState(g),null);assert.equal(storyGuidanceState(g).target,null);
});
test('随机地点、读档与循环地图边界都从同一站牌推导目标',()=>{const g=scene();g.progress.living.clearingSite={id:'patrol-clearing',mapId:'forest',name:'本次清缴地点',x:2200,y:WORLD.height-20,radius:300};const before=structuredClone(g.progress.living.clearingSite),target=clearingNavigationSite(g.progress);assert.equal(target.y,35);assert.deepEqual(g.progress.living.clearingSite,before);Object.assign(g.player,{x:2200,y:WORLD.height-1});assert.equal(worldNavigationObjective(g),null);Object.assign(g.player,{x:2400,y:WORLD.height-1});assert.deepEqual(worldNavigationObjective(g).site,target);});
test('手动关闭、完成任务与离开森林不会遗留场内站牌指引',()=>{const g=scene(),site=clearingSite(g.progress);Object.assign(g.player,{x:site.x+200,y:site.y});g.progress.mainline.navigationEnabled=false;assert.equal(worldNavigationObjective(g),null);g.progress.mainline.navigationEnabled=true;assert.ok(worldNavigationObjective(g));g.progress.living.patrolActive=false;assert.equal(worldNavigationObjective(g),null);g.progress.living.patrolActive=true;g.mapId='jiuzhaigou';assert.equal(worldNavigationObjective(g),null);});
