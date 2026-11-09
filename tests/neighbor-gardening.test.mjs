// 邻里功能委托专项：验证真实战斗来源、交易交付、同田农活和存档迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {validateMainline} from '../src/progression/story/mainline-progress.js';
import {MAINLINE_IDS,MAINLINE_SITES,currentMainlineTask} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS,pendingRestoration} from '../src/config/town-restoration.js';
import {MONSTER_CAMPS} from '../src/config/monster-camps.js';
import {updateMonsterCamps} from '../src/core/battle/monster-camps.js';
import {updateMainline,advanceMainlineSpeech,completeMainline,mainlineObjective} from '../src/core/story/mainline-manager.js';
import {awardFarmSeedDrop,buyFarmSeeds} from '../src/core/farming/farm-seeds.js';
import {farmAction} from '../src/core/farming/farm.js';
import {grantFarmSeeds} from '../src/progression/farming/farm.js';
import {worldNavigationObjective} from '../src/core/navigation/world-navigation.js';
import {FARM_SEED_DOOR,FARM_CROPS} from '../src/config/farm.js';
// 通过正式见面对白接取；修复夹具只隔离建筑前置，不代做委托目标。
function scene(id,accept=true){
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.restoration.cottageRested=true;p.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf(id));p.coins=100;
 const g=new Game(p,()=>.99);g.state='playing';g.enemies=[];g.trees=[];Object.assign(g.player,MAINLINE_SITES.camp);
 if(accept){updateMainline(g,0);assert.ok(advanceMainlineSpeech(g));}return g;
}
// 返回真实交付地点，清除测试留下的战场对象，不直接更改任务条件。
function report(g){g.enemies=[];g.boss=null;g.player.arena=null;g.mainlineSpeech=null;Object.assign(g.player,MAINLINE_SITES.camp);updateMainline(g,0);}
// 田块是空地夹具，播种、浇水与收获一律通过正式事务。
function emptyPlots(g){Object.assign(g.player,{x:900,y:2800});g.progress.farm.plots=[0,1].map(id=>({id,mapId:'forest',x:900+id*56,y:2800,crop:null,plantedAt:0,readyAt:0,watered:false}));g.progress.farm.nextId=2;}

test('新档按找种、购买、种植、照顾推进；旧档当前任务与领奖阶段保持并补新任务',()=>{
 assert.deepEqual(MAINLINE_IDS.slice(0,6),['first-map','neighbor-seeds','neighbor-seed-shop','first-farm','first-patrol','pistol-upgrade']);
 for(const phase of ['meet','doing','report']){const old=validateMainline({version:6,completed:['first-map'],phase});assert.equal(currentMainlineTask(old).id,'first-farm');assert.equal(old.phase,phase);assert.deepEqual(validateMainline(old),old);}
 const ids=MAINLINE_IDS.filter(id=>!id.startsWith('neighbor-'));
 const old=validateMainline({version:6,completed:ids,phase:'complete'});assert.equal(currentMainlineTask(old).id,'neighbor-seeds');assert.equal(old.phase,'meet');
});

test('旧库存与普通野怪不代做；真实营地清空掉种、永久解锁且重复结算无效',()=>{
 const g=scene('neighbor-seeds',false);grantFarmSeeds(g.progress.farm,0,2);assert.equal(g.progress.mainline.gardening.seedDrops,0);
 awardFarmSeedDrop(g,{id:1,type:'enemy',hp:0});assert.equal(g.progress.mainline.gardening.seedDrops,0);
 updateMainline(g,0);assert.ok(advanceMainlineSpeech(g));Object.assign(g.player,{x:900,y:2800});
 const stray=g.spawnEnemy(0,0,{x:940,y:2800},{ambient:true});g.hit(stray,1e6);assert.equal(g.progress.mainline.gardening.seedDrops,0);
 Object.assign(g.player,MONSTER_CAMPS[0]);updateMonsterCamps(g,.04);const actors=g.enemies.filter(e=>e.monsterCamp===MONSTER_CAMPS[0].id);
 for(const e of actors.slice(0,4))g.hit(e,1e6);assert.equal(g.progress.mainline.gardening.seedDrops,0);const enemy=actors[4];g.hit(enemy,1e6);
 assert.equal(g.progress.mainline.gardening.seedDrops,1);assert.equal(g.progress.farm.seeds[0],3);assert.equal(g.progress.farm.unlocked[0],true);
 assert.equal(awardFarmSeedDrop(g,enemy),null);assert.equal(g.progress.farm.seeds[0],3);
 const saved=validateProgress(structuredClone(g.progress));assert.deepEqual(saved.mainline.gardening,g.progress.mainline.gardening);
 report(g);assert.equal(g.progress.mainline.phase,'report');const before=structuredClone(g.progress);g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.deepEqual(g.progress,before);
 g.mainlinePersist=()=>true;assert.ok(completeMainline(g));assert.equal(g.progress.farm.seeds[0],2);assert.equal(g.progress.coins,140);assert.equal(completeMainline(g),false);
});

test('副本、试射、活怪及生活任务怪不能触发委托掉种',()=>{
 for(const extra of [{story:{}},{realm:{}},{workshopTrial:{}},{livingPreview:true},{campDefense:{}},{fireActive:true}]){const g={...scene('neighbor-seeds'),...extra};assert.equal(awardFarmSeedDrop(g,{id:7,type:'enemy',hp:0}),null);assert.equal(g.progress.mainline.gardening.seedDrops,0);}
 for(const enemy of [{id:7,type:'enemy',hp:1},{id:7,type:'tree',hp:0},{id:7,type:'enemy',hp:0,livingRequest:'test'}]){const g=scene('neighbor-seeds');assert.equal(awardFarmSeedDrop(g,enemy),null);assert.equal(g.progress.mainline.gardening.seedDrops,0);}
});

test('购种只记录接取后正确品种的成功交易，交付扣一粒并保留自种一粒',()=>{
 const g=scene('neighbor-seed-shop');grantFarmSeeds(g.progress.farm,0,2);grantFarmSeeds(g.progress.farm,1,1);
 assert.equal(g.progress.mainline.gardening.purchased,0);assert.equal(buyFarmSeeds(g,0).ok,false);
 Object.assign(g.player,FARM_SEED_DOOR);g.livingPersist=()=>false;assert.equal(buyFarmSeeds(g,0).ok,false);assert.equal(g.progress.mainline.gardening.purchased,0);
 g.livingPersist=()=>true;assert.ok(buyFarmSeeds(g,1).ok);assert.equal(g.progress.mainline.gardening.purchased,0);
 assert.ok(buyFarmSeeds(g,0).ok);assert.ok(buyFarmSeeds(g,0).ok);assert.equal(g.progress.mainline.gardening.purchased,2);assert.equal(g.progress.coins,40);
 g.progress=validateProgress(structuredClone(g.progress));report(g);assert.equal(mainlineObjective(g).label,'交付种子 · 青芽');
 const before=structuredClone(g.progress);g.mainlinePersist=()=>false;assert.equal(completeMainline(g),false);assert.deepEqual(g.progress,before);
 g.mainlinePersist=()=>true;assert.ok(completeMainline(g));assert.equal(g.progress.farm.seeds[0],6);assert.equal(g.progress.farm.unlocked[0],true);assert.deepEqual(g.progress.mainline.seedRewards,['neighbor-seed-shop']);assert.equal(currentMainlineTask(g.progress.mainline).id,'first-farm');
});

test('待交付种子被用掉会恢复补买指引，不能空手交付',()=>{
 const g=scene('neighbor-seed-shop');grantFarmSeeds(g.progress.farm,0,1);Object.assign(g.player,FARM_SEED_DOOR);buyFarmSeeds(g,0);buyFarmSeeds(g,0);report(g);assert.equal(g.progress.mainline.phase,'report');
 g.progress.farm.seeds[0]=0;updateMainline(g,0);assert.equal(g.progress.mainline.phase,'doing');assert.equal(mainlineObjective(g).key,'seedShop');assert.equal(completeMainline(g),false);
});

test('照顾委托绑定新播胡萝卜田，错误品种、其他田和失败事务不计入，读档可继续收获',()=>{
 const g=scene('neighbor-garden');emptyPlots(g);grantFarmSeeds(g.progress.farm,0,1);grantFarmSeeds(g.progress.farm,1,3);
 farmAction(g,'plant',{plot:1,crop:0,now:1000});assert.equal(g.progress.mainline.gardening.planted,0);
 g.livingPersist=()=>false;assert.equal(farmAction(g,'plant',{plot:0,crop:1,now:1000}).ok,false);assert.equal(g.progress.mainline.gardening.planted,0);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'plant',{plot:0,crop:1,now:1000}).ok);assert.equal(g.progress.mainline.gardening.plotId,0);
 assert.ok(farmAction(g,'water',{plot:1,now:2000}).ok);assert.equal(g.progress.mainline.gardening.watered,0);
 g.livingPersist=()=>false;assert.equal(farmAction(g,'water',{plot:0,now:2000}).ok,false);assert.equal(g.progress.mainline.gardening.watered,0);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'water',{plot:0,now:2000}).ok);assert.equal(g.progress.mainline.gardening.watered,1);assert.equal(g.progress.farm.plots[0].readyAt,91000);
 g.progress=validateProgress(structuredClone(g.progress));updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');
 assert.equal(farmAction(g,'harvest',{plot:0,now:90999}).ok,false);g.livingPersist=()=>false;assert.equal(farmAction(g,'harvest',{plot:0,now:91000}).ok,false);assert.equal(g.progress.mainline.gardening.harvested,0);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'harvest',{plot:0,now:91000}).ok);assert.equal(g.progress.mainline.gardening.harvested,0);assert.equal(g.progress.coins,100+FARM_CROPS[1].value);
 report(g);assert.ok(completeMainline(g));assert.equal(currentMainlineTask(g.progress.mainline).id,'weapon-style');
});

test('忘记浇水提前收获会恢复播种目标，其他新田可以重新完成',()=>{
 const g=scene('neighbor-garden');emptyPlots(g);grantFarmSeeds(g.progress.farm,1,2);farmAction(g,'plant',{plot:0,crop:1,now:1000});farmAction(g,'harvest',{plot:0,now:121000});
 assert.equal(g.progress.mainline.gardening.plotId,null);assert.equal(g.progress.mainline.gardening.harvested,0);
 farmAction(g,'plant',{plot:1,crop:1,now:122000});farmAction(g,'water',{plot:1,now:123000});farmAction(g,'harvest',{plot:1,now:212000});assert.equal(g.progress.mainline.gardening.harvested,1);
});

// 种子任务全程指向实际营地及交付点，不要求修复告示牌或结束旧清缴。
test('未修告示牌也可找种，任务与路线共同指向歪锅营地，完成后直接回青芽',()=>{
 const g=scene('neighbor-seeds');g.progress.restoration.repaired=[];g.progress.living.patrolActive=true;
 assert.equal(pendingRestoration(g.progress),null);assert.equal(mainlineObjective(g).key,'seedCamp');assert.equal(worldNavigationObjective(g).key,'seedCamp');
 assert.equal(mainlineObjective(g).site.id,MONSTER_CAMPS[0].id);assert.deepEqual(mainlineObjective(g).site,worldNavigationObjective(g).site);
 Object.assign(g.player,MONSTER_CAMPS[0]);updateMonsterCamps(g,.04);for(const e of [...g.enemies].filter(e=>e.monsterCamp))g.hit(e,1e6);
 g.mainlineSpeech=null;updateMainline(g,0);assert.equal(g.progress.mainline.phase,'report');assert.equal(worldNavigationObjective(g).key,'camp');
 assert.equal(g.progress.living.patrolActive,true);g.progress=validateProgress(structuredClone(g.progress));assert.equal(g.progress.mainline.gardening.seedDrops,1);
 report(g);assert.equal(g.progress.mainline.phase,'report');
});
