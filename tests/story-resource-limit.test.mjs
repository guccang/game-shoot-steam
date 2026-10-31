import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
// 奖励精简专项：校验全部内容表与实际交付，不重复跑整章路线组合。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {validateStoryDefinition} from '../src/core/story-schema.js';
import {validateStoryPosts} from '../src/core/story-posts.js';
import {validateProgress} from '../src/progression/progress.js';
import {storyRewardMarkup} from '../src/ui/story-rewards.js';
test('全部单篇与礼包最多三种正数资源，第四种明确拒绝而零值不占种类',()=>{
 for(const def of Object.values(STORY_CAMPAIGN)){
  assert.ok(Object.values(def.reward).filter(n=>n>0).length<=3);
  assert.doesNotThrow(()=>validateStoryDefinition(def));
 }
 assert.doesNotThrow(()=>validateStoryPosts());
 const bad=structuredClone(STORY_CAMPAIGN['sunleaf-01']);bad.reward.crystal=1;
 assert.throws(()=>validateStoryDefinition(bad),/最多三种/);
 bad.reward.crystal=0;assert.doesNotThrow(()=>validateStoryDefinition(bad));
 const post=structuredClone(STORY_POSTS[0]),pack=post.collection.options.find(o=>o.kind==='resources');
 pack.resources.core=1;assert.throws(()=>validateStoryPosts([post]),/最多三种/);
 pack.resources.core=0;assert.doesNotThrow(()=>validateStoryPosts([post]));
});
test('第一章预览与交付只有金币木材零件，旧晶体核心保留，保存失败及重玩不重发',()=>{
 const receipts=[],g=new Game(freshProgress(),()=>.5,(type,data)=>{if(type==='task-reward')receipts.push(data);});g.start();g.progress.materials.crystal=12;g.progress.materials.core=9;
 // 只建立合法终章条件，专门检查被修改奖励的真实结算入口。
 function ending(){
  Object.assign(g.player,{x:STORY_POSTS[0].x+STORY_POSTS[0].approach.dx,y:STORY_POSTS[0].y+STORY_POSTS[0].approach.dy});
  assert.ok((g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id),g.enterStory()));g.chooseStoryLoadout('line-patrol');
  Object.assign(g.story,{stageId:'Q80',phase:'prepare',dialogue:null,readLines:['ending']});g.story.flags.silenced=true;
 }
 ending();const before=structuredClone(g.progress);
 const preview=storyRewardMarkup(STORY_CAMPAIGN['sunleaf-01'],null);
 assert.equal((preview.match(/<span>/g)||[]).length,3);assert.doesNotMatch(preview,/能源晶体|首领核心/);
 const pendingState=g.state;g.storyPersist=()=>false;assert.equal(g.claimStory(),false);assert.deepEqual(g.progress,before);assert.equal(g.state,pendingState);assert.equal(receipts.length,0);
 g.storyPersist=()=>true;assert.ok(g.claimStory());
 assert.equal(g.state,'playing');assert.equal(receipts.length,1);
 assert.equal(g.progress.coins-before.coins,600);assert.equal(g.progress.wood-before.wood,240);
 assert.deepEqual(g.progress.materials,{parts:before.materials.parts+6,crystal:12,core:9});
 const paid=structuredClone(g.progress);ending();assert.ok(g.claimStory());
 assert.equal(g.state,'playing');assert.equal(receipts.length,1);
 assert.equal(g.progress.coins,paid.coins);assert.deepEqual(g.progress.materials,paid.materials);
 assert.deepEqual(validateProgress(g.progress).materials,paid.materials);
});
