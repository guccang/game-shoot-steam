// 游戏档案回归覆盖真实击杀、入账事务、玩法入场与旧档，避免用界面数字代替事件验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {recordActivity,validateGameStatistics,STAT_RESOURCES} from '../src/progression/game-statistics.js';
import {creditResource} from '../src/progression/resource-wallet.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {MATERIAL_CAP} from '../src/config/materials.js';
import {debugGrantProgress} from '../src/progression/debug-grants.js';
import {claimStoryCollection} from '../src/progression/story-rewards.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {storyPostApproach} from '../src/core/story-posts.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {enterStory,leaveStory} from '../src/core/story-manager.js';
import {acceptClearingPost} from '../src/core/clearing-guide.js';
import {setLivingPatrol} from '../src/core/living-world.js';
import {finishRealm,syncRealm} from '../src/core/realm-manager.js';
import {startCampDefense,leaveCampDefense,syncCampDefense} from '../src/core/camp-defense.js';

// 测试从正式新档开始，不购买或升级任何装备。
function scene(){const g=new Game(freshProgress(),()=>.45);g.start();g.mainlineSpeech=null;return g;}

test('新档为空，旧档仅恢复可信历史，坏值收敛且反复读档不重复累计',()=>{
 const p=freshProgress();assert.equal(p.statistics.partial,false);assert.equal(p.statistics.kills,0);
 delete p.statistics;p.patrol={kills:28,chopped:19};p.economyLog.income={'forest:enemy:coins':1234,'realm:tower:coins':56,'forest:tree:wood':78,'realm:tower:crystal':9};
 const loaded=validateProgress(p),s=loaded.statistics;
 assert.equal(s.partial,true);assert.equal(s.kills,28);assert.equal(s.trees,19);assert.equal(s.resources.coins,1290);assert.equal(s.resources.wood,78);assert.equal(s.resources.crystal,9);
 assert.ok(Object.values(s.plays).every(n=>n===0));assert.deepEqual(validateProgress(loaded).statistics,s);
 const broken=validateGameStatistics({version:1,kills:Infinity,trees:-2,resources:{coins:1e30,wood:2.8,core:'9'},plays:{tower:NaN,unknown:99}});
 assert.equal(broken.kills,0);assert.equal(broken.trees,0);assert.equal(broken.resources.coins,Number.MAX_SAFE_INTEGER);assert.equal(broken.resources.wood,2);assert.equal(broken.resources.core,0);assert.equal(broken.plays.unknown,undefined);
});

test('实际击杀与伐倒只记一次，非致命命中和试射不计，死亡重开保留累计',()=>{
 const g=scene();g.enemies=[];g.trees=[];
 const enemy=g.spawnEnemy(0,0,{x:1700,y:400});g.hit(enemy,1);assert.equal(g.progress.statistics.kills,0);g.hit(enemy,1e9);g.hit(enemy,1e9);assert.equal(g.progress.statistics.kills,1);
 g.addTree(950,760);const tree=g.trees[0];g.hit(tree,1e9);g.hit(tree,1e9);assert.equal(g.progress.statistics.trees,1);
 const dummy=g.spawnEnemy(0,0,{x:1700,y:400});dummy.workshopTarget=true;g.hit(dummy,1e9);assert.equal(g.progress.statistics.kills,1);
 const before=structuredClone(g.progress.statistics);g.hurt(1e9);g.start();assert.deepEqual(g.progress.statistics,before);
});

test('五种资源仅按实际到账累计，消费不减、满仓不增，累计可超过钱包上限',()=>{
 const p=freshProgress();p.coins=RESOURCE_CAP-2;p.materials.parts=MATERIAL_CAP-3;
 assert.equal(creditResource(p,'coins',10),2);assert.equal(creditResource(p,'coins',10),0);
 p.coins-=5;creditResource(p,'coins',20);assert.equal(p.statistics.resources.coins,7);
 assert.equal(creditResource(p,'parts',10),3);assert.equal(creditResource(p,'parts',10),0);
 for(const key of ['wood','crystal','core'])creditResource(p,key,12);
 assert.deepEqual(p.statistics.resources,{coins:7,wood:12,parts:3,crystal:12,core:12});
 p.statistics.resources.coins=RESOURCE_CAP*2;p.coins=0;creditResource(p,'coins',10);assert.equal(validateProgress(p).statistics.resources.coins,RESOURCE_CAP*2+10);
 const before=structuredClone(p.statistics);assert.deepEqual(debugGrantProgress(p,'resources').statistics,before);
 creditResource(p,'coins',-1);creditResource(p,'coins',NaN);assert.deepEqual(p.statistics,before);
});

test('礼包保存失败不记收入，成功仅记一次且读档不重记',()=>{
 const g=scene(),post=STORY_POSTS.find(p=>p.id==='sunleaf-post'),pack=post.collection.options.find(o=>o.kind==='resources');
 Object.assign(g.player,storyPostApproach(post));for(const id of post.chapters)Object.assign(g.progress.story.chapters[id],{completed:true,rewardClaimed:true});
 const before=structuredClone(g.progress.statistics);g.storyPersist=()=>false;assert.equal(claimStoryCollection(g,post.id,pack.id).ok,false);assert.deepEqual(g.progress.statistics,before);
 g.storyPersist=()=>true;assert.ok(claimStoryCollection(g,post.id,pack.id).ok);
 for(const key of STAT_RESOURCES)assert.equal(g.progress.statistics.resources[key],pack.resources[key]||0);
 const saved=structuredClone(g.progress.statistics);assert.equal(claimStoryCollection(g,post.id,pack.id).ok,false);assert.deepEqual(validateProgress(g.progress).statistics,saved);
});

test('四种秘境进入记次数，失败退出保留，读档及重复点击不增加',()=>{
 for(const mode of ['rogue','tower','guardian','football']){
  const g=scene();assert.ok(g.enterRealm(mode));assert.equal(g.progress.statistics.plays[mode],1);assert.equal(g.enterRealm(mode),false);
  syncRealm(g);const restored=new Game(validateProgress(g.progress),()=>.45);assert.equal(restored.progress.statistics.plays[mode],1);
  g.state='playing';finishRealm(g);g.leaveRealm();assert.equal(g.progress.statistics.plays[mode],1);
  g.start();assert.ok(g.enterRealm(mode));assert.equal(g.progress.statistics.plays[mode],2);
 }
});

test('清缴接取事务失败不计数，暂停重接同轮不重复，下轮再次累计',()=>{
 const g=scene();Object.assign(g.player,{x:810,y:965});g.livingPersist=()=>false;
 assert.equal(acceptClearingPost(g).ok,false);assert.equal(g.progress.statistics.plays.clearing,0);
 g.livingPersist=()=>true;assert.ok(acceptClearingPost(g).ok);assert.ok(acceptClearingPost(g).ok);assert.equal(g.progress.statistics.plays.clearing,1);
 assert.ok(setLivingPatrol(g,false).ok);assert.ok(acceptClearingPost(g).ok);assert.equal(g.progress.statistics.plays.clearing,1);
 g.progress.bosses=1;recordActivity(g.progress,'clearing');recordActivity(g.progress,'clearing');assert.equal(g.progress.statistics.plays.clearing,2);
});

test('故事与委托分开统计，离开再继续同章不重复',()=>{
 for(const id of ['sunleaf-01','sunleaf-side-guardian']){
  const g=scene(),def=STORY_CAMPAIGN[id],post=STORY_POSTS.find(p=>p.chapters.includes(id));
  for(const key of def.requires||[])g.progress.story.chapters[key].completed=true;
  Object.assign(g.player,storyPostApproach(post));assert.ok(enterStory(g,null,id,post.id));
  const key=def.catalogType==='commission'?'commission':'story';assert.equal(g.progress.statistics.plays[key],1);
  assert.ok(leaveStory(g));Object.assign(g.player,storyPostApproach(post));assert.ok(enterStory(g,null,id,post.id));assert.equal(g.progress.statistics.plays[key],1);
 }
});

test('营门守卫和消防成功入场计数，拒绝入场与续档不重复',()=>{
 const g=scene();Object.assign(g.player,{x:120,y:729});assert.ok(startCampDefense(g,'left'));assert.equal(g.progress.statistics.plays.defense,1);assert.equal(startCampDefense(g,'left'),false);
 syncCampDefense(g);const restored=new Game(validateProgress(g.progress),()=>.45);assert.equal(restored.progress.statistics.plays.defense,1);
 assert.ok(leaveCampDefense(g));assert.equal(g.progress.statistics.plays.defense,1);
 assert.ok(g.requestFireRescue());assert.equal(g.progress.statistics.plays.fire,0);assert.ok(g.startFireRescue());assert.equal(g.progress.statistics.plays.fire,1);assert.equal(g.startFireRescue(),false);assert.equal(g.progress.statistics.plays.fire,1);
});
