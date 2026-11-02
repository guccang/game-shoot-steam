// 装备委托必须使用设施门前的真实通行点，保留建筑阻挡与章节接取校验。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {EQUIPMENT_STORY_CHAPTERS} from '../src/config/equipment-story-chapters.js';
import {LIVING_PLACES} from '../src/config/living-world.js';
import {storyPostApproach,storyPostForChapter} from '../src/core/story-posts.js';
import {validateStorySites} from '../src/world/story-sites.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {planQuestRoute} from '../src/physics/quest-route.js';

// 只开放任务建筑，不完成任何故事；保留正式森林与所有建筑碰撞。
function prepared(){const p=freshProgress();p.arrival=null;p.restoration.repaired=['story'];const g=new Game(p,()=>.5);g.start();return g;}

test('七条装备委托均可独立接取，目标点位于可行走的门前',()=>{
 for(const def of EQUIPMENT_STORY_CHAPTERS){
  const g=prepared();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,def.id)));
  assert.ok(g.enterStory(def.id),def.id);
  for(const [key,p] of Object.entries(def.world.sites))assert.equal(blocked(p.x,p.y,12,g.trees,{mapId:'forest',livingCollision:true}),false,def.id+'/'+key);
  assert.equal(Object.values(g.progress.story.chapters).some(c=>c.completed),false);
 }
});

test('红狼通路沿真实碰撞绕行，步行和驾驶均能抵达各交接点',()=>{
 const g=prepared(),def=EQUIPMENT_STORY_CHAPTERS.find(c=>c.id==='equipment-red-wolf');
 Object.assign(g.player,storyPostApproach(storyPostForChapter(g,def.id)));assert.ok(g.enterStory(def.id));
 for(const treePass of [false,true])for(const path of def.world.paths)for(let i=1;i<path.sites.length;i++){
  const from=def.world.sites[path.sites[i-1]],to=def.world.sites[path.sites[i]],body={...from,mapId:'forest',livingCollision:true,treePass};
  const route=planQuestRoute(body,to,g.trees,16000);assert.ok(route.reachable,path.sites[i-1]+'→'+path.sites[i]);
  for(const p of route.points.slice(1))moveBody(body,p.x-body.x,p.y-body.y,null,12,g.trees);
  assert.ok(Math.hypot(body.x-to.x,body.y-to.y)<.01,'实际移动应完整走过导航路径');
 }
});

test('把端点改回厨房或集市墙内仍拒绝接取，不允许通过关闭碰撞绕过报错',()=>{
 const g=prepared(),def=structuredClone(EQUIPMENT_STORY_CHAPTERS.find(c=>c.id==='equipment-red-wolf'));
 for(const [key,id] of [['KITCHEN','kitchen'],['MARKET','market'],['RELAY','relay']]){
  const p=LIVING_PLACES[id];assert.ok(blocked(p.x,p.y,12,[],{mapId:'forest'}));def.world.sites[key]={...p};
 }
 const issues=validateStorySites(g.trees,blocked,def);
 assert.ok(issues.includes('FLOWERS→KITCHEN'));assert.ok(issues.includes('LETTERS→MARKET'));assert.ok(issues.includes('MARKET→RELAY'));
});
