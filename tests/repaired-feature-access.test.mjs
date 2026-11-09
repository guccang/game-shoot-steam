// 未完成入营教学时，实际修复状态决定功能开放；使用真实 Game 避免遗漏派生权限。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress} from '../src/progression/progress.js';
import {canUseFarm,farmAction} from '../src/core/farming/farm.js';
import {farmCell} from '../src/config/farm.js';
import {TOWN_RESTORATIONS,facilityOpen} from '../src/config/town-restoration.js';
import {repairFacility,updateRestoration} from '../src/core/camp/town-restoration.js';
import {COTTAGE} from '../src/config/cottage.js';
import {enterCottage,leaveCottage} from '../src/core/home/cottage.js';
import {quoteWorkshop,workshopUpgrade} from '../src/progression/workshop/workshop.js';
import {commitWorkshop} from '../src/core/workshop/workshop.js';
import {CAMP_GATES} from '../src/config/camp-defense.js';
import {startCampDefense} from '../src/core/camp/camp-defense.js';
import {setLivingPatrol} from '../src/core/camp/living-world.js';
import {arrivalParkingAllowed} from '../src/core/vehicles/camp-parking.js';

// 只准备任务未完成、材料充足的存档；权限、扣费和状态推进全部使用正式代码。
function scene(phase='gather'){
 const p=freshRangerProgress();Object.assign(p.arrival,{phase,keys:true,x:865,y:790});p.coins=10000;p.wood=10000;
 const g=new Game(p,()=>.5);g.start();g.livingPersist=g.restorationPersist=()=>true;g.fireClock=99999;return g;
}

test('入营各自由阶段可下车种地，真正过场与骑乘仍不可操作',()=>{
 for(const phase of ['letter','ride-guide','gather','repair','craft']){
  const g=scene(phase);Object.assign(g.player,farmCell(0),{y:farmCell(0).y+34});
  assert.equal(g.arrivalPending,true);assert.equal(canUseFarm(g),true,phase);
  assert.ok(farmAction(g,'dig',{plot:0}).ok);assert.ok(farmAction(g,'plant',{plot:0,now:1000}).ok);
  const before=g.progress.coins;assert.ok(farmAction(g,'harvest',{plot:0,now:61000}).ok);assert.equal(g.progress.coins,before+60);
  g.vehicle.active=true;assert.equal(canUseFarm(g),false);g.vehicle.active=false;
  g.progress.arrival.phase='ride';assert.equal(canUseFarm(g),false);
 }
});

test('任务未完成也能点击修复任意设施，未点击不扣费，完成后即可开放',()=>{
 for(const f of TOWN_RESTORATIONS){
  const g=scene();Object.assign(g.player,f.site);const before=g.progress.wood;
  updateRestoration(g,.05);assert.equal(g.progress.wood,before);assert.equal(facilityOpen(g.progress,f.id),false);
  assert.ok(repairFacility(g,f.id).ok,f.id);
  for(let i=0;i<70;i++)updateRestoration(g,.05);
  assert.ok(facilityOpen(g.progress,f.id),f.id);assert.equal(g.progress.wood,before-f.wood);
  assert.equal(g.arrivalPending,true);
 }
});

test('修好的小屋允许进入、移动和退出，教学不会覆盖室内坐标',()=>{
 const g=scene();Object.assign(g.player,COTTAGE.door);assert.equal(enterCottage(g),false);
 g.progress.restoration.repaired.push('cottage');assert.equal(enterCottage(g),true);
 const y=g.player.y;g.update(.05,{x:0,y:-1});assert.ok(g.player.y<y);assert.equal(g.progress.arrival.phase,'gather');
 leaveCottage(g);assert.equal(g.cottage,null);assert.equal(g.arrivalPending,true);
});

test('修复工坊后可升级电锯和载具，不必先买教学手枪',()=>{
 const g=scene('craft');g.progress.weapons[14]=1;g.progress.vehicleHulls[5]=1;
 const saw=workshopUpgrade(g.progress,'weapons',14,'damage');assert.ok(quoteWorkshop(g.progress,saw).ok);
 assert.ok(commitWorkshop(g,saw,()=>true).ok);assert.equal(g.progress.weapons[14],2);assert.equal(g.arrivalPending,true);
 const car=workshopUpgrade(g.progress,'vehicle',5,'armor');assert.equal(quoteWorkshop(g.progress,car).ok,false);
 g.progress.restoration.repaired.push('garage');assert.ok(quoteWorkshop(g.progress,car).ok);assert.ok(arrivalParkingAllowed(g,0));
 // 刚修好但尚未完成下车引导也能购首枪；完成标记与扣费一起提交，不留下卡死的教学。
 g.progress.arrival.phase='craft';assert.ok(commitWorkshop(g,{kind:'weapons',index:0,action:'buy'},()=>true).ok);assert.equal(g.arrivalPending,false);
});

test('秘境提前开放后推进战斗，刷新不被入营坐标拉回',()=>{
 const g=scene();assert.equal(g.enterRealm('tower'),false);g.progress.restoration.repaired.push('tower');
 assert.equal(g.enterRealm('tower'),true);const x=g.player.x,y=g.player.y,elapsed=g.progress.arrival.elapsed;
 for(let i=0;i<100;i++)g.update(.05);
 assert.equal(g.progress.arrival.elapsed,elapsed);assert.equal(g.progress.arrival.x,865);assert.ok(g.enemies.length>0);
 const restored=new Game(structuredClone(g.progress),()=>.5);assert.equal(restored.realm.mode,'tower');
 assert.ok(Math.hypot(restored.player.x-x,restored.player.y-y)<150);assert.ok(g.leaveRealm());assert.equal(g.arrivalPending,true);
});

test('清缴和兽潮按修复状态开放，不需要完成教学任务',()=>{
 const g=scene();assert.equal(setLivingPatrol(g,true).ok,false);g.progress.restoration.repaired.push('clearing');
 assert.ok(setLivingPatrol(g,true).ok);assert.equal(g.arrivalPending,true);
 const defense=scene(),gate=CAMP_GATES[0];Object.assign(defense.player,gate);assert.equal(startCampDefense(defense,gate.id),false);
 defense.progress.restoration.repaired.push('defense');assert.ok(startCampDefense(defense,gate.id));
 for(let i=0;i<100;i++)defense.update(.05);assert.ok(defense.campDefense.elapsed>0);assert.equal(defense.arrivalPending,true);
});
