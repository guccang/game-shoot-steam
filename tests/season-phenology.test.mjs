// 验证季节纯装饰保留真实空间与树位，并对冬季保持零额外绘制。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonGroundPatches, drawSeasonGround, prepareSeasonGroundSteps } from '../src/rendering/season-ground.js';
import { drawSeasonCanopy } from '../src/rendering/season-art.js';
import { forestLayout, pathDistance } from '../src/world/biomes.js';
import { isWaterScenery } from '../src/world/river-geometry.js';
import { isBeachScenery } from '../src/world/scenery.js';

// 首块只处理附近树木，取消后复用已完成树的结果，不能重新退回全森林准备。
test('首屏季节点缀按区域准备，取消后可续建且不会遍历全森林',()=>{
 const view={x:768,y:384,w:388,h:388},work=prepareSeasonGroundSteps(view);
 assert.equal(work.next().done,false);work.return();
 const steps=[...prepareSeasonGroundSteps(view)].length;
 assert.ok(steps<forestLayout().length/20);assert.ok(seasonGroundPatches(view).length>0);
 assert.equal([...prepareSeasonGroundSteps(view)].length,0);
});

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

// 按旧绘制边缘筛选后，局部结果与完整布局逐项相同，包括原序号和绘制顺序。
test('局部查询保留跨块边缘、远区和世界边界的完整点缀及原顺序',()=>{
 const full=seasonGroundPatches();
 for(const view of [{x:768,y:384,w:388,h:388},{x:3600,y:2800,w:388,h:388},{x:-2,y:-2,w:388,h:388},{x:47614,y:35614,w:388,h:388}]){
  const visible=p=>p.x>=view.x-20&&p.x<=view.x+view.w+20&&p.y>=view.y-20&&p.y<=view.y+view.h+20;
  assert.deepEqual(seasonGroundPatches(view).filter(visible),full.filter(visible));
 }
});
