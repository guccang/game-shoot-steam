// 遍历当前步骤的实际目的地，排除随身操作和完成步骤残留的假路点。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_TASKS,MAINLINE_IDS,MAINLINE_SITES} from '../src/config/mainline.js';
import {selectMainlineTask} from '../src/core/story/mainline-selection.js';
import {beginGardeningLesson} from '../src/progression/story/mainline-gardening.js';
import {equipmentRequirements} from '../src/progression/workshop/equipment-goals.js';
import {mainlineObjective,mainlineAction,mainlineOperation,mainlineTask,mainlineStep,canTalkMainline,updateMainline} from '../src/core/story/mainline-manager.js';
import {requestMainlineNavigation,worldNavigationObjective,requestWorldNavigation} from '../src/core/navigation/world-navigation.js';
import {ensureWildFarms} from '../src/core/farming/wild-farm.js';
import {updateCampRoutines} from '../src/core/camp/camp-routines.js';
import {questLineClear} from '../src/physics/quest-route.js';
import {playerNavigationBody,createPlayerNavigationIndex} from '../src/core/navigation/prepared-navigation.js';
import {storyRouteState} from '../src/core/navigation/story-route.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {createRenderInterpolation} from '../src/rendering/render-interpolation.js';
import {storyGuidanceState} from '../src/rendering/story-guidance.js';
import {worldDistance} from '../src/world/coordinates.js';
// 本组检查修好设施后的业务路线；修复前的采集与门前路线由 town-restoration 专项覆盖。
function preparedProgress(){const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;return p;}
// 使用正式主动选择入口进入自选体验；完成记录只负责解锁章节，不能替代当前任务身份。
function navigationScene(id){
 const p=preparedProgress();p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));
 const g=new Game(p,()=>.5);g.start();g.mainlinePersist=()=>true;g.enemies=[];g.boss=null;
 assert.equal(selectMainlineTask(g,id),true,id+' 应可主动选择');
 assert.equal(mainlineTask(g)?.id,id,'必须测试指定任务而非下一章主线');
 g.progress.mainline.phase='doing';beginGardeningLesson(g.progress);Object.assign(g.player,MAINLINE_SITES.camp);return g;
}
// 只满足前置步骤，保留本次待执行动作。
function satisfy(g,c){
 if(c.all)return c.all.forEach(v=>satisfy(g,v));if(c.any)return satisfy(g,c.any[0]);
 if(c.path){const keys=c.path.split('.'),last=keys.pop();let v=g;for(const key of keys)v=v[key]??={};v[last]='equals'in c?c.equals:c.min;}
 else if('nativeLevel'in c)g.progress.vehicleWeapons[nativeVehicleWeapon(c.nativeLevel).weaponIndex]=c.min;
 else if(c.controllerReady){g.progress.weapon=12;g.progress.weapons[12]=1;g.progress.mainline.seen.config=1;}
 else if(c.controllerLevel)g.progress.weapons[12]=c.controllerLevel;
 else if(c.tier)g.progress.bosses=999;
}
// 正式地面路线必须抵达预期目标，并逐段通过真实玩家碰撞，不能仅核对目标标签。
function assertReachable(g,nav,label){
 const frames=createRenderInterpolation();let route;
 for(let n=0;n<400;n++){g.time+=.025;route=storyRouteState(frames.sample(g,.5));if(route?.reachable)break;}
 assert.ok(route?.reachable,label+' 无可达路线');assert.equal(route.site,nav.key);
 if(route.points.length)assert.ok(worldDistance(route.points.at(-1),nav.site)<=85,label+' 路线未抵达终点');
 const body=playerNavigationBody(g),index=createPlayerNavigationIndex(g.trees);
 for(let i=1;i<route.points.length;i++)assert.ok(questLineClear(route.points[i-1],route.points[i],body,index),label+' 路线穿过障碍');
}
// 对照已知实体坐标，检查逻辑、插值画面和实际寻路三者一致。
function assertTarget(g,key,site){
 const nav=worldNavigationObjective(g);assert.equal(nav?.key,key);assert.equal(nav.site.x,site.x);assert.equal(nav.site.y,site.y);assert.equal(nav.site.mapId,site.mapId);
 assert.deepEqual(storyGuidanceState(createRenderInterpolation().sample(g,.5)).target,nav.site);assertReachable(g,nav,key);return nav;
}
test('全部主线与自选体验逐步导航，固定入口可达且随身操作不铺路',async context=>{
 for(const t of MAINLINE_TASKS)for(let i=0;i<t.guide.steps.length;i++)await context.test(t.id+':'+i,()=>{
  const g=navigationScene(t.id);
  for(let j=0;j<i;j++)satisfy(g,(t.goal.all||[t.goal])[j]);
  // 入口可达性只验证可执行购买；资源不足的拒绝路径由购买导航专项覆盖。
  const op=mainlineOperation(g);if(op?.type==='buy')for(const row of equipmentRequirements(g.progress,op.kind,op.index)){
   if(['coins','wood'].includes(row.key))g.progress[row.key]=row.need;else g.progress.materials[row.key]=row.need;
  }
  const step=t.guide.steps[i],o=mainlineObjective(g);assert.ok(o,t.id);assert.equal(mainlineStep(g)?.label,step.label,t.id+':'+i+' 未选中本步骤');
  requestMainlineNavigation(g);const nav=worldNavigationObjective(g);
  // 正式画面使用插值快照，必须与任务卡选择完全相同的操作步骤。
  const rendered=createRenderInterpolation().sample(g,.5);
  assert.deepEqual(worldNavigationObjective(rendered),nav,t.id+':'+i+' 画面与任务栏不同步');
  assert.deepEqual(storyGuidanceState(rendered).target,nav?.site||null,t.id+':'+i+' 终点不同步');
  // 无现成田块时应就近开田，不把收获指向内容表里的旧交谈地点。
  if(t.goal.harvestFor){assert.equal(g.progress.farm.plots.length,0);assert.equal(o.key,'harvest-plant');assert.equal(mainlineOperation(g).type,'farm');assert.equal(mainlineOperation(g).id,'dig');assert.equal(nav,null);return;}
  // 空货舱需要先去仓库取物，不能把内容表的就地清理提示当成始终无导航。
  if(t.id==='cargo-cleanup')assert.deepEqual(nav?.site,MAINLINE_SITES.warehouseEntry);
  else if(step.navigation===false){assert.equal(nav,null,t.id+':'+i);return;}
  else if(o.clearingStage){assert.equal(nav.key,'clearing-post');assert.deepEqual(nav.site,MAINLINE_SITES.clearingPost);}
  else assert.deepEqual(nav?.site,MAINLINE_SITES[step.navigation],t.id+':'+i);
  assert.ok(nav,t.id+':'+i);assertReachable(g,nav,t.id+':'+i);
 });
});
test('长线整备按当前内容表切换工坊，默认切到下一步路线，交付回原 NPC',()=>{
 const task=MAINLINE_TASKS.find(t=>t.id==='long-patrol'),g=navigationScene(task.id);
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
 const g=navigationScene('pistol-upgrade');g.progress.weapons[0]=3;
 assert.equal(mainlineAction(g).id,'heroes-button');assert.equal(mainlineObjective(g).navigation,false);
 assert.ok(selectMainlineTask(g,'first-vehicle'));g.progress.mainline.phase='doing';g.progress.vehicleHulls[0]=1;g.progress.vehicleIndex=0;
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

// 收获目标来自实际生成的田地，保留森林树木和建筑碰撞来验证路线，而非伪造空地图。
test('收获路线选成熟自种田，收空后换野田，带货时回仓库，无作物时就近播种',()=>{
 const g=navigationScene('upgrade-harvest');g.vehicle.active=false;ensureWildFarms(g);
 const plots=g.progress.farm.plots.filter(p=>p.mapId==='forest');assert.ok(plots.length>=2);
 const [own,wild]=plots;for(const p of plots)p.crop=null;
 Object.assign(own,{wild:false,crop:0,readyAt:0});Object.assign(wild,{crop:0,readyAt:0});
 Object.assign(g.player,{x:own.x,y:own.y+130});
 assertTarget(g,'harvest-plot-'+own.id,own);
 own.crop=null;assertTarget(g,'harvest-plot-'+wild.id,wild);
 g.progress.coins=0;g.progress.farm.inventory[0]=1;assertTarget(g,'resource-settle',MAINLINE_SITES.warehouseEntry);
 g.progress.farm.inventory[0]=0;wild.crop=null;
 assert.equal(mainlineObjective(g).key,'harvest-plant');assert.equal(mainlineOperation(g).id,'plant');assert.equal(worldNavigationObjective(g),null);
 g.progress.farm.plots=[];assert.equal(mainlineOperation(g).id,'dig');assert.equal(worldNavigationObjective(g),null);
});

// 清理要找真实车队停放处，空货舱才引导取货，不能导航到空的工坊或玩家背包。
test('货舱清理从空舱取货切换到实际停车处，完成后转向交付伙伴',()=>{
 const g=navigationScene('cargo-cleanup'),hull=g.vehicle.index;g.vehicle.active=false;g.progress.vehicleHulls[hull]=1;
 const build=g.progress.logistics.builds[hull];build.wood=0;build.cargo.fill(0);g.progress.supplies.vehicles[hull]={light:0,shell:0,heavy:0,water:0};if(g.vehicle.module)g.vehicle.module.magazine.ammo=0;
 assertTarget(g,'warehouseEntry',MAINLINE_SITES.warehouseEntry);
 const site=MAINLINE_SITES.garage;g.progress.campParking.owned=[{hull,spot:null,x:site.x,y:site.y,mapId:'forest',hp:1,ammo:0,reload:0,wheel:0,track:0}];build.wood=1;
 assertTarget(g,'vehicle-location-'+hull,{...site,y:site.y+55});
 g.progress.mainline.seen.cargoCleaned=1;updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');assertTarget(g,'garage',MAINLINE_SITES.garage);
});

// 日常走动后交付点必须跟随同一个 NPC，不能恢复旧内容表的静态岗位。
test('长线整备交付导航跟随移动伙伴，主动交谈后原地等候',()=>{
 const g=navigationScene('long-patrol');g.vehicle.active=false;
 for(let i=0;i<300;i++)updateCampRoutines(g,.04);
 const actor=g.campActors.get('mint');assert.ok(worldDistance(actor,MAINLINE_SITES.camp)>85);
 g.progress.mainline.phase='report';updateCampRoutines(g,.04);
 assertTarget(g,'camp',actor);Object.assign(g.player,{x:actor.x,y:actor.y});assert.equal(canTalkMainline(g),true);
 const position={x:actor.x,y:actor.y};for(let i=0;i<25;i++)updateCampRoutines(g,.04);assert.equal(worldDistance(actor,position),0);
});
