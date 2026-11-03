// 世界图鉴专项：正式目录、真实击杀与农活事务、历史迁移和只读汇总。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {WORLD_CODEX,worldCodexEntry} from '../src/config/world-codex.js';
import {FARM_CROPS} from '../src/config/farm.js';
import {WEAPONS} from '../src/config/weapons.js';
import {VEHICLE_ARMAMENTS} from '../src/config/vehicle-armaments.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {codexRecord,codexTotals} from '../src/progression/world-codex.js';
import {normalizeCodexStatistics,codexMonsterKey} from '../src/progression/codex-statistics.js';
import {farmAction} from '../src/core/farm.js';
import {hitMineAnimal} from '../src/core/mine-combat.js';
import {finishFishing} from '../src/core/outdoors.js';
// 真实自由巡林实例隔离用户进度，保存回调用于故障注入。
function scene(){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';const g=new Game(p,()=>.5);g.state='playing';g.mainlineSpeech=null;g.vehicle.active=false;g.enemies=[];g.trees=[];g.livingPersist=()=>true;return g;}
test('作物、手持、专属主炮和全部载具进入目录，稳定键不冲突',()=>{
 assert.equal(new Set(WORLD_CODEX.map(e=>e.key)).size,WORLD_CODEX.length);
 for(const [category,expected] of [['crop',FARM_CROPS.length],['weapon',WEAPONS.length+VEHICLE_ARMAMENTS.length],['vehicle',COLLECTED_VEHICLES.length]])assert.equal(WORLD_CODEX.filter(e=>e.category===category).length,expected);
 assert.ok(WORLD_CODEX.every(e=>e.name&&e.group&&e.portrait));assert.equal(worldCodexEntry('not-found'),null);
});
test('旧档保留已有总数、鱼获与装备历史，不从库存捏造作物和怪物明细',()=>{
 const p=freshProgress();delete p.statistics.codex;p.statistics.kills=42;p.statistics.equipment.weapons.pistol={kills:8,trees:2};p.farm.inventory[1]=12;p.outdoors.collection.carp={count:7,best:18};
 const restored=validateProgress(p);assert.equal(restored.statistics.codex.partial,true);assert.equal(restored.statistics.kills,42);assert.equal(codexRecord(restored,worldCodexEntry('weapon:pistol')).kills,8);assert.equal(codexRecord(restored,worldCodexEntry('crop:carrot')).harvested,0);assert.equal(codexRecord(restored,worldCodexEntry('monster:slime')).kills,0);assert.deepEqual(validateProgress(restored).statistics,restored.statistics);
 const n=normalizeCodexStatistics({monsters:{'monster:slime':Infinity,unknown:8},crops:{carrot:{planted:-2,harvested:3.8}}});assert.equal(n.monsters['monster:slime'],0);assert.equal(n.monsters.unknown,undefined);assert.deepEqual(n.crops.carrot,{planted:0,harvested:3});
});
test('地表真实击杀按物种和武器累计，重复死亡、非致命与靶场排除',()=>{
 const g=scene();for(const species of ['slime','leaf-bat','spore-spitter']){const e=g.spawnEnemy(0,0,{x:1700,y:400});e.species=species;e.hp=10;g.hit(e,1);assert.equal(codexRecord(g.progress,worldCodexEntry('monster:'+species)).kills,0);g.hit(e,999,false,{statisticsSource:{weapon:'pistol'}});g.hit(e,999);assert.equal(codexRecord(g.progress,worldCodexEntry('monster:'+species)).kills,1);}
 const e=g.spawnEnemy(0,0,{x:1700,y:400});e.workshopTarget=true;g.hit(e,999);assert.equal(g.progress.statistics.kills,3);assert.equal(codexRecord(g.progress,worldCodexEntry('weapon:pistol')).kills,3);assert.equal(codexMonsterKey({type:'boss',kind:'dumpling'}),'boss:dumpling');
 assert.deepEqual(validateProgress(g.progress).statistics,g.progress.statistics);
});
test('地下击杀与矿石同事务，失败不计数，重复命中不重复累计并保留来源',()=>{
 const g=scene();g.cottage={kind:'mine',depth:1};const a={key:'30,20',kind:'beetle',x:2000,y:2000,hp:1,maxHp:48};g.progress.mining.animals[a.key]=a;const before=g.progress.statistics.kills;
 g.livingPersist=()=>false;assert.equal(hitMineAnimal(g,a,99,{statisticsSource:{weapon:'vehicle-machinegun',vehicle:'pine-tank'}}),false);assert.equal(g.progress.statistics.kills,before);
 g.livingPersist=()=>true;assert.ok(hitMineAnimal(g,a,99,{statisticsSource:{weapon:'vehicle-machinegun',vehicle:'pine-tank'}}));assert.equal(hitMineAnimal(g,a,99),false);assert.equal(g.progress.statistics.kills,before+1);assert.equal(codexRecord(g.progress,worldCodexEntry('mine:beetle')).kills,1);assert.equal(codexRecord(g.progress,worldCodexEntry('vehicle:pine-tank')).kills,1);assert.equal(codexRecord(g.progress,worldCodexEntry('armament:vehicle-machinegun')).kills,1);
});
test('播种与收割只有成功保存才计数，出售消耗不清历史，未成熟和重复收割不加数',()=>{
 const g=scene();Object.assign(g.player,{x:2000,y:2000});g.progress.farm.plots=[{id:1,mapId:'forest',x:2000,y:2000,crop:null,plantedAt:0,readyAt:0,watered:false}];g.progress.farm.seeds[1]=1;
 g.livingPersist=()=>false;assert.equal(farmAction(g,'plant',{plot:1,crop:1,now:1000}).ok,false);assert.equal(codexRecord(g.progress,worldCodexEntry('crop:carrot')).planted,0);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'plant',{plot:1,crop:1,now:1000}).ok);assert.equal(farmAction(g,'harvest',{plot:1,now:2000}).ok,false);
 g.livingPersist=()=>false;assert.equal(farmAction(g,'harvest',{plot:1,now:122000}).ok,false);assert.equal(codexRecord(g.progress,worldCodexEntry('crop:carrot')).harvested,0);
 g.livingPersist=()=>true;assert.ok(farmAction(g,'harvest',{plot:1,now:122000}).ok);assert.equal(farmAction(g,'harvest',{plot:1,now:122001}).ok,false);g.progress.farm.inventory.fill(0);g.progress=validateProgress(g.progress);const r=codexRecord(g.progress,worldCodexEntry('crop:carrot'));assert.equal(r.planted,1);assert.equal(r.harvested,1);
});
test('鱼获只在入护后增加，放流与失败不计，总览读取后不修改存档',()=>{
 const g=scene();g.fishing={phase:'landed',species:0,size:18};g.livingPersist=()=>false;assert.equal(finishFishing(g,true).ok,false);assert.equal(codexTotals(g.progress).fish,0);g.livingPersist=()=>true;assert.ok(finishFishing(g,true).ok);assert.equal(codexTotals(g.progress).fish,1);
 g.fishing={phase:'landed',species:0,size:18};finishFishing(g,false);assert.equal(codexTotals(g.progress).fish,1);const before=JSON.stringify(g.progress);for(const e of WORLD_CODEX)codexRecord(g.progress,e);codexTotals(g.progress);assert.equal(JSON.stringify(g.progress),before);
});
