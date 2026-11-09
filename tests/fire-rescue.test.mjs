// 世界消防规则与实际路网驾驶验证，不把目标直接搬到玩家脚边。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {FIRE_RESCUE as C} from '../src/config/fire-rescue.js';
import {requestFireParking,updateFireRescue,fireObjective} from '../src/core/activities/fire-rescue.js';
import {FIRE_STATION,FIRE_PARKING,FIRE_EXIT,FIRE_GARAGE,fireRoute} from '../src/world/fire-navigation.js';
import {parkedOwned} from '../src/core/vehicles/camp-parking.js';
import {worldDistance} from '../src/world/coordinates.js';
import {blocked} from '../src/physics/motion.js';
import {isWaterBlocked} from '../src/world/river-geometry.js';
// 每个测试从真实森林和正式装备开始。
// 原消防用例等待正式出入库动作完成，再检验火场与奖励行为。
function advanceTransit(g){for(let i=0;i<4000&&g.fireTransit;i++)g.update(.05);assert.equal(g.fireTransit,false);}
// 通过正式入口接警，沿连续路径走到驾驶席并驶出。
function depart(g){assert.ok(g.startFireRescue());advanceTransit(g);}
function game(seed=.4){const p=freshProgress();p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;const g=new Game(p,()=>seed);g.start();return g;}
// 用正式物理走完路网的每一个折点，树和水界仍保持碰撞。
function drive(g,target){const path=fireRoute(g,target);assert.ok(path.length);for(const p of path){for(let i=0;i<200&&worldDistance(g.player,p)>7&&g.fireActive;i++){const dx=p.x-g.player.x,dy=p.y-g.player.y,d=Math.hypot(dx,dy);g.update(.05,{x:dx/d,y:dy/d});}if(g.fireActive)assert.ok(worldDistance(g.player,p)<9,'路线不能穿过水或树');}}
test('随机告警可拒绝，暂停不调度；主动接警不重建世界，不解锁借车',()=>{
 const g=game(),trees=g.trees,tree=trees[0],enemies=g.enemies,wave=g.wave;
 g.fireClock=.01;g.pause();g.update(.05);assert.equal(g.fireRescue,null);g.start();g.update(.05);assert.equal(g.fireRescue.phase,'offered');assert.equal(g.fireRescue.source,'random');assert.equal(g.trees.includes(tree),true);
 g.dismissFireRescue();assert.equal(g.progress.vehicleHulls[4],0);g.update(.05);assert.equal(g.fireRescue,null);assert.ok(g.fireClock>100);
 g.requestFireRescue();assert.equal(g.startFireRescue(),true);advanceTransit(g);assert.equal(g.startFireRescue(),false);assert.ok(!g.realm);assert.ok(!g.player.arena);assert.ok(worldDistance(g.player,FIRE_PARKING)<.001);assert.equal(g.wave,wave);assert.equal(g.progress.vehicleHulls[4],0);assert.equal(g.loadout.vehicleHulls[4],1);assert.ok(g.trees.every(t=>trees.includes(t)));assert.ok(g.enemies.every(e=>enemies.includes(e)));
 assert.equal(g.enterRealm('tower'),false);assert.equal(g.switchMap('jiuzhaigou'),false);assert.equal(g.transact('weapons',0,'upgrade'),false);
});
test('火情绑定原树，暂停和枪械不能伪造灭火，火势只蔓延到同片邻树',()=>{
 const g=game();g.requestFireRescue();depart(g);const r=g.fireRescue,f=r.fires[0],tree=f.tree,hp=tree.hp;
 g.hit(tree,999);assert.equal(tree.hp,hp);assert.equal(f.hp,C.fireHp);g.pause();const time=r.remaining;updateFireRescue(g,33);assert.equal(r.remaining,time);g.start();updateFireRescue(g,C.spreadInterval+.1);assert.equal(r.fires.filter(f=>f.lit).length,8);assert.equal(g.trees.includes(tree),true);
 for(const s of r.waters){assert.equal(blocked(s.x,s.y,16,g.trees,g.player),false);assert.equal(isWaterBlocked(s.waterX,s.waterY),true);}
});
test('河岸取水与原地刷新保存真实水量、火势、位置、借车耐久；撤退不发车',()=>{
 const g=game();g.requestFireRescue();depart(g);const r=g.fireRescue;Object.assign(g.player,r.waters[0]);r.water=0;r.waterGuide=true;updateFireRescue(g,1);assert.equal(r.water,C.refill);assert.equal(r.refills,1);
 g.vehicle.hp-=40;g.syncFireRescue();const restored=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.4);
 assert.equal(restored.fireRescue.water,C.refill);assert.equal(restored.state,'paused');assert.equal(restored.fireRescue.fires.filter(f=>f.lit).length,6);assert.ok(worldDistance(restored.player,g.player)<1);assert.equal(restored.vehicle.hp,g.vehicle.hp);assert.ok(!restored.player.arena);restored.start();updateFireRescue(restored,.1);assert.equal(restored.fireRescue.refills,1,'刷新续接同一次补水');restored.dismissFireRescue();assert.equal(restored.progress.vehicleHulls[4],0);assert.equal(restored.vehicle.index,0);
});
test('完整世界驾驶、补水、原树灭火与清怪后仅一次发车，重玩不覆盖成长',()=>{
 const g=game(.62);g.requestFireRescue();depart(g);const r=g.fireRescue,original=g.trees.length,wave=g.wave;
 for(let round=0;round<80&&g.fireActive;round++){
  const o=fireObjective(g);if(!o?.point){g.update(.05);continue;}drive(g,o.point);if(r.phase==='returning')assert.ok(requestFireParking(g));
  for(let i=0;i<120&&g.fireActive;i++){g.update(.05);if(o.water&&r.water>=99.9)break;if(!o.water&&(r.waterGuide||!o.target.lit&&o.target.stop))break;}
 }
 assert.equal(r.phase,'won',JSON.stringify({water:r.water,phase:r.phase,state:g.state,time:r.remaining,hp:g.vehicle.hp,fires:r.fires.map(f=>[f.hp,f.lit]),enemies:g.enemies.filter(e=>e.fireEvent).map(e=>e.hp)}));assert.ok(r.refills>=1);assert.equal(g.progress.vehicleHulls[4],1);assert.equal(g.progress.realms.records.fire.clears,1);assert.equal(g.progress.campLevel.xp,50);assert.ok(worldDistance(g.player,FIRE_EXIT)<1);assert.equal(g.vehicle.active,false);assert.ok(g.fireGarageParked);assert.equal(g.vehicle.index,4);assert.equal(g.wave,wave);assert.equal(g.trees.length,original);assert.ok(r.fires.every(f=>f.tree.hp>0));
 g.syncFireRescue();const reload=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.4);assert.equal(reload.progress.vehicleHulls[4],1);assert.equal(reload.progress.realms.records.fire.clears,1);assert.equal(reload.progress.campLevel.xp,50);reload.dismissFireRescue();assert.equal(reload.progress.vehicleHulls[4],1);
 const owned=g.progress.vehicleHulls[4]=3;g.dismissFireRescue();g.requestFireRescue();depart(g);g.dismissFireRescue();assert.equal(g.progress.vehicleHulls[4],owned);
});
test('旧秘境火警检查点退出圈内模式，已拥有消防车保留；损坏世界记录不恢复',()=>{
 const p=freshProgress();p.vehicleHulls[4]=1;p.realms.run={mode:'fire',phase:'combat',stage:1};p.fireDispatch={next:-5,run:{phase:'active',fires:[{}]}};
 const g=new Game(p);assert.ok(!g.realm);assert.equal(g.progress.vehicleHulls[4],1);assert.equal(g.fireRescue,null);
});

// 失败与林木耗尽属于正常世界状态，不能保留活动借车或中断更新。
test('超时和死亡归还任务车，林木不足推迟调度',()=>{
 const g=game();g.requestFireRescue();depart(g);g.fireRescue.remaining=.01;g.update(.05);assert.equal(g.fireRescue.phase,'lost');assert.equal(g.progress.vehicleHulls[4],0);assert.equal(g.vehicle.index,0);g.dismissFireRescue();
 g.requestFireRescue();depart(g);g.vehicle.active=false;g.player.invincible=0;g.hurt(g.maxHp()+1);assert.equal(g.state,'dead');assert.equal(g.fireRescue.phase,'lost');g.syncFireRescue();assert.equal(g.progress.fireDispatch.run.phase,'lost');
 const bare=game();bare.trees.forEach(t=>t.hp=0);assert.equal(bare.requestFireRescue(),false);assert.ok(bare.fireClock>100);assert.equal(bare.fireRescue,null);
});

// 告警随原森林一起冻结，往返后仍能接受；读档时不复用秘境删树后的路网。
test('未接受告警随森林冻结恢复，读档秘境不缓存删树后的路网',()=>{
 const g=game();g.requestFireRescue();const old=g.fireRescue.fires[0].tree;assert.ok(old.fireRescue);g.enterRealm('tower');assert.equal(g.fireRescue,null);g.leaveRealm();assert.equal(g.fireRescue.phase,'offered');assert.equal(old.fireRescue,g.fireRescue.fires[0]);assert.ok(g.requestFireRescue());assert.ok(g.startFireRescue());advanceTransit(g);assert.ok(fireRoute(g,fireObjective(g).point).length);
 const other=game();other.enterRealm('tower');const restored=new Game(other.progress);assert.ok(restored.realm);assert.equal(restored.fireWaters,undefined);restored.leaveRealm();assert.ok(restored.requestFireRescue());
});

// 精确验证成功边界：灭火、返程、停靠必须分开，且车体从头到尾连续存在。
test('返程保留车与位置，刷新续接；途经/步行不结算，停稳后才发一次奖励',()=>{
 const g=game();g.requestFireRescue();depart(g);const r=g.fireRescue,loan=g.vehicle,coins=g.progress.coins;
 Object.assign(g.player,r.fires[0].stop,{vx:0,vy:0});for(const f of r.fires){f.hp=0;f.lit=false;}g.enemies=g.enemies.filter(e=>!e.fireEvent);const position={x:g.player.x,y:g.player.y};updateFireRescue(g,.05);
 assert.equal(r.phase,'returning');assert.equal(g.vehicle,loan);assert.ok(g.vehicle.active);assert.deepEqual({x:g.player.x,y:g.player.y},position);assert.equal(g.progress.vehicleHulls[4],0);assert.equal(g.progress.coins,coins);assert.equal(g.dismissFireRescue(),false);assert.equal(g.guideFireWater(),false);assert.equal(g.enterRealm('tower'),false);
 const time=r.remaining;updateFireRescue(g,50);assert.equal(r.remaining,time);assert.equal(r.phase,'returning');g.syncFireRescue();
 const reload=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.4);assert.equal(reload.fireRescue.phase,'returning');assert.ok(reload.vehicle.active);assert.ok(worldDistance(reload.player,g.player)<.001);assert.equal(reload.state,'paused');reload.start();
 Object.assign(reload.player,FIRE_PARKING,{vx:80,vy:0});updateFireRescue(reload,2);assert.equal(reload.fireRescue.phase,'returning');reload.vehicle.active=false;reload.player.vx=0;updateFireRescue(reload,2);assert.equal(reload.fireRescue.phase,'returning');
 reload.summonVehicle();const returned=reload.vehicle;updateFireRescue(reload,.5);reload.pause();updateFireRescue(reload,2);assert.equal(reload.fireRescue.phase,'returning');reload.start();updateFireRescue(reload,C.dockSeconds-.5);assert.ok(requestFireParking(reload));advanceTransit(reload);assert.equal(reload.fireRescue.phase,'won');assert.equal(reload.vehicle,returned);assert.equal(returned.active,false);assert.ok(reload.fireGarageParked);assert.equal(reload.progress.vehicleHulls[4],1);
 const paid=reload.progress.coins;updateFireRescue(reload,2);assert.equal(reload.progress.coins,paid);reload.syncFireRescue();const won=new Game(validateProgress(JSON.parse(JSON.stringify(reload.progress))));assert.equal(won.vehicle.active,false);assert.ok(won.fireGarageParked);assert.ok(worldDistance(won.player,FIRE_EXIT)<1);assert.equal(won.progress.coins,paid);
});
// 复救曾在成功帧换回旧车型，导致现场消防车消失；保留同一车体及原挂载成长。
test('已有消防车重复救援入库保留车体与成长，远处不能取车',()=>{
 const p=freshProgress();p.vehicleHulls[4]=3;p.vehicleWeapons[5]=2;p.vehicleLoadouts[4]=5;const g=new Game(p,()=>.4);g.start();g.requestFireRescue();depart(g);const loan=g.vehicle;
 for(const f of g.fireRescue.fires){f.lit=false;f.hp=0;}updateFireRescue(g,.05);updateFireRescue(g,C.dockSeconds+.1);assert.ok(requestFireParking(g));advanceTransit(g);assert.equal(g.fireRescue.phase,'won');assert.equal(g.vehicle,loan);assert.equal(g.vehicle.active,false);assert.ok(g.fireGarageParked);assert.equal(g.progress.vehicleHulls[4],3);assert.equal(g.vehicle.weaponIndex,5);assert.equal(g.progress.vehicleIndex,4);g.dismissFireRescue();assert.equal(g.vehicle,loan);assert.equal(g.vehicle.active,false);assert.ok(g.fireGarageParked);Object.assign(g.player,{x:1800,y:1200});assert.equal(g.summonVehicle(),false);const hp=loan.hp;g.requestFireRescue();assert.ok(g.fireGarageParked);depart(g);assert.equal(g.vehicle,loan);assert.equal(g.vehicle.hp,hp);assert.ok(g.vehicle.active);assert.equal(g.fireGarageParked,false);
});

// 车库独立于结果面板、当前车型和世界火警，不能因为离开或重新登录丢失。
test('关闭交接后步行与刷新保留车库，拒接不出车，切换车辆不复制消防车',()=>{
 const g=game();g.requestFireRescue();depart(g);g.vehicle.hp-=67;for(const f of g.fireRescue.fires){f.lit=false;f.hp=0;}updateFireRescue(g,.05);updateFireRescue(g,C.dockSeconds+.1);assert.ok(requestFireParking(g));advanceTransit(g);const hp=g.vehicles[4].hp,coins=g.progress.coins;
 assert.equal(blocked(FIRE_EXIT.x,FIRE_EXIT.y,16,g.trees,g.player),false);assert.equal(g.vehicle.active,false);g.dismissFireRescue();for(let i=0;i<15;i++)g.update(.05,{x:1,y:0});g.syncFireRescue();assert.ok(g.fireGarageParked);assert.equal(g.progress.fireDispatch.run,null);
 const reload=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.4);reload.start();assert.ok(reload.fireGarageParked);assert.equal(reload.vehicle.active,false);assert.equal(reload.vehicles[4].hp,hp);Object.assign(reload.player,{x:1800,y:1200});assert.equal(reload.summonVehicle(),false);
 reload.requestFireRescue();reload.dismissFireRescue();assert.ok(reload.fireGarageParked);const parked=parkedOwned(reload).find(s=>s.record.hull===0);Object.assign(reload.player,{x:parked.x+64,y:parked.y+18});assert.ok(reload.selectVehicle(0));assert.ok(reload.summonVehicle());assert.ok(reload.fireGarageParked);reload.syncFireRescue();const again=new Game(validateProgress(JSON.parse(JSON.stringify(reload.progress))),()=>.4);again.start();assert.equal(again.vehicles[4].hp,hp);again.requestFireRescue();depart(again);assert.equal(again.vehicle.index,4);assert.equal(again.vehicle.hp,hp);assert.ok(again.vehicle.active);assert.equal(again.fireGarageParked,false);assert.equal(again.progress.coins,coins);
});

// 旧交接驾驶记录迁移后仍为同一次奖励，并恢复原来的车库耐久。
test('旧版成功驾驶存档迁移为入库步行，不补发奖励',()=>{
 const g=game();g.requestFireRescue();depart(g);g.vehicle.hp-=41;for(const f of g.fireRescue.fires){f.hp=0;f.lit=false;}updateFireRescue(g,.05);updateFireRescue(g,C.dockSeconds+.1);assert.ok(requestFireParking(g));advanceTransit(g);g.syncFireRescue();const raw=JSON.parse(JSON.stringify(g.progress));delete raw.fireDispatch.garage;raw.fireDispatch.run.driving=true;const restored=new Game(raw);assert.ok(restored.fireGarageParked);assert.equal(restored.vehicle.active,false);assert.equal(restored.vehicles[4].hp,g.vehicle.hp);assert.equal(restored.progress.coins,g.progress.coins);assert.equal(restored.progress.realms.records.fire.clears,1);
});
// 其他玩法使用自己的试用车，保存时不得拿试用车耐久覆盖消防站停车档案。
test('车库耐久不受秘境试用车和刷新存档影响',()=>{
 const p=freshProgress();p.vehicleHulls[4]=2;p.fireDispatch.garage={parked:true,truckHp:.63};const g=new Game(p,()=>.4);g.start();const hp=g.vehicles[4].hp;assert.ok(g.enterRealm('tower'));g.vehicles[4].hp=1;g.syncFireRescue();assert.equal(g.progress.fireDispatch.garage.truckHp,.63);const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.4);restored.leaveRealm();assert.equal(restored.vehicles[4].hp,hp);assert.ok(restored.fireGarageParked);
});
// 返站停留不接管，点击才入库；刷新、暂停和重复点击不能重复发奖励。
test('消防返站停留十秒不入库，点击发起连续入库并只结算一次',()=>{
 const g=game();g.requestFireRescue();depart(g);for(const f of g.fireRescue.fires){f.lit=false;f.hp=0;}updateFireRescue(g,.05);
 Object.assign(g.player,FIRE_PARKING,{vx:0,vy:0});for(let i=0;i<200;i++)updateFireRescue(g,.05);
 assert.equal(g.fireRescue.phase,'returning');assert.equal(g.fireRescue.dockTime,0);
 g.pause();assert.equal(requestFireParking(g),false);g.start();g.player.x+=100;assert.equal(requestFireParking(g),false);
 Object.assign(g.player,FIRE_PARKING);assert.ok(requestFireParking(g));assert.equal(requestFireParking(g),false);
 advanceTransit(g);assert.equal(g.fireRescue.phase,'won');assert.equal(g.vehicle.active,false);
 const coins=g.progress.coins;assert.equal(requestFireParking(g),false);updateFireRescue(g,10);assert.equal(g.progress.coins,coins);
});
