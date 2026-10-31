import {clearingSite} from '../src/progression/clearing-site.js';
// 聚落、清缴、远行和按需导航专项；不运行无关装备与数值测试。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {BOSS_CLEARING,SETTLEMENTS} from '../src/config/settlements.js';
import {settlementAt,settlementBlocked} from '../src/world/settlements.js';
import {livingSafePoint,livingBoltBlocked} from '../src/world/living-spaces.js';
import {livingWaveAllowed} from '../src/core/living-safety.js';
import {setLivingPatrol} from '../src/core/living-world.js';
import {updateEncounters} from '../src/core/encounter-manager.js';
import {updateBossSupport} from '../src/core/boss-reinforcements.js';
import {worldNavigationObjective,requestMainlineNavigation} from '../src/core/world-navigation.js';
import {MAINLINE_TASKS,MAINLINE_SITES} from '../src/config/mainline.js';
import {skipArrivalJourney,arrivalRoute} from '../src/core/ranger-arrival.js';
import {RANGER,RANGER_STAGES} from '../src/config/ranger-arrival.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {storyTrees} from '../src/world/story-sites.js';
import {moveBody,blocked} from '../src/physics/motion.js';
import {planQuestRoute} from '../src/physics/quest-route.js';
import {biomeAt} from '../src/world/biomes.js';
import {worldDistance,WORLD} from '../src/world/coordinates.js';
// 只布置出发状态，接取、计时、存储及移动均调用正式接口。
function scene(){const g=new Game(freshProgress(),()=>.5);g.start();Object.assign(g.player,{x:900,y:900});g.mainlineTalkDelay=999;return g;}
test('接取后必须抵达指定野外，回营或打开邻里战斗时冻结波次和节点',()=>{
 const g=scene(),warning=g.waveWarning;assert.ok(livingSafePoint(g.player));
 assert.equal(livingWaveAllowed(g),false);assert.ok(setLivingPatrol(g,true).ok);
 g.updateWaves(30);assert.equal(g.waveWarning,warning);assert.equal(g.enemies.length,0);
 Object.assign(g.player,{x:clearingSite(g.progress).x+clearingSite(g.progress).radius+1,y:clearingSite(g.progress).y});
 assert.equal(livingWaveAllowed(g),false);g.updateWaves(30);assert.equal(g.waveWarning,warning);
 Object.assign(g.player,{x:clearingSite(g.progress).x,y:clearingSite(g.progress).y});assert.ok(livingWaveAllowed(g));
 g.updateWaves(1);assert.ok(g.waveWarning<warning);const left=g.waveWarning;
 g.livingBattle='neighbors-night';g.updateWaves(20);assert.equal(g.waveWarning,left);g.livingBattle=null;
 Object.assign(g.player,{x:900,y:900});g.updateWaves(20);assert.equal(g.waveWarning,left);assert.equal(livingWaveAllowed(g),false);
 g.bossReady=true;assert.equal(g.summonBoss(),false);Object.assign(g.player,{x:clearingSite(g.progress).x,y:clearingSite(g.progress).y});assert.equal(g.summonBoss(),true);
});
test('木栏拦截玩家，木门可走，敌人与高速飞行敌人不能穿门闯进营地',()=>{
 const camp=SETTLEMENTS[0];assert.ok(settlementBlocked(400,camp.bottom,12));assert.equal(settlementBlocked(690,camp.bottom,12),false);
 const walker={x:690,y:camp.bottom+45,mapId:'forest'};moveBody(walker,0,-100,WORLD,12,[]);assert.ok(walker.y<camp.bottom);
 const wall={x:400,y:camp.bottom+45,mapId:'forest'};moveBody(wall,0,-100,WORLD,12,[]);assert.ok(wall.y>camp.bottom);
 for(const flying of [false,true]){const enemy={x:690,y:camp.bottom+45,mapId:'forest',type:'enemy',flying};moveBody(enemy,0,-100,WORLD,12,[]);assert.ok(enemy.y>camp.bottom);}
});
test('聚落工坊受伤保护、跨边界弹道拦截和循环镜像一致，野外道路不伪装安全区',()=>{
 const g=scene();for(const site of [MAINLINE_SITES.weapons,MAINLINE_SITES.garage,{x:530,y:1850}]){
  Object.assign(g.player,site);const hp=g.player.hp;g.player.invincible=0;g.hurt(999);assert.equal(g.player.hp,hp);
  assert.ok(livingSafePoint({...site,x:site.x+WORLD.width}));
 }
 assert.equal(livingSafePoint({x:690,y:1250}),false);
 assert.ok(livingBoltBlocked(g,{x:1100,y:900,vx:-500,vy:0},1));
 assert.equal(settlementAt(BOSS_CLEARING,BOSS_CLEARING.radius),null);assert.equal(biomeAt(BOSS_CLEARING.x,BOSS_CLEARING.y).id,'meadow');
});
test('购买气垫船默认不画路线，点击才导航，买完切换动作后自动取消旧路线',()=>{
 const g=scene(),index=MAINLINE_TASKS.findIndex(t=>t.id==='own-hovercraft');
 const target=index>=0?index:MAINLINE_TASKS.findIndex(t=>t.guide.steps.some(s=>s.operation?.kind==='vehicle'&&s.operation.index===3&&s.operation.type==='buy'));
 assert.ok(target>=0);g.progress.mainline.completed=MAINLINE_TASKS.slice(0,target).map(t=>t.id);g.progress.mainline.phase='doing';
 assert.equal(worldNavigationObjective(g),null);requestMainlineNavigation(g);assert.ok(worldNavigationObjective(g));
 g.progress.vehicleHulls[3]=1;assert.equal(worldNavigationObjective(g),null);
 g.progress.mainline.phase='report';assert.equal(worldNavigationObjective(g).phase,'report');
});
test('跳过长途演出只发原定工具，存储失败保持原样，不绕过伐木与制枪',()=>{
 const g=new Game(freshRangerProgress());g.start();const before=structuredClone(g.progress);
 g.arrivalPersist=()=>false;assert.equal(skipArrivalJourney(g),false);assert.deepEqual(g.progress,before);
 g.arrivalPersist=()=>true;assert.ok(skipArrivalJourney(g));assert.equal(g.progress.arrival.phase,'letter');
 assert.equal(g.progress.weapons[0],0);assert.equal(g.progress.wood,0);assert.equal(g.progress.arrival.wood,0);
 assert.equal(g.progress.weapons[RANGER.saw],1);assert.equal(g.progress.vehicleHulls[RANGER.scooter],1);
 const after=structuredClone(g.progress);assert.equal(skipArrivalJourney(g),false);assert.deepEqual(g.progress,after);
});
test('公交远离营地，短途接送沿当前道路到营门且每个采样点避开木栏和水面',()=>{
 assert.ok(RANGER.busStop.y<0);assert.ok(Math.abs(RANGER.busStop.x-630)<200);
 assert.ok(worldDistance(RANGER.busStop,{x:900,y:700})>1200);
 const start=arrivalRoute(0),end=arrivalRoute(1),gate=RANGER.stop;
 assert.ok(worldDistance(start,RANGER.busStop)<100);assert.equal(worldDistance(end,gate),0);
 assert.equal(RANGER_STAGES.ride.travel,2.8);assert.equal(RANGER_STAGES.ride.seconds,RANGER.rideSeconds);
 // 地图扩展不能把远端道路串入接送；公交到北门只保留不到一千单位的邻近路段。
 assert.ok(end.distance<1000);assert.ok(end.distance>=Math.hypot(end.x-start.x,end.y-start.y));
 for(let i=0;i<=400;i++){const p=arrivalRoute(i/400);assert.equal(blocked(p.x,p.y,12,[],{mapId:'forest'}),false,JSON.stringify(p));}
});
test('主要故事节点间距1000–2000米，实际规划路径可以步行走完',()=>{
 const g=scene();
 for(const [id,pairs] of [['sunleaf-01',[['CAMP','SIGN'],['SIGN','ROAD1'],['SIGN','SHORT1'],['SHORT1','MINT'],['ROAD1','ROAD2'],['ROAD2','MINT'],['MINT','RELAY'],['RELAY','BOSS']]],['sunleaf-03',[['CAMP','FIRST'],['FIRST','SECOND'],['SECOND','THIRD']]],['sunleaf-06',[['FAR','STATION'],['STATION','CALIBRATE']]]]){
  const def=STORY_CAMPAIGN[id],trees=storyTrees(g.trees,def);
  for(const [a,b] of pairs){const start={...def.world.sites[a],mapId:'forest'},route=planQuestRoute(start,def.world.sites[b],trees,16000);assert.ok(route.reachable,id+'/'+a+'/'+b);
   const distance=worldDistance(def.world.sites[a],def.world.sites[b]);
   assert.ok(distance>=1000&&distance<=2000,`${id} ${a}→${b} ${distance.toFixed(1)}米`);
   // 按正式移动器逐段走完，不能仅相信规划器的可达标记。
   for(const point of route.points.slice(1))moveBody(start,point.x-start.x,point.y-start.y,WORLD,12,trees);
   assert.ok(worldDistance(start,def.world.sites[b])<2);
  }
 }
});

// 接取只是预约；清缴正式开始前，野外的独立移动遭遇仍可自然发生。
test('待赴清缴场不关闭野外遭遇，进场关闭随机刷新，回营冻结领主援兵',()=>{
 const g=scene();assert.ok(setLivingPatrol(g,true).ok);Object.assign(g.player,{x:2600,y:400});g.encounterTimer=0;
 updateEncounters(g,1,true);assert.ok(g.enemies.some(e=>e.ambient));
 g.enemies=[];Object.assign(g.player,{x:clearingSite(g.progress).x,y:clearingSite(g.progress).y});g.encounterTimer=0;updateEncounters(g,1,true);assert.equal(g.enemies.length,0);
 g.bossReady=true;assert.ok(g.summonBoss());Object.assign(g.player,{x:900,y:900});const timer=g.boss.support.timer;updateBossSupport(g,50);assert.equal(g.boss.support.timer,timer);assert.equal(g.enemies.length,0);
});
