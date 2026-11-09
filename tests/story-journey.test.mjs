// 第一章体验专项：正式命中、冲锋、非阻断任务、存档与纯数据分支。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CHAPTER as def} from '../src/config/story.js';
import {WEAPONS} from '../src/config/weapons.js';
import {fireBallistics} from '../src/combat/ballistics.js';
import {updateBoss} from '../src/combat/bosses.js';
import {recordStoryEvent,updateStoryCues,storyDialogueLines,storyExperienceGoal} from '../src/core/story/story-journey.js';
import {validateStory} from '../src/progression/story/story-progress.js';
import {validateStoryDefinition} from '../src/core/story/story-schema.js';
import {storySpeechInfo} from '../src/rendering/story-guidance.js';

// 正式入口使用固定随机数，排除永久成长和随机出生差异。
function chapter(loadout='line-patrol'){
  const g=new Game(freshProgress(),()=>.5);g.start();g.enterStory();g.advanceStoryDialogue(true);g.chooseStoryLoadout(loadout);g.startStoryStage();return g;
}
// 真实敌人作为命中靶，不覆盖伤害、元素和射线实现。
function enemy(g,x=1000,y=1000){const e=g.spawnEnemy(0,0,{x,y},{bossOwner:'story'});Object.assign(e,{hp:1000,maxHp:1000,radius:17});return e;}

test('单束激光真实贯穿两只才记录；两次单体命中与树木不冒充贯穿',()=>{
  const g=chapter();g.trees=[];g.enemies=[];Object.assign(g.player,{x:900,y:1000});
  const a=enemy(g),w={...WEAPONS[1],weaponIndex:1};
  const fire=()=>fireBallistics(g,w,{x:920,y:992},{x:1,y:0},12,false);
  fire();fire();assert.equal(g.story.experiences?.['laser-line'],undefined);assert.equal(a.hp,976);
  const b=enemy(g,1060);fire();assert.equal(a.hp,964);assert.equal(b.hp,994);assert.equal(g.story.experiences['laser-line'],true);
  const g2=chapter();g2.enemies=[];g2.trees=[];Object.assign(g2.player,{x:900,y:1000});
  const tree=enemy(g2);g2.enemies=[];tree.type='tree';g2.trees=[tree];enemy(g2,1060);
  fireBallistics(g2,w,{x:920,y:992},{x:1,y:0},12,false);assert.equal(g2.story.experiences?.['laser-line'],undefined);
});

test('水电与冰炮记录读取命中当时的状态和装备，反馈一次且不改伤害',()=>{
  const g=chapter('tide-arc'),e=enemy(g);g.hit(e,10,false,{weaponIndex:10});assert.equal(g.story.experiences?.['water-arc'],undefined);
  e.wet=1;g.hit(e,25,false,{weaponIndex:10});g.hit(e,25,false,{weaponIndex:10});
  assert.equal(e.hp,940);assert.equal(g.story.metrics.synergy,2);assert.equal(g.story.cueQueue.length,1);
  assert.equal(g.story.lastExperienceLoadout,'tide-arc');assert.equal(storyExperienceGoal(g).done,true);
  g.story.loadoutId='frost-guard';e.chill=1;g.hit(e,30,false,{weaponIndex:18});
  assert.equal(e.hp,910);assert.equal(g.story.experiences['frost-cannon'],true);assert.equal(g.story.lastExperienceLoadout,'frost-guard');
  assert.match(storyDialogueLines(g.story,'ending')[1][1],/重炮/);
});

test('正式冲锋结束且未碰撞才认可闪避，装甲承伤和无敌擦撞不认可',()=>{
  for(const dodge of [true,false]){
    const g=chapter();Object.assign(g.story,{stageId:'Q60',phase:'prepare'});g.startStoryStage();g.trees=[];g.enemies=[];
    const b=g.boss;Object.assign(b,{x:520,y:1840,attack:0,speed:0});Object.assign(g.player,{x:620,y:1840});
    updateBoss(g,.05);assert.equal(b.ai.phase,'windup');
    if(dodge)g.player.y=2020;else g.player.invincible=10;
    for(let i=0;i<80&&b.ai.phase!=='recover';i++)updateBoss(g,.05,{...g.player});
    assert.equal(b.ai.phase,'recover');assert.equal(!!g.story.experiences?.['dodge-charge'],dodge);
  }
  const g=chapter();recordStoryEvent(g,'charge-end',{hit:false,travel:0});assert.equal(g.story.experiences?.['dodge-charge'],undefined);
});

test('体验、最近搭配、锁定对白分支可保存；旧版本1无新字段仍兼容',()=>{
  const g=chapter('tide-arc');recordStoryEvent(g,'impact',{weaponIndex:10,wet:true});
  const first=storyDialogueLines(g.story,'ending',true);g.story.lastExperienceLoadout='frost-guard';
  assert.deepEqual(storyDialogueLines(g.story,'ending'),first);
  g.story.lastExperienceLoadout='tide-arc';g.syncStory();const resumed=new Game(structuredClone(g.progress),()=>.5);
  assert.equal(resumed.story.experiences['water-arc'],true);assert.deepEqual(storyDialogueLines(resumed.story,'ending'),first);
  const old=structuredClone(g.progress.story);delete old.run.experiences;delete old.run.lastExperienceLoadout;delete old.run.dialogueChoices;
  assert.ok(validateStory(old).run);assert.equal(validateStory(old).run.lastExperienceLoadout,null);
});

test('未完成可选目标也能领取原奖励；结算只提供工坊目标，不赠送或装备借用品',()=>{
  const g=chapter('frost-guard'),weapons=[...g.progress.weapons],vehicles=[...g.progress.vehicleHulls];
  Object.assign(g.story,{stageId:'Q80',phase:'prepare',readLines:['ending'],routeId:'road'});g.story.flags.silenced=true;
  assert.equal(g.claimStory(),true);assert.equal(g.progress.coins,660);assert.equal(g.progress.wood,270);
  assert.deepEqual(g.progress.weapons,weapons);assert.deepEqual(g.progress.vehicleHulls,vehicles);assert.equal(g.story,null);
  assert.equal(validateStory(g.progress.story).chapters[def.id].followupLoadout,'frost-guard');
});

test('来敌提示抢先、普通反馈等清场，单气泡有界且暂停不自动推进',()=>{
  const g=chapter();Object.assign(g.story,{stageId:'Q50',phase:'active',group:0});g.enemies=[];
  recordStoryEvent(g,'laser-pierce',{count:2});updateStoryCues(g,.05);assert.equal(g.story.activeCue.id,'experience:laser-line');
  recordStoryEvent(g,'wave-start',{group:1});updateStoryCues(g,.05);assert.equal(g.story.activeCue.id,'sides');
  assert.equal(storySpeechInfo(g),null);assert.equal(g.state,'playing');
  const before=g.story.activeCue.remaining;g.pause();g.update(.05);assert.equal(g.story.activeCue.remaining,before);
  assert.ok(g.story.cueQueue.length<=def.journey.speech.queueLimit);
});

test('仅修改配置即可增加事件反馈与分支，未知事件或人物在进入前拒绝',()=>{
  for(const mutate of [d=>d.journey.experiences['laser-line'].event='unknown',d=>d.nodes.Q50.cues[0].speaker='missing',d=>d.dialogues.ending.variants[0].replace=100]){
    const copy=structuredClone(def);mutate(copy);assert.throws(()=>validateStoryDefinition(copy));}
  const old=def.journey.experiences['laser-line'];try{
    def.journey.experiences['laser-line']={...old,match:{count:{min:3}},feedback:'配置里的新反馈'};
    const g=chapter();recordStoryEvent(g,'laser-pierce',{count:2});assert.equal(g.story.experiences['laser-line'],undefined);
    recordStoryEvent(g,'laser-pierce',{count:3});assert.equal(g.story.cueQueue[0].text,'配置里的新反馈');
  }finally{def.journey.experiences['laser-line']=old;}
});
