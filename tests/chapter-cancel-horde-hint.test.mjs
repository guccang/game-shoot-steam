// 章节取消事务与返场入口、兽潮抵达提示的针对性回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {cancelStory} from '../src/core/story/story-manager.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {storyPostApproach,worldStoryPosts,canUseStoryPost,canManageStoryPost} from '../src/core/story/story-posts.js';
import {nearbyInteraction} from '../src/core/navigation/nearby-interaction.js';
import {nearbyInteractionAnchor} from '../src/world/interaction-anchors.js';
import {BUILDING_ENTRIES} from '../src/config/building-entries.js';
import {CAMP_GATES} from '../src/config/camp-defense.js';
import {canStartCampDefense} from '../src/core/camp/camp-defense.js';
// 仅补齐设施权限与入职状态，不改章节配置或战斗判定。
function setup(){
 const p=freshProgress();p.restoration.repaired.push('story','defense');
 const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.state='playing';
 Object.assign(g.player,storyPostApproach(STORY_POSTS[0]));return g;
}
// 走正式接取和配装入口，获得带有借用载具的活动现场。
function chapter(){const g=setup();assert.equal(g.enterStory('sunleaf-01'),true);g.advanceStoryDialogue(true);g.chooseStoryLoadout('tide-arc');g.startStoryStage();return g;}

test('返回接取点能管理章节，但不能越权领取收藏或开启另一章',()=>{
 const g=chapter(),post=STORY_POSTS[0];Object.assign(g.player,storyPostApproach(post));
 assert.deepEqual(worldStoryPosts(g).map(p=>p.id),[post.id]);assert.equal(canManageStoryPost(g,post),true);assert.equal(canUseStoryPost(g,post),false);
 const entry=nearbyInteraction(g);assert.equal(entry.type,'post');assert.equal(entry.presentation,'task-entry');assert.equal(nearbyInteractionAnchor(g,entry).hitbox,undefined);
 Object.assign(g.player,{x:2200,y:1700});assert.equal(canManageStoryPost(g,post),false);assert.equal(nearbyInteraction(g),null);
});
test('取消恢复森林与装备，清除检查点和屏障，不授予奖励，重新接取从头开始',()=>{
 const g=chapter(),forest=g.storyForest,before=structuredClone(g.progress);let saved;
 g.storyPersist=p=>{saved=structuredClone(p);return true;};assert.equal(cancelStory(g).ok,true);
 assert.equal(g.story,null);assert.equal(g.progress.story.run,null);assert.equal(g.player,forest.player);assert.equal(g.vehicle,forest.vehicle);assert.equal(g.trees,forest.trees);assert.equal(g.state,'playing');assert.deepEqual(g.player.worldBarriers,[]);
 assert.equal(g.progress.coins,before.coins);assert.deepEqual(g.progress.story.chapters,before.story.chapters);assert.equal(saved.story.run,null);
 assert.ok(!new Game(saved).story);assert.equal(g.enterStory('sunleaf-01'),true);assert.equal(g.story.stageId,'Q10');assert.equal(g.story.loadoutId,null);
});
test('取消保存失败不改现场，重试成功；已完成章节和奖励记录保持',()=>{
 const g=chapter(),session=g.story,progress=g.progress;g.progress.story.chapters['sunleaf-02'].completed=true;g.progress.story.chapters['sunleaf-02'].rewardClaimed=true;
 for(const persist of [()=>false,()=>{throw Error('磁盘不可写');}]){g.storyPersist=persist;assert.equal(cancelStory(g).ok,false);assert.equal(g.story,session);assert.equal(g.progress,progress);}
 g.storyPersist=()=>true;assert.equal(cancelStory(g).ok,true);assert.equal(g.progress.story.chapters['sunleaf-02'].completed,true);assert.equal(g.progress.story.chapters['sunleaf-02'].rewardClaimed,true);
});
test('暂离后可取消，刷新不再恢复旧任务；秘境进行中拒绝取消',()=>{
 const g=chapter();g.leaveStory();assert.ok(g.progress.story.run);g.realm={mode:'guardian'};assert.equal(cancelStory(g).ok,false);g.realm=null;
 assert.equal(cancelStory(g).ok,true);assert.equal(g.progress.story.run,null);assert.ok(!new Game(structuredClone(g.progress)).story);assert.equal(cancelStory(g).ok,false);
});
test('两座兽潮站牌在导航抵达范围内显示明确按钮，离开或开始活动即隐藏',()=>{
 const g=setup();
 for(const gate of CAMP_GATES){const site=BUILDING_ENTRIES.find(e=>e.type==='gate'&&e.key===gate.id);
  Object.assign(g.player,{x:site.x+35,y:site.y+15});const entry=nearbyInteraction(g);assert.equal(entry?.key,gate.id);assert.equal(entry.label,'怪潮站牌');assert.equal(entry.presentation,'task-entry');assert.equal(nearbyInteractionAnchor(g,entry).hitbox,undefined);assert.equal(canStartCampDefense(g,gate),true);
  Object.assign(g.player,gate);assert.equal(nearbyInteraction(g)?.key,gate.id,'导航终点必须能打开站牌');
 }
 Object.assign(g.player,{x:2500,y:1700});assert.notEqual(nearbyInteraction(g)?.type,'gate');
 g.campDefense={};assert.equal(nearbyInteraction(g),null);
});
