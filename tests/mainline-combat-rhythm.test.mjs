// 节奏改版的存档、战斗结算与出生配额专项，不以清场夹具代替自然胜率。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS,MAINLINE_TASKS,currentMainlineTask} from '../src/config/mainline.js';



import {recordMainlineCombat} from '../src/progression/mainline-combat.js';
import {TOWN_RESTORATIONS,pendingRestoration} from '../src/config/town-restoration.js';
import {defeatBoss} from '../src/core/boss-manager.js';
import {CAMP_GATES} from '../src/config/camp-defense.js';
import {startCampDefense,claimCampDefense} from '../src/core/camp-defense.js';
import {beginStoryWave,updateStoryWave} from '../src/core/story-encounters.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
import {STORY_SITES} from '../src/config/story.js';

// 只准备任务和建筑前置，战斗结算仍经过正式入口。
function scene(id){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.mainline.phase='doing';const g=new Game(p,()=>.5);g.start();g.mainlineTalkDelay=999;return g;}
// 按正式驿站入口进入第一章，在首处战斗圈检查出生节奏。
function encounter(){const g=scene('first-letter');Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));assert.ok(g.enterStory());g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();Object.assign(g.player,STORY_SITES.SIGN);return g;}



test('重排后建筑按任务解锁，提前的足球和远征不会误指向后段修复',()=>{
 for(const id of ['expedition','football-day','hover-service','aircraft-service']){
  const g=scene(id);g.progress.restoration.repaired=[];
  const order=MAINLINE_IDS.indexOf(id),required=TOWN_RESTORATIONS.filter(f=>f.order<=order);
  for(const f of required){assert.equal(pendingRestoration(g.progress).id,f.id);g.progress.restoration.repaired.push(f.id);}
  assert.equal(pendingRestoration(g.progress),null);
 }
});
test('三次清缴独立记录，未接取、旧胜利及普通领主不代做',()=>{
 for(const id of ['pistol-field','vehicle-field','aircraft-field']){
  const g=scene(id),op=currentMainlineTask(g.progress.mainline).guide.steps[0].operation;
  g.progress.bosses=20;g.progress.mainline.phase='meet';assert.equal(recordMainlineCombat(g.progress,'clearing'),false);
  g.progress.mainline.phase='doing';g.boss={id:991,livingChallenge:false};defeatBoss(g);assert.equal(g.progress.mainline.seen[op.record],0);
  g.progress.living.patrolActive=true;if(op.kind==='vehicle')g.progress.mainline.combatPractice=id;g.boss={id:992,livingChallenge:true};defeatBoss(g);assert.equal(g.progress.mainline.seen[op.record],1);
  for(const key of ['pistolField','vehicleField','aircraftField'].filter(k=>k!==op.record))assert.equal(g.progress.mainline.seen[key],0);
 }
});
test('复习兽潮要求指定营门的新胜利，失败保存和救场不能完成',()=>{
 for(const id of ['hover-horde','controller-horde']){
  const g=scene(id),key=currentMainlineTask(g.progress.mainline).guide.steps[0].operation.record;
  if(id==='hover-horde')g.progress.mainline.combatPractice=id;else {g.progress.weapons[12]=1;g.progress.weapon=12;}
  Object.assign(g.player,CAMP_GATES.find(g=>g.id==='left'));assert.ok(startCampDefense(g,'left'));
  Object.assign(g.campDefense,{phase:'result',cleared:10,bossDefeated:true,reason:null});g.campDefensePersist=()=>false;
  assert.equal(claimCampDefense(g),false);assert.equal(g.progress.mainline.seen[key],0);
  g.campDefense.reason='death';g.campDefensePersist=()=>true;assert.ok(claimCampDefense(g));assert.equal(g.progress.mainline.seen[key],0);
  Object.assign(g.player,CAMP_GATES.find(g=>g.id==='left'));assert.ok(startCampDefense(g,'left'));Object.assign(g.campDefense,{phase:'result',cleared:10,bossDefeated:true,reason:null});assert.ok(claimCampDefense(g));assert.equal(g.progress.mainline.seen[key],1);assert.equal(claimCampDefense(g),false);
 }
});
test('任务节奏包含四次清缴、两次兽潮复习和两次载具整备',()=>{
 assert.equal(MAINLINE_TASKS.filter(t=>t.guide.steps.some(s=>s.operation?.type==='clearing'&&s.operation.record)).length,4);
 assert.equal(MAINLINE_TASKS.filter(t=>t.guide.steps.some(s=>s.operation?.type==='camp-defense'&&s.operation.win)).length,2);
 for(const [before,after] of [['pistol-upgrade','pistol-field'],['vehicle-service','vehicle-field'],['hover-service','hover-horde'],['aircraft-service','aircraft-field'],['long-patrol','controller-horde']])assert.equal(MAINLINE_IDS.indexOf(after),MAINLINE_IDS.indexOf(before)+1);
 assert.ok(MAINLINE_IDS.indexOf('expedition')<MAINLINE_IDS.indexOf('buy-shotgun'));assert.ok(MAINLINE_IDS.indexOf('football-day')<MAINLINE_IDS.indexOf('first-vehicle'));
 for(const id of ['hover-service','aircraft-service'])assert.equal(MAINLINE_TASKS.find(t=>t.id===id).guide.steps.length,3);
});
test('定点战斗按批出生，延迟、大帧间隔、存活上限和尾批均不超配额',()=>{
 const g=encounter();beginStoryWave(g,'SIGN',7,5,2);updateStoryWave(g,1);assert.equal(g.enemies.length,0);
 updateStoryWave(g,.6);assert.equal(g.enemies.length,3);updateStoryWave(g,30);assert.equal(g.enemies.length,5);assert.equal(g.story.combat.spawned,5);
 updateStoryWave(g,30);assert.equal(g.enemies.length,5);g.enemies=[];updateStoryWave(g,.05);assert.equal(g.enemies.length,2);assert.ok(g.enemies.every(e=>e.tough));assert.equal(g.story.combat.spawned,7);
 assert.equal(updateStoryWave(g,30),false);g.enemies=[];assert.equal(updateStoryWave(g,.05),true);assert.equal(g.player.arena,undefined);
});
test('无出生空间重试保留配额，到时明确失败，不静默放行',()=>{
 const g=encounter();beginStoryWave(g,'SIGN',6,6);const cfg=storyDefinition(g).encounters;const attempts=cfg.spawn.attempts;
 try{cfg.spawn.attempts=0;for(let i=0;i<70&&g.story.phase!=='failed';i++)updateStoryWave(g,.31);assert.equal(g.story.combat.spawned,0);assert.equal(g.story.phase,'failed');assert.ok(g.story.error);}finally{cfg.spawn.attempts=attempts;}
});
import {storyDefinition} from '../src/core/story-definition.js';

// 三套正式借装自然清理成组首战与三波守点，不改伤害、血量或杀怪结果。
import {pacingGame} from './helpers/story-combat-pacing.mjs';
for(const loadout of ['line-patrol','tide-arc','frost-guard'])test(loadout+'自然战斗能清理批次遭遇与三波守点',t=>{
 for(const stage of ['Q20','Q50']){
  const g=pacingGame('sunleaf-01',loadout,stage==='Q20'?'Q10':stage);assert.ok(g.startStoryStage());
  if(stage==='Q20')Object.assign(g.player,STORY_SITES.SIGN);
  let seconds=0,peak=0;
  while(seconds<180&&g.story.phase!=='failed'&&g.story.stageId===stage&&!g.story.combat?.cleared){g.update(1/30);seconds+=1/30;peak=Math.max(peak,g.enemies.filter(e=>e.hp>0).length);}
  // 守点的每轮清场仍须等待修复，持续到全部三波结束。
  while(stage==='Q50'&&seconds<180&&g.story.phase!=='failed'&&g.story.stageId===stage){g.update(1/30);seconds+=1/30;peak=Math.max(peak,g.enemies.filter(e=>e.hp>0).length);}
  t.diagnostic(JSON.stringify({loadout,stage,seconds:+seconds.toFixed(1),peak,hp:g.player.hp}));
  assert.notEqual(g.story.phase,'failed');assert.ok(seconds<180);assert.ok(peak>=3);
  if(stage==='Q50')assert.equal(g.story.stageId,'TO_BOSS');else assert.ok(g.story.combat.cleared);
 }
});
// 取消强制购船后，旧档尚未领取的补贴统一使用新报酬，不回收既有钱包。
