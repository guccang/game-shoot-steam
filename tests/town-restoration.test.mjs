import {CAMP_PLOTS} from '../src/config/camp-land.js';
// 修复解锁回归：覆盖任务自动投料、自选手动确认、保存原子性及核心入口。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {TOWN_RESTORATIONS,facilityOpen,pendingRestoration,RESTORATION_SECONDS,RESTORATION_FLIGHT} from '../src/config/town-restoration.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {recordRestorationWood,updateRestoration,restorationStatus,repairFacility} from '../src/core/camp/town-restoration.js';
import {mainlineObjective,mainlineSteps,updateMainline} from '../src/core/story/mainline-manager.js';
import {enterCottage} from '../src/core/home/cottage.js';
import {setLivingPatrol,acceptLivingRequest} from '../src/core/camp/living-world.js';
import {startCampDefense} from '../src/core/camp/camp-defense.js';
import {requestFireRescue} from '../src/core/activities/fire-rescue.js';
import {transactVehicle} from '../src/progression/vehicles/vehicles.js';
import {quoteWorkshop} from '../src/progression/workshop/workshop.js';
import {summonVehicle} from '../src/combat/vehicle.js';
import {RANGER} from '../src/config/ranger-arrival.js';
import {worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {WORKSHOP} from '../src/world/workshop.js';
// 设置某项主线开始的现场，不修改修复函数本身。
function scene(id='clearing'){
 const f=TOWN_RESTORATIONS.find(f=>f.id===id),p=freshProgress();
 p.campLand.owned=CAMP_PLOTS.map(plot=>plot.id);
 p.mainline.completed=f.before?MAINLINE_IDS.slice(0,f.order):[...MAINLINE_IDS];p.mainline.currentId=f.before;p.mainline.phase='doing';
 p.restoration.repaired=TOWN_RESTORATIONS.slice(0,TOWN_RESTORATIONS.indexOf(f)).map(f=>f.id);
 // 后续设施场景已完成小屋休息教学，避免被首次休息目标接管。
 p.restoration.cottageRested=p.restoration.repaired.includes('cottage');
 const g=new Game(p,()=>.5);g.start();Object.assign(g.player,{x:f.site.x,y:f.site.y});g.vehicle.active=false;g.enemies=[];g.boss=null;g.attackTimer=999;
 g.restorationPersist=()=>true;return {g,f};
}
// 逐帧推进正式施工时钟，不用一次超长 dt 掩盖状态边界。
function finish(g){for(let i=0;i<70;i++)updateRestoration(g,.05);}
test('新档全部功能关闭，缺字段不继承旧主线权限',()=>{
 const p=freshRangerProgress();assert.ok(TOWN_RESTORATIONS.every(f=>!facilityOpen(p,f.id)));assert.equal(facilityOpen(p,'weapons'),false);
 const raw=freshProgress();raw.mainline.completed=[...MAINLINE_IDS];delete raw.restoration;
 assert.equal(validateProgress(raw).restoration.repaired.length,0);
});
test('目录主线引用均有效，未到现场不能远程修复',()=>{
 assert.equal(new Set(TOWN_RESTORATIONS.map(f=>f.id)).size,TOWN_RESTORATIONS.length);
 const {g}=scene();for(const f of TOWN_RESTORATIONS){assert.ok(f.before===null||f.order>=0);assert.ok(Number.isFinite(f.site.x)&&Number.isFinite(f.site.y));}
 assert.equal(repairFacility(g,'fire').ok,false);
 assert.equal(pendingRestoration(g.progress).id,'clearing');
});
test('任务已有足够木头靠近自动投料，无需本任务采集，距离仍生效',()=>{
 const {g,f}=scene();g.progress.wood=1000;assert.equal(g.progress.restoration.gathered[f.id],0);g.player.x+=180;updateRestoration(g,.01);assert.equal(g.progress.restoration.build,null);
 Object.assign(g.player,f.site);const before=g.progress.wood;updateRestoration(g,.01);assert.equal(repairFacility(g,f.id).ok,false);
 assert.equal(g.progress.restoration.build.id,f.id);assert.equal(g.progress.wood,before-f.wood);assert.equal(facilityOpen(g.progress,f.id),false);
 finish(g);assert.equal(facilityOpen(g.progress,f.id),true);assert.equal(g.progress.wood,before-f.wood);
 finish(g);assert.equal(g.progress.wood,before-f.wood);
});
test('缺料、战斗、暂停不会开工；已投料后暂停与刷新不重复扣木头',()=>{
 const {g,f}=scene();recordRestorationWood(g,f.wood);g.progress.wood=f.wood-1;updateRestoration(g,.05);assert.equal(g.progress.restoration.build,null);
 g.progress.wood=f.wood;g.boss={};updateRestoration(g,.05);assert.equal(g.progress.restoration.build,null);
 g.boss=null;g.state='paused';updateRestoration(g,.05);assert.equal(g.progress.restoration.build,null);
 g.state='playing';assert.ok(repairFacility(g,f.id).ok);assert.equal(restorationStatus(g,f.id).enough,true);assert.equal(worldNavigationObjective(g),null);updateRestoration(g,.4);g.state='paused';updateRestoration(g,10);assert.equal(g.progress.restoration.build.elapsed,.4);
 const restored=validateProgress(structuredClone(g.progress));assert.equal(restored.wood,0);assert.equal(restored.restoration.build.elapsed,.4);
 const next=new Game(restored,()=>.5);next.start();next.restorationPersist=()=>true;finish(next);assert.equal(next.progress.wood,0);assert.equal(facilityOpen(next.progress,f.id),true);
});
test('投料保存失败保持钱包，完工保存失败不解锁且重试不再收费',()=>{
 const {g,f}=scene();g.progress.wood=1000;recordRestorationWood(g,f.wood);g.restorationPersist=()=>false;
 assert.equal(repairFacility(g,f.id).ok,false);assert.equal(g.progress.wood,1000);assert.equal(g.progress.restoration.build,null);
 g.restorationRetry=0;g.restorationPersist=()=>true;assert.ok(repairFacility(g,f.id).ok);const paid=g.progress.wood;
 g.restorationPersist=()=>false;finish(g);assert.equal(facilityOpen(g.progress,f.id),false);assert.equal(g.progress.wood,paid);
 g.restorationPersist=()=>true;g.restorationRetry=0;finish(g);assert.equal(facilityOpen(g.progress,f.id),true);assert.equal(g.progress.wood,paid);
});
test('全部已购地设施都能分别建设，完成记录正常存取',()=>{
 for(const f of TOWN_RESTORATIONS){
  const {g}=scene(f.id);g.progress.wood=f.wood;assert.equal(g.progress.restoration.gathered[f.id],0);assert.ok(repairFacility(g,f.id).ok);assert.equal(g.progress.restoration.build?.id,f.id);
  finish(g);assert.equal(facilityOpen(validateProgress(g.progress),f.id),true);assert.equal(g.progress.wood,0);
 }
});
test('修复目标覆盖主线对白和完成，采木后转向同一门前',()=>{
 const {g,f}=scene();const o=mainlineObjective(g);assert.equal(o.restoration,f.id);
 g.progress.mainline.seen.wave=1;updateMainline(g,10);assert.equal(g.progress.mainline.phase,'doing');assert.equal(g.mainlineSpeech,null);
 g.progress.wood=f.wood;assert.equal(mainlineObjective(g).site.x,f.site.x);assert.equal(mainlineObjective(g).site.y,f.site.y);assert.ok(mainlineObjective(g).site.repairArea);
});
test('锁定设施不能从核心方法绕过，地图背包等随身功能仍可用',()=>{
 const {g}=scene();g.progress.coins=g.progress.wood=999999;
 assert.equal(setLivingPatrol(g,true).ok,false);
 assert.equal(acceptLivingRequest(g,'neighbors-lunch').ok,false);
 for(const id of ['rogue','tower','guardian','race','football'])assert.equal(g.enterRealm(id),false,id);
 assert.equal(g.enterStory('sunleaf-01'),false);assert.equal(requestFireRescue(g),false);
 assert.equal(startCampDefense(g,'left'),false);assert.equal(enterCottage(g),false);
 // 赠车驾驶不依赖载具工坊修复，工坊入口锁定不应收回已有车辆。
 assert.equal(summonVehicle(g),true);
 assert.equal(transactVehicle(g.progress,'vehicle',0,'buy'),false);
 assert.equal(quoteWorkshop(g.progress,{kind:'vehicle',index:0,action:'buy'}).ok,false);
 assert.equal(g.switchMap('jiuzhaigou'),false);
});
test('真实树木结算推进当前采集，击杀怪物的木头不冒充采集',()=>{
 const {g,f}=scene();const tree=g.trees.find(t=>t.hp>0);assert.ok(tree);
 g.hit(tree,1e9,false,{weaponIndex:RANGER.saw});assert.ok(g.progress.restoration.gathered[f.id]>0);
 const gathered=g.progress.restoration.gathered[f.id];const e=g.spawnEnemy(0,0,{x:1500,y:1500},{ambient:true});g.hit(e,1e9);
 assert.equal(g.progress.restoration.gathered[f.id],gathered);
});
test('首间工坊已有木料靠近自动修复，全程结束才解锁',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'gather',keys:true,wood:0,x:WORKSHOP.x,y:WORKSHOP.y+25});
 p.wood=RANGER.repairWood+RANGER.pistolWood;p.weapons[RANGER.saw]=1;
 // 排除额外采集收入，只核对一次投料、完工赠材与解锁。
 const g=new Game(p,()=>.5);g.start();g.arrivalPersist=()=>true;g.trees=[];g.attackTimer=999;g.update(.01);
 assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.progress.wood,RANGER.pistolWood);assert.equal(facilityOpen(g.progress,'weapons'),false);
 for(let i=0;i<Math.ceil((RANGER.rebuildSeconds+RESTORATION_FLIGHT)/.05)+2;i++)g.update(.05);
 assert.equal(g.progress.arrival.phase,'craft');assert.equal(g.progress.wood,RANGER.pistolWood*2);assert.equal(facilityOpen(g.progress,'weapons'),true);
});

// 赠车从短剧情实体切换为持久化停车记录时仍留在北广场，导航不得回到废墟。
test('赠送木制自行车停在北广场，接管与重载不重复占位',async()=>{
 const {adoptArrivalParking,parkingOccupied,vehicleParkingSite,boardParkedVehicle}=await import('../src/core/vehicles/camp-parking.js');
 const {arrivalObjects}=await import('../src/rendering/ranger-arrival.js');
 const {skipArrivalJourney}=await import('../src/core/camp/ranger-arrival.js');
 const g=new Game(freshRangerProgress());g.start();g.arrivalPersist=()=>true;skipArrivalJourney(g);
 const car=arrivalObjects(g).find(o=>o.type==='arrival-gift');
 assert.equal(car.hull,RANGER.giftHull);assert.equal(car.x,RANGER.parking.x);assert.equal(car.y,RANGER.parking.y);assert.equal(car.depthOffset,undefined);
 assert.equal(parkingOccupied(g,RANGER.parkingId),true);assert.equal(parkingOccupied(g,'garage'),false);
 adoptArrivalParking(g);adoptArrivalParking(g);
 assert.deepEqual(g.progress.campParking.owned.map(r=>[r.hull,r.spot]),[[RANGER.giftHull,RANGER.parkingId]]);
 assert.equal(arrivalObjects(g).some(o=>o.type==='arrival-gift'),false);
 const restored=new Game(validateProgress(structuredClone(g.progress)));
 assert.equal(vehicleParkingSite(restored,RANGER.giftHull).id,RANGER.parkingId);
 assert.equal(restored.progress.campParking.owned.length,1);
 restored.start();Object.assign(restored.player,{x:RANGER.parking.x+90,y:RANGER.parking.y+18});
 assert.equal(boardParkedVehicle(restored,RANGER.giftHull),true);assert.equal(restored.vehicle.active,true);assert.equal(restored.progress.campParking.owned.length,0);
});

// 正式特效每帧仅使用六个槽位，首次工坊与普通修复共用轨迹。
test('木料飞行覆盖完整施工时长，完工消失，减少动态不改变持续时间',async()=>{
 const {restorationTransferSamples:sample}=await import('../src/rendering/town-restoration.js');
 const from={x:20,y:160},to={x:40,y:90};
 for(const duration of [RESTORATION_SECONDS,RANGER.rebuildSeconds+RESTORATION_FLIGHT]){
  for(let elapsed=.02;elapsed<duration;elapsed+=.02){
   const particles=sample(from,to,135,elapsed,duration);
   assert.ok(particles.length>0&&particles.length<=6);
   assert.ok(particles.some(p=>p.alpha>.01),'施工期间没有木料');
   assert.ok(particles.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.alpha>=0&&p.alpha<=1));
   const reduced=sample(from,to,135,elapsed,duration,true);
   assert.equal(reduced.length,particles.length);assert.ok(reduced.every(p=>p.y===to.y-135*.35&&p.angle===0));
  }
  assert.deepEqual(sample(from,to,135,0,duration),[]);assert.deepEqual(sample(from,to,135,duration,duration),[]);
  assert.deepEqual(sample(from,to,135,1.7,duration),sample(from,to,135,1.7,duration),'暂停时轨迹不变');
 }
});
// 奖励、库存和采集使用同一余额；缺一份时才指向树木。
test('任务只要求补齐余额差额，获得木头即转向门前，花掉后恢复采集',()=>{
 const {g,f}=scene();g.progress.wood=f.wood-1;
 assert.equal(mainlineSteps(g)[0].progress,(f.wood-1)+'/'+f.wood);assert.equal(mainlineSteps(g).length,2);
 assert.match(mainlineObjective(g).hint,/还差 1 木头/);assert.notDeepEqual(mainlineObjective(g).site,f.site);
 g.progress.wood++;assert.equal(mainlineObjective(g).site.x,f.site.x);assert.equal(mainlineObjective(g).site.y,f.site.y);assert.ok(mainlineObjective(g).site.repairArea);assert.equal(g.progress.restoration.gathered[f.id],0);
 assert.deepEqual(mainlineSteps(g).map(s=>s.label),['修复'+f.name]);
 g.progress.wood--;assert.match(mainlineObjective(g).hint,/还差 1 木头/);
});
// 第一间工坊无需把修复费用与手枪费用捆绑采集。
test('首间工坊仅有修复费用即可开工，保存重载不退回采集阶段',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:0,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood;
 const g=new Game(validateProgress(p));g.start();g.arrivalPersist=()=>true;g.attackTimer=999;
 assert.equal(g.progress.arrival.phase,'repair');g.update(.01);assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.progress.wood,0);
 const restored=new Game(validateProgress(structuredClone(g.progress)));restored.start();restored.arrivalPersist=()=>true;restored.attackTimer=999;
 for(let i=0;i<125;i++)restored.update(.05);
 assert.equal(restored.progress.arrival.phase,'craft');assert.equal(restored.progress.wood,RANGER.pistolWood);assert.equal(restored.advanceArrival(),false);
});

// 西门和北门的营内落点均可到达，不要求跨越围栏或退出载具。
test('两座营门在营内外步行或骑乘靠近都能修复，导航与投料锚点一致',async()=>{
 const {restorationLocation}=await import('../src/world/restoration-area.js');
 const {CAMP_GATES}=await import('../src/config/camp-defense.js');
 const {blocked}=await import('../src/physics/motion.js');
 for(const gate of CAMP_GATES)for(const mounted of [false,true])for(const side of [-1,1]){
  const {g,f}=scene('defense'),anchor=f.locations.find(p=>p.site.id==='repair-gate-'+gate.id);
  Object.assign(g.player,{x:anchor.x-gate.nx*78*side,y:anchor.y-gate.ny*78*side+24});
  // 北门朝外时不把前侧偏移再叠到围栏上。
  if(gate.id==='top')g.player.y=anchor.y-gate.ny*(side<0?70:78)*side;
  g.progress.wood=f.wood;g.vehicle.active=mounted;
  // 西侧现有加工厂占用旧的北侧站位，改从同侧下方空地检查营门。
  if(gate.id==='left')g.player.y+=36;
  assert.equal(blocked(g.player.x,g.player.y,mounted?26:12,g.trees,g.player),false,gate.id+' 站位受阻');
  const status=restorationStatus(g,f.id);assert.equal(status.near,true,gate.id+' / '+mounted+' / '+side);assert.equal(status.canRepair,true);
  assert.equal(mainlineObjective(g).site.id,anchor.site.id);
  assert.equal(restorationLocation(f,g.player).site.id,anchor.site.id);
  assert.ok(repairFacility(g,'defense').ok);assert.equal(g.progress.restoration.build?.id,'defense');assert.equal(g.progress.wood,0);
  const saved=validateProgress(structuredClone(g.progress));assert.equal(restorationLocation(f,saved.restoration.build).site.id,anchor.site.id);
  finish(g);assert.equal(facilityOpen(g.progress,'defense'),true);assert.equal(g.progress.wood,0);
 }
});
// 可见圆角范围与逻辑边界共用公式，世界镜像保持一致。
test('各建筑修复范围覆盖前侧和两侧，外侧与圆角之外不误触发',async()=>{
 const {restorationArea,inRestorationArea}=await import('../src/world/restoration-area.js');
 const {WORLD}=await import('../src/world/coordinates.js');
 for(const f of TOWN_RESTORATIONS){
  const area=restorationArea(f),y=area.y;
  assert.equal(inRestorationArea({x:f.x+f.width/2+54,y},area),true,f.id);
  assert.equal(inRestorationArea({x:f.x+f.width/2+56,y},area),false,f.id);
  assert.equal(inRestorationArea({x:f.x,y:f.y+94},area),true,f.id);
  assert.equal(inRestorationArea({x:f.x+area.width/2,y:area.y+area.height/2},area),false,f.id);
  assert.equal(inRestorationArea({x:f.x+WORLD.width,y:y-WORLD.height},area),true,f.id);
 }
});
// 第一间工坊同样允许骑乘进入明示范围，购买手枪仍走原步行入口。
test('首次工坊在载具上靠近侧前方自动开工',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,wood:0,x:WORKSHOP.x+100,y:WORKSHOP.y+30});p.wood=RANGER.repairWood;
 const g=new Game(p);g.start();g.arrivalPersist=()=>true;g.vehicle.active=true;g.attackTimer=999;g.update(.01);
 assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.progress.wood,0);
});

// 旧导航在85单位就停下，新范围外仍继续指路，跨入标示区域才算抵达。
test('修复路线停止点与可见范围一致',async()=>{
 const {storyRouteState}=await import('../src/core/navigation/story-route.js');
 const {g,f}=scene('garage');g.progress.wood=f.wood;
 Object.assign(g.player,{x:f.x,y:f.y+100});assert.equal(restorationStatus(g,f.id).near,false);assert.equal(storyRouteState(g).near,false);
 g.player.y=f.y+94;assert.equal(restorationStatus(g,f.id).near,true);assert.equal(storyRouteState(g).near,true);
});

// 非任务建筑的路过、导航和查看都不投入材料，仅明确确认可提前修复。
test('路过非任务建筑不自动开工，打开修复页暂停后仍能手动确认',()=>{
 const {g}=scene('clearing'),other=TOWN_RESTORATIONS.find(f=>f.id==='garage');g.progress.wood=1000;Object.assign(g.player,other.site);
 assert.equal(restorationStatus(g,other.id).taskRequired,false);for(let i=0;i<80;i++)updateRestoration(g,.05);
 assert.equal(g.progress.restoration.build,null);assert.equal(g.progress.wood,1000);
 g.state='paused';assert.ok(repairFacility(g,other.id).ok);assert.equal(g.progress.wood,1000-other.wood);
 g.state='playing';finish(g);assert.ok(facilityOpen(g.progress,other.id));assert.equal(pendingRestoration(g.progress).id,'clearing');
});
// 保存失败只限速重试，重新提交仍使用同一事务，避免逐帧重复扣料。
test('自动开工保存失败不扣料，限速重试后只投料一次',()=>{
 const {g,f}=scene();g.progress.wood=1000;let calls=0;g.restorationPersist=()=>{calls++;return false;};
 updateRestoration(g,.05);assert.equal(calls,1);assert.equal(g.progress.wood,1000);assert.equal(g.progress.restoration.build,null);
 updateRestoration(g,.5);assert.equal(calls,1);g.restorationPersist=()=>{calls++;return true;};updateRestoration(g,.5);
 assert.equal(calls,2);assert.equal(g.progress.restoration.build.id,f.id);assert.equal(g.progress.wood,1000-f.wood);
 finish(g);assert.equal(g.progress.wood,1000-f.wood);
});
// 完成全部主线不能把剩余未修复建筑当成当前任务自动消费。
test('没有当前任务时只允许手动修复，骑乘执行当前任务仍可自动开工',()=>{
 const {g,f}=scene();g.progress.wood=1000;g.progress.mainline.completed=[...MAINLINE_IDS];g.progress.mainline.currentId=null;
 updateRestoration(g,.05);assert.equal(g.progress.restoration.build,null);assert.equal(g.progress.wood,1000);
 const {g:mounted}=scene();mounted.progress.wood=f.wood;mounted.vehicle.active=true;updateRestoration(mounted,.05);
 assert.equal(mounted.progress.restoration.build.id,f.id);assert.equal(mounted.progress.wood,0);
});
// 首次工坊也遵守暂停和原子保存，失败后通过原有重试入口恢复。
test('首次工坊自动施工保存失败及暂停不扣料',()=>{
 const p=freshRangerProgress();Object.assign(p.arrival,{phase:'repair',keys:true,x:WORKSHOP.x,y:WORKSHOP.y+25});p.wood=RANGER.repairWood;
 const g=new Game(p);g.start();g.attackTimer=999;g.arrivalPersist=()=>false;g.state='paused';g.update(.05);
 assert.equal(g.progress.arrival.phase,'repair');assert.equal(g.progress.wood,RANGER.repairWood);
 g.state='playing';g.update(.05);assert.equal(g.arrivalError,true);assert.equal(g.progress.wood,RANGER.repairWood);
 g.arrivalPersist=()=>true;g.advanceArrival();g.update(.05);assert.equal(g.progress.arrival.phase,'repairing');assert.equal(g.progress.wood,0);
});
