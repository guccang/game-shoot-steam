// 新手来信与采木指引：验证真实任务推进、静止出路点及目标切换。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {skipArrivalJourney,completeArrivalLetter} from '../src/core/ranger-arrival.js';
import {arrivalWorkshopGuide} from '../src/ui/arrival-workshop-guide.js';
import {worldNavigationObjective} from '../src/core/world-navigation.js';
import {storyRouteState,storyRouteDots} from '../src/core/story-route.js';

// 从正式交接入口进入来信任务，不伪造阶段或赠品。
function waiting(){const g=new Game(freshRangerProgress(),()=>.5);g.start();skipArrivalJourney(g);return g;}
// 实际上车触发采木任务，冻结电锯以观察静止导航。
function gathering(){const g=waiting();completeArrivalLetter(g);Object.assign(g.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});assert.ok(g.summonVehicle());g.update(.05);g.attackTimer=999;assert.equal(g.progress.arrival.phase,'gather');return g;}

test('来信猫爪指向任务按钮，弹窗期间隐藏，关闭未读来信后恢复',()=>{
 const g=waiting();assert.equal(arrivalWorkshopGuide(g).source,'#arrival-goal');assert.equal(arrivalWorkshopGuide(g).id,'arrival-letter');
 assert.equal(arrivalWorkshopGuide(g,'arrival-letter-dialog'),null);assert.equal(arrivalWorkshopGuide(g,'settings-dialog'),null);
 assert.equal(arrivalWorkshopGuide(g).id,'arrival-letter');completeArrivalLetter(g);assert.notEqual(arrivalWorkshopGuide(g)?.id,'arrival-letter');
});

test('上车后原地不动即可出现采木路线，保留树旁终点碰撞信息',()=>{
 const g=gathering(),start={x:g.player.x,y:g.player.y},objective=worldNavigationObjective(g);
 assert.equal(objective.task.id,'arrival-wood');assert.equal(objective.site.type,'tree');assert.ok(objective.site.radius>0);
 let route;
 for(let i=0;i<60;i++){g.update(.05);route=storyRouteState(g);if(route?.reachable&&storyRouteDots(route.points).length)break;}
 assert.deepEqual({x:g.player.x,y:g.player.y},start);assert.equal(route?.reachable,true);assert.ok(storyRouteDots(route.points).length>0);
});

test('活树砍倒后切换下一棵，木料够用切回修复且施工不铺路线',()=>{
 const g=gathering(),first=worldNavigationObjective(g).site;
 g.trees.find(t=>t.x===first.x&&t.y===first.y).hp=0;
 const next=worldNavigationObjective(g);assert.ok(next.site.hp>0);assert.notDeepEqual([next.site.x,next.site.y],[first.x,first.y]);
 g.progress.wood=RANGER.repairWood;g.update(.05);assert.equal(worldNavigationObjective(g).task.id,'arrival-workshop');
 g.progress.arrival.phase='repairing';assert.equal(worldNavigationObjective(g),null);
});

test('采木指引遵守关闭偏好，没有活树时不产生假目标',()=>{
 const g=gathering();g.progress.mainline.navigationEnabled=false;assert.equal(worldNavigationObjective(g),null);
 g.progress.mainline.navigationEnabled=true;assert.equal(worldNavigationObjective(g).task.id,'arrival-wood');
 for(const tree of g.trees)tree.hp=0;assert.equal(worldNavigationObjective(g),null);
});
