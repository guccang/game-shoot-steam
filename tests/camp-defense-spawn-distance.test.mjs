// 兽潮出生距离回归：两处营门、首末波和横向边缘均保持在战区内，能正常接近和清场。
import test from 'node:test';
import assert from 'node:assert/strict';
import {hordeGame,hordeInput} from './helpers/horde-wave-pacing.mjs';
import {CAMP_GATES,campDefenseWave} from '../src/config/camp-defense.js';
import {updateCampDefense} from '../src/core/camp/camp-defense.js';
import {nearest,worldDistance} from '../src/world/coordinates.js';
for(const gate of CAMP_GATES){
 test(gate.name+'首末波出生外移且不越过战区边界',()=>{
  const g=hordeGame(42,gate.id),r=g.campDefense;
  for(const wave of [1,5])for(const roll of [0,.5,.999999]){
   g.enemies=[];g.random=()=>roll;Object.assign(r,{wave,timer:0,spawnTimer:0,spawned:0,waveKills:0});updateCampDefense(g,.01);
   const e=g.enemies[0],p=nearest(e,r.barrier),depth=(p.x-r.barrier.x)*gate.nx+(p.y-r.barrier.y)*gate.ny;
   assert.ok(Math.abs(depth-(305+roll*70))<1e-6);assert.ok(worldDistance(e,r.arena)+e.radius<r.arena.radius);assert.ok(worldDistance(e,g.player)>=215);assert.equal(e.level,wave+4);assert.equal(e.maxHp,campDefenseWave(wave).hp);
  }
 });
 test(gate.name+'外移后仍能用正式战车清完首波进入第二波',()=>{
  const g=hordeGame(42,gate.id);let elapsed=0;
  while(g.campDefense.wave===1&&g.campDefense.phase==='waves'&&elapsed<60){g.update(1/30,hordeInput(g));elapsed+=1/30;}
  assert.equal(g.campDefense.wave,2);assert.equal(g.campDefense.cleared,1);assert.equal(g.campDefense.kills,campDefenseWave(1).count);assert.equal(g.campDefense.reason,null);assert.ok(elapsed<30);
 });
}
