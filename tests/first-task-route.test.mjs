// 首篇路程专项：正式绕路、逐段移动、战斗场与旧检查点迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {STORY_CHAPTER as def} from '../src/config/story.js';
import {storyTrees,validateStorySites} from '../src/world/story-sites.js';
import {SpatialGrid} from '../src/world/spatial-grid.js';
import {planQuestRoute,questLineClear} from '../src/physics/quest-route.js';
import {blocked,moveBody} from '../src/physics/motion.js';
import {validateStory} from '../src/progression/story-progress.js';
import {enterStory} from '../src/core/story-manager.js';
import {beginStoryWave,spawnStoryEnemy,spawnStoryBoss} from '../src/core/story-encounters.js';

const journeys=[['CAMP','SIGN','ROAD1','ROAD2','MINT','RELAY','BOSS','RELAY','CAMP'],['SIGN','SHORT1','MINT']];
// 距离累计正式寻路折线，包含山湖与树干造成的绕行。
function length(route){return route.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route.points[i].x,p.y-route.points[i].y),0);}

test('首篇步行及水陆装备每段实际路程均在1000–1500米，且真实移动可走完全程',()=>{
 const g=new Game(freshProgress(),()=>.5),trees=storyTrees(g.trees,def),index=new SpatialGrid(trees);
 assert.deepEqual(validateStorySites(trees,blocked,def),[]);
 for(const amphibious of [false,true]){
  const distances=new Map();
  for(const keys of journeys)for(let i=1;i<keys.length;i++){
   const from=keys[i-1],to=keys[i],body={...def.world.sites[from],mapId:'forest',amphibious};
   const route=planQuestRoute(body,def.world.sites[to],index,16000),distance=length(route);
   assert.ok(route.reachable,from+'→'+to);assert.ok(distance>=1000&&distance<=1500,`${from}→${to}: ${distance}`);distances.set(from+'-'+to,distance);
   for(const point of route.points.slice(1)){
    assert.ok(questLineClear(body,point,body,index));moveBody(body,point.x-body.x,point.y-body.y,null,12,index);
    assert.ok(Math.hypot(body.x-point.x,body.y-point.y)<.001,'正式碰撞阻断路线');
   }
  }
  assert.ok(distances.get('SIGN-SHORT1')+distances.get('SHORT1-MINT')<distances.get('SIGN-ROAD1')+distances.get('ROAD1-ROAD2')+distances.get('ROAD2-MINT'));
 }
});

// 存档夹具只指定阶段起点，不伪造完成或领取奖励。
function saved(stageId,loadoutId='line-patrol',extra={}){return {chapterId:def.id,definitionVersion:def.version,stageId,phase:'active',loadoutId,checkpoint:{x:2600,y:2595,hp:73,magazines:[{ammo:3,remaining:.4}]},...extra};}

test('旧路线后半程迁移到对应新起点，阶段与供给保留且重复校验不漂移',()=>{
 for(const [stageId,key]of Object.entries(def.world.checkpointSites)){
  const raw={run:saved(stageId)},before=structuredClone(raw),result=validateStory(raw);
  assert.deepEqual(raw,before);assert.equal(result.run.stageId,stageId);assert.equal(result.run.checkpoint.hp,73);
  assert.deepEqual(result.run.checkpoint.magazines,[{ammo:3,remaining:.4}]);
  assert.equal(result.run.checkpoint.x,def.world.sites[key].x);assert.equal(result.run.checkpoint.y,def.world.sites[key].y);
  assert.deepEqual(validateStory(result),result);
 }
 const early=validateStory({run:saved('Q30')});assert.equal(early.run.checkpoint.x,2600);
 const current=validateStory({run:saved('Q50','line-patrol',{routeVersion:1})});assert.equal(current.run.checkpoint.y,2595);
});

test('三套借用装备在搬迁中继站与领主场恢复后可正常生成战斗',()=>{
 for(const loadout of def.loadouts){
  const g=new Game(freshProgress(),()=>.5),r=validateStory({run:saved('Q50',loadout.id)}).run;
  assert.ok(enterStory(g,r));assert.equal(g.player.x,def.world.sites.RELAY.x);assert.equal(g.player.hp,73);
  beginStoryWave(g,'RELAY',10,6);for(let i=0;i<6;i++)assert.ok(spawnStoryEnemy(g,def.world.sites.RELAY,i),loadout.id);
  g.enemies=[];delete g.player.arena;Object.assign(g.player,def.world.sites.BOSS);g.story.stageId='Q60';
  // 正式开战会把玩家放在圈心下方95米；圈心与横纵闪避空间都必须落在干地。
  const center=def.world.sites.BOSS;
  assert.ok(!blocked(center.x,center.y+95,12,g.trees,{mapId:'forest'}));
  for(let d=-170;d<=170;d+=10)for(const [dx,dy]of [[d,0],[0,d]])assert.ok(!blocked(center.x+dx,center.y+dy,48,g.trees,{mapId:'forest'}));
  spawnStoryBoss(g,Object.keys(def.encounters.bosses)[0]);assert.ok(g.boss);assert.ok(!blocked(g.boss.x,g.boss.y,g.boss.radius,g.trees,g.boss));
 }
});
