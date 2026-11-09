// 四矿种概率、真实货运事务与旧档迁移，防止改层数后重复掉矿或卸货变种。
import test from 'node:test';
import assert from 'node:assert/strict';
import {ORE_KEYS,oreCount,validOre,mineOreWeights,mineOreKind,CART_CAPACITY} from '../src/config/mine-freight.js';
import {mineCargoDisplay,MINE_ORE_COLORS} from '../src/rendering/mine-cargo.js';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {freshMineLayer,mineLayer} from '../src/progression/mining/mine-layers.js';
import {mineFreightReward,unloadMineFreight} from '../src/core/mining/mine-transactions.js';
import {MINING} from '../src/config/mining.js';
import {buildMine} from '../src/core/mining/mining.js';
import {backpackEntries} from '../src/progression/inventory/backpack.js';
// 隔离存档，第三层的入口与独立列车，材料仍走正式原子保存。
function scene(){
 const p=freshProgress();p.homeDecor.basement=true;p.wood=12;for(let d=2;d<=3;d++)p.mining.layers[d]=freshMineLayer(d,{x:0,y:0},()=>.5);
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.livingPersist=()=>true;g.cottage={kind:'mine',depth:3,direction:1};Object.assign(g.player,MINING.home);return g;
}
test('各层概率总和为100%，一层99.5%石矿/0.5%铜，铁和稀有严格为零',()=>{
 assert.deepEqual(mineOreWeights(1),{stone:9950,copper:50,iron:0,rareMetal:0});
 for(let d=1;d<=12;d++){const w=mineOreWeights(d);assert.equal(Object.values(w).reduce((a,b)=>a+b,0),10000);assert.ok(ORE_KEYS.every(key=>w[key]>=0));}
 for(const depth of [1,2,3,6]){
  const counts=Object.fromEntries(ORE_KEYS.map(key=>[key,0])),samples=100000;
  for(let n=0;n<samples;n++)counts[mineOreKind(depth,1847,{x:n%1000,y:Math.floor(n/1000)})]++;
  for(const key of ORE_KEYS){const expected=mineOreWeights(depth)[key]*samples/10000;if(!expected)assert.equal(counts[key],0);else assert.ok(Math.abs(counts[key]-expected)<Math.max(90,expected*.08),JSON.stringify({depth,key,counts}));}
 }
});
test('矿点种类不依赖抽取顺序、刷新和失败，层种子与再生轮次参与分布',()=>{
 const cell={x:20,y:30},kind=mineOreKind(3,1847,cell,60);for(let n=0;n<10;n++){mineOreKind(3,999,{x:n,y:40});assert.equal(mineOreKind(3,1847,cell,60),kind);}
 assert.ok(new Set(Array.from({length:100},(_,seed)=>mineOreKind(3,seed+1,cell))).size>1);
 assert.ok(new Set(Array.from({length:100},(_,cycle)=>mineOreKind(3,1847,cell,cycle*120))).size>1);
});
test('混装及旧矿车不改种类，旧背包原石合并一次且重量保持',()=>{
 const g=scene(),cargo={stone:12,copper:8,iron:7,rareMetal:5};mineLayer(g.progress.mining,3).rails['0,0']=true;
 mineLayer(g.progress.mining,3).carts=[{id:1,...MINING.home,cargo},{id:2,...MINING.home,cargo:{stone:100,copper:30,iron:20,rareMetal:10}}];g.progress.mining.bagOre={stone:2,copper:1};g.progress.industry.bag.rawStone=3;
 const p=validateProgress(structuredClone(g.progress));assert.deepEqual(mineLayer(p.mining,3).carts[0].cargo,cargo);assert.deepEqual(p.mining.bagOre,{stone:5,copper:1});assert.equal(p.industry.bag.rawStone,0);
 assert.deepEqual(mineLayer(p.mining,3).carts[1].cargo,{stone:100,copper:30,iron:20,rareMetal:10});assert.equal(oreCount(mineLayer(validateProgress(p).mining,3).carts[1].cargo),160);
 assert.deepEqual(validateProgress(p).mining.bagOre,p.mining.bagOre);assert.deepEqual(validOre({copper:3,iron:2}),{copper:3,iron:2});
 assert.equal(backpackEntries({progress:p}).find(e=>e.id==='ore:stone').weight,2.5);
});
test('每种矿物按实际矿点装车，保存失败不挖矿、不掉货，重试不重抽',()=>{
 for(const key of ORE_KEYS){const g=scene(),l=mineLayer(g.progress.mining,3);l.carts=[{id:1,...MINING.home,cargo:{}}];let cell;
  for(let x=0;x<10000;x++)if(mineOreKind(3,l.seed,{x,y:4})===key){cell={x,y:4};break;}assert.ok(cell,key);
  const change=(m,p,layer)=>{layer.dug[`${cell.x},4`]=true;},before=structuredClone(g.progress);g.livingPersist=()=>false;
  assert.equal(mineFreightReward(g,3,change,'开采',{cell}).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;
  const result=mineFreightReward(g,3,change,'开采',{cell});assert.ok(result.ok);assert.deepEqual(mineLayer(g.progress.mining,3).carts[0].cargo,{[key]:3});assert.equal(oreCount(g.progress.mining.bagOre),0);
 }
});
test('混装车和背包卸货守恒：石矿进建材，金属进各自原矿，失败完整保留',()=>{
 const g=scene(),l=mineLayer(g.progress.mining,3);l.carts=[{id:1,...MINING.home,cargo:{stone:5,copper:4,iron:3,rareMetal:2}}];g.progress.mining.bagOre={stone:2,iron:1};const before=structuredClone(g.progress);
 g.livingPersist=()=>false;unloadMineFreight(g,l.carts,MINING.home);assert.deepEqual(g.progress,before);g.cottage.freightRetry=0;g.livingPersist=()=>true;
 unloadMineFreight(g,l.carts,MINING.home);assert.equal(g.progress.mining.ore,7);assert.equal(g.progress.industry.raw.copper,4);assert.equal(g.progress.industry.raw.iron,4);assert.equal(g.progress.industry.raw.rareMetal,2);
 assert.equal(oreCount(g.progress.mining.bagOre),0);assert.deepEqual(mineLayer(g.progress.mining,3).carts[0].cargo,{});const saved=structuredClone(g.progress);unloadMineFreight(g,mineLayer(g.progress.mining,3).carts,MINING.home);assert.deepEqual(g.progress,saved);
});
test('矿车颜色与实物对应，混装各矿可见、空车无矿且展示有上限',()=>{
 assert.equal(new Set(Object.values(MINE_ORE_COLORS)).size,4);assert.deepEqual(mineCargoDisplay({}),[]);
 for(const key of ORE_KEYS)assert.deepEqual([...new Set(mineCargoDisplay({[key]:CART_CAPACITY}))],[key]);
 for(const cargo of [{stone:29,copper:1,iron:1,rareMetal:1},{stone:1,iron:1},{stone:10,copper:10,iron:10,rareMetal:10}]){const icons=mineCargoDisplay(cargo);assert.ok(icons.length<=12);assert.deepEqual([...new Set(icons)].sort(),Object.keys(cargo).sort());}
});
test('背包石矿优先用于造车，不耗铜铁稀有，保存往返保留余量',()=>{
 const g=scene(),l=mineLayer(g.progress.mining,3);l.rails['0,0']=true;g.progress.mining.bagOre={stone:10,copper:1,iron:1,rareMetal:1};assert.ok(buildMine(g,'cart').ok);
 assert.deepEqual(g.progress.mining.bagOre,{stone:2,copper:1,iron:1,rareMetal:1});assert.equal(mineLayer(g.progress.mining,3).carts.length,1);assert.deepEqual(validateProgress(g.progress).mining.bagOre,g.progress.mining.bagOre);
});
