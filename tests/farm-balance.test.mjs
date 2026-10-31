// 农田经济合同：验证解锁、旧档兼容、净收益和装备消费节奏，避免只检查配置自洽。
import test from 'node:test';
import assert from 'node:assert/strict';
import {FARM_CROPS,FARM_LEVEL_XP,farmLevel,farmLevelProgress} from '../src/config/farm.js';
import {freshFarm,validateFarm} from '../src/progression/farm.js';
import {freshProgress} from '../src/progression/progress.js';
import {RECOMMENDED_ECONOMY as economy,economyUpgradeCost} from '../src/config/economy.js';
import {simulateFarmEconomy,farmEconomyCatalog} from '../src/balance/farm-model.js';
test('园艺等级保留成长记录，新档种子需首次获得且雏菊购种收费',()=>{
 assert.equal(freshFarm().version,6);assert.equal(farmLevel(freshFarm()),1);
 for(let i=1;i<FARM_LEVEL_XP.length;i++){assert.equal(farmLevel({xp:FARM_LEVEL_XP[i]-1}),i);assert.equal(farmLevel({xp:FARM_LEVEL_XP[i]}),i+1);}
 assert.equal(farmLevelProgress({xp:3300}).nextCrop,null);assert.equal(FARM_CROPS[0].cost,10);assert.equal(FARM_CROPS[0].seconds,60);
 for(const crop of FARM_CROPS){assert.ok(crop.value>crop.cost);assert.ok(crop.cost/crop.value<=.4);}
 assert.ok(FARM_CROPS[6].seconds>FARM_CROPS[7].seconds);assert.ok(FARM_CROPS[6].value>FARM_CROPS[7].value);
});
test('旧档每个等级和档内进度保留，成熟时刻不重置，迁移幂等且不补金币',()=>{
 for(const version of [1,2,3])for(let xp=0;xp<=240;xp++){
  const farm=validateFarm({version,xp,plots:[{id:0,x:780,y:620,mapId:'forest',crop:1,plantedAt:1000,readyAt:101000,watered:true}]});
  assert.equal(farmLevel(farm),Math.min(8,1+Math.floor(xp/30)));
  assert.equal(farm.plots[0].readyAt,101000);assert.equal(farm.plots[0].watered,true);assert.deepEqual(validateFarm(farm),farm);
 }
});
test('木材独立定价且后期升级有上限，入门金币与同类追赶保留',()=>{
 const p=freshProgress();assert.deepEqual(economyUpgradeCost(p,'weapons',0,1),{coins:35,wood:9});
 for(const kind of ['weapons','heroes','turret','vehicle']){const cost=economyUpgradeCost(p,kind,1,19);assert.ok(cost.wood<=140);assert.ok(cost.coins<=2400);}
 const catalog=farmEconomyCatalog(),tank=catalog.equipment.find(r=>r.kind==='vehicle'&&r.index===6);assert.equal(tank.listWood,3200);assert.equal(tank.wood,3136);
 assert.equal(economy.weapons[3].coins,1200);assert.equal(economy.vehicles[1].coins,4800);
 const plain=economyUpgradeCost(p,'weapons',3,5);p.weapons[0]=15;
 assert.equal(economyUpgradeCost(p,'weapons',3,5).coins,Math.ceil(plain.coins*.3));
});
test('购种种田经济保留净收益，逐次往返和农活不超过总时间',()=>{
 const normal=simulateFarmEconomy(),dry=simulateFarmEconomy({water:false}),small=simulateFarmEconomy({plots:4,minutes:30});
 assert.equal(normal.net,normal.gross-normal.seedCost);assert.ok(normal.net>0&&dry.net>0);assert.ok(normal.seedCost>0&&dry.seedCost>0);
 assert.equal(normal.initialSeeds,8);assert.ok(normal.seedCost>0);assert.ok(normal.harvests>8);
 assert.ok(normal.netPerMinute>0);assert.ok(small.net>0);
 for(const s of [normal,dry,small])assert.ok(s.activeMinutes<=s.minutes);
});
test('快递情景使用真实库存，领取与农活共享时间预算，随机种子可复现',()=>{
 const a=simulateFarmEconomy({delivery:true,minutes:30,seed:7}),b=simulateFarmEconomy({delivery:true,minutes:30,seed:7});
 assert.deepEqual(a,b);assert.ok(a.parcelsClaimed>0);assert.equal(a.net,a.gross-a.seedCost);assert.ok(a.activeMinutes<=30);
 assert.throws(()=>simulateFarmEconomy({plots:512,minutes:1}),/不足以开垦/);
});
