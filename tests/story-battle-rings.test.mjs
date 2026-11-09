// 战斗圈、自然清场与机械猫河岸回归，保留真实伤害、碰撞和移动。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {validateStoryDefinition} from '../src/core/story/story-schema.js';
import {failStory,enterStory} from '../src/core/story/story-manager.js';
import {beginStoryWave,spawnStoryEnemy,updateStoryWave} from '../src/core/story/story-encounters.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {moveBody,applyImpulse,stepBodies,blocked} from '../src/physics/motion.js';
import {terrainBlocked,terrainLineClear,naturalWaypoint} from '../src/physics/terrain-navigation.js';
import {walkNode,groundDestination} from '../src/combat/summons/ground-motion.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story/story-posts.js';
// 设置指定阶段用于独立边界回归；整章自然战斗另由浏览器实际输入完成。
function setup(id='sunleaf-06',stage='DEFEND'){
 const p=freshProgress();for(const required of STORY_CAMPAIGN[id].requires||[])p.story.chapters[required].completed=true;
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,storyPostApproach(storyPostForChapter(g,id)));assert.ok(enterStory(g,null,id));g.advanceStoryDialogue(true);g.chooseStoryLoadout(STORY_CAMPAIGN[id].loadouts[0].id);g.startStoryStage();
 g.story.stageId=stage;g.story.phase='active';return g;
}

test('所有故事继承扩大50%的普通圈与剧情领主圈，沿用任务生命预算并保留敌人伤害',()=>{
 for(const def of Object.values(STORY_CAMPAIGN)){
  assert.equal(def.encounters.arena.radius,220*1.5,def.id);
  assert.equal(def.encounters.enemies.normal.hp,48);assert.equal(def.encounters.enemies.normal.damage,10);
  for(const boss of Object.values(def.encounters.bosses))assert.equal(boss.arena.radius,280*1.5,def.id);
 }
});

test('战斗圈与绘制共用对象，玩家、空中载具、怪物与连锁击退均不能越界',()=>{
 const g=setup(),center=STORY_CAMPAIGN['sunleaf-06'].world.sites.STATION;Object.assign(g.player,center);beginStoryWave(g,'STATION',8,5);
 const a=g.player.arena;assert.equal(storyGuidanceState(g).arena,a);assert.ok(spawnStoryEnemy(g,center,0));const e=g.enemies[0];assert.equal(e.arena,a);
 for(const flying of [false,true]){Object.assign(g.player,{...center,flying});moveBody(g.player,2000,0,WORLD,12,g.trees);assert.ok(worldDistance(g.player,a)<=a.radius-12+.01);}
 for(let i=0;i<600;i++){applyImpulse(e,{x:-1,y:.2},1150,760);stepBodies([e],1/60,WORLD,()=>{},g.trees);assert.ok(worldDistance(e,a)<=a.radius-12+.01);}
 assert.ok(terrainLineClear(center,e,0));
});

test('所有新增主线战斗站点都能在同岸圈内刷满同屏名额，不生成跨河隔墙目标',()=>{
 for(const def of Object.values(STORY_CAMPAIGN))for(const [stage,node] of Object.entries(def.nodes)){
  if(!['wave','defense'].includes(node.task.type))continue;
  const g=setup(def.id,stage),site=node.task.site,center=def.world.sites[site];Object.assign(g.player,{x:center.x,y:center.y+80});
  beginStoryWave(g,site,10,6);for(let i=0;i<6;i++)assert.ok(spawnStoryEnemy(g,center,i),def.id+'/'+stage+'/'+i);
  for(const e of g.enemies){assert.ok(worldDistance(e,center)<g.player.arena.radius);assert.ok(terrainLineClear(e,center,18));}
 }
});

test('单场清场解除边界，连续守点保留同一边界，暂离与重试不残留旧圈',()=>{
 const g=setup('sunleaf-03','STOP1'),c=STORY_CAMPAIGN['sunleaf-03'].world.sites.FIRST;Object.assign(g.player,c);beginStoryWave(g,'FIRST',6,4);
 g.story.combat.spawned=6;assert.ok(updateStoryWave(g,.1));assert.equal(g.player.arena,undefined);
 const f=setup();Object.assign(f.player,STORY_CAMPAIGN['sunleaf-06'].world.sites.STATION);beginStoryWave(f,'STATION',8,5);const a=f.player.arena;
 f.story.combat.spawned=8;assert.ok(updateStoryWave(f,.1));assert.equal(f.player.arena,a);beginStoryWave(f,'STATION',10,6);assert.equal(f.player.arena,a);
 failStory(f,'测试失败');f.retryStory();assert.equal(f.player.arena,undefined);f.leaveStory();assert.equal(f.player.arena,undefined);
});

test('机械伙伴实际从桥头跨岸，路径与每一步都不穿水，归队点限制在战斗圈干地',()=>{
 const g={player:{x:1450,y:1000},vehicle:{active:false},trees:[]};const node={x:1100,y:1000,index:0,radius:9,walkPhase:0};
 for(let i=0;i<3600&&worldDistance(node,g.player)>12;i++){walkNode(g,node,g.player,200,1/60);assert.ok(!terrainBlocked(node.x,node.y,9));}
 assert.ok(worldDistance(node,g.player)<12,JSON.stringify(node));
 node.arena={x:1450,y:1100,radius:220,terrain:'forest'};const goal=groundDestination(g,node,{x:1200,y:1100});assert.ok(!blocked(goal.x,goal.y,9,[],node));
});

test('九单位脚底可站立的河岸不会被十二单位寻路误判成永远无路',()=>{
 let start;for(let x=1200;x<1400;x+=.5)if(!terrainBlocked(x,1100,9)&&terrainBlocked(x,1100,12)){start={x,y:1100};break;}
 assert.ok(start);const node={...start,index:0,radius:9,walkPhase:0},g={player:{x:1450,y:1100},vehicle:{active:false},trees:[]};
 for(let i=0;i<120;i++)walkNode(g,node,g.player,120,1/60);
 assert.ok(worldDistance(node,start)>50);assert.ok(!terrainBlocked(node.x,node.y,9));
});


// 控制输入追击威胁站点的敌人；不调用hit、不改生命或刷新弹药，用正式战斗检验新圈内节奏。
test('第一章三套搭配与第六章机械核心以正式伤害完成圈内守点',()=>{
 for(const [id,loadout] of [['sunleaf-01','line-patrol'],['sunleaf-01','tide-arc'],['sunleaf-01','frost-guard'],['sunleaf-06','little-team']]){
  const g=setup(id,id==='sunleaf-01'?'Q50':'DEFEND');g.story.phase='prepare';g.chooseStoryLoadout(loadout);g.startStoryStage();let strikes=0;
  assert.equal(STORY_CAMPAIGN[id].nodes[g.story.stageId].encounter.interval,2);
  for(let i=0;i<10000&&g.story.phase==='active'&&g.story.stageId===(id==='sunleaf-01'?'Q50':'DEFEND');i++){
   const e=g.enemies.filter(e=>e.hp>0).sort((a,b)=>worldDistance(a,g.story.relay)-worldDistance(b,g.story.relay))[0];let goal=g.story.relay;
   if(e){const dx=g.player.x-e.x,dy=g.player.y-e.y,d=Math.hypot(dx,dy)||1;goal={x:e.x+dx/d*75,y:e.y+dy/d*75};}
   const p=naturalWaypoint(g.player,goal),dx=p.x-g.player.x,dy=p.y-g.player.y,d=Math.hypot(dx,dy);
   g.update(.025,{x:d>8?dx/d:0,y:d>8?dy/d:0});if(g.mechanical.nodes.some(n=>n.mode==='strike'))strikes++;
  }
  assert.equal(g.story.phase,id==='sunleaf-01'?'active':'dialogue',id+'/'+loadout+' '+g.story.error);if(id==='sunleaf-01')assert.equal(g.story.stageId,'TO_BOSS');assert.ok(g.player.hp>0);assert.ok(g.story.relay.hp>0);
  assert.equal(g.player.arena,undefined);if(loadout==='little-team')assert.ok(strikes>0,'重装爪必须实际挥击并走正式伤害入口');
 }
});

// 可配置的圈与节奏必须在开始游戏前被校验，不能用坏表生成空气墙。
test('默认与节点覆盖战斗圈、守点间隔拒绝无效配置',()=>{
 for(const patch of [d=>d.encounters.arena.radius=0,d=>d.nodes.DEFEND.encounter.arena={radius:100},d=>d.nodes.DEFEND.encounter.interval=0]){
  const def=structuredClone(STORY_CAMPAIGN['sunleaf-06']);patch(def);assert.throws(()=>validateStoryDefinition(def),/战斗圈|间隔/);
 }
});
