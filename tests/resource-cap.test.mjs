import {forestReward} from '../src/config/economy.js';
// 资源上限回归：覆盖存档、实际采集、奖励事务与满仓后的再次获取。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {MATERIAL_CAP} from '../src/config/materials.js';
import {creditResource} from '../src/progression/economy/resource-wallet.js';
import {debugGrantProgress} from '../src/progression/player/debug-grants.js';
import {awardMainline} from '../src/progression/story/mainline-reward.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {storyPostApproach} from '../src/core/story/story-posts.js';
import {claimStoryCollection} from '../src/progression/story/story-rewards.js';
import {startCampDefense,claimCampDefense} from '../src/core/camp/camp-defense.js';
import {CAMP_GATES} from '../src/config/camp-defense.js';
import {finishFootball} from '../src/core/activities/slime-football.js';

// 使用正式进度和游戏对象，仅将钱包置于距离上限两份资源的位置。
function nearCap(){const p=freshProgress();p.coins=p.wood=RESOURCE_CAP-2;return p;}

test('金币木材上限为9999万，超额旧档收敛且合法库存重载不减少',()=>{
 assert.equal(RESOURCE_CAP,99990000);
 for(const amount of [10000000,RESOURCE_CAP-1,RESOURCE_CAP,1e9]){
  const p=freshProgress();p.coins=p.wood=amount;const loaded=validateProgress(JSON.parse(JSON.stringify(p)));
  assert.equal(loaded.coins,Math.min(amount,RESOURCE_CAP));assert.equal(loaded.wood,loaded.coins);
 }
});
test('满仓收益舍弃，消费后能重新入账，调试赠送不改变材料上限',()=>{
 const p=nearCap();assert.equal(creditResource(p,'coins',100),2);assert.equal(creditResource(p,'coins',100),0);
 p.coins-=20;assert.equal(creditResource(p,'coins',30),20);assert.equal(p.coins,RESOURCE_CAP);
 p.materials.parts=MATERIAL_CAP;const next=debugGrantProgress(p,'resources');assert.equal(next.coins,RESOURCE_CAP);assert.equal(next.wood,RESOURCE_CAP);assert.equal(next.materials.parts,MATERIAL_CAP);
});
test('木材背包与仓库独立封顶，采集与战斗只记录实际增量',()=>{
 const g=new Game(nearCap(),()=>.5);g.start();g.trees=[];g.enemies=[];g.progress.logistics.bagWood=RESOURCE_CAP-2;g.addTree(950,760);g.hit(g.trees[0],10000);
 assert.equal(g.progress.coins,RESOURCE_CAP-2);assert.equal(g.progress.wood,RESOURCE_CAP-2);
 assert.equal(g.drops[0].coins,0);assert.equal(g.drops[0].wood,2);
 assert.equal(g.progress.logistics.bagWood,RESOURCE_CAP);
 assert.equal(g.progress.economyLog.income['forest:tree:coins']||0,0);
 const enemy=g.spawnEnemy(0,100),coins=Math.min(2,forestReward('enemy',enemy.reward,g.progress).coins);g.hit(enemy,100000);assert.equal(g.progress.coins,RESOURCE_CAP-2+coins);assert.equal(g.progress.wood,RESOURCE_CAP-2);
 assert.equal(g.drops.at(-1).coins,coins);assert.equal(g.drops.at(-1).wood,0);
});
test('主线与比赛结算封顶，奖励记录保留实际到账量',()=>{
 const p=nearCap(),reward=awardMainline(p,'first-map');assert.equal(reward.coins,2);assert.equal(p.coins,RESOURCE_CAP);
 const g=new Game(nearCap(),()=>.5);g.realm={mode:'football',phase:'combat',score:20,remaining:0};assert.ok(finishFootball(g));
 assert.equal(g.progress.coins,RESOURCE_CAP);assert.equal(g.realm.earnings.coins,2);assert.equal(finishFootball(g),false);
});
test('委托礼包候选存档封顶，保存失败不改变钱包',()=>{
 const g=new Game(nearCap(),()=>.5);g.start();const post=STORY_POSTS.find(p=>p.id==='sunleaf-post'),pack=post.collection.options.find(o=>o.kind==='resources');
 Object.assign(g.player,storyPostApproach(post));for(const id of post.chapters)Object.assign(g.progress.story.chapters[id],{completed:true,rewardClaimed:true});
 g.storyPersist=()=>false;assert.equal(claimStoryCollection(g,post.id,pack.id).ok,false);assert.equal(g.progress.coins,RESOURCE_CAP-2);
 let saved;g.storyPersist=p=>{saved=p;return true;};assert.ok(claimStoryCollection(g,post.id,pack.id).ok);
 assert.equal(saved.coins,RESOURCE_CAP);assert.equal(saved.wood,RESOURCE_CAP);assert.equal(g.progress.coins,RESOURCE_CAP);
});
test('营地结算封顶并只记实际奖励，不回落到旧上限',()=>{
 const p=nearCap();p.restoration.repaired.push('defense');
 const g=new Game(p,()=>.41);g.state='playing';Object.assign(g.player,CAMP_GATES.find(gate=>gate.id==='left'));assert.ok(startCampDefense(g,'left'));g.campDefense.phase='result';
 assert.ok(claimCampDefense(g));assert.equal(g.progress.coins,RESOURCE_CAP);assert.equal(g.progress.wood,RESOURCE_CAP);
 assert.equal(g.progress.economyLog.income['camp-defense:B:coins'],2);
 assert.equal(g.progress.economyLog.income['camp-defense:B:wood'],2);
 assert.equal(claimCampDefense(g),false);assert.equal(g.progress.campDefense.runs,1);
});
