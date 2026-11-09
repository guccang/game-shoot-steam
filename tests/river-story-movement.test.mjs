// 第二章真实河道、维修生命周期与循环地图战斗圈专项回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_POSTS} from '../src/config/story-posts.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {storyNode} from '../src/core/story/story-definition.js';
import {updateStory} from '../src/core/story/story-manager.js';
import {beginStoryWave,spawnStoryEnemy,updateStoryWave} from '../src/core/story/story-encounters.js';
import {storyWorldBarriers} from '../src/core/story/story-world.js';
import {storyObjects,storyCast} from '../src/rendering/story-props.js';
import {riverCrossingObjects} from '../src/rendering/river-crossing.js';
import {RIVER_DELIVERY_SITES as sites} from '../src/config/river-crossing.js';
import {BRIDGE,riverXAt,isWaterBlocked} from '../src/world/river-geometry.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
import {moveBody,blocked} from '../src/physics/motion.js';
import {questLineClear,planQuestRoute} from '../src/physics/quest-route.js';
import {validateStoryDefinition} from '../src/core/story/story-schema.js';
// 只补齐前置章节，当前章仍通过正式接取与装备动作进入。
function enter(){const p=freshProgress();p.story.chapters['sunleaf-01'].completed=true;const g=new Game(p,()=>.5);g.start();const post=STORY_POSTS.find(p=>p.id==='sunleaf-post');Object.assign(g.player,{x:post.x+post.approach.dx,y:post.y+post.approach.dy});assert.ok(g.enterStory('sunleaf-02'));g.advanceStoryDialogue(true);g.chooseStoryLoadout('tide-arc');g.startStoryStage();return g;}
// 交互由公开距离校验和计时触发，跳对白仍执行正式动作表。
function interact(g){assert.ok(g.interactStory());updateStory(g,3);assert.ok(g.story.dialogue);g.advanceStoryDialogue(true);}

test('故事战斗在正负循环镜像内均能移动，击退与寻路仍受可见圆圈限制',()=>{
 for(const [dx,dy] of [[0,0],[WORLD.width,-WORLD.height],[-WORLD.width,WORLD.height]]){
  const g=enter();g.story.stageId='SHORE';Object.assign(g.player,{x:sites.FAR.x+dx,y:sites.FAR.y+dy});beginStoryWave(g,'FAR',8,4);
  assert.ok(spawnStoryEnemy(g,sites.FAR,0));const before={...g.player};for(let i=0;i<30;i++)g.update(.02,{x:1,y:0});
  assert.ok(g.story.combat&&!g.story.combat.cleared);assert.ok(g.enemies.length);assert.ok(worldDistance(before,g.player)>35,'活怪存在时仍能主动移动');
  assert.ok(Math.abs(g.player.x-before.x)<200&&Math.abs(g.player.y-before.y)<200,'不能瞬移回原地图坐标');
  assert.ok(planQuestRoute(g.player,{x:before.x,y:before.y+60},g.trees).reachable);
  moveBody(g.player,2000,0,null,12,g.trees);assert.ok(worldDistance(g.player,g.player.arena)<=318.001);
  for(const e of g.enemies){moveBody(e,-2000,1000,null,12,g.trees);assert.ok(worldDistance(e,e.arena)<=318.001);}
  g.enemies=[];g.story.combat.spawned=8;assert.ok(updateStoryWave(g,.1));assert.equal(g.player.arena,undefined);
 }
});

test('第二章药箱在西岸，真实水路点在河内，两岸渡口及东岸战斗空地可达',()=>{
 const g=enter(),def=STORY_CAMPAIGN['sunleaf-02'];validateStoryDefinition(JSON.parse(JSON.stringify(def)));
 assert.ok(sites.SUPPLY.x<riverXAt(sites.SUPPLY.y));assert.ok(sites.DOCK.x<riverXAt(sites.DOCK.y));assert.ok(sites.FAR.x>riverXAt(sites.FAR.y)+330);
 for(const id of ['WATER','CHANNEL'])assert.ok(isWaterBlocked(sites[id].x,sites[id].y,12));
 for(const actor of def.nodes.DOCK.actors)assert.equal(isWaterBlocked(sites.DOCK.x+(actor.dx||0),sites.DOCK.y+(actor.dy||0),12),false,'渡口人物必须站在干岸');
 g.story.stageId='DOCK';g.story.dialogue='dock';Object.assign(g.player,{x:sites.DOCK.x,y:sites.DOCK.y-30});for(const actor of storyCast(g))assert.equal(blocked(actor.x,actor.y,16,g.trees,{mapId:'forest'}),false,'对话侧让不能把人物推到水里或护栏上');g.story.dialogue=null;
 assert.equal(def.nodes.ROUTE.task.type,'travel');assert.ok(!def.nodes.ROUTE.routeChoice);
 for(const path of def.world.paths)for(let i=1;i<path.sites.length;i++)assert.ok(planQuestRoute({...sites[path.sites[i-1]],mapId:'forest',worldBarriers:def.world.barriers,amphibious:path.travel==='water'},sites[path.sites[i]],g.trees,16000).reachable);
 g.story.stageId='SHORE';Object.assign(g.player,sites.FAR);beginStoryWave(g,'FAR',8,4);for(let i=0;i<4;i++)assert.ok(spawnStoryEnemy(g,sites.FAR,i));
});

test('封桥同步阻挡步行和气垫船及导航，循环镜像一致，暂离与恢复仍保留维修',()=>{
 const g=enter();assert.equal(storyWorldBarriers(g).length,2);assert.equal(riverCrossingObjects(g).filter(x=>x.type==='river-barrier').length,2);
 const y=BRIDGE.y+BRIDGE.height/2;
 for(const amphibious of [false,true])for(const offset of [0,WORLD.width]){
  const b={x:BRIDGE.x-45+offset,y,mapId:'forest',amphibious,worldBarriers:storyWorldBarriers(g)};
  assert.equal(questLineClear(b,{x:BRIDGE.x+BRIDGE.width+40+offset,y},b,[]),false);
  for(let i=0;i<100;i++)moveBody(b,4,0,null,12,[]);assert.ok(b.x<BRIDGE.x+offset-18);
 }
 g.leaveStory();assert.equal(storyWorldBarriers(g).length,2);assert.equal(g.player.worldBarriers.length,2);
 const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(storyWorldBarriers(restored).length,2);
 assert.equal(riverCrossingObjects({...g,realm:{}}).length,0);
});

test('水面教学拒绝步行跳路点，取药后原药箱消失，交付完成解封且奖励不变',()=>{
 const g=enter(),wallet={coins:g.progress.coins,wood:g.progress.wood};assert.equal(g.story.stageId,'PICKUP');
 assert.ok(storyObjects(g).some(p=>p.kind==='medicine'&&p.x===sites.SUPPLY.x));Object.assign(g.player,sites.SUPPLY);interact(g);
 assert.equal(g.story.stageId,'DOCK');assert.ok(!storyObjects(g).some(p=>p.kind==='medicine'));
 Object.assign(g.player,sites.DOCK);interact(g);Object.assign(g.player,sites.WATER);g.player.amphibious=false;updateStory(g,.1);assert.equal(g.story.stageId,'SAIL');
 g.player.amphibious=true;updateStory(g,.1);assert.equal(g.story.stageId,'ROUTE');
 Object.assign(g.player,sites.LANDING);updateStory(g,.1);assert.equal(g.story.waypoint,0,'不能跳过水上航线直接交药');
 for(const id of ['CHANNEL','LANDING','FAR']){Object.assign(g.player,sites[id]);updateStory(g,.1);}
 assert.equal(g.story.stageId,'SHORE');updateStory(g,.1);
 // 清场夹具仅隔离剧情结算，不改变战斗数值或伪称自然战斗。
 g.story.combat.spawned=8;g.enemies=[];updateStory(g,.1);interact(g);assert.equal(g.story.stageId,'HOME');assert.ok(storyObjects(g).some(p=>p.kind==='medicine'&&p.x===sites.FAR.x));
 for(const id of storyNode(g).task.points){Object.assign(g.player,sites[id]);updateStory(g,.1);}
 assert.equal(g.story.stageId,'END');interact(g);assert.ok(g.claimStory());assert.equal(storyWorldBarriers(g).length,0);assert.deepEqual(g.player.worldBarriers,[]);
 const b={x:BRIDGE.x-40,y:BRIDGE.y+39,mapId:'forest',worldBarriers:[]};for(let i=0;i<80;i++)moveBody(b,4,0,null,12,[]);assert.ok(b.x>BRIDGE.x+BRIDGE.width);
 assert.deepEqual({coins:g.progress.coins,wood:g.progress.wood},wallet);assert.equal(g.progress.story.chapters['sunleaf-02'].completed,true);assert.equal(storyObjects(g).length,0);
});

test('第六章仍保留原来的水陆路线，第二章独立表不会改变其他章节',()=>{
 const d=STORY_CAMPAIGN['sunleaf-06'];validateStoryDefinition(d);assert.equal(d.nodes.ROUTE.task.type,'route');assert.equal(d.nodes.ROUTE.routeChoice,true);
 assert.deepEqual(d.routes.bank.sites,['WEST','EAST']);assert.deepEqual(d.routes.water.sites,['WATER']);assert.equal(d.world.barriers,undefined);assert.equal(d.world.sites.DOCK.x,1650);
});

test('维修设施配置拒绝错误尺寸，步行水界没有被渡口装饰放开',()=>{
 const d=structuredClone(STORY_CAMPAIGN['sunleaf-02']);d.world.barriers[0].width=-1;assert.throws(()=>validateStoryDefinition(d),/维修设施/);
 const p={...sites.WATER,mapId:'forest'};assert.ok(blocked(p.x,p.y,12,[],p));assert.equal(blocked(p.x,p.y,12,[],{...p,amphibious:true}),false);
});
