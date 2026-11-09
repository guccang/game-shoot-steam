// 专项验证章节实体随会话清理，以及退出、旧档和重玩的直接影响。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story/story-posts.js';
import {STORY_ID} from '../src/config/story.js';
import {storyObjects} from '../src/rendering/story-props.js';
// 建立真实营地会话；不推进与本次修改无关的战斗流程。
function chapter(){const p=freshProgress();p.restoration.repaired.push('story');const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,STORY_ID)));assert.ok(g.enterStory());return g;}
// 只准备已完成交付的检查点，领奖仍走正式事务。
function readyToClaim(g){Object.assign(g.story,{stageId:'Q80',phase:'prepare',dialogue:null,routeId:'road',readLines:['ending']});g.story.flags.silenced=true;}

test('暂离清空全部故事实体，原森林保持原对象，继续时重新出现',()=>{
  const g=chapter(),forest=g.storyForest;
  assert.deepEqual(storyObjects(g).map(o=>o.kind),['mail','sign','relay','crate','snow']);
  Object.assign(g.story,{stageId:'Q30',routeId:null});
  assert.equal(storyObjects(g).filter(o=>o.kind==='route').length,0);
  assert.equal(g.leaveStory(),true);assert.deepEqual(storyObjects(g),[]);
  assert.equal(g.trees,forest.trees);assert.equal(g.player,forest.player);
  assert.equal(g.enterStory(),true);assert.ok(storyObjects(g).length);
});

test('正式领奖、旧通关存档和重玩不会残留道具或继承修复外观',()=>{
  const g=chapter();readyToClaim(g);
  assert.ok(storyObjects(g).some(o=>o.kind==='mint'));
  assert.equal(g.claimStory(),true);assert.deepEqual(storyObjects(g),[]);
  assert.equal(g.progress.story.chapters[STORY_ID].rewardClaimed,true);
  assert.equal(g.progress.story.worldFlags.sunleafRestored,true);
  const restored=new Game(structuredClone(g.progress),()=>.5);
  assert.deepEqual(storyObjects(restored),[]);
  assert.equal(g.enterStory(),true);
  assert.ok(storyObjects(g).filter(o=>['mail','sign','relay','crate'].includes(o.kind)).every(o=>!o.restored));
});

test('保存失败保留当前故事道具；非故事地图和新档不生成专属实体',()=>{
  const g=chapter();readyToClaim(g);g.storyPersist=()=>false;
  assert.equal(g.claimStory(),false);assert.ok(storyObjects(g).length);
  g.mapId='jiuzhaigou';assert.deepEqual(storyObjects(g),[]);
  g.mapId='forest';g.realm={};assert.deepEqual(storyObjects(g),[]);
  assert.deepEqual(storyObjects(new Game(freshProgress())),[]);
});
