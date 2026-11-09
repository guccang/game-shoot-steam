// 章节与营地显隐解耦：逐节点比对永久建筑、修复状态和剧情会话隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {storyCampScene} from '../src/rendering/story-camp.js';
import {livingObjects} from '../src/rendering/living-world.js';
import {farmObjects} from '../src/rendering/farm.js';
import {restorationObjects,restorationBuildingVisible} from '../src/rendering/town-restoration.js';
import {storyDeliveryReady} from '../src/core/story/story-definition.js';

// 只采集永久建筑身份及修复显示条件，不把临时剧情人物计为营地建筑。
function buildings(game){
 return {facilities:livingObjects(game).filter(o=>o.type==='living-facility').map(o=>o.id),
  farm:farmObjects(game).map(o=>o.type),extras:restorationObjects(game).map(o=>o.id),
  repaired:TOWN_RESTORATIONS.map(f=>[f.id,restorationBuildingVisible(game,f.id)])};
}

for(const repaired of [[],['story','cottage'],TOWN_RESTORATIONS.map(f=>f.id)])test('全部章节节点保留相同营地建筑：'+repaired.length+'项已修复',()=>{
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=repaired;
 const game=new Game(p,()=>.5);game.start();const expected=buildings(game),before=JSON.stringify(game.progress);
 for(const def of Object.values(STORY_CAMPAIGN))for(const stageId of Object.keys(def.nodes)){
  const run={chapterId:def.id,stageId,phase:'dialogue'},equipment={weapons:[]};
  game.story={...run,equipment};const active=game.story;
  const scene=storyCampScene(game);
  assert.deepEqual(buildings(scene),expected,def.id+':'+stageId);
  assert.equal(scene.progress,game.progress);assert.equal(scene.loadout,game.progress);
  assert.equal(game.story,active);assert.equal(game.loadout,equipment);
  assert.equal(storyDeliveryReady(game),false,'显示建筑不能提前开放交付');
 }
 assert.equal(JSON.stringify(game.progress),before,'显示不改写永久进度');
});

test('正常森林和独立地图仍使用自身场景，章节车辆使用入场前停车状态',()=>{
 const game=new Game(freshProgress(),()=>.5);assert.equal(storyCampScene(game),game);
 game.story={chapterId:'sunleaf-02',stageId:'SHORE'};game.storyForest={vehicles:[{id:'parked'}],parkingVisitors:[]};
 assert.equal(storyCampScene(game).vehicles,game.storyForest.vehicles);
 game.realm={mode:'tower'};assert.equal(storyCampScene(game),game);
 game.realm=null;game.mapId='jiuzhaigou';assert.equal(storyCampScene(game),game);
});

// 可见的营地底座在章节出发后仍阻挡角色，避免显示恢复后能够穿屋。
test('第二章出发保留营地建筑底座碰撞',async()=>{
 const {MAINLINE_IDS}=await import('../src/config/mainline.js');
 const {storyPostForChapter,storyPostApproach}=await import('../src/core/story/story-posts.js');
 const {LIVING_PLACES}=await import('../src/config/living-world.js');
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=['story'];
 p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.story.chapters['sunleaf-01'].completed=true;
 const game=new Game(p,()=>.5);game.start();Object.assign(game.player,storyPostApproach(storyPostForChapter(game,'sunleaf-02')));
 assert.ok(game.enterStory('sunleaf-02'));game.advanceStoryDialogue(true);game.chooseStoryLoadout('tide-arc');game.startStoryStage();
 game.dismountVehicle();const site=LIVING_PLACES.camp;Object.assign(game.player,{x:site.x,y:site.y+55});
 const before=game.player.y;for(let i=0;i<40;i++)game.update(.02,{x:0,y:-1});
 assert.equal(game.player.livingCollision,true);assert.ok(game.player.y<before,'应能走到建筑门前');
 assert.ok(game.player.y>=site.y+5,'不能穿过实体底座');assert.equal(game.story.stageId,'PICKUP');
});
