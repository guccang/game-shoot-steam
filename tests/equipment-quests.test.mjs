// 装备故事专项：交易不绕过门槛、真实任务状态闭环、借装隔离、保存失败及旧档兼容。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {EQUIPMENT_QUESTS} from '../src/config/equipment-quests.js';
import {EQUIPMENT_STORY_CHAPTERS} from '../src/config/equipment-story-chapters.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {WEAPONS} from '../src/config/weapons.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {equipmentQuestReason} from '../src/progression/workshop/equipment-quests.js';
import {canPurchaseEquipment} from '../src/progression/workshop/equipment-goals.js';
import {transactProgress} from '../src/progression/economy/transactions.js';
import {transactVehicle} from '../src/progression/vehicles/vehicles.js';
import {quoteWorkshop} from '../src/progression/workshop/workshop.js';
import {validateProgress} from '../src/progression/progress.js';
import {storyNode,storyUnlocked} from '../src/core/story/story-definition.js';
import {updateStory,runStoryActions,syncStory,cancelStory} from '../src/core/story/story-manager.js';
import {equipmentQuestDestination,canEnterEquipmentQuest} from '../src/core/workshop/equipment-quest-entry.js';
import {storyPostApproach,storyPostForChapter,worldStoryPosts,canManageStoryPost} from '../src/core/story/story-posts.js';
import {equipmentQuestStatus} from '../src/ui/equipment-quests.js';
import {crushVehicleTrees} from '../src/combat/vehicle.js';
import {storyCollectionStatus} from '../src/progression/story/story-rewards.js';
import {STORY_POSTS} from '../src/config/story-posts.js';

// 丰富材料仅隔离购买前提，既不完成目标任务，也不授予目标装备。
function prepared(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.coins=p.wood=1e8;for(const key of Object.keys(p.materials))p.materials[key]=10000;return p;}
// 稳定标识查询正式目录编号，防止车炮与手持枪相同编号串档。
function indexOf(q){return(q.kind==='weapons'?WEAPONS:COLLECTED_VEHICLES).findIndex(e=>e.id===q.equipment);}

test('九项首次购买必须完成对应故事，低层交易不扣费，完成后仍检查原配方',()=>{
 for(const q of EQUIPMENT_QUESTS){const p=prepared(),index=indexOf(q),kind=q.kind,transaction=kind==='weapons'?transactProgress:transactVehicle;
  const before=structuredClone(p);assert.match(equipmentQuestReason(p,kind,index),/需完成/);assert.equal(canPurchaseEquipment(p,kind,index),false);
  assert.equal(quoteWorkshop(p,{kind,index,action:'buy'}).ok,false);assert.equal(transaction(p,kind,index,'buy'),false);assert.deepEqual(p,before);
  p.story.chapters[q.chapter].completed=true;assert.equal(equipmentQuestReason(p,kind,index),'');assert.ok(canPurchaseEquipment(p,kind,index));
  const poor=structuredClone(p);poor.coins=poor.wood=0;assert.equal(transaction(poor,kind,index,'buy'),false);
  assert.ok(transaction(p,kind,index,'buy'));assert.ok((kind==='weapons'?p.weapons:p.vehicleHulls)[index]);assert.ok(p.coins<before.coins);
 }
});

test('旧装备保留使用升级，旧第四第五章认可资格，不恢复旧主线或挑战门槛',()=>{
 for(const q of EQUIPMENT_QUESTS){const p=prepared(),index=indexOf(q);(q.kind==='weapons'?p.weapons:p.vehicleHulls)[index]=2;
  assert.equal(equipmentQuestReason(p,q.kind,index),'');assert.ok(quoteWorkshop(p,{kind:q.kind,index,action:'upgrade'}).ok);}
 const p=prepared();for(const id of ['sunleaf-04','sunleaf-05'])p.story.chapters[id].completed=true;
 const restored=validateProgress(JSON.parse(JSON.stringify(p)));assert.ok(canPurchaseEquipment(restored,'weapons',15));assert.ok(canPurchaseEquipment(restored,'vehicle',2));
 assert.equal(canPurchaseEquipment(prepared(),'weapons',3),true);
});

test('九项装备任务只需任务建筑开放即可独立接取，不完成任何其他故事',()=>{
 for(const q of EQUIPMENT_QUESTS){
  const p=freshProgress();p.arrival=null;p.restoration.repaired=['story'];
  assert.deepEqual(q.requires,[]);assert.deepEqual(STORY_CAMPAIGN[q.chapter].requires,[]);
  assert.ok(storyUnlocked(p,q.chapter));assert.equal(equipmentQuestStatus(p,q).target,q.chapter);
  const g=new Game(p,()=>.5);g.start();const post=storyPostForChapter(g,q.chapter);
  Object.assign(g.player,{x:100,y:100});assert.equal(g.enterStory(q.chapter),false,'仍须在现场接取');
  Object.assign(g.player,storyPostApproach(post));g.progress.restoration.repaired=[];
  assert.equal(g.enterStory(q.chapter),false,'仍须开放任务建筑');g.progress.restoration.repaired=['story'];
  assert.ok(g.enterStory(q.chapter),q.chapter);assert.equal(g.story.chapterId,q.chapter);
  assert.match(equipmentQuestReason(g.progress,q.kind,indexOf(q)),/需完成/,'接取不等于完成');
  assert.ok(Object.values(g.progress.story.chapters).every(record=>!record.completed));
 }
});

test('其他故事占用可以取消后改接装备任务，保留普通故事前置与谢礼要求',()=>{
 const p=prepared();
 assert.equal(storyCollectionStatus(p,STORY_POSTS[0]).total,8);assert.equal(storyCollectionStatus(p,STORY_POSTS[1]).total,3);
 assert.equal(storyUnlocked(p,'sunleaf-02'),false);assert.equal(storyUnlocked(p,'sunleaf-03'),false);
 const q=EQUIPMENT_QUESTS.find(q=>q.equipment==='red-wolf'),g=new Game(p,()=>.5);g.start();
 Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));assert.ok(g.enterStory('sunleaf-01'));
 const status=equipmentQuestStatus(g.progress,q);assert.equal(status.target,'sunleaf-01');assert.match(status.text,/取消/);
 assert.equal(g.enterStory(q.chapter),false);assert.ok(g.leaveStory());
 Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));assert.ok(cancelStory(g).ok);
 assert.equal(equipmentQuestStatus(g.progress,q).target,q.chapter);
 Object.assign(g.player,storyPostApproach(storyPostForChapter(g,q.chapter)));assert.ok(g.enterStory(q.chapter));
 assert.equal(g.progress.story.chapters['sunleaf-01'].completed,false);
});

// 正式状态机执行七条故事；清场加速夹具不代替自然战斗难度验收。
function finish(g){const visited=new Set();let guard=0;
 while(g.story&&guard++<8000){const r=g.story,n=storyNode(g),def=STORY_CAMPAIGN[r.chapterId];visited.add(r.stageId);
  if(r.dialogue){g.advanceStoryDialogue(true);continue;}
  if(r.phase==='prepare'){
   if(n.claimWhen){const before=structuredClone(g.progress);g.storyPersist=()=>false;assert.equal(g.claimStory(),false);assert.deepEqual(g.progress,before);
    const q=EQUIPMENT_QUESTS.find(q=>q.chapter===def.id);assert.match(equipmentQuestReason(g.progress,q.kind,indexOf(q)),/需完成/);
    g.storyPersist=()=>true;assert.ok(g.claimStory());continue;}
   assert.ok(g.chooseStoryLoadout(def.loadouts[0].id));assert.ok(g.startStoryStage());continue;
  }
  g.state='playing';const o=g.storyObjective(),target=def.world.sites[o.site];Object.assign(g.player,{x:target.x,y:target.y+45});
  if(n.task.type==='timber'&&r.timberTrees)for(const tree of r.timberTrees){const hp=tree.hp;g.hit(tree,1e6);assert.equal(tree.hp,hp,'炮火不能代替履带目标');const from={x:tree.x,y:tree.y-80};Object.assign(g.player,{x:tree.x,y:tree.y+80});crushVehicleTrees(g,from);}
  for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);
  if(o.action&&!r.interacting)assert.ok(g.interactStory(),def.id+'/'+r.stageId);updateStory(g,.1);
 }
 assert.ok(guard<8000,'故事不得卡住 '+g.story?.chapterId+'/'+g.story?.stageId);return visited;
}

test('七条新故事逐步交付、保存失败可重试，暂离与重载归还借装',()=>{
 for(const def of EQUIPMENT_STORY_CHAPTERS){const p=prepared();for(const id of def.requires)p.story.chapters[id].completed=true;
  const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,def.id)));const owned=JSON.stringify([g.progress.weapons,g.progress.vehicleHulls]);
  assert.ok(g.enterStory(def.id));g.advanceStoryDialogue(true);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();
  assert.equal(g.vehicle.active,!def.loadouts[0].onFoot);assert.equal(JSON.stringify([g.progress.weapons,g.progress.vehicleHulls]),owned);
  const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);assert.equal(restored.story.chapterId,def.id);restored.leaveStory();assert.equal(restored.story,null);
  const visited=finish(g);assert.ok(visited.has('END'));assert.ok(g.progress.story.chapters[def.id].completed);
  assert.equal(JSON.stringify([g.progress.weapons,g.progress.vehicleHulls]),owned);assert.equal(g.story,null);assert.equal(g.claimStory(),false);
 }
});

test('居民现场接取校验距离，照料与碾压中途重载重新构建目标且不提前授权',()=>{
 for(const [id,stage] of [['equipment-water','WATER'],['equipment-red-wolf','TIMBER']]){
  const p=prepared(),def=STORY_CAMPAIGN[id];for(const key of def.requires)p.story.chapters[key].completed=true;
  const g=new Game(p,()=>.5);g.start();Object.assign(g.player,{x:100,y:100});assert.equal(canEnterEquipmentQuest(g,id),false);
  Object.assign(g.player,equipmentQuestDestination(g,id));assert.ok(canEnterEquipmentQuest(g,id));assert.equal(canEnterEquipmentQuest(g,id,'unknown'),false);
  assert.ok(g.enterStory(id));g.advanceStoryDialogue(true);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();
  runStoryActions(g,[{type:'stage',id:stage,phase:'active'}]);const site=def.world.sites[def.nodes[stage].objective.site];Object.assign(g.player,{x:site.x,y:site.y+65});updateStory(g,.1);
  if(stage==='WATER'){assert.ok(g.interactStory());updateStory(g,.5);}else assert.equal(g.story.timberTrees.length,3);
  syncStory(g);const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.equal(restored.story.stageId,stage);assert.ok(!restored.story.interacting);assert.ok(!restored.progress.story.chapters[id].completed);
  Object.assign(restored.player,{x:site.x,y:site.y+65});restored.state='playing';updateStory(restored,.1);
  if(stage==='TIMBER')assert.equal(restored.story.timberTrees.filter(t=>t.hp>0).length,3);else assert.ok(restored.interactStory());
  assert.ok(restored.leaveStory());assert.equal(restored.progress.weapons[5],0);assert.equal(restored.progress.vehicleHulls[6],0);
 }
});

// 合并章节取消功能后，新装备故事也必须在原委托板提供管理入口。
test('七条装备故事可返回委托板取消，归还借装且不授予购买资格',()=>{
 for(const def of EQUIPMENT_STORY_CHAPTERS){const p=prepared();for(const id of def.requires)p.story.chapters[id].completed=true;
  const g=new Game(p,()=>.5);g.start();const post=storyPostForChapter(g,def.id);Object.assign(g.player,storyPostApproach(post));assert.ok(g.enterStory(def.id));g.advanceStoryDialogue(true);g.chooseStoryLoadout(def.loadouts[0].id);g.startStoryStage();
  Object.assign(g.player,storyPostApproach(post));assert.ok(worldStoryPosts(g).some(p=>p.id===post.id));assert.ok(canManageStoryPost(g,post));
  const q=EQUIPMENT_QUESTS.find(q=>q.chapter===def.id);assert.ok(cancelStory(g).ok);assert.equal(g.story,null);assert.equal(g.progress.story.run,null);assert.match(equipmentQuestReason(g.progress,q.kind,indexOf(q)),/需完成/);
 }
});
