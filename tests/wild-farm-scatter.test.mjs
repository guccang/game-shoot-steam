// 大世界小方田验收：完整空地、旧档增量补充、驾驶发现、收割与持久化不重复发奖。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {ensureWildFarms} from '../src/core/farming/wild-farm.js';
import {farmAction} from '../src/core/farming/farm.js';
import {farmLandReason,farmApproach} from '../src/world/farm-land.js';
import {settlementAt} from '../src/world/settlements.js';
import {clearingSite} from '../src/progression/story/clearing-site.js';
import {worldDistance} from '../src/world/coordinates.js';
import {FARM_MAX_PLOTS,FARM_CROPS} from '../src/config/farm.js';
import {WILD_FARM_SCATTER as C} from '../src/config/wild-farm.js';

// 模拟已经领取固定田的旧档，只验证本轮增量；世界树木和碰撞保持正式生成。
function scene(){const p=freshRangerProgress();p.arrival=null;p.farm.wildMaps=['forest','jiuzhaigou'];const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.livingPersist=()=>true;return g;}

test('正式大世界分散完整2×2成熟小田，混合常见作物且避让道路树冠和任务场地',()=>{
 const g=scene();g.random=()=>{throw Error('不能消耗战斗随机流');};assert.ok(ensureWildFarms(g));
 const f=g.progress.farm;assert.ok(f.plots.length>=80);assert.ok(f.plots.length<=C.columns*C.rows*4);assert.equal(f.plots.length%4,0);
 assert.equal(f.wildScatterVersion,1);assert.equal(f.dug,0);assert.equal(f.planted,0);assert.ok(new Set(f.plots.map(p=>p.crop)).size>1);
 const centers=[];
 for(let i=0;i<f.plots.length;i+=4){const group=f.plots.slice(i,i+4),a=group[0],center={x:a.x+28,y:a.y+26};
  assert.deepEqual(group.map(p=>[p.x-a.x,p.y-a.y]),[[0,0],[56,0],[0,52],[56,52]]);
  assert.ok(centers.every(p=>worldDistance(p,center)>=C.minSeparation));centers.push(center);
  assert.ok(worldDistance(center,clearingSite(g.progress))>=clearingSite(g.progress).radius+120);
  for(const p of group){assert.equal(p.readyAt,0);assert.ok(p.wild);assert.ok(C.crops.includes(p.crop));assert.equal(settlementAt(p,80),null);assert.ok(farmApproach(g,p));assert.equal(farmLandReason(g,p,p.id),null);
   assert.ok(g.trees.every(t=>t.hp<=0||Math.abs(t.x-p.x)>=65*(t.size||1)||Math.abs(t.y-40-p.y)>=90*(t.size||1)));
  }
 }
 assert.ok(centers.some(p=>p.x>7200&&p.y>5600),'扩展林区也应出现小田');
 assert.deepEqual(validateProgress(g.progress).farm,f);
 const p=f.plots[0];Object.assign(g.player,farmApproach(g,p));assert.ok(farmAction(g,'harvest',{plot:p.id}).ok);assert.equal(g.progress.farm.lessonRewarded,false);assert.ok(g.progress.farm.seeds.every(n=>n===0));
});

test('旧田及资产保留；收获、死亡重建和读档不会补回作物或重复增加田地',()=>{
 const g=scene(),old={id:9,mapId:'forest',x:1800,y:1600,crop:7,plantedAt:100,readyAt:200,watered:true};
 g.progress.farm.plots=[old];g.progress.farm.nextId=10;g.progress.farm.lessonRewarded=true;const coins=g.progress.coins,seeds=[...g.progress.farm.seeds],unlocked=[...g.progress.farm.unlocked];
 assert.ok(ensureWildFarms(g));assert.deepEqual(g.progress.farm.plots[0],old);assert.equal(g.progress.coins,coins);
 const p=g.progress.farm.plots[1],count=g.progress.farm.plots.length;Object.assign(g.player,farmApproach(g,p));
 assert.equal(farmAction(g,'harvest',{plot:p.id}).coins,FARM_CROPS[p.crop].value);assert.equal(farmAction(g,'harvest',{plot:p.id}).ok,false);
 assert.deepEqual(g.progress.farm.seeds,seeds);assert.deepEqual(g.progress.farm.unlocked,unlocked);assert.equal(g.progress.farm.lessonRewarded,true);
 g.progress=validateProgress(structuredClone(g.progress));g.reset();g.state='playing';g.mainlineSpeech=null;
 assert.equal(ensureWildFarms(g),false);assert.equal(g.progress.farm.plots.length,count);assert.equal(g.progress.farm.plots.find(q=>q.id===p.id).crop,null);
 g.progress.farm.plots=g.progress.farm.plots.filter(q=>q.id!==p.id);assert.equal(ensureWildFarms(g),false);
});

test('驾驶时可生成发现，暂停副本不生成，保存失败完全回滚且重试可恢复',()=>{
 const g=scene();g.vehicle.active=true;g.player.flying=true;g.player.amphibious=true;g.player.treePass=true;
 const before=structuredClone(g.progress);g.state='paused';assert.equal(ensureWildFarms(g,10000),false);g.state='playing';g.realm={};assert.equal(ensureWildFarms(g,10000),false);g.realm=null;
 g.livingPersist=()=>false;assert.equal(ensureWildFarms(g,10000),false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.equal(ensureWildFarms(g,10001),false);assert.ok(ensureWildFarms(g,20000));assert.equal(g.vehicle.active,true);
 for(const p of g.progress.farm.plots)assert.ok(farmApproach({...g,player:{...g.player,flying:false,amphibious:false,treePass:false}},p));
});

test('容量不足四格时不生成残缺田，湖谷仍沿用固定田而不追加森林小田',()=>{
 const g=scene();g.progress.farm.plots=Array.from({length:FARM_MAX_PLOTS-2},(_,id)=>({id,x:1800+id*56,y:1600,mapId:'forest',crop:null,plantedAt:0,readyAt:0,watered:false}));
 const before=structuredClone(g.progress.farm.plots);assert.ok(ensureWildFarms(g));assert.deepEqual(g.progress.farm.plots,before);assert.equal(ensureWildFarms(g),false);
 const v=scene();v.mapId='jiuzhaigou';assert.equal(ensureWildFarms(v),false);assert.equal(v.progress.farm.wildScatterVersion,0);
});
