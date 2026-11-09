// 战车进屋、出屋与读档回归：保留真实停车碰撞、门口候停和自动上车。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {COTTAGE} from '../src/config/cottage.js';
import {capturePatrol} from '../src/core/battle/patrol-session.js';
import {leaveCottage} from '../src/core/home/cottage.js';
import {updateParkingVisitors} from '../src/core/vehicles/camp-parking.js';
import {blocked} from '../src/physics/motion.js';
import {canonical,WORLD,worldDistance} from '../src/world/coordinates.js';
// 完整地图保留树木、建筑和停车体，避免空地图掩盖出生重叠。
function setup(dx=20,shift=0){const p=ownedPineProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(s=>s.id);const g=new Game(p,()=>.5);g.start();g.mainlineSpeech=null;g.enemies=[];g.spawnTimer=g.fireClock=g.mainlineTalkDelay=999999;Object.assign(g.player,{x:COTTAGE.door.x+dx+shift,y:COTTAGE.door.y+10,vx:0,vy:0});assert.ok(g.summonVehicle());g.vehicle.hp*=.65;return g;}
// 真实更新推进到候门结束，不直接伪造室内或停车记录。
function enter(g){for(let i=0;i<40&&!g.cottage;i++)g.update(.05);assert.equal(g.cottage?.kind,'cottage');assert.equal(g.vehicle.active,false);assert.equal(g.progress.campParking.owned.length,1);}
// 当前停车记录必须先进入碰撞，再检查能否迈出一步。
function canWalk(g){updateParkingVisitors(g,0);assert.equal(blocked(g.player.x,g.player.y,12,g.trees,g.player),false);const before=canonical(g.player);for(let i=0;i<6;i++)g.update(.05,{x:1,y:0});assert.ok(worldDistance(before,g.player)>10);}
// JSON落盘经过正式存档清洗，并覆盖首页延后建图入口。
function reload(g,deferred){g.progress.patrol=capturePatrol(g);const r=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.5,()=>{},{deferWorld:deferred});if(deferred)r.initializeWorld();r.start();r.mainlineSpeech=null;r.spawnTimer=r.fireClock=r.mainlineTalkDelay=999999;return r;}

test('门口左右停车入屋后安全出门，直接读档与首页读档均能移动且不丢车',()=>{
 for(const dx of [-20,0,20])for(const deferred of [false,true]){const g=setup(dx);enter(g);const car=structuredClone(g.progress.campParking.owned);assert.ok(leaveCottage(g));const point=canonical(g.player),r=reload(g,deferred);assert.deepEqual(r.progress.campParking.owned,car);assert.equal(r.vehicle.active,false);assert.ok(worldDistance(point,r.player)<.01);canWalk(r);assert.ok(worldDistance(point,g.player)<.01);canWalk(g);}
});
test('旧档已卡在门口战车内时就近解困，自动上车和驾驶恢复且耐久弹药不变',()=>{
 const g=setup();enter(g);assert.ok(leaveCottage(g));const car=structuredClone(g.progress.campParking.owned[0]);Object.assign(g.player,{x:COTTAGE.door.x+50,y:COTTAGE.door.y+30});const old=canonical(g.player),r=reload(g,true);updateParkingVisitors(r,0);assert.equal(blocked(r.player.x,r.player.y,12,r.trees,r.player),false);assert.ok(worldDistance(r.player,old)>0&&worldDistance(r.player,old)<=64);assert.deepEqual(r.progress.campParking.owned,[car]);
 for(let i=0;i<25&&!r.vehicle.active;i++)r.update(.05);assert.equal(r.vehicle.active,true);assert.equal(r.vehicle.index,0);assert.equal(r.progress.campParking.owned.length,0);assert.equal(r.vehicle.hp/r.vehicle.maxHp,car.hp);assert.equal(r.vehicle.module.magazine.ammo,car.ammo);const start=canonical(r.player);for(let i=0;i<8;i++)r.update(.05,{x:0,y:1});assert.ok(worldDistance(start,r.player)>10);
});
test('进屋期间存档仍写安全屋外坐标，周期镜像出屋和读档不远距跳转',()=>{
 const g=setup(20,WORLD.width);enter(g);const outside=canonical(g.cottage.outside),r=reload(g,true);assert.ok(worldDistance(outside,r.player)<.01);assert.equal(r.cottage,null);canWalk(r);assert.ok(leaveCottage(g));assert.ok(g.player.x>WORLD.width);assert.ok(worldDistance(g.player,outside)<.01);canWalk(g);
});
test('入屋后门外新增车辆会重新选安全落点，旧屋外坐标不再盲用',()=>{
 const g=setup(-20);enter(g);const old={...g.cottage.outside};Object.assign(g.progress.campParking.owned[0],canonical({x:old.x,y:old.y+20}));assert.ok(leaveCottage(g));assert.ok(worldDistance(old,g.player)>0);canWalk(g);
});

test('门外完全被占据时保持屋内与原资产，不把角色送入障碍',()=>{
 const g=setup();enter(g);const room=g.cottage,position={x:g.player.x,y:g.player.y},cars=structuredClone(g.progress.campParking.owned);g.trees=[{...room.outside,radius:1000,hp:1}];assert.equal(leaveCottage(g),false);assert.equal(g.cottage,room);assert.deepEqual({x:g.player.x,y:g.player.y},position);assert.deepEqual(g.progress.campParking.owned,cars);assert.match(room.notice,/安全落脚点/);
});
