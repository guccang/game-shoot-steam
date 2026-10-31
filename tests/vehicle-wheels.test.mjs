import {WORLD} from '../src/world/coordinates.js';
// 轮式战车检查真实驾驶、停止、暂停、倒车、撞墙及车型隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, freshProgress } from '../src/game.js';
import { advanceVehicleWheels } from '../src/combat/vehicle-motion.js';

// 用无地形的已有秘境平台隔离驱动输入，仍执行正式 Game.update 和 driveBody。
function arena() {
  const game=new Game(freshProgress(),()=>.5); game.start();
  game.enemies=[]; game.trees=[]; game.spawnTimer=game.attackTimer=999;
  Object.assign(game.player,{x:900,y:750,arena:{x:900,y:750,radius:200},vx:0,vy:0});
  game.summonVehicle(); return game;
}

test('真实行驶滚动、反向回转，停车和暂停不重置',()=>{
  const g=arena();
  g.update(.05,{x:1,y:0});assert.ok(g.vehicle.wheelPhase>0);
  g.player.vx=0; const before=g.vehicle.wheelPhase;
  g.update(.05,{x:-1,y:0});assert.ok(g.vehicle.wheelPhase<before);
  g.player.vx=g.player.vy=0; const stopped=g.vehicle.wheelPhase;
  g.update(.05);assert.equal(g.vehicle.wheelPhase,stopped);
  g.pause();g.update(.05,{x:1,y:0});assert.equal(g.vehicle.wheelPhase,stopped);
});

test('真实边界阻挡不空转，下车及其他车型不推进轮角',()=>{
  const g=arena();g.player.x=1088-1e-6;const before=g.vehicle.wheelPhase;
  for(let i=0;i<12;i++)g.update(.05,{x:1,y:0});
  assert.equal(g.vehicle.wheelPhase,before);
  for(const v of [{index:0,active:false,wheelPhase:1},{index:1,active:true,wheelPhase:1}]) {
    advanceVehicleWheels(v,{x:30,y:0},{x:0,y:0});assert.equal(v.wheelPhase,1);
  }
});

test('循环边缘使用最近位移并限制相位范围',()=>{
  const v={index:0,active:true,wheelPhase:0};
  advanceVehicleWheels(v,{x:2,y:0},{x:WORLD.width-2,y:0});
  assert.ok(Math.abs(v.wheelPhase-4/12)<1e-9);
  for(let i=0;i<10000;i++)advanceVehicleWheels(v,{x:5,y:0},{x:0,y:0});
  assert.ok(Math.abs(v.wheelPhase)<Math.PI*2);
});
