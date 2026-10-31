// 种子闭环回归：首获解锁、击杀保底、正式购种、保存回滚和库存播种。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {grantFarmSeeds,validateFarm} from '../src/progression/farm.js';
import {buyFarmSeeds,awardFarmSeedDrop} from '../src/core/farm-seeds.js';
import {farmAction} from '../src/core/farm.js';
import {FARM_CROPS,FARM_SEED_DROP,FARM_SEED_DOOR,FARM_SEED_SHOP,FARM_STOCK_CAP} from '../src/config/farm.js';
import {farmLandReason} from '../src/world/farm-land.js';
import {livingFacilityBlocked} from '../src/world/living-spaces.js';
// 柜台夹具保留正式存档与事务，仅替换持久化接口和随机数。
function scene(){const progress=freshProgress();progress.coins=100;return {progress,state:'playing',mapId:'forest',player:{...FARM_SEED_DOOR},livingPersist:()=>true,random:()=>0,trees:[]};}
test('新档全部锁定，首获后用完仍解锁，升级不解锁；旧档保留历史权限',()=>{
 const g=scene(),f=g.progress.farm;assert.ok(f.unlocked.every(v=>!v));f.xp=9999;assert.ok(validateFarm(f).unlocked.every(v=>!v));
 f.plots=[{id:0,mapId:'forest',x:900,y:600,crop:7,plantedAt:0,readyAt:0,wild:true}];assert.equal(validateFarm(f).unlocked[7],false);
 grantFarmSeeds(f,0,1);f.seeds[0]=0;assert.equal(validateFarm(f).unlocked[0],true);
 const old=validateFarm({version:4,xp:30,seeds:[0,0,0,1]});assert.deepEqual(old.unlocked,FARM_CROPS.map((_,i)=>[0,1,3].includes(i)));assert.deepEqual(validateFarm(old),old);
 assert.equal(grantFarmSeeds(f,0,-1),0);assert.equal(grantFarmSeeds(f,99,1),0);
});
test('普通怪一粒与领主两粒，死亡结算不重复，连续十九次未掉后必掉',()=>{
 const g=scene(),e={id:1,type:'enemy',hp:0};assert.equal(awardFarmSeedDrop(g,e).count,1);assert.equal(g.progress.farm.unlocked[0],true);assert.equal(awardFarmSeedDrop(g,e),null);
 e.id=2;assert.equal(awardFarmSeedDrop(g,e).count,1);assert.equal(awardFarmSeedDrop(g,{type:'boss',hp:0}).count,2);
 g.random=()=>.99;for(let n=0;n<FARM_SEED_DROP.pity-1;n++)assert.equal(awardFarmSeedDrop(g,{type:'enemy',hp:0}),null);
 g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.farm.seedDryKills,19);assert.equal(awardFarmSeedDrop(g,{type:'enemy',hp:0}).count,1);assert.equal(g.progress.farm.seedDryKills,0);assert.equal(g.progress.farm.unlocked[3],true);assert.equal(g.progress.farm.unlocked[7],false);
});
test('活怪、树木和副本活动不产种子也不推进保底',()=>{
 for(const extra of [{realm:{}},{story:{}},{workshopTrial:{}},{campDefense:{}},{fireActive:true},{livingPreview:true},{mapId:'arena'}]){const g={...scene(),...extra};assert.equal(awardFarmSeedDrop(g,{type:'enemy',hp:0}),null);assert.equal(g.progress.farm.seedDryKills,0);}
 for(const target of [{type:'tree',hp:0},{type:'enemy',hp:1},{type:'enemy',hp:0,football:true},{type:'enemy',hp:0,livingRequest:true}])assert.equal(awardFarmSeedDrop(scene(),target),null);
});
test('购买锁定、距离、余额、容量与参数均重新检查；骑乘可购且雏菊收费',()=>{
 const g=scene();assert.equal(buyFarmSeeds(g,0).ok,false);grantFarmSeeds(g.progress.farm,0,1);g.vehicle={active:true};
 assert.equal(buyFarmSeeds(g,0,5).ok,true);assert.equal(g.progress.coins,50);assert.equal(g.progress.farm.seeds[0],6);
 for(const count of [0,-1,2,1.5,Infinity])assert.equal(buyFarmSeeds(g,0,count).ok,false);
 assert.equal(buyFarmSeeds(g,0,10).ok,false);g.player.x+=200;assert.equal(buyFarmSeeds(g,0).ok,false);g.player={...FARM_SEED_DOOR};g.progress.farm.seeds[0]=FARM_STOCK_CAP;assert.equal(buyFarmSeeds(g,0).ok,false);
});
test('保存失败不扣金币和库存，播种只消耗库存不自动购买',()=>{
 const g=scene();grantFarmSeeds(g.progress.farm,0,1);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(buyFarmSeeds(g,0).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;g.player={x:900,y:2800};g.progress.farm.plots=[{id:0,mapId:'forest',...g.player,crop:null,plantedAt:0,readyAt:0,watered:false}];
 assert.equal(farmAction(g,'plant',{plot:0,crop:0,now:1000}).ok,true);assert.equal(g.progress.coins,100);assert.equal(g.progress.farm.seeds[0],0);
 g.progress.farm.plots[0].crop=null;assert.equal(farmAction(g,'plant',{plot:0,crop:0}).ok,false);assert.equal(g.progress.coins,100);assert.equal(g.progress.farm.unlocked[0],true);
});
test('小屋底座阻挡种地与穿行，门前和两侧可通行',()=>{
 const g=scene();assert.ok(farmLandReason(g,FARM_SEED_SHOP));assert.equal(livingFacilityBlocked(FARM_SEED_SHOP.x,FARM_SEED_SHOP.y,10,'forest'),true);
 assert.equal(livingFacilityBlocked(FARM_SEED_DOOR.x,FARM_SEED_DOOR.y,10),false);
 for(const dx of [-85,85])assert.equal(livingFacilityBlocked(FARM_SEED_SHOP.x+dx,FARM_SEED_SHOP.y,10),false);
});
