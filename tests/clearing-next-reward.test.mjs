// 清缴使用正式五波、领主和接取事务，验证异地续战或回营接取均不重发奖励。
import test from 'node:test';
import assert from 'node:assert/strict';
import {blocked} from '../src/physics/motion.js';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {acceptClearingPost} from '../src/core/story/clearing-guide.js';
import {setLivingPatrol,acceptNextClearing,canAcceptNextClearing} from '../src/core/camp/living-world.js';
import {clearingSite,clearingNavigationSite} from '../src/progression/story/clearing-site.js';
import {worldDistance} from '../src/world/coordinates.js';
import {worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {CLEARING_APPROACH,CLEARING_STARTER_RULES,CLEARING_SITE_RULES} from '../src/config/clearing.js';
import {clearingEnemyLevel} from '../src/config/clearing-difficulty.js';
import {livingWaveAllowed} from '../src/core/camp/living-safety.js';
// 固定随机序列保证选点可复现，胜利收据仍由正式事件生成。
function scene(){let seed=29;const events=[],p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired.push('clearing');p.campLand.owned.push('workyard');const g=new Game(p,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),(type,data)=>{if(type==='victory')events.push(data);});g.start();g.mainlineSpeech=null;Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});const accepted=acceptClearingPost(g);assert.ok(accepted.ok,accepted.message);return {g,events};}
// 完整清掉五波后击败领主，重复致命命中不应再结算。
function finish(g,victoryPosition=null){const s=clearingSite(g.progress);Object.assign(g.player,{x:s.x,y:s.y});for(let i=0;i<600&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);}assert.ok(g.boss);if(victoryPosition)Object.assign(g.player,victoryPosition);const boss=g.boss;g.hit(boss,1e9);g.hit(boss,1e9);}

// 追击领主离开刷怪范围仍可续接，保存失败可重试，真正回场后才推进下一波。
test('范围外击败领主可接取新场地，返回前冻结刷怪且不重复领奖',()=>{
 for(const offset of [1,200,'camp']){
  const {g,events}=scene(),site=structuredClone(clearingSite(g.progress));
  // 圈外击杀使用真实可站立坐标，避免把角色传送进树干后测试寻路。
  const position=offset==='camp'?{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y}:Array.from({length:64},(_,i)=>({x:site.x+Math.cos(i*Math.PI/32)*(site.radius+offset),y:site.y+Math.sin(i*Math.PI/32)*(site.radius+offset)})).find(p=>!blocked(p.x,p.y,12,g.trees,{...g.player,livingCollision:true,mapId:'forest'}));assert.ok(position);
  finish(g,position);g.state='paused';const round=events.at(-1).clearingRound,before=structuredClone(g.progress);
  assert.ok(canAcceptNextClearing(g,round));
  g.livingPersist=()=>false;assert.equal(acceptNextClearing(g,round).ok,false);assert.deepEqual(g.progress,before);assert.equal(g.pendingClearingRound,round);
  g.livingPersist=()=>true;const result=acceptNextClearing(g,round);assert.ok(result.ok,JSON.stringify({message:result.message,offset,position,site}));assert.match(result.message,/对应等级的新清缴地点/);
  const nextSite=clearingSite(g.progress);assert.notDeepEqual(nextSite,site);assert.deepEqual({x:g.player.x,y:g.player.y},position);
  assert.equal(g.progress.campLevel.xp,before.campLevel.xp);assert.equal(g.progress.bosses,round);assert.equal(g.pendingClearingRound,0);
  assert.equal(acceptNextClearing(g,round).ok,false);assert.deepEqual(worldNavigationObjective(g).site,clearingNavigationSite(g.progress));
  g.state='playing';const wave=g.wave,rest=g.waveRest;assert.equal(livingWaveAllowed(g),false);g.updateWaves(30);assert.equal(g.wave,wave);assert.equal(g.waveRest,rest);
  Object.assign(g.player,{x:nextSite.x,y:nextSite.y});assert.ok(livingWaveAllowed(g));for(let i=0;i<30;i++)g.updateWaves(.5);assert.ok(g.wave>wave);assert.ok(g.enemies.some(e=>e.wave===g.wave&&e.hp>0));
 }
});

test('首轮及后续当前收据可接取新地点且不重复奖励',()=>{
 for(const round of [1,4,5,6]){
  const {g,events}=scene();g.progress.bosses=round-1;finish(g);g.state='paused';
  assert.equal(events.at(-1).clearingRound,round);const before=structuredClone(g.progress),origin={x:g.player.x,y:g.player.y};
  assert.equal(canAcceptNextClearing(g,round),true);
  const result=acceptNextClearing(g,round);
  assert.equal(result.ok,true);const site=structuredClone(clearingSite(g.progress));
  assert.notDeepEqual(site,before.living.clearingSite);assert.ok(worldDistance(origin,site)>site.radius);
  assert.equal(g.progress.campLevel.xp,before.campLevel.xp);assert.equal(g.progress.bosses,round);assert.ok(g.progress.living.patrolActive);
  const accepted=structuredClone(g.progress);assert.equal(acceptNextClearing(g,round).ok,false);assert.deepEqual(g.progress,accepted);
  const loaded=new Game(validateProgress({...g.progress,patrol:capturePatrol(g)}),()=>.5);loaded.start();assert.deepEqual(clearingSite(loaded.progress),site);assert.ok(loaded.progress.living.patrolActive);
 }
});

test('续接拒绝旧收据，保存失败保留资格，成功后及重置后不能再次使用',()=>{
 const {g}=scene();g.progress.bosses=4;finish(g);g.state='paused';const before=structuredClone(g.progress);
 assert.equal(acceptNextClearing(g,4).ok,false);assert.equal(acceptNextClearing(g,6).ok,false);
 g.livingPersist=()=>false;assert.equal(acceptNextClearing(g,5).ok,false);assert.deepEqual(g.progress,before);assert.equal(g.pendingClearingRound,5);
 g.livingPersist=()=>true;assert.equal(acceptNextClearing(g,5).ok,true);assert.equal(g.pendingClearingRound,0);
 g.pendingClearingRound=5;g.reset();assert.equal(g.pendingClearingRound,0);assert.equal(acceptNextClearing(g,5).ok,false);
});
test('连续两轮选择回营接取，奖励、随机地点和续档一致',()=>{
 const {g,events}=scene();for(let round=1;round<=2;round++){
  finish(g);assert.equal(events.length,round);assert.equal(events.at(-1).clearingRound,round);assert.equal(g.progress.living.patrolActive,false);const xp=g.progress.campLevel.xp,before=structuredClone(g.progress);
  g.state='paused';assert.equal(acceptClearingPost(g).ok,false);assert.equal(setLivingPatrol(g,true).ok,false);assert.deepEqual(g.progress,before);
  Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});const origin={x:g.player.x,y:g.player.y};assert.ok(acceptClearingPost(g).ok);const site=structuredClone(clearingSite(g.progress));assert.deepEqual(site.origin,origin);const rules=clearingEnemyLevel(g.progress.bosses)<=3?CLEARING_STARTER_RULES:CLEARING_SITE_RULES;assert.ok(worldDistance(origin,site)>=rules.minDistance&&worldDistance(origin,site)<=rules.maxDistance);assert.deepEqual(worldNavigationObjective(g).site,clearingNavigationSite(g.progress));
  assert.ok(acceptClearingPost(g).ok);assert.deepEqual(clearingSite(g.progress),site);assert.equal(g.progress.campLevel.xp,xp);assert.equal(g.progress.bosses,round);
  const saved=validateProgress({...g.progress,patrol:capturePatrol(g)}),loaded=new Game(saved,()=>.5);loaded.start();assert.deepEqual(clearingSite(loaded.progress),site);assert.ok(loaded.progress.living.patrolActive);g.state='playing';
 }assert.equal(g.progress.campLevel.xp,360);
});
test('回营后保存失败与无合法地点不改变进度，恢复后可重试',()=>{
 const {g}=scene();finish(g);Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});const before=structuredClone(g.progress),trees=g.trees;g.livingPersist=()=>false;assert.equal(acceptClearingPost(g).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;g.trees=[{x:g.player.x,y:g.player.y,radius:10000,hp:1}];assert.equal(acceptClearingPost(g).ok,false);assert.deepEqual(g.progress,before);g.trees=trees;assert.ok(acceptClearingPost(g).ok);
});
