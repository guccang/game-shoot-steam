// 只覆盖本次地面提示、气泡锚点及直接关联的章节衔接，不运行其他玩法回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_SITES} from '../src/world/story-sites.js';
import {storyGuidanceState,drawStoryGuidance,storySpeechInfo} from '../src/rendering/story-guidance.js';
import {worldNavigationObjective} from '../src/core/world-navigation.js';
import {storyCast} from '../src/rendering/story-props.js';
import {moveBody,blocked} from '../src/physics/motion.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
// 从正式章节入口建立固定随机状态。
function chapter(){const g=new Game(freshProgress(),()=>.5);g.start();g.enterStory();return g;}
test('边界绘制直接使用碰撞圆心与半径，角色被限制在圆环内侧',()=>{
  const g=chapter();g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');
  Object.assign(g.story,{stageId:'Q60',phase:'prepare'});g.startStoryStage();
  assert.equal(storyGuidanceState(g).arena,g.player.arena);
  const a=g.player.arena,arcs=[],ellipses=[];
  const c={save(){},restore(){},translate(){},scale(){},rotate(){},closePath(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},
    arc(...args){arcs.push(args);},ellipse(...args){ellipses.push(args);}};
  drawStoryGuidance(c,g,{x:a.x-400,y:a.y-400,w:800,h:800},true);
  assert.deepEqual(arcs[0].slice(0,3),[a.x,a.y,420]);
  assert.ok(ellipses.some(e=>e[2]===55));
  for(const [dx,dy] of [[500,0],[-500,0],[0,500],[0,-500]]){
    const p={x:a.x,y:a.y,arena:a,flying:true};moveBody(p,dx,dy,null,12,[]);
    assert.ok(Math.abs(Math.hypot(p.x-a.x,p.y-a.y)-408)<.001);
    assert.equal(blocked(a.x+dx,a.y+dy,12,[],p),true);
  }
  g.boss=null;g.enemies=[];g.story.support={triggered:false,spawned:0,timer:0};g.update(.01);
  assert.equal(g.story.stageId,'Q70');assert.equal(storyGuidanceState(g).arena,null);
});
test('目标光圈随主路、近道、广播和回营切换，试射和非章节隐藏',()=>{
  const g=chapter();g.advanceStoryDialogue(true);g.chooseStoryLoadout('line-patrol');g.startStoryStage();
  for(const [stageId,routeId,group,site] of [['Q20',null,0,'SIGN'],['Q30','road',0,'ROAD1'],['Q30','road',1,'ROAD2'],['Q30','short',0,'SHORT1'],['Q70','short',0,'RELAY'],['Q80','short',0,'CAMP']]){
    Object.assign(g.story,{stageId,routeId,group});assert.deepEqual(storyGuidanceState(g).target,{...STORY_SITES[site],site});
  }
  g.story.trial={};assert.equal(storyGuidanceState(g).target,null);g.leaveStory();
  assert.deepEqual(storyGuidanceState(g),{arena:null,target:worldNavigationObjective(g)?.site||null});
});
test('气泡跟随真实发言者，手动逐句和跳过仍走正式解锁与日志条件',()=>{
  // 按当前正式入口先修复设施并到达任务点，旧测试在远处无法进入章节。
  const g=chapter();g.progress.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
  Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));
  assert.equal(g.enterStory(),true);
  const snow=storyCast(g).find(p=>p.kind==='snow');
  let info=storySpeechInfo(g);assert.equal(info.speaker,'雪团');assert.deepEqual(info.anchor,{x:snow.x,y:snow.y});
  assert.equal('duration' in info,false);
  g.advanceStoryDialogue(false);info=storySpeechInfo(g);assert.equal(info.speaker,'栗子');
  assert.deepEqual(info.anchor,{x:g.player.x,y:g.player.y});
  g.advanceStoryDialogue(false);g.advanceStoryDialogue(false);
  assert.equal(storySpeechInfo(g),null);assert.equal(g.story.phase,'prepare');assert.ok(g.story.readLines.includes('intro'));
  Object.assign(g.story,{stageId:'Q40',phase:'dialogue',dialogue:'mint',line:0});Object.assign(g.player,STORY_SITES.MINT);
  const aside=storyCast(g).find(p=>p.kind==='mint');assert.ok(Math.hypot(aside.x-g.player.x,aside.y-g.player.y)>=65);
  assert.deepEqual(storySpeechInfo(g).anchor,{x:aside.x,y:aside.y});
  Object.assign(g.story,{stageId:'Q60',phase:'dialogue',dialogue:'boss',line:0});
  const mint=storyCast(g).find(p=>p.kind==='mint');assert.deepEqual(storySpeechInfo(g).anchor,{x:mint.x,y:mint.y});
  assert.equal(g.startStoryStage(),false);g.advanceStoryDialogue(true);assert.equal(g.story.phase,'prepare');
  g.leaveStory();assert.equal(storySpeechInfo(g),null);
});
