// 清缴显示边界独立于战斗触发范围，覆盖历史场地、随机场地及安全区优先级。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {clearingSite,normalizeClearingSite,clearingNavigationSite} from '../src/progression/clearing-site.js';
import {clearingCombatActive,livingWaveAllowed} from '../src/core/living-safety.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {worldNavigationObjective,requestWorldNavigation,worldNavigationDiagnostics} from '../src/core/world-navigation.js';
import {clearingObjective} from '../src/core/clearing-guide.js';
import {storyRouteState} from '../src/core/story-route.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {livingRouteStates} from '../src/core/living-route.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';

// 使用真实进度结构，位置从正式场地取得，不创建怪物或修改全局配置。
function scene(randomSite=false){
 const progress=freshProgress();progress.living.patrolActive=true;
 if(randomSite)progress.living.clearingSite=normalizeClearingSite({x:2200,y:400,origin:{x:600,y:600}});
 const site=clearingSite(progress);
 return {mapId:'forest',progress,player:{x:site.x,y:site.y}};
}

for(const randomSite of [false,true])test(`${randomSite?'随机':'历史'}场地显示半径300扩大至450，战斗范围保持不变`,()=>{
 const g=scene(randomSite),site=clearingSite(g.progress);
 for(const distance of [299,300,301,375,449,450,451]){
  g.player.x=site.x+distance;
  assert.equal(clearingCombatActive(g),distance<=450,`显示距离 ${distance}`);
  assert.equal(livingWaveAllowed(g),distance<=300,`战斗距离 ${distance}`);
 }
 g.player.x=site.x+375;assert.ok(clearingCombatActive(g),'返回扩展范围恢复显示');
});

test('未接取、其他活动及安全区域仍隐藏清缴展示',()=>{
 const g=scene();
 g.progress.living.patrolActive=false;assert.equal(clearingCombatActive(g),false);g.progress.living.patrolActive=true;
 for(const key of ['campDefense','story','realm','fireActive','arrivalCinematic','workshopTrial','livingBattle']){
  g[key]={};assert.equal(clearingCombatActive(g),false,key);g[key]=null;
 }
 g.mapId='jiuzhaigou';assert.equal(clearingCombatActive(g),false);g.mapId='forest';
 g.progress.living.clearingSite={...CLEARING_APPROACH,radius:300};g.player={...CLEARING_APPROACH};
 assert.equal(clearingCombatActive(g),false,'安全区优先于距离');
});

// HUD 与清缴路线可以共存，跨过两层边界后仍要走到站牌附近。
for(const randomSite of [false,true])test(`${randomSite?'随机':'历史'}场地寻路持续到站牌，离场恢复且不改变偏好`,()=>{
 const g=scene(randomSite),site=clearingSite(g.progress);g.state='playing';g.time=0;g.trees=[];
 Object.assign(g.progress.restoration,{repaired:TOWN_RESTORATIONS.map(f=>f.id),cottageRested:true});
 g.progress.arrival=null;g.progress.mainline.completed=[...MAINLINE_IDS];g.progress.mainline.phase='complete';
 for(const distance of [299,300,301,375,449,450,451,375,451]){
  g.player.x=site.x+distance;
  assert.equal(!!worldNavigationObjective(g),true,`导航距离 ${distance}`);
  assert.equal(!!storyGuidanceState(g).target,true,`终点距离 ${distance}`);
  assert.equal(clearingObjective(g).navigation,true,`任务导航距离 ${distance}`);
  assert.deepEqual(worldNavigationObjective(g).site,clearingNavigationSite(g.progress));
 }
 requestWorldNavigation(g,CLEARING_APPROACH,'返回告示牌',{direct:true});g.player.x=site.x+375;
 assert.equal(worldNavigationObjective(g).key,'boss-clearing');assert.ok(worldNavigationDiagnostics(g).intent,'赶路期间保留临时访问目标');
 g.progress.living.requests['neighbors-lunch']={stage:0,completed:false};g.progress.taskTracking={kind:'living',id:'neighbors-lunch'};
 assert.deepEqual(livingRouteStates(g),[],'邻里旧路线不能接替显示');
 g.player.x=site.x+451;assert.equal(worldNavigationObjective(g).site.id,CLEARING_APPROACH.id,'离场恢复原目标');
 g.progress.mainline.navigationEnabled=false;g.player.x=site.x+375;assert.equal(worldNavigationObjective(g),null);
 g.player.x=site.x+451;assert.equal(worldNavigationObjective(g),null,'离场不覆盖手动关闭');
 assert.equal(g.progress.living.patrolActive,true,'不取消清缴任务');
});
