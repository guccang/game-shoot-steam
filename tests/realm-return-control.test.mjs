// 秘境入口与退出回归：室内下车、载具隔离、读档以及各阶段返回后的真实移动。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {enterWorkshop,updateCottage,leaveCottage} from '../src/core/home/cottage.js';
import {syncRealm,finishRealm} from '../src/core/realms/realm-manager.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';

// 清除无关教学，保留正式游戏更新、停车和秘境逻辑。
function setup(){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.vehicleHulls[0]=1;p.vehicleIndex=0;
 const weapon=nativeVehicleWeapon(0).weaponIndex;p.vehicleWeapons[weapon]=1;p.vehicleLoadouts[0]=weapon;
 const g=new Game(p,()=>.45);g.start();g.mainlineSpeech=null;g.trees=[];g.enemies=[];
 g.spawnTimer=g.fireClock=g.parkingVisitTimer=999;g.progress.campParking.owned=[];
 Object.assign(g.player,{x:900,y:800,vx:0,vy:0});return g;
}

test('驾驶到接待厅下车后入塔带车，退出仍在原室内且立即可走动出门',()=>{
 const g=setup();assert.ok(g.summonVehicle());g.vehicle.hp-=25;
 Object.assign(g.player,WORKSHOP_INTERIORS.tower.door);
 for(let i=0;i<24&&!g.cottage;i++)updateCottage(g,.05,{x:0,y:0});
 assert.equal(g.cottage?.kind,'tower');assert.equal(g.vehicle.active,false);
 const room=g.cottage,player=g.player,vehicle=g.vehicle,parking=structuredClone(g.progress.campParking.owned),hp=vehicle.hp;
 vehicle.module.magazine.ammo=3;vehicle.module.magazine.remaining=.7;
 g.pause();assert.ok(g.enterRealm('tower'));
 assert.equal(g.cottage,null);assert.equal(g.vehicle.active,true);assert.equal(g.vehicle.hp,hp);
 assert.equal(g.vehicle.module.magazine.ammo,3);assert.equal(g.vehicle.module.magazine.remaining,.7);
 g.vehicle.module.magazine.ammo=1;
 g.vehicle.hp-=15;assert.equal(vehicle.hp,hp);
 assert.ok(g.leaveRealm());assert.equal(g.state,'playing');assert.equal(g.cottage,room);assert.equal(g.player,player);
 assert.equal(g.vehicle,vehicle);assert.equal(g.vehicle.active,false);assert.equal(g.vehicle.hp,hp);
 assert.equal(g.vehicle.module.magazine.ammo,3);
 assert.deepEqual(g.progress.campParking.owned,parking);
 const x=g.player.x;g.update(.05,{x:1,y:0});assert.ok(g.player.x>x);
 assert.ok(leaveCottage(g));assert.equal(g.cottage,null);assert.equal(g.progress.realms.run,null);
});

for(const mode of ['tower','guardian']){
 test(`${mode} 步行入场带当前可用车辆，读档不覆盖主动下车`,()=>{
  const g=setup();assert.ok(g.enterRealm(mode));assert.equal(g.vehicle.active,true);
  assert.ok(g.dismountVehicle());syncRealm(g);g.progress.patrol=capturePatrol(g);
  const r=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.45);
  assert.equal(r.realm.mode,mode);assert.equal(r.vehicle.active,false);
  assert.ok(r.leaveRealm());assert.equal(r.state,'playing');assert.equal(r.vehicle.active,false);
 });
 for(const unavailable of ['unowned','wreck','cooldown','repair'])test(`${mode} 不自动启用${unavailable}车辆`,()=>{
  const g=setup();
  if(unavailable==='unowned')g.progress.vehicleHulls[0]=0;
  if(unavailable==='wreck')g.vehicle.hp=0;
  if(unavailable==='cooldown')g.vehicle.cooldown=12;
  if(unavailable==='repair')g.progress.vehicleService[0]={hp:1,phase:'repairing'};
  assert.ok(g.enterRealm(mode));assert.equal(g.vehicle.active,false);
 });
}

for(const mode of ['tower','guardian'])test(`${mode} 层间暂停后退出立即恢复森林操作且不再推进下一层`,()=>{
 const g=setup();assert.ok(g.enterRealm(mode));
 g.realm.phase='rest';g.realm.restRemaining=.01;g.state='paused';syncRealm(g);
 const coins=g.progress.coins;assert.ok(g.leaveRealm());assert.equal(g.state,'playing');
 const x=g.player.x;g.update(.05,{x:1,y:0});assert.ok(g.player.x>x);
 assert.equal(g.realm,null);assert.equal(g.progress.realms.run,null);assert.equal(g.progress.coins,coins);
});

for(const mode of ['tower','guardian','rogue','football','race'])for(const phase of ['entry','combat','lost']){
 test(`${mode} ${phase}退出后关闭会话并恢复接待厅移动`,()=>{
  const g=setup();Object.assign(g.player,WORKSHOP_INTERIORS.tower.door);assert.ok(enterWorkshop(g,'tower'));
  g.pause();assert.ok(g.enterRealm(mode));
  if(phase!=='entry'){
   if(mode==='rogue'){g.rollRealmEquipment('weapon');g.rollRealmEquipment('vehicle');g.readyRealm();g.chooseRealmBlessing(g.realm.offers[0]);}
   else if(mode!=='tower')g.continueRealm();
   if(phase==='lost')finishRealm(g);
  }
  assert.ok(g.leaveRealm());assert.equal(g.realm,null);assert.equal(g.progress.realms.run,null);assert.equal(g.state,'playing');
  const x=g.player.x;g.update(.05,{x:1,y:0});assert.ok(g.player.x>x);
  assert.equal(g.leaveRealm(),false);
 });
}
