// 反攻主线回归：章节因果、决战门槛、失败重试与原子交付使用正式状态机。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateStory} from '../src/progression/story-progress.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {MAINLINE_TASKS} from '../src/config/mainline.js';
import {EQUIPMENT_QUESTS} from '../src/config/equipment-quests.js';
import {equipmentQuestStatus} from '../src/ui/equipment-quests.js';
import {storyUnlocked,storyCondition} from '../src/core/story-definition.js';
import {validateStoryDefinition} from '../src/core/story-schema.js';
import {updateStory,failStory,hurtStoryTarget} from '../src/core/story-manager.js';
import {updateStoryBoss} from '../src/core/story-encounters.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
import {pacingGame} from './helpers/story-combat-pacing.mjs';

const finale=STORY_CAMPAIGN['sunleaf-06'];
// 阶段夹具只跳过长距离赶路，开战、命中、击杀和状态迁移走正式入口。
function battle(stage='COMMAND',loadout='line-patrol'){
 const g=pacingGame(finale.id,loadout,stage);assert.ok(g.startStoryStage());return g;
}
// 逐帧清除真实生成的敌人，验证波次和援军配额，避免直接伪造清场旗标。
function clearCombat(g,expected){
 for(let i=0;i<1500&&g.story.stageId!==expected;i++){
  for(const enemy of [...g.enemies])if(enemy.hp>0)g.hit(enemy,1e6);
  g.enemies=g.enemies.filter(e=>e.hp>0);updateStory(g,.1);
 }
 assert.equal(g.story.stageId,expected);
}

test('六章逐战开放，装备入口使用同一前置，决战是主线最后目标',()=>{
 const p=freshProgress();
 assert.equal(equipmentQuestStatus(p,EQUIPMENT_QUESTS.find(q=>q.chapter==='sunleaf-04')).target,'sunleaf-03');
 for(let n=1;n<=6;n++){
  const id='sunleaf-0'+n,def=STORY_CAMPAIGN[id];validateStoryDefinition(def);
  assert.ok(storyUnlocked(p,id),id);
  if(n<6)assert.equal(storyUnlocked(p,'sunleaf-0'+(n+1)),false);
  p.story.chapters[id].completed=true;
 }
 for(const id of ['sunleaf-04','sunleaf-05'])assert.deepEqual(EQUIPMENT_QUESTS.find(q=>q.chapter===id).requires,STORY_CAMPAIGN[id].requires);
 assert.equal(MAINLINE_TASKS.at(-1).id,'last-letter');
 assert.match(MAINLINE_TASKS.at(-1).text,/击败铁棘统领.*切断号令核心/);
 for(const c of Object.values(STORY_CAMPAIGN))validateStoryDefinition(c);
});

test('中后章混编有递增压力，终章守点、突破、统领和核心不能由对白跳过',()=>{
 assert.equal(finale.nodes.DEFEND.task.waves.length,3);
 assert.equal(finale.nodes.LAST.task.wave.heavy,4);
 assert.deepEqual(finale.dialogues.now.after,[{type:'stage',id:'COMMAND',phase:'prepare'}]);
 const condition=finale.nodes.END.claimWhen;
 assert.equal(storyCondition({flags:{},readLines:['ending']},condition),false);
 assert.equal(storyCondition({flags:{coreBroken:true},readLines:[]},condition),false);
 assert.equal(storyCondition({flags:{coreBroken:true},readLines:['ending']},condition),true);
});

test('总转发站被毁即失败，重试恢复本站而不跳过三轮反扑',()=>{
 const g=battle('DEFEND');hurtStoryTarget(g,1e6);assert.equal(g.story.phase,'failed');assert.equal(g.claimStory(),false);
 assert.ok(g.retryStory());assert.equal(g.story.stageId,'DEFEND');assert.ok(g.startStoryStage());
 assert.equal(g.story.relay.hp,finale.targets.relay.hp);assert.equal(g.story.group,0);
});

for(const loadout of finale.loadouts)test(loadout.id+' 可以开战，统领爆发死亡仍须清完八名援军',()=>{
 const g=battle('COMMAND',loadout.id);assert.equal(g.boss.name,'铁棘统领');assert.equal(g.boss.maxHp,2530);
 assert.equal(g.claimStory(),false);g.hit(g.boss,1e6);assert.equal(g.boss,null);
 assert.equal(updateStoryBoss(g,.1),false);assert.equal(g.story.support.triggered,true);
 let spawned=0;const spawn=g.spawnEnemy.bind(g);
 // 只记录余下的正式出生次数，不修改出生点、敌人或配额。
 const initial=g.story.support.spawned;g.spawnEnemy=(...args)=>{spawned++;return spawn(...args);};
 clearCombat(g,'CORE');assert.equal(initial+spawned,8);assert.equal(g.story.flags.commander,true);
 assert.equal(g.story.flags.coreBroken,undefined);assert.equal(g.claimStory(),false);
});

test('决战保存后恢复准备，失败重试不会保留半血 Boss 或预先拆除核心',()=>{
 const g=battle();g.hit(g.boss,700);g.syncStory();
 const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(restored.story.stageId,'COMMAND');
 assert.equal(restored.story.phase,'prepare');assert.ok(restored.startStoryStage());assert.equal(restored.boss.hp,2530);
 failStory(restored);assert.ok(restored.retryStory());assert.ok(restored.startStoryStage());assert.equal(restored.boss.hp,2530);
 assert.equal(restored.story.flags.coreBroken,false);
});

test('核心必须近身交互，胜利记录保存失败可重试且不会重复结算',()=>{
 const g=battle();g.hit(g.boss,1e6);clearCombat(g,'CORE');
 Object.assign(g.player,finale.world.sites.CAMP);assert.equal(g.interactStory(),false);
 Object.assign(g.player,finale.world.sites.CALIBRATE);assert.ok(g.interactStory());updateStory(g,2.1);
 assert.equal(g.story.dialogue,'core');assert.equal(g.story.flags.coreBroken,undefined);
 assert.ok(g.advanceStoryDialogue(true));assert.equal(g.story.flags.coreBroken,true);assert.equal(g.story.stageId,'HOME');
 g.syncStory();const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(restored.story.flags.coreBroken,true);
 // 回营仍经正式路点与交谈，不直接设置完成账本。
 restored.state='playing';Object.assign(restored.player,finale.world.sites.CAMP);updateStory(restored,.1);
 assert.equal(restored.story.stageId,'END');updateStory(restored,.1);updateStory(restored,2.1);
 assert.equal(restored.story.dialogue,'ending');restored.advanceStoryDialogue(true);
 const before=structuredClone(restored.progress);restored.storyPersist=()=>false;assert.equal(restored.claimStory(),false);assert.deepEqual(restored.progress,before);
 restored.storyPersist=()=>true;assert.ok(restored.claimStory());assert.equal(restored.progress.story.chapters[finale.id].completed,true);
 const after=structuredClone(restored.progress);assert.equal(restored.claimStory(),false);assert.deepEqual(restored.progress,after);
});

test('六章依次接取到胜利交付，全部正式阶段可达且不提前完成',()=>{
 const p=freshProgress();p.restoration.repaired.push('story','garage','neighbors');
 const g=new Game(p,()=>.4);g.start();
 for(let number=1;number<=6;number++){
  const id='sunleaf-0'+number,def=STORY_CAMPAIGN[id];g.state='playing';
  Object.assign(g.player,storyPostApproach(storyPostForChapter(g,id)));assert.ok(g.enterStory(id),id);
  const visited=new Set();
  for(let step=0;step<6000&&g.story;step++){
   const r=g.story,node=def.nodes[r.stageId];visited.add(r.stageId);
   assert.notEqual(r.phase,'failed',id+':'+r.error);
   if(r.dialogue){g.advanceStoryDialogue(true);continue;}
   if(r.phase==='prepare'){
    if(node.claimWhen){assert.ok(g.claimStory(),id);continue;}
    if(node.choice){assert.ok(g.chooseStoryOption(def.choices[node.choice][0].id));continue;}
    if(node.loadout)assert.ok(g.chooseStoryLoadout(def.loadouts[0].id));
    assert.ok(g.startStoryStage(),id+':'+r.stageId);continue;
   }
   g.state='playing';Object.assign(g.player,def.world.sites[g.storyObjective().site]);
   if(node.task.type==='landing'&&g.vehicle.active)g.dismountVehicle();
   if(g.boss)g.hit(g.boss,1e6);
   for(const e of [...g.enemies])if(e.hp>0)g.hit(e,1e6);
   g.enemies=g.enemies.filter(e=>e.hp>0);
   if(g.storyObjective().action&&!r.interacting)g.interactStory();updateStory(g,.2);
  }
  assert.equal(g.story,null,id+' 未完成');assert.equal(g.progress.story.chapters[id].completed,true);
  if(number===6)for(const stage of ['DEFEND','LAST','COMMAND','CORE','HOME','END'])assert.ok(visited.has(stage),stage);
 }
});

// 旧终章缺少核心旗标时不允许卡在新交付页，永久记录仍按原账本保留。
test('终章版本更新拒绝旧运行检查点，保留已交付章节与奖励记录',()=>{
 const g=battle(),saved=structuredClone(g.progress.story);saved.run.definitionVersion=1;saved.run.stageId='END';
 saved.chapters['sunleaf-01'].completed=true;saved.chapters['sunleaf-01'].rewardClaimed=true;
 const next=validateStory(saved);assert.equal(next.run,null);assert.equal(next.invalidRun,true);
 assert.equal(next.chapters['sunleaf-01'].completed,true);assert.equal(next.chapters['sunleaf-01'].rewardClaimed,true);
});
