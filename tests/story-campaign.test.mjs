// 多章节专项：通过公开动作与显式清场夹具验收剧情闭环，不冒充自然战斗胜率。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {STORY_CAMPAIGN as chapters} from '../src/config/story-campaign.js';
import {storyDefinition,storyNode,storyUnlocked} from '../src/core/story/story-definition.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story/story-posts.js';
import {updateStory} from '../src/core/story/story-manager.js';
import {storyObjects,storyCast} from '../src/rendering/story-props.js';
import {storySpeechInfo} from '../src/rendering/story-guidance.js';
import {validateStoryDefinition} from '../src/core/story/story-schema.js';
import {validateStory} from '../src/progression/story/story-progress.js';
import {storyTrees,validateStorySites} from '../src/world/story-sites.js';
import {riverXAt} from '../src/world/river-geometry.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {finishRealm} from '../src/core/realms/realm-manager.js';
import {recordStoryExcursion} from '../src/core/story/story-excursion.js';
// 已完成前置记录只用于隔离每章测试，不通过伪造本章完成来代替执行。
function enter(id,loadout){const p=freshProgress();for(const required of chapters[id].requires||[])p.story.chapters[required].completed=true;
 p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,id)));assert.ok(g.enterStory(id));g.advanceStoryDialogue(true);
 if(loadout){assert.ok(g.chooseStoryLoadout(loadout));assert.ok(g.startStoryStage());}return g;}
// 所有移动目标来自正式查询；清场只消除敌人，不跳过出生名额、计时或阶段条件。
function finish(g,route='bank',name='lamp'){let guard=0;const visited=[];
 while(g.story&&guard++<15000){const r=g.story,n=storyNode(g),def=storyDefinition(g);visited.push(r.stageId);
  if(r.dialogue){assert.ok(storySpeechInfo(g));g.advanceStoryDialogue(true);continue;}
  if(r.phase==='prepare'){
   if(n.claimWhen){assert.ok(g.claimStory());continue;}
   if(n.choice){assert.ok(g.chooseStoryOption(name));continue;}
   if(n.routeChoice&&!r.routeId){assert.ok(g.chooseStoryRoute(route));continue;}
   if(n.loadout){g.chooseStoryLoadout(r.loadoutId||def.loadouts[0].id);assert.ok(g.startStoryStage());continue;}
   throw Error('未处理准备阶段 '+r.stageId);
  }
  g.state='playing';const o=g.storyObjective();Object.assign(g.player,def.world.sites[o.site]);
  if(n.task.type==='landing'){if(g.vehicle.active)g.dismountVehicle();}
  for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);
  if(o.action&&!r.interacting)assert.ok(g.interactStory());updateStory(g,.1);
 }
 assert.ok(guard<15000,'流程不得挂起 '+g.story?.chapterId+'/'+g.story?.stageId+'/'+g.story?.phase);return [...new Set(visited)];}

test('八个故事均为纯数据，实际通行走廊合法，前置只来自各章完成记录',()=>{
 const p=freshProgress();assert.ok(storyUnlocked(p,'sunleaf-01'));assert.ok(!storyUnlocked(p,'sunleaf-02'));
 for(const def of Object.values(chapters)){validateStoryDefinition(JSON.parse(JSON.stringify(def)));
  const g=new Game(p,()=>.5);assert.deepEqual(validateStorySites(storyTrees(g.trees,def),blocked,def),[],def.id);}
 assert.equal(new Game(p,()=>.5).enterStory('sunleaf-02'),false);
});

test('新增五章所有借用组合与直接送信目标闭环，奖励不重复且森林与道具清理正确',()=>{
 for(const id of ['sunleaf-02','sunleaf-03','sunleaf-04','sunleaf-05','sunleaf-06'])for(const l of chapters[id].loadouts){
  const routes=['bank'];
  for(const route of routes){const g=enter(id,l.id),forest=g.storyForest,coins=g.progress.coins,wood=g.progress.wood;
   const visited=finish(g,route);assert.ok(visited.includes('END'));assert.equal(g.progress.story.chapters[id].completed,true);
   assert.equal(g.progress.coins,coins);assert.equal(g.progress.wood,wood);assert.equal(g.player,forest.player);assert.deepEqual(storyObjects(g),[]);
   assert.equal(g.progress.story.run,null);assert.equal(g.claimStory(),false);}
 }
});

test('每个新主线阶段旧检查点恢复同章，不串人物、路点、装备或奖励账本',()=>{
 for(const id of ['sunleaf-02','sunleaf-03','sunleaf-04','sunleaf-05','sunleaf-06']){
  const g=enter(id,chapters[id].loadouts[0].id);
  for(const [stageId,node] of Object.entries(chapters[id].nodes)){
   const raw=structuredClone(g.progress);raw.story.run={...structuredClone(g.progress.story.run),stageId,dialogue:null,phase:'active',routeId:node.routeChoice?'bank':null};
   const restored=new Game(raw,()=>.5);assert.equal(restored.story.chapterId,id);assert.equal(restored.story.stageId,stageId);
   assert.equal(storyDefinition(restored),chapters[id]);assert.ok(storyObjects(restored).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
   restored.leaveStory();assert.deepEqual(storyObjects(restored),[]);
  }
 }
});

test('机械猫命名持久化，另一个Game和第一章不会读取同一章节全局状态',()=>{
 const a=enter('sunleaf-04','little-team'),b=enter('sunleaf-02','tide-arc');finish(a,'bank','echo');
 assert.equal(a.progress.story.chapters['sunleaf-04'].choices.companion,'echo');
 const saved=validateStory(a.progress.story);assert.equal(saved.chapters['sunleaf-04'].choices.companion,'echo');
 assert.equal(storyDefinition(b).id,'sunleaf-02');assert.equal(storyDefinition().id,'sunleaf-01');
 assert.equal(a.progress.story.chapters['sunleaf-02'].completed,false);
});

test('不再提供水陆二选一、飞行路点要求起飞、实际下机才能完成落地',()=>{
 const g=enter('sunleaf-06','line-patrol');assert.equal(g.chooseStoryRoute('water'),false);assert.equal(g.chooseStoryRoute('bank'),false);assert.equal(g.story.phase,'active');assert.equal(g.storyObjective().site,'WEST');
 const f=enter('sunleaf-05','canopy-light');const d=chapters['sunleaf-05'];
 assert.equal(f.player.flying,true);Object.assign(f.player,d.world.sites.WATER);f.player.flying=false;updateStory(f,.1);assert.equal(f.story.waypoint,0);
 f.player.flying=true;updateStory(f,.1);Object.assign(f.player,d.world.sites.FAR);updateStory(f,.1);assert.equal(f.story.stageId,'LAND');
 updateStory(f,.1);assert.equal(f.story.stageId,'LAND');assert.ok(f.dismountVehicle());updateStory(f,.1);assert.equal(f.story.stageId,'REPORT');
});

test('实际水陆碰撞保留：步行不能过河，气垫船和直升机能经过目标水域',()=>{
 const d=chapters['sunleaf-02'];for(const travel of ['walk','water','air']){
  const y=d.world.sites.WATER.y,river=riverXAt(y),body={x:river-180,y,amphibious:travel==='water',flying:travel==='air'};
  for(let i=0;i<100;i++)moveBody(body,4,0,null,12,[]);
  assert.equal(body.x>river+100,travel!=='walk');}
});

// 不使用清怪、祝福或布防夹具，验证仅进入就满足两种委托。
for(const [id,mode] of [['sunleaf-side-expedition','rogue'],['sunleaf-side-guardian','guardian']]){
 for(const outcome of ['exit','failure','reload-exit','reload-failure'])test(`${mode} 进入即达成，${outcome} 后可交付且不凭空发秘境奖励`,()=>{
  let g=enter(id);const wallet={coins:g.progress.coins,wood:g.progress.wood,materials:structuredClone(g.progress.materials)};
  assert.ok(!g.progress.story.run.flags.excursion);assert.ok(g.startStoryExcursion());
  assert.equal(g.story,null);assert.equal(g.realm.mode,mode);assert.equal(g.realm.cleared,0);
  assert.ok(g.progress.story.run.flags.excursion);
  if(outcome.includes('failure'))finishRealm(g);
  if(outcome.startsWith('reload'))g=new Game(structuredClone(g.progress),()=>.5);
  if(outcome.includes('failure'))g.update(0);else assert.ok(g.leaveRealm());
  assert.equal(g.realm,null);assert.ok(g.progress.story.run.flags.excursion);
  assert.equal(g.story.stageId,'END');assert.equal(g.story.phase,'prepare');assert.equal(g.story.dialogue,null);
  assert.ok(g.claimStory());
  assert.ok(g.progress.story.chapters[id].completed);assert.equal(g.progress.story.run,null);
  assert.equal(g.claimStory(),false);
  assert.deepEqual({coins:g.progress.coins,wood:g.progress.wood,materials:g.progress.materials},wallet);
 });
}

test('旧秘境存档恢复或退出补记体验，失败仍可回营完成委托',()=>{
 for(const reload of [false,true]){
  let g=enter('sunleaf-side-guardian');g.startStoryExcursion();finishRealm(g);
  // 模拟旧版已进入秘境但尚未完成一波与布防，未写入体验标记的存档。
  g.progress.story.run.flags.excursion=false;
  if(reload){g=new Game(structuredClone(g.progress),()=>.5);assert.ok(g.progress.story.run.flags.excursion);}
  assert.ok(g.leaveRealm());assert.ok(g.progress.story.run.flags.excursion);
  assert.equal(g.story.stageId,'END');assert.ok(g.claimStory());
  assert.ok(g.progress.story.chapters['sunleaf-side-guardian'].completed);
 }
});

test('仅接取、进入失败或进入不同秘境均不误记，重复进入记录不重复提交',()=>{
 const g=enter('sunleaf-side-guardian');g.leaveStory();g.state='dead';
 // 入口校验失败不能记录体验；仅接取故事同样不满足进入条件。
 assert.equal(g.enterRealm('guardian'),false);assert.ok(!g.progress.story.run.flags.excursion);
 g.state='playing';g.player.hp=g.maxHp();
 assert.ok(g.enterRealm('tower'));assert.ok(!g.progress.story.run.flags.excursion);g.leaveRealm();
 assert.ok(!g.progress.story.run.flags.excursion);assert.ok(g.enterRealm('guardian'));
 let events=0;g.onEvent=()=>events++;recordStoryExcursion(g);recordStoryExcursion(g);
 assert.equal(events,0);assert.ok(g.progress.story.run.flags.excursion);
});

// 自动进入交付页仍须显式领取；存储失败保留页面与记录供重试。
test('直达交付可保存恢复，领取失败不扣改钱包，重复点击只结算一次',()=>{
 const id='sunleaf-side-guardian';let g=enter(id);g.startStoryExcursion();g.leaveRealm();
 assert.equal(g.progress.story.chapters[id].completed,false);
 g=new Game(structuredClone(g.progress),()=>.5);
 assert.equal(g.story.stageId,'END');assert.equal(g.story.dialogue,null);assert.equal(g.state,'story');
 const before=structuredClone(g.progress);g.storyPersist=()=>false;assert.equal(g.claimStory(),false);
 assert.deepEqual(g.progress,before);assert.equal(g.story.phase,'prepare');
 g.storyPersist=()=>true;assert.ok(g.claimStory());assert.ok(g.progress.campLevel.xp>before.campLevel.xp);const after=structuredClone(g.progress);
 assert.equal(g.claimStory(),false);assert.deepEqual(g.progress,after);
});

test('旧档回程对白直接变为交付，普通秘境失败仍保留自己的结算页',()=>{
 const g=enter('sunleaf-side-guardian');g.startStoryExcursion();g.leaveRealm();
 const saved=structuredClone(g.progress);saved.story.run.stageId='RETURN';saved.story.run.dialogue='return';saved.story.run.phase='dialogue';
 const restored=new Game(saved,()=>.5);assert.equal(restored.story.stageId,'END');assert.equal(restored.story.dialogue,null);assert.ok(restored.claimStory());
 const normal=new Game(freshProgress(),()=>.5);normal.progress.restoration.repaired.push('guardian');normal.start();normal.enterRealm('guardian');finishRealm(normal);normal.update(0);
 assert.equal(normal.realm.phase,'lost');assert.ok(!normal.story);
});
