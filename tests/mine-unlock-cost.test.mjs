// 新深层解锁以正式钱包事务结算，不读取探索开发率；旧坡道不追收费用。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {openBasement} from '../src/progression/mining/mining.js';
import {MINING,minePoint,mineLayerUnlockCost,mineFreightCell} from '../src/config/mining.js';
import {RESOURCE_CAP} from '../src/config/resource-limits.js';
import {enterMine} from '../src/core/mining/mining.js';
import {travelMineLayer,currentMineLayer,mineLayerUnlockQuote} from '../src/core/mining/mine-layers.js';
import {mineDevelopment} from '../src/progression/mining/mine-layers.js';
// 使用地下室的真实入口和足额库存，不填充探索地图。
function scene(){const p=freshProgress();p.homeDecor.basement=true;p.coins=1000000;p.wood=200;openBasement(p.mining);p.mining.ore=100;p.mining.coreClears[1]=true;p.mining.coreCrystals[1]=1;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;g.cottage={kind:'cottage',floor:0,outside:{x:600,y:370}};Object.assign(g.player,MINING.hatch.goal);assert.ok(enterMine(g));return g;}
test('费用集中配置，按层递增且不会超过钱包上限',()=>{assert.deepEqual(mineLayerUnlockCost(2),{coins:10000,ore:10,wood:20});assert.deepEqual(mineLayerUnlockCost(3),{coins:30000,ore:20,wood:40});assert.equal(mineLayerUnlockCost(4).coins,90000);assert.equal(mineLayerUnlockCost(5).coins,270000);for(const n of Object.values(mineLayerUnlockCost(Number.MAX_SAFE_INTEGER)))assert.ok(Number.isSafeInteger(n)&&n<=RESOURCE_CAP);});
test('持晶核且开发不足百分之一也可开二层，首次扣费往返免费',()=>{
 const g=scene();assert.ok(mineDevelopment(currentMineLayer(g)).ratio<.01);g.progress.mining.bagOre={copper:9};const before=structuredClone(g.progress),cost=mineLayerUnlockQuote(g).cost;
 assert.ok(travelMineLayer(g,1).ok);assert.equal(g.cottage.depth,2);assert.equal(g.progress.coins,before.coins-cost.coins);assert.equal(g.progress.wood,before.wood-cost.wood);assert.equal(g.progress.mining.ore,before.mining.ore-cost.ore);assert.deepEqual(g.progress.mining.bagOre,{copper:9});
 assert.equal(g.progress.economyLog.expense['mine:layer:2:coins'],10000);assert.ok(travelMineLayer(g,-1).ok);const saved=structuredClone(g.progress);assert.equal(mineLayerUnlockQuote(g).unlocked,true);assert.ok(travelMineLayer(g,1).ok);assert.deepEqual(g.progress,saved);
});
test('分别缺金币、矿石、木材时不扣其他资源或生成地图',()=>{
 for(const key of ['coins','ore','wood']){const g=scene();assert.ok(travelMineLayer(g,1).ok);g.progress.mining.coreClears[2]=true;g.progress.mining.coreCrystals[2]=1;const cost=mineLayerUnlockCost(3);if(key==='ore')g.progress.mining.ore=cost.ore-1;else g.progress[key]=cost[key]-1;
  const before=structuredClone(g.progress),quote=mineLayerUnlockQuote(g);assert.equal(quote.affordable,false);assert.match(quote.missing.join(),/缺 1/);const result=travelMineLayer(g,1);assert.equal(result.ok,false);assert.match(result.message,/不足/);assert.deepEqual(g.progress,before);assert.equal(g.cottage.depth,2);
 }
});
test('保存失败或抛错原子回滚，重试与读档后免费使用旧坡道',()=>{
 const g=scene(),before=structuredClone(g.progress);for(const callback of [()=>false,()=>{throw Error('存储失败');}]){g.livingPersist=callback;assert.equal(travelMineLayer(g,1).ok,false);assert.deepEqual(g.progress,before);assert.equal(g.cottage.depth,1);}
 g.livingPersist=()=>true;assert.ok(travelMineLayer(g,1).ok);const seed=currentMineLayer(g).seed;assert.ok(travelMineLayer(g,-1).ok);g.progress=validateProgress(structuredClone(g.progress));g.progress.coins=g.progress.wood=g.progress.mining.ore=0;
 assert.equal(mineLayerUnlockQuote(g).affordable,true);assert.ok(travelMineLayer(g,1).ok);assert.equal(currentMineLayer(g).seed,seed);assert.equal(g.progress.coins,0);assert.equal(travelMineLayer(g,1).ok,false);
});
test('仓库升井、偏离格心、矿车骑乘和暂停不能付费开层',()=>{
 for(const state of ['depot','offset','cart','paused']){const g=scene();if(state==='depot')Object.assign(g.player,minePoint(mineFreightCell(currentMineLayer(g),1)));if(state==='offset')g.player.x+=30;if(state==='cart')g.cottage.ride=1;if(state==='paused')g.state='paused';const before=structuredClone(g.progress);assert.equal(travelMineLayer(g,1).ok,false);assert.deepEqual(g.progress,before);}
});
