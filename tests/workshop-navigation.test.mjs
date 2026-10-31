// 工坊路点回归：入职目标接入正式路线，后续购买仍由点击启用。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,freshRangerProgress} from '../src/progression/progress.js';
import {worldNavigationObjective,requestMainlineNavigation} from '../src/core/world-navigation.js';
import {storyRouteState} from '../src/core/story-route.js';
import {MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {WORKSHOP} from '../src/world/workshop.js';
// 从真实入职检查点创建角色，不推进漫长的接送演出。
function arrival(phase,wood=RANGER.repairWood+RANGER.pistolWood){const p=freshRangerProgress();Object.assign(p.arrival,{phase,keys:true,wood:RANGER.repairWood+RANGER.pistolWood,x:800,y:900});p.wood=wood;const g=new Game(p,()=>.5);g.start();return g;}
for(const phase of ['repair','craft'])test('入职工坊自动铺路：'+phase,()=>{
 const g=arrival(phase),o=worldNavigationObjective(g);assert.ok(o);assert.equal(o.site.x,WORKSHOP.x);assert.equal(o.site.y,WORKSHOP.y+25);assert.equal(o.site.mapId,'forest');
 requestMainlineNavigation(g);let route;for(let i=0;i<240;i++){g.time+=1/60;route=storyRouteState(g);if(route?.reachable)break;}
 assert.ok(route?.reachable);assert.ok(route.points.length>1);Object.assign(g.player,o.site);assert.equal(storyRouteState(g).near,true);
});
test('采集、缺木材、施工和完成阶段不错误引导回工坊',()=>{
 for(const [phase,wood] of [['gather',0],['repair',0],['craft',0],['repairing',24],['crafting',8]])assert.equal(worldNavigationObjective(arrival(phase,wood)),null);
 const g=arrival('craft');requestMainlineNavigation(g);g.progress.arrival.phase='complete';g.progress.mainline.completed=[...MAINLINE_IDS];assert.equal(worldNavigationObjective(g),null);
});
test('购买载具只有明确点击后显示路线，步骤变化自动撤销旧路线',()=>{
 const p=freshProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('own-hover'));p.mainline.phase='doing';const g=new Game(p,()=>.5);g.start();Object.assign(g.player,{x:900,y:900});
 assert.equal(worldNavigationObjective(g),null);requestMainlineNavigation(g);assert.deepEqual(worldNavigationObjective(g).site,MAINLINE_SITES.garageEntry);
 g.progress.vehicleHulls[3]=1;assert.equal(worldNavigationObjective(g),null);
});

