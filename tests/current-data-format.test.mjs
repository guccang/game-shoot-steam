// 当前数据结构回归：存档往返、输入校验和退役迁移路径不再补物资或改写任务。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,freshRangerProgress,validateProgress} from '../src/progression/progress.js';
import {freshFarm,validateFarm} from '../src/progression/farm.js';
import {validateMainline} from '../src/progression/mainline-progress.js';
import {validatePatrol} from '../src/progression/patrol-progress.js';
import {validateRealms} from '../src/progression/realm-progress.js';
import {validateGameStatistics} from '../src/progression/game-statistics.js';
import {validateArrival} from '../src/config/ranger-arrival.js';
import {validateEconomy,RECOMMENDED_ECONOMY,ORIGINAL_ECONOMY} from '../src/config/economy.js';
import {createVehicle} from '../src/combat/vehicle.js';

import {nativeVehicleWeapon} from '../src/config/vehicle-armaments.js';
import {Game} from '../src/core/game.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';

// JSON 往返与游戏实际保存方式一致，不保留运行时原型或属性代理。
function roundTrip(value){return validateProgress(JSON.parse(JSON.stringify(value)));}

for(const make of [freshProgress,freshRangerProgress])test(make.name+' 当前存档往返稳定且不写入旧单车字段',()=>{
 const p=make(),first=roundTrip(p),second=roundTrip(first);
 assert.deepEqual(second,first);assert.equal(first.coins,p.coins);assert.equal(first.wood,p.wood);
 assert.deepEqual(first.vehicleHulls,p.vehicleHulls);assert.deepEqual(first.keepsakes,p.keepsakes);
 assert.equal(Object.hasOwn(first,'vehicleLevel'),false);assert.equal(Object.hasOwn(first,'vehicleWeapon'),false);
});

test('当前载具数组拥有唯一数据源，旧别名不覆盖选择、等级和实物挂载',()=>{
 const p=freshProgress(),gun=nativeVehicleWeapon(0).weaponIndex;
 p.vehicleHulls[0]=3;p.vehicleIndex=0;p.vehicleWeapons[gun]=2;p.vehicleLoadouts[0]=gun;
 p.vehicleLevel=20;p.vehicleWeapon=null;
 const next=roundTrip(p);assert.equal(next.vehicleHulls[0],3);assert.equal(next.vehicleLoadouts[0],gun);
 assert.equal(createVehicle(next,0).index,0);assert.equal(createVehicle(next,0).weaponIndex,gun);
 delete p.vehicleHulls;assert.equal(roundTrip(p).vehicleHulls.some(Boolean),false);
});

test('读取不补发原生主炮、交接物品、首通记录、种子或停车位',()=>{
 const p=freshProgress();p.vehicleHulls[0]=1;p.vehicleWeapons.fill(0);p.keepsakes={items:[]};p.materialBosses=[];p.bosses=8;
 p.mainline.currentId='first-farm';p.mainline.completed=['first-map'];p.campParking.owned=[];
 const next=roundTrip(p);assert.equal(next.vehicleWeapons.some(Boolean),false);assert.deepEqual(next.keepsakes.items,[]);
 assert.deepEqual(next.materialBosses,[]);assert.equal(next.farm.seeds.some(Boolean),false);assert.deepEqual(next.campParking.owned,[]);
});

test('当前任务和田地保留，旧版本不再转换完成顺序、经验和坐标',()=>{
 const p=freshProgress();p.mainline.currentId='first-farm';p.mainline.phase='doing';p.mainline.completed=['first-map'];
 p.farm.plots=[{id:7,mapId:'forest',x:1200,y:1600,crop:null,plantedAt:0,readyAt:0,watered:false}];
 const next=roundTrip(p);assert.equal(next.mainline.currentId,'first-farm');assert.equal(next.mainline.phase,'doing');assert.equal(next.farm.plots[0].x,1200);
 assert.deepEqual(validateMainline({...p.mainline,version:3}),validateMainline(null));
 assert.deepEqual(validateFarm({...p.farm,version:2}),freshFarm());
 assert.equal(validateArrival({version:2,phase:'ride',keys:true}),null);
});

test('巡游保留当前真实击杀，不按历史配额缩放；坏数值仍受约束',()=>{
 const p=validatePatrol({version:1,waveQuotaVersion:2,state:'active',wave:20,waveKills:2,kills:9,playerHp:Infinity});
 assert.equal(p.waveKills,2);assert.equal(p.kills,9);assert.ok(Number.isFinite(p.playerHp));assert.equal(Object.hasOwn(p,'respawnDelay'),false);
 const invalid=roundTrip({...freshProgress(),coins:-10,wood:Infinity});assert.ok(invalid.coins>=0);assert.ok(Number.isFinite(invalid.wood));
});

test('历史账本不再反推足球或累计统计，当前统计明确保留',()=>{
 const ledger={events:[{type:'challenge',source:'football:99'}]};
 assert.equal(validateRealms({records:{football:{best:5,clears:2}}},ledger).records.football.totalGoals,0);
 assert.equal(validateGameStatistics(null,{patrol:{kills:99}}).kills,0);
 assert.equal(validateGameStatistics({version:1,kills:12}).kills,12);
});

test('只接受完整的第四版经济配置，两套现行对照方案仍可运行',()=>{
 for(const config of [RECOMMENDED_ECONOMY,ORIGINAL_ECONOMY])assert.deepEqual(validateEconomy(config),config);
 for(const version of [1,2,3])assert.throws(()=>validateEconomy({...RECOMMENDED_ECONOMY,version}));
 const partial=structuredClone(RECOMMENDED_ECONOMY);partial.vehicles.pop();assert.throws(()=>validateEconomy(partial));
});

test('秘境检查点往返带当前载具，退役终点和守护车格不转换或退款',()=>{
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 const g=new Game(p,()=>.45);g.start();assert.ok(g.enterRealm('guardian'));
 const run=structuredClone(g.progress.realms.run);assert.equal(validateRealms({run}).run.mode,'guardian');
 const old=structuredClone(run);old.phase='won';old.stage=old.cleared=6;assert.equal(validateRealms({run:old}).run,null);
 const grid=structuredClone(run);grid.defenses=[{slot:0,kind:'vehicle',index:0,weaponIndex:0,level:1}];
 const restored=validateRealms({run:grid}).run;assert.deepEqual(restored.defenses,[]);assert.equal(restored.realmCoins,run.realmCoins);
});
