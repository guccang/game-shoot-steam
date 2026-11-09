// 章节回营专项：真实章节入口、对白结束、移动与交付事务共用正式规则。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story/story-posts.js';
import {storyDefinition,storyDeliveryReady,storyCampReturn} from '../src/core/story/story-definition.js';
import {enterStory,runStoryActions,syncStory,updateStory} from '../src/core/story/story-manager.js';
import {storyCampScene} from '../src/rendering/story-camp.js';
import {livingObjects} from '../src/rendering/living-world.js';
import {farmObjects} from '../src/rendering/farm.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {livingFacilityBlocked} from '../src/world/living-spaces.js';

// 跳过已独立验证的水路战斗，只建立回程起点，结束对话和交付仍走公开意图。
function returning(){
 const p=freshProgress();p.arrival={version:2,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.story.chapters['sunleaf-01'].completed=true;
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-02')));
 assert.ok(g.enterStory('sunleaf-02'));g.advanceStoryDialogue(true);g.chooseStoryLoadout(storyDefinition(g).loadouts[0].id);g.startStoryStage();
 runStoryActions(g,[{type:'stage',id:'HOME'}]);return g;
}
// 实际到达回营路点并等待自动交谈，不手改待交付 phase。
function ending(g){
 const def=storyDefinition(g);
 for(const site of def.nodes.HOME.task.points){Object.assign(g.player,def.world.sites[site]);updateStory(g,.04);}
 assert.equal(g.story.stageId,'END');for(let i=0;i<60&&!g.story.dialogue;i++)updateStory(g,.04);
 assert.equal(g.story.dialogue,'ending');
}

test('回程建筑和种子小屋读取永久进度，故事与借用装备不被改写',()=>{
 const g=returning(),run=g.story,equipment=g.loadout,scene=storyCampScene(g);
 assert.notEqual(scene,g);assert.equal(scene.progress,g.progress);assert.equal(scene.loadout,g.progress);
 assert.ok(livingObjects(scene).some(o=>o.type==='living-facility'&&o.id==='camp'));
 assert.ok(farmObjects(scene).some(o=>o.type==='seed-shop'));
 assert.equal(g.story,run);assert.equal(g.loadout,equipment);assert.equal(g.progress.story.chapters['sunleaf-02'].completed,false);
 g.story.stageId='SHORE';assert.equal(storyCampScene(g).story,null);
});

test('结束对白恢复行走，暂停和继续不重播对白、不提前交付',()=>{
 const g=returning();ending(g);const x=g.player.x;
 g.update(.04,{x:1,y:0});assert.equal(g.player.x,x);assert.equal(g.state,'story');
 assert.ok(g.advanceStoryDialogue(true));assert.ok(storyDeliveryReady(g));assert.equal(g.state,'playing');
 g.pause();assert.equal(g.state,'paused');g.update(.04,{x:1,y:0});assert.equal(g.player.x,x);
 g.pause();assert.equal(g.state,'playing');for(let i=0;i<10;i++)g.update(.04,{x:1,y:0});
 assert.ok(g.player.x>x+10);assert.equal(g.player.livingCollision,true);assert.equal(g.story.dialogue,null);
 const building=livingObjects(storyCampScene(g)).find(o=>o.type==='living-facility'&&o.id==='camp');
 assert.equal(livingFacilityBlocked(building.x,building.y,12),true);
 assert.equal(g.progress.story.chapters['sunleaf-02'].completed,false);
});

test('旧待交付检查点读档后可移动，保存失败可重试且只交付一次',()=>{
 const g=returning();ending(g);g.advanceStoryDialogue(true);syncStory(g);
 const restored=new Game(structuredClone(g.progress),()=>.5);restored.start();
 assert.ok(storyDeliveryReady(restored));assert.equal(restored.state,'playing');
 const before=restored.progress,coins=before.coins;restored.storyPersist=()=>false;
 assert.equal(restored.claimStory(),false);assert.equal(restored.progress,before);assert.ok(restored.story.error);assert.equal(restored.progress.coins,coins);
 restored.pause();restored.pause();assert.equal(restored.state,'playing');
 restored.storyPersist=()=>true;assert.equal(restored.claimStory(),true);assert.equal(restored.story,null);assert.equal(restored.state,'playing');
 assert.equal(restored.progress.story.chapters['sunleaf-02'].completed,true);assert.equal(restored.progress.story.run,null);assert.equal(restored.claimStory(),false);
});

// 第一章返回及待交付都保留常驻建筑；不提前发奖，也不把未修复房屋解锁。
test('第一章回营、结尾对白和旧档待交付始终显示营地，交付前后修复状态一致',()=>{
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=['story','cottage'];
 p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));
 assert.ok(g.enterStory('sunleaf-01'));g.advanceStoryDialogue(true);g.chooseStoryLoadout(storyDefinition(g).loadouts[0].id);g.startStoryStage();
 assert.equal(storyCampScene(g).story,null,'章节途中同样保留营地建筑视图');
 runStoryActions(g,[{type:'flag',key:'silenced'},{type:'stage',id:'Q80'}]);
 const equipment=g.loadout;
 assert.ok(storyCampReturn(g));
 const scene=storyCampScene(g);assert.equal(scene.progress,g.progress);assert.equal(scene.loadout,g.progress);
 assert.ok(livingObjects(scene).some(o=>o.type==='living-facility'&&o.id==='camp'));assert.ok(farmObjects(scene).some(o=>o.type==='seed-shop'));
 assert.equal(g.loadout,equipment);assert.deepEqual([...g.progress.restoration.repaired].sort(),['cottage','story']);
 Object.assign(g.player,storyDefinition(g).world.sites.CAMP);for(let i=0;i<60&&!g.story.dialogue;i++)updateStory(g,.04);
 assert.equal(g.story.dialogue,'ending');assert.notEqual(storyCampScene(g),g);
 g.advanceStoryDialogue(true);assert.ok(storyDeliveryReady(g));assert.equal(g.state,'playing');syncStory(g);
 const restored=new Game(structuredClone(g.progress),()=>.5);restored.start();
 assert.ok(storyDeliveryReady(restored));assert.ok(livingObjects(storyCampScene(restored)).some(o=>o.id==='camp'));
 const before=restored.progress,buildings=livingObjects(storyCampScene(restored)).map(o=>o.id);
 restored.storyPersist=()=>false;assert.equal(restored.claimStory(),false);assert.equal(restored.progress,before);assert.ok(storyCampReturn(restored));
 restored.storyPersist=()=>true;assert.equal(restored.claimStory(),true);assert.equal(restored.story,null);
 assert.deepEqual(livingObjects(restored).map(o=>o.id),buildings);assert.deepEqual([...restored.progress.restoration.repaired].sort(),['cottage','story']);
 assert.equal(restored.progress.story.chapters['sunleaf-01'].completed,true);assert.equal(restored.claimStory(),false);
});

// 回营标记仅控制交付；主线、支线和旧邻居故事的途中遭遇均不提前进入结算。
test('全部章节共用回程与结尾标记，战斗阶段不会变成回营交付',()=>{
 for(const def of Object.values(STORY_CAMPAIGN)){
  for(const id of ['HOME','END'])if(def.nodes[id])assert.equal(def.nodes[id].campReturn,true,def.id+':'+id);
  for(const [id,node] of Object.entries(def.nodes))if(['boss','wave','defense'].includes(node.task.type))assert.notEqual(node.campReturn,true,def.id+':'+id);
 }
});

// 旧版邻居故事复用底层入口、结尾对白和存档流程；新邻居任务已走常驻世界，确保领奖前后常驻建筑一致。
for(const id of ['neighbors-lunch','neighbors-night','neighbors-market'])test(id+' 回营、读档和交付都保留常驻建筑',()=>{
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,id)));
 assert.ok(enterStory(g,null,id));g.advanceStoryDialogue(true);g.chooseStoryLoadout(storyDefinition(g).loadouts[0].id);g.startStoryStage();
 assert.equal(storyCampScene(g).story,null,'外出阶段同样保留营地建筑视图');
 const equipment=g.loadout;runStoryActions(g,[{type:'stage',id:'END'}]);
 assert.ok(storyCampReturn(g));assert.equal(g.loadout,equipment);
 const buildings=livingObjects(storyCampScene(g)).map(o=>o.id);
 assert.ok(buildings.includes('camp'));assert.ok(farmObjects(storyCampScene(g)).some(o=>o.type==='seed-shop'));
 Object.assign(g.player,storyDefinition(g).world.sites.CAMP);for(let i=0;i<60&&!g.story.dialogue;i++)updateStory(g,.04);
 assert.equal(g.story.dialogue,'ending');g.advanceStoryDialogue(true);assert.ok(storyDeliveryReady(g));assert.equal(g.state,'playing');
 syncStory(g);const restored=new Game(structuredClone(g.progress),()=>.5);restored.start();
 // 旧检查点按现有迁移规则转为原地委托，常驻建筑可见且尚未发奖。
 assert.ok(!restored.story);assert.equal(restored.progress.story.run,null);
 assert.deepEqual(livingObjects(restored).map(o=>o.id),buildings);
 assert.equal(restored.progress.living.requests[id].completed,false);assert.equal(restored.progress.story.chapters[id].completed,false);
 const before=g.progress;g.storyPersist=()=>false;
 assert.equal(g.claimStory(),false);assert.equal(g.progress,before);assert.ok(storyCampReturn(g));
 g.storyPersist=()=>true;assert.equal(g.claimStory(),true);assert.equal(g.story,null);
 assert.deepEqual(livingObjects(g).map(o=>o.id),buildings);assert.equal(g.progress.story.chapters[id].completed,true);
 assert.equal(g.claimStory(),false);
});
