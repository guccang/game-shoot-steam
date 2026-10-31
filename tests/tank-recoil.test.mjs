// 从正式开火与弹簧状态验证重炮后坐，确保表现不改变驾驶、供给和伤害。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {createRecoil,triggerRecoil,updateRecoil} from '../src/combat/recoil.js';
import {updateVehicle,vehicleMuzzle,vehicleGunPose,configureVehicle} from '../src/combat/vehicle.js';
import {tankHullPose} from '../src/config/tank-recoil.js';

// 保留正式战斗与供给，移除刷怪、地图碰撞和角色开火的干扰。
function arena(){
 const p=freshProgress();p.vehicleHulls[1]=1;p.vehicleIndex=1;p.vehicleLoadouts[1]=18;p.vehicleWeapons[0]=1;
 const g=new Game(p,()=>{},()=>.5);g.start();g.trees=[];g.enemies=[];g.boss=null;
 Object.assign(g.player,{x:900,y:750,arena:{x:900,y:750,radius:1000}});g.summonVehicle();
 const e=g.spawnEnemy(0,0,{x:1100,y:755});Object.assign(e,{hp:10000,maxHp:10000,speed:0});return g;
}

test('重炮只在真实发射时触发后坐，不移动玩家、不额外耗弹',()=>{
 const g=arena(),v=g.vehicle,before={x:g.player.x,y:g.player.y,hp:v.hp};
 updateVehicle(g,.01);assert.equal(g.projectiles.length,1);assert.equal(v.recoil.tankAge,0);assert.equal(v.module.magazine.ammo,0);
 const tip=vehicleMuzzle(g.player,{...v,recoil:createRecoil()});
 assert.equal(g.projectiles[0].x,tip.x);assert.equal(g.projectiles[0].y,tip.y);
 for(let i=0;i<80;i++)updateVehicle(g,.01);
 assert.equal(g.projectiles.length,1);assert.deepEqual({x:g.player.x,y:g.player.y,hp:v.hp},before);
 assert.deepEqual(tankHullPose(v),{x:0,y:0,compression:0});
 for(let i=0;i<180;i++)updateVehicle(g,.01);
 assert.equal(g.projectiles.length,2);assert.ok(v.recoil.tankAge<.5);
});

test('炮管急退后阻尼复进，30及120Hz均有明确行程并稳定回正',()=>{
 const peaks=[];
 for(const hz of [30,120]){
  const r=createRecoil();triggerRecoil(r,18);let peak=0;
  for(let i=0;i<hz*2;i++){updateRecoil(r,18,1/hz);peak=Math.max(peak,r.kick);assert.ok(r.kick>=-.01&&r.kick<=32);}
  assert.ok(peak>28);assert.ok(r.kick<.1);assert.equal(r.tankAge,.8);peaks.push(peak);
 }
 assert.ok(Math.abs(peaks[0]-peaks[1])<1);
});

test('125炮弹头离开后闪光消退，后坐继续恢复，下一发独立点亮',()=>{
 for(const hz of [30,60,120]){
  const r=createRecoil();triggerRecoil(r,18);assert.ok(r.flash>0);
  for(let i=0;i<Math.ceil(.06*hz);i++)updateRecoil(r,18,1/hz);
  assert.equal(r.flash,0);assert.ok(r.kick>20);
  triggerRecoil(r,18);assert.ok(r.flash>0&&r.flash<=.06);
 }
});

test('车体按开炮方向受力，炮口与绘制共用位移，转向不旋转已有后坐',()=>{
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const v={index:1,weaponIndex:18,angle,recoil:{...createRecoil(),tankAge:.07,tankAngle:angle,kick:30}};
  const hull=tankHullPose(v),pose=vehicleGunPose(v),m=vehicleMuzzle({x:10,y:20},v);
  assert.equal(pose.angle,angle);assert.ok(Math.abs(hull.x+Math.cos(angle)*5)<1e-8);
  assert.ok(Math.abs(m.x-(10+hull.x+Math.cos(angle)*(78*.75-pose.kick)))<1e-8);
  assert.ok(Math.abs(m.y-(25+hull.y+Math.sin(angle)*(78*.75-pose.kick)))<1e-8);
  v.angle+=1;assert.deepEqual(tankHullPose(v),hull);
 }
});

test('暂停冻结、换炮清理，低动态只保留微小炮管行程，其他车型不受影响',()=>{
 const g=arena();updateVehicle(g,.01);updateVehicle(g,.07);const v=g.vehicle,snapshot=JSON.stringify(v.recoil);
 g.state='paused';updateVehicle(g,.1);assert.equal(JSON.stringify(v.recoil),snapshot);
 assert.deepEqual(tankHullPose(v,true),{x:0,y:0,compression:0});assert.ok(vehicleGunPose(v,true).kick<=2.56);
 assert.deepEqual(tankHullPose({...v,index:3}),{x:0,y:0,compression:0});
 assert.equal(configureVehicle(g,0,1),true);assert.equal(v.recoil.tankAge,undefined);
 assert.deepEqual(tankHullPose(v),{x:0,y:0,compression:0});
});
