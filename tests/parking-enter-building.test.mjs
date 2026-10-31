// 库内停车完成后自动入屋，复用真实游戏、停车路线、车队记录与室内控制器。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {requestParking,updateParking} from '../src/core/parking.js';
import {enterParkedWorkshop,enterWorkshop,leaveCottage} from '../src/core/cottage.js';
import {vehicleBoardingPoint} from '../src/core/vehicle-boarding.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {requestVehicleRepair} from '../src/core/vehicle-repair.js';
import {WORLD,worldDistance} from '../src/world/coordinates.js';
// 完成营地修复与主线，关闭随机事件，车辆从真实车库入口驶入。
function scene(id='garage',shift=0){const p=ownedPineProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(s=>s.id);p.coins=10000;const events=[],g=new Game(p,()=>.5);g.onEvent=(type,data)=>events.push({type,data});g.state='playing';g.mainlineSpeech=null;g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999;g.enemies=[];g.parkingVisitors=[];g.progress.campParking.owned=[];const spot=PARKING_SPOTS.find(s=>s.id===id);Object.assign(g.player,{x:spot.x+shift,y:spot.approachY,vx:0,vy:0});assert.ok(g.summonVehicle());g.vehicle.hp*=.65;return {g,spot,events};}
// 仅推进到真实停车完成这一帧，不额外等待普通门口的一秒。
function finish(g){for(let i=0;i<300&&g.vehicle.active;i++)g.update(.05);assert.equal(g.vehicle.active,false);}
test('两座库内车位停稳同帧入屋，保留唯一车位、耐久和弹药，不重复触发',()=>{for(const id of ['garage','repair-garage'])for(const shift of [0,WORLD.width]){const {g,spot,events}=scene(id,shift),hp=g.vehicle.hp,ammo=g.vehicle.module.magazine.ammo;assert.ok(requestParking(g));assert.equal(g.cottage,null);finish(g);assert.equal(g.cottage.kind,spot.kind);assert.deepEqual({x:g.player.x,y:g.player.y},WORKSHOP_INTERIORS[spot.kind].spawn);assert.equal(g.vehicle.hp,hp);assert.equal(g.progress.campParking.owned.length,1);assert.equal(g.progress.campParking.owned[0].spot,id);assert.equal(g.progress.campParking.owned[0].ammo,ammo);assert.equal(g.cottageEntry,null);assert.equal(g.parking,null);for(let i=0;i<25;i++)g.update(.05);assert.equal(g.vehicle.active,false);assert.equal(events.filter(e=>e.type==='vehicle-parked').length,1);assert.equal(events.filter(e=>e.type==='cottage-change').length,1);}});
test('露天停车只下车，北停车场及建筑外车位不会传送入屋',()=>{for(const id of ['repair-west','weapons-west','cottage','north-0-0']){const {g}=scene(id);assert.ok(requestParking(g));finish(g);assert.equal(g.cottage,null);assert.equal(g.progress.campParking.owned[0].spot,id);}});
test('倒车暂停不入屋，移动取消后保持驾驶，不能伪造停车入口',()=>{const {g}=scene();assert.ok(requestParking(g));g.update(.05);g.state='paused';for(let i=0;i<30;i++)g.update(.05);assert.equal(g.cottage,null);assert.equal(g.vehicle.active,true);g.state='playing';g.update(.05,{x:1,y:0});assert.equal(g.parking.phase,'cancelled');assert.equal(g.cottage,null);assert.equal(enterParkedWorkshop(g,'garage'),false);});
test('未开放建筑不进入，普通步行仍须到门口，安全下车失败不发送停车完成',()=>{const {g}=scene();g.progress.restoration.repaired=g.progress.restoration.repaired.filter(s=>s!=='garage');assert.ok(requestParking(g));finish(g);assert.equal(g.cottage,null);assert.equal(g.progress.campParking.owned[0].spot,'garage');const {g:h,spot,events}=scene();h.player.flying=true;h.trees=[{x:spot.x,y:spot.y,radius:10000,hp:1}];h.parking={id:spot.id,hull:0,phase:'reverse',path:[{x:h.player.x,y:h.player.y}],step:0,speed:0,stalled:0};updateParking(h,.05);assert.equal(h.cottage,null);assert.equal(events.some(e=>e.type==='vehicle-parked'),false);const {g:k}=scene();k.vehicle.active=false;k.player.x+=100;assert.equal(enterWorkshop(k,'vehicle'),false);});
test('入屋保存只记录安全屋外位置和实际车位，出门后可按车头一秒规则取车',()=>{for(const id of ['garage','repair-garage']){const {g,spot}=scene(id);assert.ok(requestParking(g));finish(g);const outside={...g.cottage.outside};capturePatrol(g);const p=validateProgress(structuredClone(g.progress));assert.ok(worldDistance(p.living.position,outside)<.01);assert.equal(p.campParking.owned[0].spot,id);const restored=new Game(p);assert.equal(restored.vehicle.active,false);assert.equal(restored.progress.campParking.owned[0].spot,id);assert.ok(leaveCottage(g));assert.ok(worldDistance(g.player,outside)<.01);Object.assign(g.player,vehicleBoardingPoint(spot),{vx:0,vy:0});for(let i=0;i<19;i++)g.update(.05);assert.equal(g.vehicle.active,false);g.update(.05);assert.equal(g.vehicle.active,true);}});
test('停入维修中心后直接使用屋内维修服务，交车不要求再次走到门前',()=>{const {g}=scene('repair-garage');assert.ok(requestParking(g));finish(g);assert.equal(g.cottage.kind,'repair');const room=g.cottage,coins=g.progress.coins;assert.ok(requestVehicleRepair(g,0).ok);assert.equal(g.cottage,room);assert.ok(g.progress.coins<coins);assert.equal(g.progress.vehicleService[0].phase,'repairing');});
