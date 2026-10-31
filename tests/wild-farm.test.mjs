// 固定田地回归：真实地图固定坐标、完整方阵、一次性持久化与教学事实隔离。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {ensureWildFarms} from '../src/core/wild-farm.js';
import {farmAction} from '../src/core/farm.js';
import {farmLandReason,farmApproach} from '../src/world/farm-land.js';
import {FARM_MAX_PLOTS} from '../src/config/farm.js';
import {WILD_FARM_SITES} from '../src/config/wild-farm.js';

// 固定随机种子让失败可复现，保留正式地形、树木与碰撞。
function scene(mapId='forest',seed=17){
 const p=freshRangerProgress();p.arrival=null;p.mapId=mapId;p.farm.wildScatterVersion=1;
 const g=new Game(p,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;});
 g.state='playing';g.mainlineSpeech=null;g.livingPersist=()=>true;return g;
}

test('两图均固定放置三处完整成熟方田，随机种子不改变位置或作物',()=>{
 for(const mapId of ['forest','jiuzhaigou'])for(const seed of [17,42,135]){
  const g=scene(mapId,seed);assert.equal(ensureWildFarms(g,10000),true);
  const f=g.progress.farm;assert.equal(f.plots.length,29);assert.equal(f.dug,0);assert.equal(f.planted,0);
  // 按间距连通分组，确认每组都是无缺格的2×2、3×3或4×4方田。
  const pending=new Set(f.plots),sizes=[];
  while(pending.size){const queue=[pending.values().next().value],group=[];pending.delete(queue[0]);while(queue.length){const p=queue.pop();group.push(p);for(const q of pending)if(Math.abs(p.x-q.x)<=56&&Math.abs(p.y-q.y)<=52){pending.delete(q);queue.push(q);}}const size=Math.sqrt(group.length);assert.ok([2,3,4].includes(size));assert.equal(new Set(group.map(p=>p.x)).size,size);assert.equal(new Set(group.map(p=>p.y)).size,size);sizes.push(size);}
  assert.ok([2,3,4].every(size=>sizes.includes(size)));
  assert.equal(sizes.length,3);for(const field of WILD_FARM_SITES[mapId])assert.ok(f.plots.some(p=>p.x===field.x&&p.y===field.y&&p.crop===field.crop));
  for(const p of f.plots){assert.equal(p.mapId,mapId);assert.equal(p.readyAt,0);assert.ok(farmApproach(g,p));assert.equal(farmLandReason({...g,progress:{farm:{plots:f.plots.filter(q=>q!==p)}}},p),null);}
  assert.deepEqual(validateProgress(g.progress).farm,f);
 }
 const a=scene('forest',17),b=scene('forest',42);ensureWildFarms(a);ensureWildFarms(b);assert.deepEqual(a.progress.farm.plots,b.progress.farm.plots);
});

test('收割、刷新、重建与往返不补成熟作物，原地消耗种子复种且不跳过教学',()=>{
 const g=scene();ensureWildFarms(g);const id=g.progress.farm.plots[0].id;
 Object.assign(g.player,g.progress.farm.plots[0]);
 assert.ok(farmAction(g,'harvest',{plot:id}).coins>0);assert.equal(g.progress.farm.lessonRewarded,false);
 assert.equal(g.progress.farm.dug,0);assert.equal(g.progress.farm.planted,0);
 const copy=validateProgress(structuredClone(g.progress));g.progress=copy;g.reset();g.state='playing';
 assert.equal(ensureWildFarms(g),false);assert.equal(g.progress.farm.plots.find(p=>p.id===id).crop,null);
 Object.assign(g.player,g.progress.farm.plots.find(p=>p.id===id));g.progress.farm.seeds[0]=1;assert.ok(farmAction(g,'plant',{plot:id,crop:0}).ok);assert.equal(g.progress.farm.seeds[0],0);
 assert.equal(g.progress.farm.planted,1);assert.equal(g.progress.farm.dug,0);
 const forest=structuredClone(g.progress.farm.plots);g.mapId='jiuzhaigou';g.reset();g.state='playing';g.wildFarmRetryAt=0;
 assert.ok(ensureWildFarms(g));assert.deepEqual(g.progress.farm.plots.filter(p=>p.mapId==='forest'),forest);
 g.mapId='forest';assert.equal(ensureWildFarms(g),false);
});

test('保存失败回滚并限频，暂停与副本不生成，满容量不覆盖玩家田块',()=>{
 const g=scene(),before=structuredClone(g.progress);g.livingPersist=()=>false;
 assert.equal(ensureWildFarms(g,10000),false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.equal(ensureWildFarms(g,10001),false);
 g.state='paused';assert.equal(ensureWildFarms(g,30000),false);g.state='playing';g.realm={};assert.equal(ensureWildFarms(g,30000),false);g.realm=null;
 assert.equal(ensureWildFarms(g,30000),true);
 const full=scene();full.progress.farm.plots=Array.from({length:FARM_MAX_PLOTS},(_,id)=>({id,x:id*56,y:620,mapId:'forest',crop:null,plantedAt:0,readyAt:0,watered:false}));
 const plots=structuredClone(full.progress.farm.plots);assert.ok(ensureWildFarms(full));assert.deepEqual(full.progress.farm.plots,plots);
});

test('固定位置被旧田占用则整处跳过，不覆盖、不挪位、不补残缺田',()=>{
 const g=scene(),field=WILD_FARM_SITES.forest[0],existing={id:40,mapId:'forest',x:field.x,y:field.y,crop:7,plantedAt:100,readyAt:480100,watered:true};
 g.progress.farm.plots=[existing];g.progress.farm.nextId=41;
 // 放置示范田不读取玩法随机数，固定位置不受战斗随机序列影响。
 g.random=()=>{throw Error('固定田地不应调用随机数');};
 assert.ok(ensureWildFarms(g));assert.deepEqual(g.progress.farm.plots[0],existing);assert.equal(g.progress.farm.plots.length,26);
 assert.ok(g.progress.farm.plots.slice(1).every(p=>p.x!==field.x&&p.id>=41));
});
