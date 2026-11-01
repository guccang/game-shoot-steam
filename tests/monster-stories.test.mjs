// 怪物邻里专项：公开任务动作、显式移动/清场夹具与奖励事务，不模拟自然战斗胜率。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {MONSTER_STORIES} from '../src/config/monster-stories.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {storyNode,storyDefinition} from '../src/core/story-definition.js';
import {updateStory} from '../src/core/story-manager.js';
import {validateStoryDefinition} from '../src/core/story-schema.js';
import {validateStoryPosts,storyPostApproach} from '../src/core/story-posts.js';
import {storyCast,storyObjects} from '../src/rendering/story-props.js';
import {storySpeechInfo} from '../src/rendering/story-guidance.js';
import {storyTrees,validateStorySites} from '../src/world/story-sites.js';
import {blocked} from '../src/physics/motion.js';
import {claimStoryCollection,storyCollectionStatus,storyEquipmentSource} from '../src/progression/story-rewards.js';
import {storyRewardMarkup,storyCollectionMarkup,storyCollectionHelp} from '../src/ui/story-rewards.js';
const POST=STORY_POSTS.find(p=>p.id==='monster-neighbors');
// 隔离每次新档，真实接取必须靠近新增委托板。
function game(){const g=new Game(freshProgress(),()=>.5);g.start();Object.assign(g.player,storyPostApproach(POST));return g;}
// 所有阶段实际执行，战斗仅用伤害夹具加速，仍等出生配额并完成近距交互。
function finish(g,id,failSave=false){
 assert.ok(g.enterStory(id,POST.id));const seen=new Set(),npcs=new Set();let steps=0;
 while(g.story&&steps++<5000){
  const r=g.story,n=storyNode(g),def=storyDefinition(g);seen.add(r.stageId);
  if(r.dialogue){const speech=storySpeechInfo(g);
   for(const [name] of speech.lines){const spec=Object.values(def.actors).find(a=>a.name===name);
    if(spec.source==='actor')assert.ok(storyCast(g).some(a=>a.kind===spec.kind),'发言怪物必须在场：'+name);}
   for(const a of storyCast(g))if(a.appearance)npcs.add(a.appearance.type);
   g.advanceStoryDialogue(true);continue;
  }
  if(r.phase==='prepare'){
   if(n.claimWhen){if(failSave){const before=JSON.stringify(g.progress);g.storyPersist=()=>false;assert.equal(g.claimStory(),false);assert.equal(JSON.stringify(g.progress),before);g.storyPersist=()=>true;}
    assert.ok(g.claimStory());continue;}
   assert.ok(g.chooseStoryLoadout(def.loadouts[0].id));assert.ok(g.startStoryStage());continue;
  }
  g.state='playing';const o=g.storyObjective();Object.assign(g.player,def.world.sites[o.site]);
  for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);
  if(o.action&&!r.interacting)assert.ok(g.interactStory());updateStory(g,.1);
 }
 assert.ok(steps<5000,'流程挂起 '+g.story?.stageId);assert.ok(seen.has('END'));assert.deepEqual(storyObjects(g),[]);return {seen,npcs};
}
// 单独构造领取前置以穷举事务分支；流程完成另有全链路检查。
function completedGame(){const g=game();for(const id of POST.chapters)Object.assign(g.progress.story.chapters[id],{completed:true,rewardClaimed:true});return g;}
test('三篇纯数据配置与实际地形可通行，奖励键和NPC外观错误明确拒绝',()=>{
 const g=game();assert.equal(blocked(POST.x,POST.y+40,12,g.trees),false);
 for(const c of MONSTER_STORIES){validateStoryDefinition(JSON.parse(JSON.stringify(c)));assert.deepEqual(validateStorySites(storyTrees(g.trees,c),blocked,c),[]);
  const bad=structuredClone(c);bad.reward.crystals=2;assert.throws(()=>validateStoryDefinition(bad),/奖励资源/);
  const broken=structuredClone(c);broken.actors.cook.appearance.species='typo';assert.throws(()=>validateStoryDefinition(broken),/外观/);}
 const p=structuredClone(POST);p.collection.options[0].index=999;assert.throws(()=>validateStoryPosts([p]),/委托板装备/);
});
test('三篇从接取到交付走通、对白人物真实出场、奖励逐篇入账且重玩不发奖',()=>{
 const g=game(),start={coins:g.progress.coins,wood:g.progress.wood,parts:g.progress.materials.parts,crystal:g.progress.materials.crystal};
 for(const c of MONSTER_STORIES){const forest=g.player;const result=finish(g,c.id,true);assert.ok(result.npcs.has('monster'));assert.ok(result.npcs.has('boss'));
  assert.equal(g.player,forest);assert.ok(g.progress.story.chapters[c.id].completed);assert.ok(g.progress.story.chapters[c.id].rewardClaimed);
  const saved=JSON.stringify([g.progress.coins,g.progress.wood,g.progress.materials]);finish(g,c.id);assert.equal(JSON.stringify([g.progress.coins,g.progress.wood,g.progress.materials]),saved);}
 assert.equal(g.progress.coins-start.coins,1100);assert.equal(g.progress.wood-start.wood,300);assert.equal(g.progress.materials.parts-start.parts,5);assert.equal(g.progress.materials.crystal-start.crystal,2);
 assert.ok(storyCollectionStatus(g.progress,POST).ready);
});
test('领取资格限制完成、地点、地图、领主、秘境与未交付会话，失败不动钱包',()=>{
 const g=game();assert.equal(claimStoryCollection(g,POST.id,'firefly').ok,false);
 for(const change of [g=>{g.player.x=900;},g=>{g.mapId='jiuzhaigou';},g=>{g.boss={};},g=>{g.realm={};},g=>{g.progress.story.run={};}]){
  const a=completedGame();change(a);const before=JSON.stringify(a.progress);assert.equal(claimStoryCollection(a,POST.id,'firefly').ok,false);assert.equal(JSON.stringify(a.progress),before);}
});
test('装备二选一先保存再授予，双击与重载不重复；载具立即可召唤且附赠主炮',()=>{
 for(const option of POST.collection.options){const g=completedGame(),before=JSON.stringify(g.progress);
  g.storyPersist=()=>false;assert.equal(claimStoryCollection(g,POST.id,option.id).ok,false);assert.equal(JSON.stringify(g.progress),before);
  g.storyPersist=()=>{throw Error('storage');};assert.equal(claimStoryCollection(g,POST.id,option.id).ok,false);assert.equal(JSON.stringify(g.progress),before);
  let saved;g.storyPersist=p=>{saved=JSON.stringify(p);return true;};assert.ok(claimStoryCollection(g,POST.id,option.id).ok);
  assert.equal(g.progress.coins,60);assert.equal(g.progress.bosses,0);assert.equal(g.progress.vehicleIndex,0);assert.equal(g.progress.weapon,0);
  for(const choice of POST.collection.options)assert.equal(claimStoryCollection(g,POST.id,choice.id).ok,false);
  const restored=new Game(validateProgress(JSON.parse(saved)),()=>.5);assert.equal(restored.progress.story.boardRewards[POST.id],option.id);
  Object.assign(restored.player,storyPostApproach(POST));assert.equal(claimStoryCollection(restored,POST.id,option.id).ok,false);
  if(option.kind==='vehicle'){assert.ok(g.selectVehicle(3));assert.equal(g.progress.vehicleLoadouts[g.progress.vehicleIndex||0],20);assert.equal(g.progress.vehicleHulls[g.progress.vehicleIndex||0],1);assert.equal(g.progress.vehicleWeapons[20],1);assert.ok(g.summonVehicle());assert.equal(g.player.amphibious,true);}
  else assert.equal(g.progress.weapons[1],1);
 }
});
test('已有装备仅折算一次且保留升级；旧档领取记录白名单迁移',()=>{
 const g=completedGame();g.progress.weapons[1]=7;g.progress.weaponParts[1].capacity=4;
 assert.ok(claimStoryCollection(g,POST.id,'firefly').ok);assert.equal(g.progress.coins,1060);assert.equal(g.progress.weapons[1],7);assert.equal(g.progress.weaponParts[1].capacity,4);
 const raw=JSON.parse(JSON.stringify(g.progress));raw.story.boardRewards[POST.id]='invalid';assert.deepEqual(validateProgress(raw).story.boardRewards,{});
 assert.deepEqual(freshProgress().story.boardRewards,{});
});
test('奖励UI明确单篇数额、重复规则、三篇进度、二选一与武器载具获取来源',()=>{
 const g=game();const markup=storyRewardMarkup(MONSTER_STORIES[1],g.progress.story.chapters['neighbors-night']);assert.match(markup,/350/);assert.match(markup,/晶体/);
 const cards=storyCollectionMarkup(g.progress,POST,true);assert.match(cards,/0 \/ 3/);assert.match(cards,/二选一/);assert.match(storyCollectionHelp(g.progress,POST,true),/1000/);assert.match(cards,/disabled/);
 assert.match(storyEquipmentSource(g.progress,'weapons',1),/雾松密林/);assert.match(storyEquipmentSource(g.progress,'vehicle',3),/二选一/);
 assert.equal(storyEquipmentSource(g.progress,'weapons',0),'');
});
