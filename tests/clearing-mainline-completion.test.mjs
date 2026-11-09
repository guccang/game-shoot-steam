// 清缴退出回归：真实五波和领主结算后恢复主线，任意武器和载具胜利都能推进主线。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {MAINLINE_IDS,MAINLINE_SITES,currentMainlineTask} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CLEARING_APPROACH} from '../src/config/clearing.js';
import {acceptClearingPost} from '../src/core/story/clearing-guide.js';
import {acceptNextClearing} from '../src/core/camp/living-world.js';
import {finishClearingNavigation} from '../src/core/story/clearing-completion.js';
import {worldNavigationObjective,requestWorldNavigation} from '../src/core/navigation/world-navigation.js';
import {updateMainline,recordMainlineEvent,completeMainline} from '../src/core/story/mainline-manager.js';

// 使用真实进度与固定随机序列，只补任务前置，不预填清缴完成记录。
function scene(id){
 let seed=6;const p=freshProgress();
 p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;
 p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.currentId=id;p.mainline.phase='doing';
 const g=new Game(p,()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32));
 g.onEvent=type=>recordMainlineEvent(g,type);g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=999;g.vehicle.active=false;
 return g;
}
// 正式接单、五波击杀和领主死亡；可选择留下指向告示牌的旧导航。
function battle(g,{stale=false,impact}={}){
 Object.assign(g.player,{x:CLEARING_APPROACH.x,y:CLEARING_APPROACH.y});assert.ok(acceptClearingPost(g).ok);
 if(stale)requestWorldNavigation(g,CLEARING_APPROACH,'去清缴告示牌接取',{direct:true});
 const s=g.progress.living.clearingSite;Object.assign(g.player,{x:s.x,y:s.y});
 for(let i=0;i<1200&&!g.boss;i++){g.updateWaves(.5);for(const e of g.enemies.filter(e=>e.hp>0))g.hit(e,1e9);updateMainline(g,0);}
 assert.ok(g.boss);g.hit(g.boss,1e9,false,impact);g.state='paused';
 return g.pendingClearingRound;
}

test('结束连续两轮清缴都撤回旧告示牌导航，交付后进入整备任务且不重领奖',()=>{
 const g=scene('first-patrol');
 for(let i=0;i<2;i++){
  const round=battle(g,{stale:true});updateMainline(g,0);
  assert.equal(worldNavigationObjective(g).key,'visit');const before=structuredClone(g.progress);
  assert.ok(finishClearingNavigation(g,round));assert.equal(g.progress.living.patrolActive,false);
  assert.equal(worldNavigationObjective(g).phase,'report');assert.equal(worldNavigationObjective(g).key,'camp');
  assert.deepEqual(g.progress,before);assert.equal(finishClearingNavigation(g,round),false);g.state='playing';
 }
 Object.assign(g.player,MAINLINE_SITES.camp);g.enemies=[];assert.ok(completeMainline(g));
 assert.equal(currentMainlineTask(g.progress.mainline).id,'pistol-upgrade');assert.equal(completeMainline(g),false);
 const loaded=new Game(validateProgress(g.progress),()=>.5);loaded.start();loaded.mainlineSpeech=null;
 assert.equal(currentMainlineTask(loaded.progress.mainline).id,'pistol-upgrade');assert.notEqual(worldNavigationObjective(loaded)?.key,'clearing-post');
});

test('清缴复习结算即时进入交付，旧收据与主动继续不会取消新一轮',()=>{
 const g=scene('pistol-field'),round=battle(g);assert.equal(g.progress.mainline.phase,'doing');
 assert.equal(finishClearingNavigation(g,round-1),false);assert.ok(finishClearingNavigation(g,round));
 assert.equal(g.progress.mainline.phase,'report');assert.equal(worldNavigationObjective(g).key,'camp');
 g.state='playing';const nextRound=battle(g);assert.ok(acceptNextClearing(g,nextRound).ok);
 assert.equal(finishClearingNavigation(g,nextRound),false);assert.ok(g.progress.living.patrolActive);
});

// 直接走真实胜利入口，覆盖步行手枪、其他载具和临阵换枪，均不伪造任务记录。
for(const id of ['pistol-field','weapon-field','vehicle-field','aircraft-field'])test(id+'只需清缴成功，任意武器与载具都能交付',()=>{
 for(const mode of ['walking','other-vehicle','switch-weapon']){
  const g=scene(id);
  if(mode==='other-vehicle'){g.progress.vehicleHulls[3]=1;Object.assign(g.vehicle,{active:true,index:3});}
  if(mode==='switch-weapon'){g.progress.weapons[5]=1;g.progress.weapon=5;}
  const round=battle(g,{stale:true});assert.equal(g.progress.mainline.combatPractice,null);
  assert.ok(finishClearingNavigation(g,round));assert.equal(g.progress.mainline.phase,'report');
  assert.equal(worldNavigationObjective(g).key,'camp');
  g.progress=validateProgress(g.progress);g.state='playing';g.vehicle.active=false;g.enemies=[];Object.assign(g.player,MAINLINE_SITES.camp);
  assert.ok(completeMainline(g));assert.ok(g.progress.mainline.completed.includes(id));
  assert.notEqual(currentMainlineTask(g.progress.mainline).id,id);assert.equal(completeMainline(g),false);
 }
});

test('第一份清缴也必须完成领主战，只完成一波不能提前交付',()=>{
 const g=scene('first-patrol');g.progress.mainline.seen.wave=1;updateMainline(g,0);
 assert.equal(g.progress.mainline.phase,'doing');assert.ok(finishClearingNavigation(g,battle(g)));
 assert.equal(g.progress.mainline.phase,'report');
});
