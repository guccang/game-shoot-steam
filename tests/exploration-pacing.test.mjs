// 节奏第一轮回归：主线闭环、自选体验保存、自由探索追踪及分区遭遇。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {MAINLINE_TASKS,MAINLINE_SITES,currentMainlineTask} from '../src/config/mainline.js';
import {CAMPAIGN_TASK_IDS,isCampaignTask} from '../src/config/mainline-pacing.js';
import {selectMainlineTask} from '../src/core/mainline-selection.js';
import {awardMainline} from '../src/progression/mainline-reward.js';
import {completeMainline,updateMainline,mainlineObjective,mainlineTask} from '../src/core/mainline-manager.js';
import {worldNavigationObjective} from '../src/core/world-navigation.js';
import {trackedLivingId} from '../src/progression/task-tracking.js';
import {TOWN_RESTORATIONS,pendingRestoration} from '../src/config/town-restoration.js';
import {startRestoredTask} from '../src/progression/restoration-task.js';
import {beginGardeningLesson} from '../src/progression/mainline-gardening.js';
import {resetEncounters,updateEncounters,encounterRules} from '../src/core/encounter-manager.js';
import {ENCOUNTERS,LOW_RISK_ENCOUNTERS} from '../src/config/encounters.js';
import {findNearbyArrivalSpot} from '../src/core/enemy-arrival.js';
import {forestThreatAt} from '../src/world/forest-levels.js';
import {livingSafePoint} from '../src/world/living-spaces.js';
import {observingMonsterCamp} from '../src/core/monster-camps.js';
import {taskCatalog} from '../src/ui/task-catalog.js';
// 使用正式游戏实例及保存入口，测试不访问用户存储。
function scene(){const g=new Game(freshProgress(),()=>.5);g.start();g.state='playing';g.vehicle.active=false;g.mainlinePersist=()=>true;g.enemies=[];g.boss=null;g.trees=[];return g;}
// 恢复正式结构，模拟同版本刷新。
function reload(g){g.progress=validateProgress(JSON.parse(JSON.stringify(g.progress)));}

test('必经主线只有八阶段，四十项自选体验不被标记完成或补领奖励',()=>{
 const g=scene();assert.equal(MAINLINE_TASKS.filter(isCampaignTask).length,8);assert.equal(MAINLINE_TASKS.length-CAMPAIGN_TASK_IDS.length,40);
 for(const id of CAMPAIGN_TASK_IDS){assert.equal(mainlineTask(g).id,id);assert.ok(awardMainline(g.progress,id));reload(g);}
 assert.equal(mainlineTask(g),null);assert.equal(g.progress.mainline.phase,'complete');assert.deepEqual(g.progress.mainline.completed,CAMPAIGN_TASK_IDS);
 assert.equal(awardMainline(g.progress,'last-letter'),null);
 assert.ok(selectMainlineTask(g,'football-day'));assert.equal(mainlineTask(g).id,'football-day');
});
test('正式交付停止追踪，下一项、对白、地图及目录不会抢回探索',()=>{
 const g=scene();Object.assign(g.player,MAINLINE_SITES.camp);g.progress.mainline.currentId='first-map';g.progress.mainline.phase='report';g.progress.mainline.seen.map=1;g.progress.mainline.distance=80;
 g.mainlinePersist=()=>false;const before=structuredClone(g.progress);assert.equal(completeMainline(g),false);assert.deepEqual(g.progress,before);
 g.mainlinePersist=()=>true;assert.ok(completeMainline(g));reload(g);
 assert.equal(mainlineTask(g).id,'first-patrol');assert.equal(mainlineObjective(g),null);assert.equal(worldNavigationObjective(g),null);assert.equal(taskCatalog(g).current,null);
 g.progress.living.requests['neighbors-lunch'].stage=0;assert.equal(trackedLivingId(g.progress),null);
 updateMainline(g,100);assert.equal(g.mainlineSpeech,null);assert.equal(g.progress.mainline.phase,'meet');assert.equal(pendingRestoration(g.progress),null);
 assert.ok(selectMainlineTask(g,'first-patrol'));assert.ok(mainlineObjective(g));
});
test('自选待交付阶段和种植地块切走再回来都保留，保存失败无部分切换',()=>{
 const g=scene();assert.ok(selectMainlineTask(g,'neighbor-garden'));g.progress.mainline.phase='doing';beginGardeningLesson(g.progress);
 Object.assign(g.progress.mainline.gardening,{plotId:17,planted:1,watered:1});g.progress.mainline.phase='report';
 assert.ok(selectMainlineTask(g,'football-day'));reload(g);assert.ok(selectMainlineTask(g,'neighbor-garden'));
 assert.equal(g.progress.mainline.phase,'report');assert.equal(g.progress.mainline.gardening.plotId,17);assert.equal(g.progress.mainline.gardening.watered,1);
 const before=structuredClone(g.progress);g.mainlinePersist=()=>false;assert.equal(selectMainlineTask(g,'warehouse-lesson'),false);assert.deepEqual(g.progress,before);
});
test('自由探索保存后仍关闭追踪，手动继续才恢复，不能越级选择章节',()=>{
 const g=scene();assert.equal(selectMainlineTask(g,'last-letter'),false);assert.ok(selectMainlineTask(g));reload(g);assert.equal(mainlineObjective(g),null);
 assert.ok(selectMainlineTask(g,'first-map'));reload(g);assert.ok(mainlineObjective(g));g.boss={};assert.equal(selectMainlineTask(g,'football-day'),false);
});
test('设施只阻挡对应当前任务，休闲设施不再成为后续故事前置',()=>{
 const g=scene();g.progress.mainline.completed=['first-map','first-patrol'];g.progress.mainline.currentId='first-letter';assert.equal(pendingRestoration(g.progress).id,'story');
 g.progress.restoration.repaired=['story'];assert.equal(pendingRestoration(g.progress),null);
 g.progress.mainline.currentId='road-trial';assert.equal(pendingRestoration(g.progress),null);
 g.progress.mainline.currentId='football-day';assert.equal(pendingRestoration(g.progress).id,'football');
 g.progress.mainline.trackingPaused=true;g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);assert.equal(startRestoredTask(g.progress),null);
});
// 找到真实低风险、可遭遇且不属于聚落或怪物营地的坐标，避免伪造区域接口。
function lowRiskScene(){const g=scene();for(let x=0;x<1600;x+=100)for(let y=0;y<2200;y+=100){Object.assign(g.player,{x,y});if(forestThreatAt(x,y).max<=3&&!livingSafePoint(g.player)&&!observingMonsterCamp(g)&&findNearbyArrivalSpot(g,0,ENCOUNTERS)){resetEncounters(g);return g;}}throw Error('缺少低风险样本');}
test('低风险18至28秒、三只上限；危险区和其他地图保留原规则',()=>{
 const g=lowRiskScene();assert.equal(encounterRules(g),LOW_RISK_ENCOUNTERS);for(const r of [0,1]){g.random=()=>r;resetEncounters(g);assert.equal(g.encounterTimer,r?28:18);}
 g.enemies=Array.from({length:3},()=>({ambient:true,hp:1}));g.encounterTimer=1;updateEncounters(g,10,true);assert.equal(g.encounterTimer,1);
 Object.assign(g.player,{x:2500,y:755});assert.equal(encounterRules(g),ENCOUNTERS);g.mapId='jiuzhaigou';assert.equal(encounterRules(g),ENCOUNTERS);
});
test('清完遭遇后喘息，停止和暂停不计时，低帧率不追补一批怪',()=>{
 const g=lowRiskScene();g.encounterHadEnemies=true;g.encounterTimer=5;updateEncounters(g,1,true);assert.equal(g.encounterQuiet,11);assert.equal(g.encounterTimer,5);
 updateEncounters(g,100,false);assert.equal(g.encounterQuiet,11);g.state='paused';updateEncounters(g,100,true);assert.equal(g.encounterQuiet,11);
 g.state='playing';updateEncounters(g,100,true);assert.equal(g.encounterQuiet,0);assert.equal(g.encounterSpawned,0);
 updateEncounters(g,100,true);assert.equal(g.encounterSpawned,1);
});
test('从危险区返回低风险区不立即补怪；专属战斗继续冻结计时',()=>{
 const g=lowRiskScene();g.encounterLowRisk=false;g.encounterTimer=.1;updateEncounters(g,.1,true);assert.ok(g.encounterTimer>=17.9);
 for(const key of ['story','realm','boss','campDefense']){g[key]={};const timer=g.encounterTimer;updateEncounters(g,100,true);assert.equal(g.encounterTimer,timer);g[key]=null;}
});

// 自选活动结算或退出不应把已暂停的主线再次推到屏幕上。
test('自由探索中完成邻里委托后不自动恢复主线',async()=>{
 const {LIVING_REQUESTS}=await import('../src/config/living-world.js');
 const {livingRequestTarget,interactLivingRequest}=await import('../src/core/living-world.js');
 const g=scene(),spec=LIVING_REQUESTS[0];g.livingPersist=()=>true;g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 assert.ok(selectMainlineTask(g));g.progress.living.requests[spec.id].stage=spec.steps.length-1;g.progress.taskTracking={kind:'living',id:spec.id};
 const target=livingRequestTarget(g,spec);Object.assign(g.player,{x:target.x,y:target.y});assert.ok(interactLivingRequest(g,spec.id).ok);reload(g);
 assert.equal(g.progress.living.requests[spec.id].completed,true);assert.equal(g.progress.taskTracking.kind,'none');assert.equal(mainlineObjective(g),null);
});
test('自由探索进入并退出秘境后主线仍未追踪',()=>{
 const g=scene();g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);assert.ok(selectMainlineTask(g));
 g.enterRealm('tower');assert.ok(g.realm);g.leaveRealm();assert.equal(g.realm,null);assert.equal(g.progress.mainline.trackingPaused,true);assert.equal(mainlineObjective(g),null);
});
