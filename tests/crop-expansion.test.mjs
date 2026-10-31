// 追加种类追加作物的存档身份与真实种植闭环，避免只加商品却无法种收。
import test from 'node:test';
import assert from 'node:assert/strict';
import {FARM_CROPS,FARM_CATEGORIES} from '../src/config/farm.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {grantFarmSeeds,validateFarm} from '../src/progression/farm.js';
import {farmAction} from '../src/core/farm.js';

test('旧十七种索引和存档库存完整保留，新追加种类默认锁定，ID及名称不重复',()=>{
 const ids=['daisy','carrot','strawberry','wheat','tomato','corn','pumpkin','sunflower','rice','soybean','cabbage','apple','pear','peach','orange','tulip','lavender'];
 assert.deepEqual(FARM_CROPS.slice(0,17).map(c=>c.id),ids);
 assert.equal(new Set(FARM_CROPS.map(c=>c.id)).size,60);assert.equal(new Set(FARM_CROPS.map(c=>c.name)).size,60);
 for(const category of FARM_CATEGORIES)assert.equal(FARM_CROPS.slice(17).filter(c=>c.category===category.id).length,category.id==='fruit'?10:11);
 const raw=freshProgress().farm;raw.seeds=ids.map((_,i)=>i+1);raw.unlocked=ids.map(()=>true);raw.inventory=ids.map((_,i)=>17-i);
 raw.plots=ids.map((_,i)=>({id:i,mapId:'forest',x:921+i*56,y:2855,crop:i,plantedAt:1000,readyAt:999999,watered:true}));
 const next=validateFarm(raw);
 for(const key of ['seeds','inventory','unlocked'])assert.deepEqual(next[key].slice(0,17),raw[key]);
 assert.ok(next.unlocked.slice(17).every(v=>!v));assert.ok(next.seeds.slice(17).every(v=>v===0));
 assert.deepEqual(next.plots.map(p=>p.crop),ids.map((_,i)=>i));assert.deepEqual(validateFarm(next),next);
 // 本轮追加三种也不能改变既有57种的库存、权限和田块身份。
 const previous={...raw,seeds:Array.from({length:57},(_,i)=>i+1),inventory:Array.from({length:57},(_,i)=>57-i),unlocked:Array(57).fill(true),plots:[{...raw.plots[0],crop:56}]},expanded=validateFarm(previous);
 for(const key of ['seeds','inventory','unlocked'])assert.deepEqual(expanded[key].slice(0,57),previous[key]);
 assert.deepEqual(expanded.seeds.slice(57),[0,0,0]);assert.deepEqual(expanded.unlocked.slice(57),[false,false,false]);assert.equal(expanded.plots[0].crop,56);
 assert.deepEqual(FARM_CROPS.slice(57).map(c=>c.id),['quinoa','asparagus','daffodil']);
});

test('全部新品种可播种、存档、成长并收获，未成熟不能提前结算',()=>{
 for(let crop=17;crop<FARM_CROPS.length;crop++){
  const spec=FARM_CROPS[crop],progress=freshProgress();progress.coins=0;progress.farm.lessonRewarded=true;
  progress.farm.plots=[{id:0,mapId:'forest',x:921,y:2855,crop:null,watered:false,plantedAt:0,readyAt:0}];grantFarmSeeds(progress.farm,crop,1);
  const g={progress,state:'playing',mapId:'forest',player:{x:921,y:2855,hp:100},trees:[],livingPersist:()=>true};
  assert.equal(farmAction(g,'plant',{plot:0,crop,now:1000}).ok,true,spec.name);assert.equal(g.progress.farm.seeds[crop],0);
  const readyAt=1000+spec.seconds*1000;assert.equal(g.progress.farm.plots[0].readyAt,readyAt);
  g.progress=validateProgress(g.progress);assert.equal(g.progress.farm.plots[0].crop,crop);
  assert.equal(farmAction(g,'harvest',{plot:0,now:readyAt-1}).ok,false);
  assert.equal(farmAction(g,'harvest',{plot:0,now:readyAt}).coins,spec.value);
  assert.equal(g.progress.coins,spec.value);assert.equal(g.progress.farm.plots[0].crop,null);
  assert.equal(g.progress.farm.xp,spec.xp);assert.ok(spec.value/spec.cost<=4);
 }
});
