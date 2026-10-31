// 委托板统一赠礼：只检查新增资源事务、旧档兼容及直接关联的目录展示。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {validateProgress} from '../src/progression/progress.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {storyPostApproach,validateStoryPosts} from '../src/core/story-posts.js';
import {claimStoryCollection,storyCollectionStatus,storyEquipmentSource} from '../src/progression/story-rewards.js';
import {storyCollectionMarkup,storyCollectionHelp} from '../src/ui/story-rewards.js';
const CAMP=STORY_POSTS.find(p=>p.id==='sunleaf-post'),MONSTER=STORY_POSTS.find(p=>p.id==='monster-neighbors');
const PACK=CAMP.collection.options.find(o=>o.kind==='resources'),GUN=CAMP.collection.options.find(o=>o.kind==='weapons');
// 显式构造已交付存档；不以奖励测试代替剧情全流程试玩。
function completedGame(){
 const g=new Game(freshProgress(),()=>.5);g.start();Object.assign(g.player,storyPostApproach(CAMP));
 for(const id of CAMP.chapters)Object.assign(g.progress.story.chapters[id],{completed:true,rewardClaimed:true});
 return g;
}
test('所有委托板必须配置一次性赠礼，资源名和数额严格校验',()=>{
 assert.doesNotThrow(()=>validateStoryPosts(JSON.parse(JSON.stringify(STORY_POSTS))));
 const absent=structuredClone(CAMP);delete absent.collection;assert.throws(()=>validateStoryPosts([absent]),/缺少一次性赠礼/);
 for(const resources of [{},{coins:0},{unknown:1},{coins:-1},{coins:1.5},{coins:Infinity},{coins:NaN}]){
  const bad=structuredClone(CAMP);bad.collection.options=[{...PACK,resources}];
  assert.throws(()=>validateStoryPosts([bad]),/资源礼包/);
 }
 const duplicate=structuredClone(CAMP);duplicate.collection.options.push(structuredClone(duplicate.collection.options[0]));
 assert.throws(()=>validateStoryPosts([duplicate]),/赠礼选项/);
});
test('六章与两条支线必须全部交付，单篇未领或远程均不能领取整组赠礼',()=>{
 const g=completedGame(),last=CAMP.chapters.at(-1);g.progress.story.chapters[last].rewardClaimed=false;
 assert.equal(storyCollectionStatus(g.progress,CAMP).count,7);assert.equal(claimStoryCollection(g,CAMP.id,PACK.id).ok,false);
 g.progress.story.chapters[last].rewardClaimed=true;g.progress.story.chapters[last].completed=false;
 assert.equal(claimStoryCollection(g,CAMP.id,PACK.id).ok,false);
 g.progress.story.chapters[last].completed=true;g.player.x+=500;
 assert.equal(claimStoryCollection(g,CAMP.id,PACK.id).ok,false);
});
test('资源礼包保存失败可重试，正确入账一次且重载不能改选或重复领取',()=>{
 const g=completedGame(),before=structuredClone(g.progress);
 for(const persist of [()=>false,()=>{throw Error('写入失败');}]){
  g.storyPersist=persist;assert.equal(claimStoryCollection(g,CAMP.id,PACK.id).ok,false);assert.deepEqual(g.progress,before);
 }
 let saved;g.storyPersist=p=>{saved=JSON.stringify(p);return true;};
 assert.ok(claimStoryCollection(g,CAMP.id,PACK.id).ok);
 for(const [key,n] of Object.entries(PACK.resources))assert.equal(key in before.materials?g.progress.materials[key]-before.materials[key]:g.progress[key]-before[key],n,key);
 for(const key of ['weapons','weaponParts','weapon','vehicleHulls','vehicleIndex'])assert.deepEqual(g.progress[key],before[key]);
 for(const option of CAMP.collection.options)assert.equal(claimStoryCollection(g,CAMP.id,option.id).ok,false);
 const restored=new Game(validateProgress(JSON.parse(saved)),()=>.5);restored.start();Object.assign(restored.player,storyPostApproach(CAMP));
 assert.equal(storyCollectionStatus(restored.progress,CAMP).claimed,PACK.id);
 assert.equal(claimStoryCollection(restored,CAMP.id,GUN.id).ok,false);
 assert.deepEqual(restored.progress.materials,g.progress.materials);
});
test('营地装备永久获取，已有成长保留并只折算一次',()=>{
 const g=completedGame();assert.equal(g.progress.weapons[GUN.index],0);
 assert.ok(claimStoryCollection(g,CAMP.id,GUN.id).ok);assert.equal(g.progress.weapons[GUN.index],1);
 const owned=completedGame();owned.progress.weapons[GUN.index]=5;owned.progress.weaponParts[GUN.index].capacity=3;
 const coins=owned.progress.coins;assert.ok(claimStoryCollection(owned,CAMP.id,GUN.id).ok);
 assert.equal(owned.progress.coins,coins+CAMP.collection.duplicateCoins);
 assert.equal(owned.progress.weapons[GUN.index],5);assert.equal(owned.progress.weaponParts[GUN.index].capacity,3);
 assert.equal(claimStoryCollection(owned,CAMP.id,PACK.id).ok,false);
});
test('旧档已完成营地可补领，新旧委托板领取记录各自独立',()=>{
 const raw=completedGame().progress;
 for(const id of MONSTER.chapters)Object.assign(raw.story.chapters[id],{completed:true,rewardClaimed:true});
 raw.story.boardRewards={[MONSTER.id]:'hovercraft'};
 const g=new Game(validateProgress(JSON.parse(JSON.stringify(raw))),()=>.5);g.start();Object.assign(g.player,storyPostApproach(CAMP));
 assert.equal(storyCollectionStatus(g.progress,CAMP).ready,true);assert.equal(storyCollectionStatus(g.progress,CAMP).claimed,null);
 assert.ok(claimStoryCollection(g,CAMP.id,PACK.id).ok);
 assert.deepEqual(validateProgress(g.progress).story.boardRewards,{[CAMP.id]:PACK.id,[MONSTER.id]:'hovercraft'});
});
test('统一UI列明礼包数额、当前板位置、一次性状态与武器获取来源',()=>{
 const g=completedGame();let html=storyCollectionMarkup(g.progress,CAMP,true);
 for(const n of Object.values(PACK.resources))assert.ok(html.includes('+'+n));
 assert.match(html,/8 \/ 8 · 可领取/);assert.match(html,/二选一/);assert.match(storyCollectionHelp(g.progress,CAMP,true),/每块委托板仅领一次/);
 assert.match(storyCollectionHelp(g.progress,CAMP,false),/晴叶回信驿旁领取/);
 assert.match(storyEquipmentSource(g.progress,'weapons',GUN.index),/晴叶回信驿.*全部 8 篇/);
 assert.match(storyEquipmentSource(g.progress,'vehicle',3),/怪物邻里委托板.*全部 3 篇/);
 g.progress.story.run={};assert.match(storyCollectionHelp(g.progress,CAMP,true),/结束当前故事后领取/);g.progress.story.run=null;
 claimStoryCollection(g,CAMP.id,PACK.id);html=storyCollectionMarkup(g.progress,CAMP,true);
 assert.match(html,/✓ 已领取/);assert.match(storyCollectionHelp(g.progress,CAMP,true),/已领取：巡护补给礼包/);assert.match(html,/本组已领取/);
 assert.equal((html.match(/ disabled/g)||[]).length,2);
});
