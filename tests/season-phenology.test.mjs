// 验证季节纯装饰保留真实空间与树位，并对冬季保持零额外绘制。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonGroundPatches, drawSeasonGround } from '../src/rendering/season-ground.js';
import { drawSeasonCanopy } from '../src/rendering/season-art.js';
import { forestLayout, pathDistance } from '../src/world/biomes.js';
import { isWaterScenery } from '../src/world/river-geometry.js';
import { isBeachScenery } from '../src/world/scenery.js';

test('林缘点缀不改树位，四角均在道路与水沙之外且不占营地中央',()=>{
 const before=JSON.stringify(forestLayout()),patches=seasonGroundPatches();assert.ok(patches.length>20);
 assert.equal(seasonGroundPatches(),patches);assert.equal(JSON.stringify(forestLayout()),before);
 for(const p of patches){
  assert.ok(Math.hypot((p.x-900)/245,(p.y-830)/240)>=1.1);
  for(const [dx,dy] of [[-20,-20],[20,-20],[-20,20],[20,20]]) {
   assert.ok(pathDistance(p.x+dx,p.y+dy)>=38);
   assert.equal(isWaterScenery(p.x+dx,p.y+dy),false);assert.equal(isBeachScenery(p.x+dx,p.y+dy),false);
  }
 }
});
test('冬季与非森林原景不新增地表或树冠图元',()=>{
 const forbidden=new Proxy({},{get(){throw Error('冬景不应调用额外绘制');}});
 for(const season of ['winter','original']) {
  drawSeasonGround(forbidden,null,season);drawSeasonCanopy(forbidden,'round',0,season,x=>x);
 }
});
