// 生产回归覆盖真实Game的事务、经济守恒、空间覆盖、迁移和行动时钟。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {PRODUCTION as P,productionCrop} from '../src/config/farm-production.js';
import {FARM_CROPS,FARM_SEED_DOOR} from '../src/config/farm.js';
import {WAREHOUSE} from '../src/config/warehouse.js';
import {productionUnlocked,productionSalePlan,productionGoal,productionCropStock} from '../src/progression/farming/farm-production.js';
import {placeProduction,productionPlacement,updateProduction,setProductionKeep,craftProduction,useProduction} from '../src/core/farming/farm-production.js';
import {farmAction} from '../src/core/farming/farm.js';
import {updateWarehouseHarvest} from '../src/core/inventory/warehouse-harvest.js';
import {sellCrops} from '../src/core/inventory/cargo.js';
import {openBasement} from '../src/progression/mining/mining.js';
import {MINING as M,minePoint} from '../src/config/mining.js';
import {mineTerrain} from '../src/config/mine-ecology.js';
import {enterMine,updateMining,toggleMineDig,rideMineCart,toggleMineCart,buildMine} from '../src/core/mining/mining.js';
// 隔离存档与车队，收割目的地明确落在背包，避免旧测试夹具的在场载具干扰。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.wood=1000;p.mining.ore=200;const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.vehicles=[];g.trees=[];g.enemies=[];g.mainlineSpeech=null;g.livingPersist=()=>true;g.progress.production.returned=true;g.progress.production.minedOre=12;return g;}
// 搜索真实合法地形，并预留四向农田与加工台的位置。
function field(g){for(let y=1000;y<2500;y+=104)for(let x=500;x<2500;x+=112){const point={x,y,mapId:'forest'};Object.assign(g.player,point);if(!productionPlacement(g,point,'sprinkler').reason&&!productionPlacement(g,{...point,x:x+112},'bench').reason)return point;}throw Error('未找到合法测试田');}
// 创建指定成熟时间的真实田块，模拟已播种而不等待数分钟。
function plot(id,point,crop=1,readyAt=100000){return {id,...point,crop,plantedAt:1,readyAt,watered:false};}
// 地下使用真实入口和原地形，测试只预开运输走廊。
function mine(g){g.progress.homeDecor.basement=true;openBasement(g.progress.mining);g.cottage={kind:'cottage',floor:0,outside:M.home};Object.assign(g.player,M.hatch.goal);assert.ok(enterMine(g));g.progress.mining.seed=1847;}
// 新版天然洞厅中寻找真实岩壁，只有岩壁开掘才消耗便当。
function rock(g){for(let y=3;y<90;y++)for(let x=3;x<90;x++){const l=g.progress.mining;if(!mineTerrain({x,y},l).natural&&!mineTerrain({x:x-1,y},l).water){l.dug[`${x-1},${y}`]=true;Object.assign(g.player,minePoint({x:x-1,y}));return `${x},${y}`;}}throw Error('未找到岩壁');}
// 固定时间步推进正式矿区，覆盖停顿和暂停状态。
function tick(g,n,input={x:0,y:0}){for(let i=0;i<n;i++)updateMining(g,.05,input);}

test('旧档不赠奖励，非法数量截断，矿车润滑跨层恢复且不离线消耗',()=>{const p=freshProgress();delete p.production;p.mining.ore=13;let n=validateProgress(p);assert.equal(n.production.minedOre,13);assert.equal(n.production.returned,false);assert.equal(n.production.seedGift,false);p.production={stock:{meal:-1,juice:Infinity,oil:1e10},effects:{meal:1e8,juice:12.25},keep:[-1,999],sprinklers:[{mapId:'forest',x:NaN,y:0}]};n=validateProgress(p);assert.deepEqual(n.production.stock,{meal:0,juice:0,oil:999});assert.equal(n.production.effects.meal,100);assert.equal(n.production.effects.juice,12.25);assert.equal(n.production.keep[1],20);assert.equal(n.production.sprinklers.length,0);});
test('设施只在回地面后解锁，放置失败不扣料，不能覆盖农田，移动免费',()=>{const g=scene(),p=field(g);g.progress.production.returned=false;assert.equal(placeProduction(g,'sprinkler',p).ok,false);assert.equal(finishWatering(g,1000),true);g.livingPersist=()=>false;const before=structuredClone(g.progress);assert.equal(placeProduction(g,'sprinkler',p).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(placeProduction(g,'sprinkler',p).ok);const ore=g.progress.mining.ore;assert.ok(placeProduction(g,'sprinkler',{...p,x:p.x+56},1).ok);assert.equal(g.progress.mining.ore,ore);assert.equal(placeProduction(g,'sprinkler',{...p,x:p.x+56}).ok,false);});
test('两格覆盖包含近处对角，不含成熟、野生及异图田，手浇/雨水不叠加，暂停不处理',()=>{const g=scene(),p=field(g);assert.ok(placeProduction(g,'sprinkler',p).ok);g.progress.farm.plots=[plot(1,{...p,x:p.x+56}),plot(2,{...p,x:p.x+56,y:p.y+52}),plot(3,{...p,y:p.y+52},1,100),{...plot(4,{...p,x:p.x-56}),watered:true},plot(5,{...p,y:p.y-52,mapId:'jiuzhaigou'}),{...plot(6,{...p,y:p.y-52}),wild:true}];g.state='paused';assert.equal(finishWatering(g,1000),false);g.state='playing';assert.equal(finishWatering(g,1000),true);assert.equal(g.progress.farm.plots[0].readyAt,70000);assert.equal(g.progress.farm.plots[0].sprinklerWatered,true);assert.equal(g.progress.farm.plots[1].sprinklerWatered,true);assert.ok(g.progress.farm.plots.slice(2).every(p=>!p.sprinklerWatered));assert.equal(finishWatering(g,1000),false);const n=validateProgress(g.progress);assert.equal(n.farm.plots[0].sprinklerWatered,true);});
test('设备照料收获保留记录，建台一次赠种，失败不吞作物',()=>{const g=scene(),p=field(g);placeProduction(g,'sprinkler',p);g.progress.farm.plots=[plot(1,{...p,x:p.x+56})];g.progress.farm.nextId=2;finishWatering(g,1000);Object.assign(g.player,{x:p.x+56,y:p.y});g.livingPersist=()=>false;assert.equal(farmAction(g,'harvest',{plot:1,now:100001}).ok,false);assert.equal(g.progress.production.wateredHarvest,false);g.livingPersist=()=>true;assert.ok(farmAction(g,'harvest',{plot:1,now:100001}).ok);assert.equal(g.progress.farm.inventory[1],1);assert.ok(productionUnlocked(g.progress,'bench'));assert.ok(placeProduction(g,'bench',{...p,x:p.x+112}).ok);assert.equal(g.progress.farm.seeds[productionCrop('wheat')],2);const count=g.progress.farm.seeds[1];assert.ok(placeProduction(g,'bench',{...p,x:p.x+112},'bench').ok);assert.equal(g.progress.farm.seeds[1],count);});
test('两种出售共用跨来源保留配额，设置为零即可按原价出售',()=>{const g=scene();g.progress.production.bench={mapId:'forest',x:500,y:1200};g.progress.farm.inventory[1]=5;assert.ok(setProductionKeep(g,1,2).ok);assert.equal(setProductionKeep(g,1,3).ok,false);const second=FARM_CROPS.map(()=>0);second[1]=3;const plan=productionSalePlan(g.progress,[g.progress.farm.inventory,second]);assert.equal(plan[0][1],3);assert.equal(plan[1][1],3);Object.assign(g.player,{x:WAREHOUSE.x,y:WAREHOUSE.y+100});const coins=g.progress.coins;updateWarehouseHarvest(g,.05);assert.equal(g.progress.farm.inventory[1],2);assert.equal(g.progress.coins,coins+3*FARM_CROPS[1].value);Object.assign(g.player,FARM_SEED_DOOR);assert.equal(sellCrops(g).ok,false);assert.ok(setProductionKeep(g,1,0).ok);assert.ok(sellCrops(g).ok);assert.equal(g.progress.farm.inventory[1],0);assert.equal(g.progress.coins,coins+5*FARM_CROPS[1].value);});
test('加工消耗真实原料，配方权限与库存上限有效，保存异常无损',()=>{const g=scene(),p=field(g);g.progress.production.bench=p;const wheat=productionCrop('wheat');g.progress.farm.unlocked[1]=g.progress.farm.unlocked[wheat]=true;g.progress.farm.inventory[1]=g.progress.farm.inventory[wheat]=1;g.livingPersist=()=>{throw Error('存档不可用');};const before=structuredClone(g.progress);assert.equal(craftProduction(g,'meal').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(craftProduction(g,'meal').ok);assert.equal(g.progress.production.stock.meal,3);assert.equal(g.progress.farm.inventory[wheat],0);assert.equal(craftProduction(g,'meal').ok,false);assert.equal(craftProduction(g,'juice',1).ok,false);g.player.x+=200;assert.equal(craftProduction(g,'meal').ok,false);});
test('便当只在成功开掘后扣次数，失败与暂停不扣，20次后开放自定保留',()=>{const g=scene();mine(g);g.progress.production.stock.meal=3;assert.ok(useProduction(g,'meal').ok);assert.equal(useProduction(g,'meal').ok,false);const wall=rock(g);toggleMineDig(g);g.state='paused';tick(g,30);assert.equal(g.progress.production.effects.meal,100);g.state='playing';g.livingPersist=()=>false;tick(g,12);assert.equal(g.progress.production.effects.meal,100);assert.equal(g.progress.mining.dug[wall],undefined);g.livingPersist=()=>true;toggleMineDig(g);tick(g,11);assert.ok(g.progress.mining.dug[wall]);assert.equal(g.progress.production.effects.meal,99);tick(g,30);assert.equal(g.progress.production.effects.meal,99);g.progress.production.bench={mapId:'forest',x:500,y:1200};g.progress.production.mealDigs=20;assert.ok(setProductionKeep(g,1,7).ok);});
test('果饮只计地下实际步行，撞墙和矿车不消耗；油按单车行驶消耗且恢复不重置',()=>{const g=scene();mine(g);g.progress.production.stock.juice=1;assert.ok(useProduction(g,'juice').ok);tick(g,10);assert.equal(g.progress.production.effects.juice,180);tick(g,10,{x:1,y:0});assert.ok(g.progress.production.effects.juice<180);const rest=g.progress.production.effects.juice;g.state='paused';tick(g,20,{x:1,y:0});assert.equal(g.progress.production.effects.juice,rest);g.state='playing';Object.assign(g.player,M.home);buildMine(g,'rail');Object.assign(g.player,minePoint({x:1,y:0}));buildMine(g,'rail');Object.assign(g.player,M.home);buildMine(g,'cart');assert.ok(rideMineCart(g));g.progress.production.stock.oil=2;assert.ok(useProduction(g,'oil').ok);assert.equal(useProduction(g,'oil').ok,false);tick(g,20);assert.equal(g.progress.mining.carts[0].lubrication,180);toggleMineCart(g);tick(g,8);const oil=g.progress.mining.carts[0].lubrication;assert.ok(oil<180&&oil>179);assert.equal(g.progress.production.effects.juice,rest);const loaded=validateProgress(g.progress);assert.equal(loaded.mining.carts[0].lubrication,oil);assert.equal(loaded.production.effects.juice,rest);});

test('果饮和植物油按发现品种及乘车事实解锁，容量不足不扣原料',()=>{const g=scene(),p=field(g);g.progress.production.bench=p;const fruit=productionCrop('strawberry'),corn=productionCrop('corn');g.progress.farm.inventory[fruit]=g.progress.farm.inventory[corn]=2;assert.equal(craftProduction(g,'juice',fruit).ok,false);g.progress.farm.unlocked[fruit]=true;assert.ok(craftProduction(g,'juice',fruit).ok);assert.equal(g.progress.farm.inventory[fruit],1);assert.equal(g.progress.production.stock.juice,3);g.progress.farm.unlocked[corn]=true;assert.equal(craftProduction(g,'oil').ok,false);g.progress.production.rodeCart=true;assert.ok(craftProduction(g,'oil').ok);g.progress.production.stock.oil=P.maxStock-1;const n=g.progress.farm.inventory[corn];assert.equal(craftProduction(g,'oil').ok,false);assert.equal(g.progress.farm.inventory[corn],n);});
test('行走速度真实增加15%，持续撞墙不扣果饮，消费保存失败不增加效果',()=>{const a=scene(),b=scene();mine(a);mine(b);b.progress.production.stock.juice=2;b.livingPersist=()=>false;assert.equal(useProduction(b,'juice').ok,false);assert.equal(b.progress.production.effects.juice,0);assert.equal(b.progress.production.stock.juice,2);b.livingPersist=()=>true;useProduction(b,'juice');tick(a,1,{x:1,y:0});tick(b,1,{x:1,y:0});assert.ok(Math.abs((b.player.x-M.home.x)/(a.player.x-M.home.x)-1.15)<.0001);rock(b);tick(b,100,{x:1,y:0});const rest=b.progress.production.effects.juice;tick(b,100,{x:1,y:0});assert.equal(b.progress.production.effects.juice,rest);});
test('不同层同编号矿车的润滑互不串用，归一化保存不补充余量',()=>{const g=scene();mine(g);Object.assign(g.player,M.home);buildMine(g,'rail');buildMine(g,'cart');const layer=structuredClone(g.progress.mining);layer.layers={};g.progress.mining.layers[2]=layer;g.cottage.depth=2;g.progress.production.stock.oil=1;assert.ok(useProduction(g,'oil').ok);assert.equal(g.progress.mining.carts[0].lubrication||0,0);assert.equal(g.progress.mining.layers[2].carts[0].lubrication,180);g.progress.mining.layers[2].carts[0].lubrication=123.75;assert.equal(validateProgress(g.progress).mining.layers[2].carts[0].lubrication,123.75);});

// 空背包与空货舱也能建造；只校验8矿石和20仓库木材，不依赖种植或洒水器教学。
test('加工台只需建材足够，缺料和保存失败不扣费，移动不再收费',()=>{
 const g=scene(),point=field(g),p=g.progress;p.production.returned=false;p.production.minedOre=0;p.production.wateredHarvest=false;p.farm.inventory.fill(0);p.farm.seeds.fill(0);p.logistics.builds.forEach(b=>b.cargo.fill(0));
 assert.ok(productionUnlocked(p,'bench'));assert.match(productionGoal(p),/8矿石＋20仓库木材/);assert.equal(productionCropStock(p,1).total,0);
 for(const [ore,wood] of [[7,20],[8,19]]){p.mining.ore=ore;p.wood=wood;const before=structuredClone(p);assert.equal(placeProduction(g,'bench',point).ok,false);assert.deepEqual(g.progress,before);}
 p.mining.ore=8;p.wood=20;g.livingPersist=()=>false;const before=structuredClone(p);assert.equal(placeProduction(g,'bench',point).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;assert.ok(placeProduction(g,'bench',point).ok);assert.equal(g.progress.mining.ore,0);assert.equal(g.progress.wood,0);assert.equal(g.progress.farm.seeds[productionCrop('wheat')],2);assert.equal(g.progress.farm.seeds[productionCrop('carrot')],2);
 assert.ok(placeProduction(g,'bench',point,'bench').ok);assert.equal(g.progress.farm.seeds[productionCrop('wheat')],2);
});
// 货舱可独立供料，也可跨背包和不同车型拼齐配方；重复提交不能凭空生成补给。
test('加工统一扣除背包和所有已拥有载具库存，优先使用背包',()=>{
 for(const source of ['cargo','mixed']){
  const g=scene(),point=field(g),p=g.progress,w=productionCrop('wheat'),c=productionCrop('carrot');p.production.bench=point;p.vehicleHulls.fill(0);p.vehicleHulls[0]=p.vehicleHulls[1]=1;p.farm.unlocked[w]=p.farm.unlocked[c]=true;
  p.logistics.builds[0].cargo[w]=1;p.logistics.builds[1].cargo[c]=1;if(source==='mixed')p.farm.inventory[w]=1;
  assert.ok(craftProduction(g,'meal').ok);assert.equal(g.progress.production.stock.meal,3);assert.equal(g.progress.farm.inventory[w],0);assert.equal(g.progress.logistics.builds[0].cargo[w],source==='mixed'?1:0);assert.equal(g.progress.logistics.builds[1].cargo[c],0);
  const after=structuredClone(g.progress);assert.equal(craftProduction(g,'meal').ok,false);assert.deepEqual(g.progress,after);
 }
});
// 失败事务不得先扣其中一种原料，归一化和重载必须保留实际货舱余额。
test('货舱原料不足、存档失败、容量不足均不扣料，成功后可正确重载',()=>{
 const g=scene(),point=field(g),p=g.progress,w=productionCrop('wheat'),c=productionCrop('carrot');p.production.bench=point;p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.farm.unlocked[w]=p.farm.unlocked[c]=true;p.logistics.builds[0].cargo[w]=2;p.logistics.builds[1].cargo[c]=2;
 let before=structuredClone(p);assert.equal(craftProduction(g,'meal').ok,false);assert.deepEqual(g.progress,before);
 p.vehicleHulls[1]=1;before=structuredClone(p);g.livingPersist=()=>false;assert.equal(craftProduction(g,'meal').ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>{throw Error('保存失败');};assert.equal(craftProduction(g,'meal').ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;p.production.stock.meal=P.maxStock-1;before=structuredClone(p);assert.equal(craftProduction(g,'meal').ok,false);assert.deepEqual(g.progress,before);
 p.production.stock.meal=0;assert.ok(craftProduction(g,'meal').ok);const loaded=validateProgress(g.progress);assert.equal(loaded.logistics.builds[0].cargo[w],1);assert.equal(loaded.logistics.builds[1].cargo[c],1);assert.equal(loaded.production.stock.meal,3);
});
// 果饮和油也使用同一货舱口径，仍保持发现品种与乘坐矿车的配方条件。
test('货舱水果与玉米可制作果饮和植物油',()=>{
 const g=scene(),point=field(g),p=g.progress,fruit=productionCrop('strawberry'),corn=productionCrop('corn');p.production.bench=point;p.vehicleHulls[1]=1;p.farm.unlocked[fruit]=p.farm.unlocked[corn]=true;p.logistics.builds[1].cargo[fruit]=p.logistics.builds[1].cargo[corn]=1;
 assert.ok(craftProduction(g,'juice',fruit).ok);assert.equal(g.progress.logistics.builds[1].cargo[fruit],0);assert.equal(craftProduction(g,'oil').ok,false);g.progress.production.rodeCart=true;assert.ok(craftProduction(g,'oil').ok);assert.equal(g.progress.logistics.builds[1].cargo[corn],0);
});

// 保留原事务断言，但通过真实扫描时钟等待一轮落水。
function finishWatering(g,now){const first=updateProduction(g,now);if(g.state!=='playing')return first;g.time+=1.25;return updateProduction(g,now)||first;}
