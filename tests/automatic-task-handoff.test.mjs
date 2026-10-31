// 到点交付专项：只准备回营检查点，交谈、领奖及存储失败走正式状态机。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {updateStory} from '../src/core/story-manager.js';

// 为各章构造已结束战斗、尚未回营的交付检查点，不直接标记通关。
function returning(id='sunleaf-01'){
 const p=freshProgress(),def=STORY_CAMPAIGN[id];
 for(const required of def.requires||[])p.story.chapters[required].completed=true;
 const g=new Game(p,()=>.5);g.start();assert.ok(g.enterStory(id));
 const [stageId,node]=Object.entries(def.nodes).find(([,n])=>n.panel?.type==='claim');
 Object.assign(g.story,{stageId,phase:'active',dialogue:null,interacting:0,readLines:[]});
 g.story.flags.silenced=true;g.enemies=[];g.boss=null;g.state='playing';
 const site=def.world.sites[node.objective.site];Object.assign(g.player,{x:site.x,y:site.y});
 return g;
}

test('六章抵达交付点自动交谈，读完打开准备页但不代领资源',()=>{
 for(let i=1;i<=6;i++){
  const id='sunleaf-0'+i,g=returning(id),coins=g.progress.coins;
  updateStory(g,.1);assert.ok(g.story.interacting>0,id);
  updateStory(g,10);assert.equal(g.story.dialogue,'ending',id);
  assert.ok(g.advanceStoryDialogue(true));assert.equal(g.story.phase,'prepare',id);
  assert.equal(g.progress.coins,coins);assert.equal(g.progress.story.chapters[id].rewardClaimed,false);
  g.storyPersist=()=>false;assert.equal(g.claimStory(),false);assert.equal(g.progress.coins,coins);
  g.storyPersist=()=>true;assert.ok(g.claimStory());assert.equal(g.progress.coins,coins+(STORY_CAMPAIGN[id].reward.coins||0));
  assert.equal(g.claimStory(),false);
 }
});

test('远处、暂停、错误地图或敌人尚在时不自动交付，恢复安全后可触发',()=>{
 for(const blocked of ['far','paused','map','enemy','boss']){
  const g=returning(),site={x:g.player.x,y:g.player.y},map=g.mapId;
  if(blocked==='far')g.player.x+=300;
  if(blocked==='paused')g.state='paused';
  if(blocked==='map')g.mapId='jiuzhaigou';
  if(blocked==='enemy')g.enemies=[{hp:1}];
  if(blocked==='boss')g.boss={hp:1};
  updateStory(g,.1);assert.equal(g.story.interacting,0,blocked);
  Object.assign(g.player,site);g.mapId=map;g.state='playing';g.enemies=[];g.boss=null;
  updateStory(g,.1);assert.ok(g.story.interacting>0,blocked);
 }
});

test('交谈准备期间离开会取消，普通调查节点仍要求现场操作',()=>{
 const g=returning();updateStory(g,.1);g.player.x+=300;updateStory(g,.1);assert.equal(g.story.interacting,0);
 g.story.stageId='Q70';const site=STORY_CAMPAIGN['sunleaf-01'].world.sites.RELAY;
 Object.assign(g.player,{x:site.x,y:site.y});updateStory(g,.1);assert.equal(g.story.interacting,0);assert.equal(g.story.dialogue,null);
});
