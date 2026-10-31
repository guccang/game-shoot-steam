// 章节契约回归：状态推进用显式击杀夹具，实战平衡另由 story-simulation.mjs 检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_ID,STORY_LOADOUTS} from '../src/config/story.js';
import {STORY_SITES,validateStorySites} from '../src/world/story-sites.js';
import {blocked} from '../src/physics/motion.js';
import {validateStory} from '../src/progression/story-progress.js';
import {updateStory} from '../src/core/story-manager.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
// 补齐正式驿牌修复与到场前置，章节流程仍通过公开入口执行。
function chapter(id='line-patrol',p=freshProgress()){
  p.restoration.repaired=[...new Set([...p.restoration.repaired,'story'])];
  const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,STORY_ID)));assert.equal(g.enterStory(),true);
  g.advanceStoryDialogue(true);g.chooseStoryLoadout(id);g.startStoryStage();return g;
}
// 隔离任务状态推进，不以此代替真实射击胜率。
function tick(g,n=1){for(let i=0;i<n;i++)updateStory(g,.05);}
// 到达交互点并完成正式两秒读条。
function interact(g,site){Object.assign(g.player,STORY_SITES[site]);g.state='playing';assert.equal(g.interactStory(),true);tick(g,41);assert.ok(g.story.dialogue);g.advanceStoryDialogue(true);}
// 清除指定遭遇名额，验证计数、上限及最后一只才放行。
function clearWave(g){for(let i=0;i<2000&&!g.story.combat?.cleared;i++){
  tick(g);if(!g.story.combat)return;assert.ok(g.enemies.filter(e=>e.hp>0).length<=g.story.combat.cap);
  for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);
  g.enemies=g.enemies.filter(e=>e.hp>0);
  if(!g.story.combat)return;
}assert.equal(g.story.combat?.cleared,true);}
// 从剧情入口到结尾，所有阶段通过公开意图和真实计时前进。
function finish(g,route='road'){
  Object.assign(g.player,STORY_SITES.SIGN);tick(g);clearWave(g);interact(g,'SIGN');
  assert.equal(g.story.stageId,'Q30');assert.equal(g.story.phase,'active');assert.equal(g.story.routeId,'road');assert.equal(g.chooseStoryRoute('short'),false);
  for(const site of route==='road'?['ROAD1','ROAD2']:['SHORT1']){
    Object.assign(g.player,STORY_SITES[site]);tick(g);clearWave(g);
  }
  Object.assign(g.player,STORY_SITES.MINT);tick(g);assert.equal(g.story.stageId,'Q40');interact(g,'MINT');
  g.startStoryStage();assert.equal(g.story.stageId,'TO_RELAY');Object.assign(g.player,STORY_SITES.RELAY);tick(g);assert.equal(g.story.stageId,'Q50');g.startStoryStage();
  for(let i=0;i<3;i++){clearWave(g);tick(g,82);}
  assert.equal(g.story.stageId,'TO_BOSS');Object.assign(g.player,STORY_SITES.BOSS);tick(g);assert.equal(g.story.stageId,'Q60');g.advanceStoryDialogue(true);g.startStoryStage();
  g.hit(g.boss,g.boss.maxHp*.5+1);tick(g);assert.equal(g.story.support.triggered,true);
  for(let i=0;i<200;i++){for(const e of g.enemies)if(e.hp>0)g.hit(e,1e6);g.enemies=g.enemies.filter(e=>e.hp>0);tick(g);}
  assert.equal(g.story.support.spawned,4);g.hit(g.boss,1e6);tick(g);
  assert.equal(g.story.stageId,'Q70');interact(g,'RELAY');assert.equal(g.story.stageId,'Q80');interact(g,'CAMP');
}
test('三套配装沿固定目标闭环、固定成长、奖励一次且原森林对象完整恢复',()=>{
  for(const spec of STORY_LOADOUTS)for(const route of ['road']){
    const g=chapter(spec.id),forest=g.storyForest,initial=structuredClone(g.progress);finish(g,route);
    assert.equal(g.kills,0);assert.equal(g.progress.coins,initial.coins);assert.equal(g.maxHp(),120);
    assert.equal(g.loadout.weapon,spec.weapon);assert.equal(g.vehicle.maxHp,spec.hull);
    assert.equal(g.claimStory(),true);assert.equal(g.story,null);assert.equal(g.player,forest.player);assert.equal(g.trees,forest.trees);
    assert.equal(g.progress.coins,initial.coins+600);assert.equal(g.progress.wood,initial.wood+240);
    assert.equal(g.progress.materials.parts,initial.materials.parts+6);
    assert.equal(g.progress.materials.crystal,initial.materials.crystal);
    assert.equal(g.progress.materials.core,initial.materials.core);assert.equal(g.claimStory(),false);
    assert.equal(g.enterStory(),true);g.advanceStoryDialogue(true);g.chooseStoryLoadout(spec.id);g.startStoryStage();finish(g,route);g.claimStory();
    assert.equal(g.progress.coins,initial.coins+600);assert.deepEqual(g.progress.story.chapters[STORY_ID].completedRoutes,[route]);
  }
});
test('站点失败优先、检查点恢复、保存失败可重试且刷新不重复发奖',()=>{
  const g=chapter();finish(g);const wallet=g.progress.coins;
  g.storyPersist=()=>false;assert.equal(g.claimStory(),false);assert.equal(g.progress.coins,wallet);assert.ok(g.story);
  g.syncStory();const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.equal(restored.story.phase,'prepare');assert.equal(restored.story.stageId,'Q80');
  let saved;restored.storyPersist=p=>{saved=structuredClone(p);return true;};assert.equal(restored.claimStory(),true);
  const after=new Game(saved);assert.equal(after.story,undefined);assert.equal(after.progress.coins,wallet+600);
});
test('刷新未交谈的薄荷阶段不会跳过剧情，已提交路线不能切换',()=>{
  const g=chapter();Object.assign(g.story,{stageId:'Q40',phase:'active',routeId:'short'});g.syncStory();
  const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.equal(restored.story.phase,'active');assert.equal(restored.state,'paused');assert.equal(restored.startStoryStage(),false);
  assert.equal(restored.chooseStoryRoute('road'),false);
});
test('旧档迁移和未知版本明确拒绝恢复；入口与永久事务不能越权',()=>{
  assert.equal(validateStory(null).run,null);assert.equal(validateStory({run:{chapterId:STORY_ID,definitionVersion:999}}).invalidRun,true);
  assert.deepEqual(validateStory({chapters:{[STORY_ID]:{completedRoutes:{filter:3}}}}).chapters[STORY_ID].completedRoutes,[]);
  const g=chapter();assert.deepEqual(validateStorySites(g.trees,blocked),[]);
  assert.equal(g.transact('weapons',0,'upgrade'),false);assert.equal(g.switchMap('jiuzhaigou'),false);assert.equal(g.enterStory(),false);
  assert.equal(g.claimStory(),false);assert.equal(g.startStoryStage(),false);assert.equal(g.chooseStoryLoadout('frost-guard'),false);
  const old=g.storyForest;g.leaveStory();assert.equal(g.player,old.player);assert.equal(g.state,'paused');
});
test('刷新领主登场对白仍可阅读，不会直接丢到开战页',()=>{
  const g=chapter();Object.assign(g.story,{stageId:'Q60',phase:'dialogue',dialogue:'boss'});g.syncStory();
  const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5);
  assert.equal(restored.story.dialogue,'boss');assert.equal(restored.story.phase,'dialogue');assert.equal(restored.startStoryStage(),false);
  restored.advanceStoryDialogue(true);assert.equal(restored.startStoryStage(),true);
});
test('守点伤害和重试恢复站点，但不抹去已完成的寻找路线',()=>{
  const g=chapter();Object.assign(g.story,{stageId:'Q50',phase:'prepare',routeId:'short'});g.startStoryStage();
  g.hurtStoryTarget(300);assert.equal(g.story.phase,'failed');assert.equal(g.story.metrics.deaths,1);
  assert.equal(g.retryStory(),true);assert.equal(g.story.stageId,'Q50');assert.equal(g.story.routeId,'short');
  assert.equal(g.story.relay.hp,300);assert.equal(g.story.phase,'prepare');g.startStoryStage();assert.equal(g.story.combat.spawned,0);
});
test('高成长账号借用配置与新号相同；试射结束不保存训练敌人或弹药',()=>{
  const p=freshProgress();p.heroes[0]=30;p.weapons[1]=30;p.coins=100000;
  const g=chapter('line-patrol',p),fresh=chapter();assert.equal(g.damage(),fresh.damage());assert.equal(g.maxHp(),120);
  g.leaveStory();g.progress.story.run=null;g.enterStory();g.advanceStoryDialogue(true);g.chooseStoryLoadout('tide-arc');
  assert.equal(g.startStoryTrial('approach'),true);assert.equal(g.enemies.length,6);g.syncStory();assert.equal(g.progress.story.run.trial,undefined);
  tick(g,1201);assert.equal(g.story.phase,'prepare');assert.equal(g.enemies.length,0);assert.equal(g.progress.coins,100000);
});
test('角色死亡与最后击杀不能覆盖站点失败，交互读条受伤或离开会取消',()=>{
  const g=chapter();Object.assign(g.story,{stageId:'Q50',phase:'prepare'});g.startStoryStage();
  const e=g.spawnEnemy(0,0,{x:480,y:1400},{bossOwner:'fixture'});g.hurtStoryTarget(300);g.hit(e,1e6);tick(g);
  assert.equal(g.story.phase,'failed');assert.equal(g.story.stageId,'Q50');g.retryStory();g.startStoryStage();
  g.hurt(1e6);g.player.invincible=0;g.hurt(1e6);assert.equal(g.story.phase,'failed');assert.equal(g.state,'story');
  const h=chapter();h.story.combat={cleared:true};Object.assign(h.player,STORY_SITES.SIGN);h.interactStory();
  h.player.x+=100;tick(h);assert.equal(h.story.interacting,0);assert.equal(h.story.dialogue,null);
  Object.assign(h.player,STORY_SITES.SIGN);h.interactStory();h.vehicle.hp-=1;tick(h);assert.equal(h.story.interacting,0);
});
