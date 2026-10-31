// 遍历当前步骤的实际目的地，排除随身操作和完成步骤残留的假路点。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_TASKS,MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {equipmentRequirements} from '../src/progression/equipment-goals.js';
import {mainlineObjective,mainlineAction,mainlineOperation,canTalkMainline} from '../src/core/mainline-manager.js';
import {requestMainlineNavigation,worldNavigationObjective,requestWorldNavigation} from '../src/core/world-navigation.js';
import {storyRouteState} from '../src/core/story-route.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {worldDistance} from '../src/world/coordinates.js';
// 本组检查修好设施后的业务路线；修复前的采集与门前路线由 town-restoration 专项覆盖。
function preparedProgress(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;return p;}
// 只满足前置步骤，保留本次待执行动作。
function satisfy(g,c){
 if(c.all)return c.all.forEach(v=>satisfy(g,v));if(c.any)return satisfy(g,c.any[0]);
 if(c.path){const keys=c.path.split('.'),last=keys.pop();let v=g;for(const key of keys)v=v[key]??={};v[last]='equals'in c?c.equals:c.min;}
 else if('nativeLevel'in c)g.progress.vehicleWeapons[nativeVehicleWeapon(c.nativeLevel).weaponIndex]=c.min;
 else if(c.controllerReady){g.progress.weapon=12;g.progress.weapons[12]=1;g.progress.mainline.seen.config=1;}
 else if(c.controllerLevel)g.progress.weapons[12]=c.controllerLevel;
 else if(c.tier)g.progress.bosses=999;
}
test('全部主线每个未完成步骤点击后指向表中操作入口，随身步骤不铺路',()=>{
 for(const [index,t] of MAINLINE_TASKS.entries())for(let i=0;i<t.guide.steps.length;i++){
  const p=preparedProgress();p.mainline.completed=MAINLINE_IDS.slice(0,index);p.mainline.phase='doing';p.mainline.currentId=t.id;
  const g=new Game(p,()=>.5);g.start();Object.assign(g.player,MAINLINE_SITES.camp);
  for(let j=0;j<i;j++)satisfy(g,(t.goal.all||[t.goal])[j]);
  // 入口可达性只验证可执行购买；资源不足的拒绝路径由购买导航专项覆盖。
  const op=mainlineOperation(g);if(op?.type==='buy')for(const row of equipmentRequirements(g.progress,op.kind,op.index)){
   if(['coins','wood'].includes(row.key))g.progress[row.key]=row.need;else g.progress.materials[row.key]=row.need;
  }
  const step=t.guide.steps[i],o=mainlineObjective(g);assert.ok(o,t.id);
  requestMainlineNavigation(g);const nav=worldNavigationObjective(g);
  // 正式画面使用插值快照，必须与任务卡选择完全相同的操作步骤。
  const rendered=createRenderInterpolation().sample(g,.5);
  assert.deepEqual(worldNavigationObjective(rendered),nav,t.id+':'+i+' 画面与任务栏不同步');
  assert.deepEqual(storyGuidanceState(rendered).target,nav?.site||null,t.id+':'+i+' 终点不同步');
  if(step.navigation===false){assert.equal(nav,null,t.id+':'+i);continue;}
  assert.ok(nav,t.id+':'+i);
  if(o.clearingStage){assert.equal(nav.key,'clearing-post');continue;}
  assert.deepEqual(nav.site,MAINLINE_SITES[step.navigation],t.id+':'+i);
  const frames=createRenderInterpolation();let route;for(let n=0;n<400;n++){g.time+=.025;route=storyRouteState(frames.sample(g,.5));if(route?.reachable)break;}
  assert.ok(route?.reachable,t.id+':'+step.navigation+' 无可达路线');
  assert.equal(route.site,nav.key);if(route.points.length)assert.ok(worldDistance(route.points.at(-1),nav.site)<=85,t.id+' 路线未抵达终点');
 }
});
test('长线整备按当前内容表切换工坊，默认切到下一步路线，交付回原 NPC',()=>{
 const task=MAINLINE_TASKS.find(t=>t.id==='long-patrol'),p=preparedProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(task.id));p.mainline.phase='doing';const g=new Game(p);g.start();
 // 长线目标由内容表维护，按当前真实条件推进，避免旧版等级与步骤顺序失配。
 for(const [i,step] of task.guide.steps.entries()){
  requestMainlineNavigation(g);const nav=worldNavigationObjective(g);
  if(step.navigation===false)assert.equal(nav,null);else assert.equal(nav.key,step.navigation);
  satisfy(g,task.goal.all[i]);const next=mainlineObjective(g),nextNav=worldNavigationObjective(g);
  if(next?.navigation===false)assert.equal(nextNav,null);else assert.deepEqual(nextNav?.site,next?.site);
 }
 g.progress.mainline.phase='report';assert.equal(worldNavigationObjective(g).key,'camp');
});
test('角色升级与已选战车驾驶是随身操作，不要求返回工坊',()=>{
 const p=preparedProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('pistol-upgrade'));p.mainline.phase='doing';p.weapons[0]=3;const g=new Game(p);g.start();
 assert.equal(mainlineAction(g).id,'heroes-button');assert.equal(mainlineObjective(g).navigation,false);
 g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-vehicle'));g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;
 assert.equal(mainlineObjective(g).navigation,false);assert.equal(mainlineAction(g),null);
});
test('远处盾牌的临时路线保留守门入口，不误转邻里',()=>{
 const g=new Game(freshProgress());g.start();Object.assign(g.player,MAINLINE_SITES.camp);
 const action={type:'camp-defense',gate:'left'};requestWorldNavigation(g,MAINLINE_SITES.westGate,'前往西门守门',{action});
 assert.deepEqual(worldNavigationObjective(g).action,action);assert.equal(worldNavigationObjective(g).site.id,'left');
});

// 独立对照真实球场设施，防止任务表与导航表同时误指向另一座建筑。
test('球赛接取、比赛与交付均指向林间球场站，守护任务保留祭坛',()=>{
 const p=preparedProgress(),field=TOWN_RESTORATIONS.find(f=>f.id==='football');
 p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('football-day'));p.mainline.currentId='football-day';
 const g=new Game(p,()=>.5);g.start();g.enemies=[];
 for(const phase of ['meet','doing','report']){
  g.progress.mainline.phase=phase;requestMainlineNavigation(g);
  const nav=worldNavigationObjective(g);assert.equal(nav.key,'footballEntry');
  assert.equal(nav.site.mapId,field.site.mapId);assert.equal(nav.site.x,field.site.x);assert.equal(nav.site.y,field.site.y);
  assert.deepEqual(storyGuidanceState(createRenderInterpolation().sample(g,.5)).target,nav.site);
  Object.assign(g.player,field.site);assert.equal(canTalkMainline(g),true);
  Object.assign(g.player,MAINLINE_SITES.guardianEntry);assert.equal(canTalkMainline(g),false);
 }
 g.progress.mainline.phase='doing';assert.equal(mainlineAction(g).mode,'football');
 const frames=createRenderInterpolation();let route;
 for(let n=0;n<400;n++){g.time+=.025;route=storyRouteState(frames.sample(g,.5));if(route?.reachable)break;}
 assert.ok(route?.reachable,'祭坛到球场站应可达');assert.ok(worldDistance(route.points.at(-1),field.site)<=85);
 g.progress.mainline.currentId='guardian';g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('guardian'));
 assert.equal(worldNavigationObjective(g).key,'guardianEntry');
});
