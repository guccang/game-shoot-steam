// 导航一致性审计：主线外的临时访问、邻里、修复与章节均覆盖真实表现快照。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {MAINLINE_IDS,MAINLINE_SITES,MAINLINE_TASKS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {LIVING_REQUESTS} from '../src/config/living-world.js';
import {STORY_CAMPAIGN} from '../src/config/story-campaign.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {worldNavigationObjective,requestWorldNavigation,requestMainlineNavigation} from '../src/core/navigation/world-navigation.js';
import {setTaskNavigationEnabled} from '../src/core/navigation/task-navigation.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {storyRouteState} from '../src/core/navigation/story-route.js';
import {livingRouteStates} from '../src/core/navigation/living-route.js';
import {livingRequestTarget,updateLivingWorld} from '../src/core/camp/living-world.js';
import {GAMEPLAY_VALUES} from '../src/config/gameplay-values.js';

// 以已完成入职、尚未完成登塔的存档为基线，不跳过任务选择逻辑。
function world(){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('tower'));p.mainline.phase='doing';p.weapons[0]=10;
 const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.vehicle.active=false;Object.assign(g.player,{x:1400,y:850});return g;
}
// 对比真实业务目标、地面终点和路线身份；路线起点允许使用平滑后的角色坐标。
function aligned(g,view){
 const nav=worldNavigationObjective(g);assert.deepEqual(worldNavigationObjective(view),nav);
 assert.deepEqual(storyGuidanceState(view).target,nav?.site?.mapId===g.mapId?nav.site:null);
 const route=storyRouteState(view);assert.equal(route?.site,nav?.site.mapId===g.mapId?nav.key:undefined);return nav;
}

test('临时访问共享业务身份，目标替换、开关与返回主线不残留旧终点',()=>{
 const g=world(),frames=createRenderInterpolation();
 for(const key of ['weaponsEntry','garageEntry','storyPost','westGate','towerEntry','seedShop','northParking']){
  requestWorldNavigation(g,MAINLINE_SITES[key],'前往'+key,{direct:true});
  const view=frames.sample(g,.5);assert.equal(aligned(g,view).key,'visit');assert.deepEqual(storyGuidanceState(view).target,MAINLINE_SITES[key]);
  setTaskNavigationEnabled(g,false);assert.equal(aligned(g,frames.sample(g,.5)),null);
  setTaskNavigationEnabled(g,true);assert.equal(aligned(g,frames.sample(g,.5)).key,'visit');
 }
 requestMainlineNavigation(g);assert.equal(aligned(g,frames.sample(g,.5)).key,'towerEntry');
 requestWorldNavigation(g,MAINLINE_SITES.seedShop,'种子小屋',{direct:true});
 const restored=new Game(JSON.parse(JSON.stringify(g.progress)));restored.start();restored.mainlineSpeech=null;
 assert.equal(worldNavigationObjective(frames.sample(restored,.5)).key,'towerEntry','读档不继承旧会话临时意图');
});

test('抵达只按真实位置判定，插值与跨地图同坐标不能提前删除意图',()=>{
 const g=world(),frames=createRenderInterpolation(),site=MAINLINE_SITES.weaponsEntry,radius=GAMEPLAY_VALUES.mainline.visitRadius;
 Object.assign(g.player,{x:site.x+radius-1,y:site.y});frames.beforeStep(g);g.player.x=site.x+radius+1;
 requestWorldNavigation(g,site,'工坊',{direct:true});assert.equal(aligned(g,frames.sample(g,0)).key,'visit');
 g.player.x=site.x+radius-1;assert.equal(aligned(g,frames.sample(g,1)).key,'towerEntry');
 const other={x:g.player.x,y:g.player.y,mapId:'jiuzhaigou'};requestWorldNavigation(g,other,'另一地图',{direct:true});
 assert.equal(aligned(g,frames.sample(g,1)).key,'visit');
 g.mapId='jiuzhaigou';assert.equal(worldNavigationObjective(frames.sample(g,1)),null);
 g.mapId='forest';assert.equal(worldNavigationObjective(g).key,'visit','跨地图暂停导航时保留意图');
});

test('所有邻里委托阶段与移动居民使用当前追踪的同一目标，关闭无残留',()=>{
 const g=world(),frames=createRenderInterpolation();updateLivingWorld(g,.05);
 for(const spec of LIVING_REQUESTS)for(let stage=0;stage<spec.steps.length;stage++){
  g.progress.living.requests[spec.id]={...g.progress.living.requests[spec.id],stage,completed:false};g.progress.taskTracking={kind:'living',id:spec.id};
  frames.beforeStep(g);for(const actor of g.livingActors.values())actor.x+=2;
  const view=frames.sample(g,.25),target=livingRequestTarget(g,spec),routes=livingRouteStates(view);
  assert.equal(worldNavigationObjective(view),null);assert.equal(storyGuidanceState(view).target,null);
  assert.equal(routes.length,1,spec.id+':'+stage);assert.equal(routes[0].id,spec.id);assert.deepEqual(routes[0].target,target);
  setTaskNavigationEnabled(g,false);assert.deepEqual(livingRouteStates(view),[]);setTaskNavigationEnabled(g,true);
 }
 g.progress.taskTracking={kind:'mainline'};assert.deepEqual(livingRouteStates(frames.sample(g,1)),[]);
 assert.equal(aligned(g,frames.sample(g,1)).key,'towerEntry');
});

test('修复前置压过邻里路线，显式访问再接管，施工与关闭寻路清除终点',()=>{
 const g=world(),frames=createRenderInterpolation(),spec=LIVING_REQUESTS[0];
 g.progress.taskTracking={kind:'living',id:spec.id};g.progress.living.requests[spec.id].stage=0;
 g.progress.restoration.repaired=g.progress.restoration.repaired.filter(id=>id!=='tower');g.progress.wood=1000;
 const view=frames.sample(g,.5);assert.equal(aligned(g,view).restoration,'tower');assert.deepEqual(livingRouteStates(view),[]);
 requestWorldNavigation(g,MAINLINE_SITES.seedShop,'种子小屋',{direct:true});assert.equal(aligned(g,view).key,'visit');assert.deepEqual(livingRouteStates(view),[]);
 requestMainlineNavigation(g);setTaskNavigationEnabled(g,false);assert.equal(aligned(g,view),null);assert.deepEqual(livingRouteStates(view),[]);
 setTaskNavigationEnabled(g,true);g.progress.restoration.build={id:'tower',elapsed:0,x:1000,y:1300};assert.equal(aligned(g,view),null);assert.deepEqual(livingRouteStates(view),[]);
});

test('全部设施的缺料和到场修复阶段读取同一个树木或修复区域',()=>{
 const g=world(),frames=createRenderInterpolation();
 for(const facility of TOWN_RESTORATIONS){
  g.progress.mainline.completed=MAINLINE_IDS.slice(0,facility.order);g.progress.restoration.repaired=TOWN_RESTORATIONS.filter(f=>f.id!==facility.id).map(f=>f.id);
  for(const wood of [0,1000]){
   g.progress.wood=wood;frames.beforeStep(g);g.player.x+=2;
   const nav=aligned(g,frames.sample(g,.5));assert.equal(nav.restoration,facility.id);assert.equal(!!nav.site.repairArea,wood>0);
  }
 }
});

test('全部章节节点及多段行进目标的提示、路线身份和终点一致',()=>{
 const g=world(),frames=createRenderInterpolation();
 for(const def of Object.values(STORY_CAMPAIGN))for(const [stageId,node] of Object.entries(def.nodes)){
  const route=def.routes[node.task.route],count=node.task.type==='route'?route.sites.length:node.task.type==='travel'?node.task.points.length:1;
  for(let index=0;index<count;index++){
   g.story={chapterId:def.id,stageId,phase:'active',runId:def.id,group:index,waypoint:index,flags:{},readLines:[]};g.mapId=def.cleanup.scene.mapId;
   const expected=g.storyObjective(),view=frames.sample(g,.5),target=storyGuidanceState(view).target;
   assert.equal(view.storyObjective().site,expected.site);assert.equal(storyRouteState(view).site,expected.site);
   assert.equal(target.site,expected.site);assert.equal(target.x,def.world.sites[expected.site].x);assert.equal(target.y,def.world.sites[expected.site].y);
  }
 }
});

test('全部主线接取与交付阶段、读档以及暂停均不沿用执行步骤终点',()=>{
 const g=world(),frames=createRenderInterpolation();
 for(const [index,task] of MAINLINE_TASKS.entries())for(const phase of ['meet','report']){
  g.progress.mainline.completed=MAINLINE_IDS.slice(0,index);g.progress.mainline.phase=phase;
  const nav=aligned(g,frames.sample(g,.5));assert.equal(nav.key,task.site);assert.deepEqual(nav.site,MAINLINE_SITES[task.site]);
 }
 g.state='paused';assert.equal(storyRouteState(frames.sample(g,.5)),null);
});

test('章节对白、完成与寻路关闭不留下执行阶段路线和终点',()=>{
 const g=world(),frames=createRenderInterpolation(),def=Object.values(STORY_CAMPAIGN)[0],stageId=Object.keys(def.nodes)[0];
 g.story={chapterId:def.id,stageId,phase:'active',runId:'audit',group:0,waypoint:0,flags:{},readLines:[]};g.mapId=def.cleanup.scene.mapId;
 assert.ok(storyGuidanceState(frames.sample(g,1)).target);
 for(const phase of ['dialogue','complete']){
  g.story.phase=phase;const view=frames.sample(g,.5);assert.equal(storyGuidanceState(view).target,null);assert.equal(storyRouteState(view),null);
 }
 g.story.phase='active';setTaskNavigationEnabled(g,false);const view=frames.sample(g,1);assert.equal(storyGuidanceState(view).target,null);assert.equal(storyRouteState(view),null);
});
