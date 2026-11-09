// 矿车建造沿用正式原子事务，验证背包补料、深层归属及失败回滚。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {freshMineLayer,mineLayer} from '../src/progression/mining/mine-layers.js';
import {minePoint} from '../src/config/mining.js';
import {buildMine} from '../src/core/mining/mining.js';
// 在合法已铺轨格施工，不依赖地表任务、加载或附近矿车自动收矿。
function scene(depth=1){
 const p=freshProgress();p.homeDecor.basement=true;p.wood=12;p.mining.ore=0;for(let d=2;d<=depth;d++)p.mining.layers[d]=freshMineLayer(d,{x:0,y:0},()=>.5);
 const g=new Game(p,()=>.5);g.state='playing';g.cottage={kind:'mine',depth,direction:1};g.livingPersist=()=>true;Object.assign(g.player,minePoint({x:0,y:0}));
 const l=mineLayer(g.progress.mining,depth);l.rails['0,0']=l.dug['0,0']=l.bridges['0,0']=true;l.carts=[];return g;
}
test('造矿车可只使用背包原矿，第三层25份原矿扣8份并在当前层建车',()=>{
 const g=scene(3);g.progress.mining.bagOre={rareMetal:25};assert.ok(buildMine(g,'cart').ok);
 assert.equal(g.progress.mining.ore,0);assert.deepEqual(g.progress.mining.bagOre,{rareMetal:17});assert.equal(g.progress.wood,0);
 assert.equal(mineLayer(g.progress.mining,3).carts.length,1);assert.equal(g.progress.mining.carts.length,0);
});
test('造矿车优先用库存矿石，再按铜、铁、稀有补足差额',()=>{
 const g=scene();g.progress.mining.ore=3;g.progress.mining.bagOre={copper:2,iron:2,rareMetal:5};const raw=structuredClone(g.progress.industry.raw);
 assert.ok(buildMine(g,'cart').ok);assert.equal(g.progress.mining.ore,0);assert.deepEqual(g.progress.mining.bagOre,{rareMetal:4});assert.deepEqual(g.progress.industry.raw,raw);
 const h=scene();h.progress.mining.ore=10;h.progress.mining.bagOre={copper:5};assert.ok(buildMine(h,'cart').ok);assert.equal(h.progress.mining.ore,2);assert.deepEqual(h.progress.mining.bagOre,{copper:5});
});
test('造矿车缺矿、缺木、缺轨或车位被占时不扣料，也不动附近车厢货物',()=>{
 for(const failure of ['ore','wood','rail','occupied']){
  const g=scene();g.progress.mining.bagOre={copper:failure==='ore'?7:8};if(failure==='wood')g.progress.wood=11;if(failure==='rail')delete g.progress.mining.rails['0,0'];
  g.progress.mining.carts=[{id:9,...minePoint({x:failure==='occupied'?0:1,y:0}),cargo:{copper:20},wheel:0}];
  const before=structuredClone(g.progress);assert.equal(buildMine(g,'cart').ok,false);assert.deepEqual(g.progress,before);
 }
});
test('造矿车保存失败不扣原矿或木材，重试成功一次且重复点击不再扣料',()=>{
 const g=scene(3);g.progress.mining.bagOre={iron:10};const before=structuredClone(g.progress);g.livingPersist=()=>false;
 assert.equal(buildMine(g,'cart').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(buildMine(g,'cart').ok);
 const saved=structuredClone(g.progress);assert.equal(buildMine(g,'cart').ok,false);assert.deepEqual(g.progress,saved);assert.deepEqual(g.progress.mining.bagOre,{iron:2});
});
