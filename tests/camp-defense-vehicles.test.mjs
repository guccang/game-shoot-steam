// 兽潮刷新保留驾驶、耐久和供给，森林车库与活动检查点彼此隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {CAMP_GATES} from '../src/config/camp-defense.js';
import {COLLECTED_VEHICLES,vehicleModel} from '../src/config/vehicles.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {startCampDefense,syncCampDefense,leaveCampDefense,claimCampDefense} from '../src/core/camp-defense.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {captureRealmVehicles} from '../src/core/realm-vehicles.js';

// 通过正式拥有状态及召唤入口准备驾驶，不绕过载具的通行标记。
function scene(index=0,mounted=true){
 const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls.fill(1);p.vehicleWeapons.fill(1);p.vehicleIndex=index;
 const g=new Game(validateProgress(p),()=>.4);g.start();g.mainlineSpeech=null;g.mainlineTalkDelay=9999;
 Object.assign(g.player,CAMP_GATES[0]);if(mounted)assert.ok(g.summonVehicle());return g;
}
// 模拟正式保存顺序，经 JSON 与进度校验后重建游戏。
function reload(g){syncCampDefense(g);g.progress.patrol=capturePatrol(g);return new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.4);}

for(const [index,model] of COLLECTED_VEHICLES.entries())test(model.name+' 兽潮连续刷新恢复驾驶、受损耐久、弹药和通行能力',()=>{
 let g=scene(index);assert.ok(startCampDefense(g,CAMP_GATES[0].id));assert.ok(g.vehicle.active);
 g.vehicle.hp-=17;if(g.vehicle.module){g.vehicle.module.magazine.ammo=0;g.vehicle.module.magazine.remaining=.3;}
 const vehicles=captureRealmVehicles(g);Object.assign(g.campDefense,{wave:3,cleared:2,waveKills:4,kills:50,gateHp:999});
 for(let i=0;i<2;i++){
  g=reload(g);assert.equal(g.vehicle.index,index);assert.ok(g.vehicle.active);assert.deepEqual(captureRealmVehicles(g),vehicles);
  assert.equal(g.player.flying,!!vehicleModel(index).flying);assert.equal(g.player.amphibious,!!vehicleModel(index).amphibious);assert.equal(g.player.treePass,!!vehicleModel(index).treePass);
  assert.equal(g.campDefense.wave,3);assert.equal(g.campDefense.waveKills,4);assert.equal(g.campDefense.gateHp,999);
 }
});

test('步行入场、主动下车和载具损毁后刷新不自动上车或跳过修复',()=>{
 for(const mode of ['walk','dismount','destroyed']){
  let g=scene(0,mode!=='walk');assert.ok(startCampDefense(g,CAMP_GATES[0].id));
  if(mode==='dismount')assert.ok(g.dismountVehicle());
  if(mode==='destroyed'){g.player.invincible=0;g.hurt(1e6);assert.equal(g.vehicle.hp,0);assert.ok(g.vehicle.cooldown>0);}
  const vehicles=captureRealmVehicles(g);g=reload(g);assert.equal(g.vehicle.active,false);assert.deepEqual(captureRealmVehicles(g),vehicles);
 }
});

test('局内新召唤与切换车型按最新现场恢复，旧档按入场乘坐记录兼容',()=>{
 let g=scene(0,false);startCampDefense(g,CAMP_GATES[0].id);assert.ok(g.summonVehicle());g=reload(g);assert.ok(g.vehicle.active);
 assert.ok(g.selectVehicle(2));assert.ok(g.summonVehicle());g=reload(g);assert.equal(g.vehicle.index,2);assert.ok(g.vehicle.active);assert.ok(g.player.flying);
 const old=scene(3);startCampDefense(old,CAMP_GATES[0].id);syncCampDefense(old);old.progress.patrol=capturePatrol(old);
 delete old.progress.campDefense.run.vehicles;delete old.progress.campDefense.run.forestVehicles;
 const legacy=new Game(validateProgress(JSON.parse(JSON.stringify(old.progress))),()=>.4);assert.equal(legacy.vehicle.index,3);assert.ok(legacy.vehicle.active);
});

for(const action of ['leave','claim'])test(action+' 读档后归还原森林驾驶状态，保存失败不退出且成功不重复结算',()=>{
 let g=scene();g.vehicle.hp-=23;const forest=captureRealmVehicles(g);startCampDefense(g,CAMP_GATES[0].id);
 assert.ok(g.selectVehicle(2));assert.ok(g.summonVehicle());g.vehicle.hp-=30;g=reload(g);
 if(action==='claim')Object.assign(g.campDefense,{phase:'result',cleared:10,bossDefeated:true});
 const finish=action==='claim'?claimCampDefense:leaveCampDefense;let stored;
 g.campDefensePersist=()=>false;assert.equal(finish(g),false);assert.equal(g.vehicle.index,2);assert.ok(g.campDefense);
 g.campDefensePersist=next=>{stored=structuredClone(next);return true;};assert.ok(finish(g));assert.deepEqual(captureRealmVehicles(g),forest);assert.equal(stored.vehicleIndex,0);assert.equal(g.progress.vehicleIndex,0);
 assert.equal(stored.campDefense.run,null);assert.equal(finish(g),false);
 Object.assign(g.player,CAMP_GATES[0]);assert.ok(startCampDefense(g,CAMP_GATES[0].id));assert.ok(g.vehicle.active);assert.equal(g.vehicle.index,0);
});

test('损坏存档不能借驾驶检查点获得未拥有的载具',()=>{
 const g=scene(2);startCampDefense(g,CAMP_GATES[0].id);syncCampDefense(g);g.progress.patrol=capturePatrol(g);g.progress.vehicleHulls[2]=0;
 const loaded=new Game(validateProgress(JSON.parse(JSON.stringify(g.progress))),()=>.4);assert.equal(loaded.vehicles[2].active,false);assert.equal(loaded.player.flying,false);
});
