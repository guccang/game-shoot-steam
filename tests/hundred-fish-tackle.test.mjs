// 百鱼装备回归覆盖概率数学、真实抛竿、事务失败、负重与老存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {FISH_SPECIES,FISH_WATERS,naturalFishIndex} from '../src/config/fish-catalog.js';
import {FISHING_RODS,FISHING_BAITS,baitCount,fishCatchWeight} from '../src/config/fishing-tackle.js';
import {fishingOdds,sampleFishingOdds} from '../src/core/fishing-tackle.js';
import {buyOutdoorGear,equipFishingTackle,beginFishing,fishingControl,updateOutdoors,finishFishing,sellOutdoorFish} from '../src/core/outdoors.js';
import {normalizeOutdoors,outdoorInventory} from '../src/progression/outdoors.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {Game} from '../src/core/game.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {fishingShores} from '../src/world/outdoor-sites.js';
import {catLoad} from '../src/progression/load-weight.js';
// 使用真实商店和可用湖岸；仅准备自由巡林与钱包，不绕过购买或装备事务。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.coins=20000;const g=new Game(p,()=>.99999);g.state='playing';g.cottage={kind:'ammo'};g.vehicle.active=false;g.enemies=[];g.boss=null;g.mainlineSpeech=null;g.progress.living.patrolActive=false;g.livingPersist=()=>true;return g;}
// 正式状态机推进到咬钩，保持完整的准备、蓄力、扣饵与选鱼步骤。
function cast(g){g.cottage=null;Object.assign(g.player,fishingShores(g)[0]);assert.ok(beginFishing(g).ok);fishingControl(g,'press');updateOutdoors(g,1);assert.ok(fishingControl(g,'release'));}
test('百种鱼身份唯一，所有水域与装备组合归一，百种均可达且低阶竿无越级',()=>{
 assert.equal(FISH_SPECIES.length,100);assert.equal(new Set(FISH_SPECIES.map(f=>f.id)).size,100);assert.equal(new Set(FISH_SPECIES.map(f=>f.name)).size,100);assert.deepEqual(FISH_SPECIES.slice(0,3).map(f=>f.id),['crucian','perch','carp']);const found=new Set();
 for(const water of Object.keys(FISH_WATERS))for(const [rodId,rod] of Object.entries(FISHING_RODS))for(const baitId of Object.keys(FISHING_BAITS)){
  const pool=fishingOdds(rodId,baitId,water);assert.ok(pool.length);assert.ok(Math.abs(pool.reduce((s,e)=>s+e.probability,0)-1)<1e-12);for(const e of pool){assert.ok(e.fish.tier<=rod.tier&&e.fish.waters.includes(water));assert.ok(e.probability>0);found.add(e.fish.id);}
  assert.equal(sampleFishingOdds(pool,0).fish.id,pool[0].fish.id);assert.equal(sampleFishingOdds(pool,1).fish.id,pool.at(-1).fish.id);
 }assert.equal(found.size,100);for(const f of FISH_SPECIES){assert.ok(f.maxSize>f.minSize&&f.maxSize<=200&&f.mass>0&&f.coins>0);assert.ok(FISHING_BAITS[f.favoriteBait]);}
 assert.deepEqual(fishingOdds('unknown','bait','forest'),[]);assert.deepEqual(fishingOdds('rod','__proto__','forest'),[]);
});
test('偏好饵四倍权重和高阶竿稀有加成确实影响概率，抽样匹配展示分布',()=>{
 const fish=FISH_SPECIES.find(f=>f.tier===4&&f.waters.includes('forest')),bait=fish.favoriteBait,other=Object.keys(FISHING_BAITS).find(id=>id!==bait);assert.equal(fishCatchWeight(fish,'star',bait,'forest')/fishCatchWeight(fish,'star',other,'forest'),4);assert.ok(fishCatchWeight(fish,'star',bait,'forest')>fishCatchWeight(fish,'crystal',bait,'forest'));
 const pool=fishingOdds('star','glow','mine'),counts=new Map();for(let i=0;i<100000;i++){const e=sampleFishingOdds(pool,(i+.5)/100000);counts.set(e.fish.id,(counts.get(e.fish.id)||0)+1);}for(const e of pool)assert.ok(Math.abs((counts.get(e.fish.id)||0)-e.probability*100000)<=1,e.fish.id);
 for(const water of Object.keys(FISH_WATERS))for(let seed=0;seed<100000;seed+=113)assert.ok(FISH_SPECIES[naturalFishIndex(water,seed)].waters.includes(water));
});
test('老竿老饵和收藏不丢失，扩展装备非法字段清理且规范化幂等',()=>{
 const old=normalizeOutdoors({rod:true,bait:17,fish:{carp:3},collection:{carp:{count:8,best:55}}});assert.equal(old.selectedRod,'rod');assert.equal(old.selectedBait,'bait');assert.equal(old.bait,17);assert.equal(old.collection.carp.count,8);assert.equal(old.collection.carp.best,55);
 const data=normalizeOutdoors({rods:{star:true,bogus:true},baits:{worm:Infinity,glow:-7},selectedRod:'bogus',selectedBait:'__proto__'});assert.equal(data.selectedRod,'star');assert.equal(data.selectedBait,'bait');assert.equal(data.baits.worm,999);assert.equal(data.baits.glow,0);assert.equal(data.rods.bogus,undefined);assert.deepEqual(normalizeOutdoors(data),data);
});
test('购买和装备都先落盘，扩展竿饵计重正确，缺钱满饵超重拒绝',()=>{
 const g=scene(),before=structuredClone(g.progress),weight=catLoad(g).weight;assert.equal(buyOutdoorGear(g,'__proto__').ok,false);g.livingPersist=()=>false;assert.equal(buyOutdoorGear(g,'rod-star').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;
 assert.ok(buyOutdoorGear(g,'rod-star').ok);assert.equal(g.progress.coins,16200);assert.ok(Math.abs(catLoad(g).weight-weight-1.6)<1e-9);assert.equal(buyOutdoorGear(g,'rod-star').ok,false);assert.ok(buyOutdoorGear(g,'bait-worm').ok);assert.equal(baitCount(g.progress.outdoors,'worm'),20);assert.ok(Math.abs(outdoorInventory(g.progress).find(e=>e.id==='outdoor:bait-worm').weight-.24)<1e-9);
 g.livingPersist=()=>false;assert.equal(equipFishingTackle(g,'bait','worm').ok,false);assert.equal(g.progress.outdoors.selectedBait,'bait');g.livingPersist=()=>true;assert.ok(equipFishingTackle(g,'bait','worm').ok);assert.equal(validateProgress(g.progress).outdoors.selectedBait,'worm');assert.equal(equipFishingTackle(g,'rod','reed').ok,false);
 g.progress.outdoors.baits.worm=999;assert.equal(buyOutdoorGear(g,'bait-worm').ok,false);g.progress.coins=0;assert.equal(buyOutdoorGear(g,'bait-glow').ok,false);g.progress.coins=20000;g.progress.logistics.bagWood=999;assert.equal(buyOutdoorGear(g,'rod-reed').ok,false);
});
test('抛竿只扣选中饵，失败不扣、取消蓄力不扣、进行中不能换装，预览匹配实际鱼',()=>{
 const g=scene();assert.ok(buyOutdoorGear(g,'rod-star').ok);assert.ok(buyOutdoorGear(g,'bait-worm').ok);assert.ok(equipFishingTackle(g,'bait','worm').ok);g.cottage=null;Object.assign(g.player,fishingShores(g)[0]);assert.ok(beginFishing(g).ok);fishingControl(g,'press');fishingControl(g,'cancel');assert.equal(g.progress.outdoors.baits.worm,20);
 assert.ok(beginFishing(g).ok);assert.equal(equipFishingTackle(g,'bait','worm').ok,false);fishingControl(g,'press');g.livingPersist=()=>false;assert.equal(fishingControl(g,'release'),false);assert.equal(g.progress.outdoors.baits.worm,20);g.livingPersist=()=>true;fishingControl(g,'press');assert.ok(fishingControl(g,'release'));assert.equal(g.progress.outdoors.baits.worm,19);assert.equal(g.progress.outdoors.bait,0);assert.equal(g.fishing.species,sampleFishingOdds(fishingOdds('star','worm','forest'),.99999).index);assert.ok(g.fishing.size<=FISH_SPECIES[g.fishing.species].maxSize);
 fishingControl(g,'cancel');g.progress.outdoors.baits.worm=0;assert.equal(beginFishing(g).ok,false);
});
test('最高阶鱼通过完整控线可上岸，入护出售和重载保持新鱼历史',()=>{
 const g=scene();buyOutdoorGear(g,'rod-star');buyOutdoorGear(g,'bait-worm');equipFishingTackle(g,'bait','worm');cast(g);for(let i=0;i<230&&g.fishing.phase!=='bite';i++)updateOutdoors(g,.04);assert.equal(g.fishing.phase,'bite');fishingControl(g,'press');for(let i=0;i<1700&&g.fishing.phase==='fight';i++){const f=g.fishing;fishingControl(g,'lean',-(f.direction||1));fishingControl(g,f.tension>.7?'release':f.tension<.4?'press':f.reeling?'press':'release');updateOutdoors(g,.04);}assert.equal(g.fishing.phase,'landed');const fish=FISH_SPECIES[g.fishing.species];assert.equal(fish.tier,5);assert.ok(finishFishing(g,true).ok);assert.equal(g.progress.outdoors.fish[fish.id],1);g.cottage={kind:'ammo'};const coins=g.progress.coins;assert.ok(sellOutdoorFish(g).ok);assert.equal(g.progress.coins,coins+fish.coins);assert.equal(validateProgress(g.progress).outdoors.collection[fish.id].count,1);
});
