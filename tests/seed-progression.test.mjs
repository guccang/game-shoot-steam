// 种子分阶段获取、四类容量、旧档兼容及收获减半的正式事务回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FARM_CROPS,FARM_CATEGORIES,FARM_SEED_DROP,FARM_SEED_DOOR,farmSeedPool} from '../src/config/farm.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {validateFarm,grantFarmSeeds} from '../src/progression/farming/farm.js';
import {awardFarmSeedDrop,buyFarmSeeds} from '../src/core/farming/farm-seeds.js';
import {farmAction} from '../src/core/farming/farm.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {beginGardeningLesson} from '../src/progression/story/mainline-gardening.js';
// 保留完整正式存档和事务，仅替换随机数与存储接口。
function scene(rounds=0){const progress=freshProgress();progress.bosses=rounds;return {progress,state:'playing',mapId:'forest',player:{x:921,y:2855,hp:100},livingPersist:()=>true,random:()=>0,trees:[]};}
test('四类各十五种，旧作物身份稳定，所有阶段都有有效图集',()=>{
 assert.deepEqual(FARM_CATEGORIES.map(c=>FARM_CROPS.filter(p=>p.category===c.id).length),[15,15,15,15]);
 assert.deepEqual(FARM_CROPS.slice(0,8).map(c=>c.id),['daisy','carrot','strawberry','wheat','tomato','corn','pumpkin','sunflower']);
 const manifest=JSON.parse(readFileSync(new URL('../assets/farm/manifest.json',import.meta.url)));
 for(const [i,crop] of FARM_CROPS.entries())for(let stage=0;stage<3;stage++){const art=manifest.crops[`crop-${i}-${stage}`];assert.ok(art,crop.id);assert.ok(manifest.runtimeFiles.includes(art.file));assert.ok(art.rect[0]+art.rect[2]<=art.sheet[0]&&art.rect[1]+art.rect[3]<=art.sheet[1]);assert.deepEqual(art.anchor,[.5,1]);}
});
test('三轮以内反复击杀与领主均不能抽到中后期，保底不能绕过轮次门槛',()=>{
 for(let rounds=0;rounds<=3;rounds++){
  const g=scene(rounds);let seed=rounds+1;g.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let id=0;id<3000;id++){const drop=awardFarmSeedDrop(g,{id,hp:0,type:id%20?'enemy':'boss'});if(drop)assert.ok(FARM_CROPS[drop.crop].rounds<=rounds);}
  assert.ok(g.progress.farm.unlocked.filter(Boolean).length<=farmSeedPool({bosses:rounds}).length);assert.equal(g.progress.farm.unlocked[13],false);
 }
 for(const rounds of [0,3,6,10,15,20]){const g=scene(rounds);g.random=()=>.999999;g.progress.farm.seedDryKills=19;const drop=awardFarmSeedDrop(g,{hp:0,type:'enemy'});assert.ok(FARM_CROPS[drop.crop].rounds<=rounds);assert.equal(g.progress.farm.seedDryKills,0);}
 assert.deepEqual([0,3,6,10,15,20].map(bosses=>farmSeedPool({bosses}).length),[3,14,26,38,50,60]);
});
test('达到门槛只开放掉落，首获才解锁购买；所有新品种可从阶段池抽到',()=>{
 for(const [index,crop] of FARM_CROPS.entries()){
  const g=scene(crop.rounds);Object.assign(g.player,FARM_SEED_DOOR);g.progress.coins=10000;assert.equal(buyFarmSeeds(g,index).ok,false);
  const pool=farmSeedPool(g.progress),at=pool.findIndex(c=>c.index===index),total=pool.reduce((s,c)=>s+c.weight,0),mid=(pool.slice(0,at).reduce((s,c)=>s+c.weight,0)+crop.weight/2)/total;
  g.random=()=>mid;const drop=awardFarmSeedDrop(g,{hp:0,type:'boss'});assert.equal(drop.crop,index);assert.equal(drop.count,2);assert.ok(buyFarmSeeds(g,index).ok);
 }
 assert.equal(FARM_SEED_DROP.chance,.08);
});
test('普通野怪与领主掉落保留原概率，但不代做怪物营地找种任务',()=>{
 const g=scene();g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('neighbor-seeds'));g.progress.mainline.currentId='neighbor-seeds';g.progress.mainline.phase='doing';beginGardeningLesson(g.progress);g.random=()=>.999;
 const enemy={id:7,type:'enemy',hp:0};assert.equal(awardFarmSeedDrop(g,enemy),null);assert.equal(awardFarmSeedDrop(g,enemy),null);
 const drop=awardFarmSeedDrop(g,{id:8,type:'boss',hp:0});assert.ok(drop.count>0);assert.equal(g.progress.mainline.gardening.seedDrops,0);
});

test('旧八种的权限和田块原样保留，高园艺等级不自动解锁后续追加种类，迁移幂等',()=>{
 for(const version of [4,5]){const raw={version,xp:99999,seeds:[1,2,3,4,5,6,7,8],unlocked:Array(8).fill(true),inventory:[0,1],seedDryKills:7,plots:[{id:5,x:921,y:2855,mapId:'forest',crop:2,plantedAt:1000,readyAt:241000,watered:false}]},f=validateFarm(raw);assert.deepEqual(f.seeds.slice(0,8),raw.seeds);assert.equal(f.unlocked.filter(Boolean).length,8);assert.ok(f.unlocked.slice(8).every(v=>!v));assert.equal(f.plots[0].crop,2);assert.equal(f.plots[0].readyAt,241000);assert.deepEqual(validateFarm(f),f);}
 const g=scene();grantFarmSeeds(g.progress.farm,16,1);g.progress.farm.seeds[16]=0;g.progress=validateProgress(g.progress);Object.assign(g.player,FARM_SEED_DOOR);g.progress.coins=1000;assert.ok(buyFarmSeeds(g,16).ok);
});
test('所有作物收获金币统一减半，世界田块、反馈、旧库存结算同价且失败不扣作物',()=>{
 const oldValues=[60,220,480,390,840,1440,2280,1200,660,1080,420,1800,2160,2880,2520,360,1680];
 assert.deepEqual(FARM_CROPS.slice(0,17).map(c=>c.value),oldValues.map(v=>v/2));assert.deepEqual(FARM_CROPS.slice(0,8).map(c=>c.cost),[10,40,80,60,120,180,300,160]);
 for(const [crop,c] of FARM_CROPS.entries()){
  const g=scene();g.progress.coins=0;g.progress.farm.lessonRewarded=true;g.progress.farm.plots=[{id:0,mapId:'forest',x:921,y:2855,crop,plantedAt:0,readyAt:0,watered:false}];
  g.livingPersist=()=>false;assert.equal(farmAction(g,'harvest',{plot:0}).ok,false);assert.equal(g.progress.farm.plots[0].crop,crop);assert.equal(g.progress.coins,0);
  g.livingPersist=()=>true;const result=farmAction(g,'harvest',{plot:0});assert.equal(result.coins,c.value);assert.equal(g.progress.coins,c.value);assert.match(result.message,new RegExp('金币 \\+'+c.value));assert.equal(farmAction(g,'harvest',{plot:0}).ok,false);
  g.progress.farm.inventory[crop]=2;assert.equal(farmAction(g,'legacy').coins,c.value*2);assert.equal(g.progress.coins,c.value*3);
 }
});
