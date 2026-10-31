// 消防站搬迁验收：实体、修复、引导与出入库都使用同一布局，并保留可通行车道。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {FIRE_STATION,FIRE_PARKING,FIRE_EXIT,FIRE_GARAGE,FIRE_DOOR,FIRE_APRON,FIRE_DOOR_APPROACH,fireRoute,fireWaterSources} from '../src/world/fire-navigation.js';
import {REALM_ENTRANCES} from '../src/world/realm-entrances.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {MAINLINE_SITES,MAINLINE_IDS} from '../src/config/mainline.js';
import {isWaterBlocked,riverXAt,riverHalfWidth} from '../src/world/river-geometry.js';
import {BUILDING_ENTRIES} from '../src/config/building-entries.js';
import {migrateFireStationProgress} from '../src/progression/fire-station-migration.js';
import {blocked} from '../src/physics/motion.js';
import {requestFireParking,updateFireRescue,fireObjective} from '../src/core/fire-rescue.js';
import {worldDistance} from '../src/world/coordinates.js';

test('西岸实体、修复和导航同位，完整站房与车道留出沿岸干地',()=>{
 const entry=REALM_ENTRANCES.find(e=>e.mode==='fire'),repair=TOWN_RESTORATIONS.find(e=>e.id==='fire');
 assert.equal(FIRE_STATION.y,1200);
 for(const point of [entry,repair]){assert.equal(point.x,FIRE_STATION.x);assert.equal(point.y,FIRE_STATION.y);}
 assert.equal(repair.site.y,FIRE_STATION.y+22);
 assert.equal(repair.site.x,FIRE_STATION.x);
 assert.equal(BUILDING_ENTRIES.find(e=>e.id==='realm-fire').x,FIRE_STATION.x);
 assert.equal(MAINLINE_SITES.fire.x,FIRE_STATION.x-100);
 assert.equal(MAINLINE_SITES.fire.y,FIRE_STATION.y+90);
 for(let y=FIRE_STATION.y-FIRE_STATION.height;y<=FIRE_STATION.y+80;y+=10)
  assert.ok(FIRE_STATION.x+FIRE_STATION.width/2+30<riverXAt(y)-riverHalfWidth(y,-1),'站房东侧至少保留30单位干地');
 for(const point of [FIRE_PARKING,FIRE_EXIT,FIRE_GARAGE,FIRE_DOOR,FIRE_APRON,FIRE_DOOR_APPROACH])assert.equal(isWaterBlocked(point.x,point.y,16),false,JSON.stringify(point));
});

test('新站址接警步行和河岸补水路线不穿水或树干',()=>{
 const g=new Game(freshProgress(),()=>.4);g.start();
 const waters=fireWaterSources(g);assert.equal(waters.length,3);
 for(const source of waters){
  assert.ok(source.x>riverXAt(source.y)+riverHalfWidth(source.y,1),'取水泵位于东岸');
  assert.equal(isWaterBlocked(source.x,source.y,16),false,'停靠点为干地');
  assert.ok(source.waterDx<0,'吸水管向西伸入河道');
  assert.equal(isWaterBlocked(source.waterX,source.waterY),true,'吸水口仍在水中');
 }
 for(const target of [FIRE_APRON,...fireWaterSources(g)]){
  const path=fireRoute(g,target,true);assert.ok(path.length>0);
  for(let i=1;i<path.length;i++){
   const a=path[i-1],b=path[i],steps=Math.ceil(worldDistance(a,b)/4);
   for(let n=0;n<=steps;n++)assert.equal(blocked(a.x+(b.x-a.x)*n/steps,a.y+(b.y-a.y)*n/steps,12,g.trees,{mapId:'forest'}),false);
  }
 }
});

// 旧救援检查点重新生成岸边设备，保留任务水量并在新位置使用正式补水逻辑。
test('低水量导航与存档恢复使用东岸取水点，到场后可实际补水',()=>{
 const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.4);g.start();assert.ok(g.requestFireRescue());assert.ok(g.startFireRescue());
 for(let i=0;i<5000&&g.fireTransit;i++)updateFireRescue(g,.05);
 assert.equal(g.fireRescue.phase,'active');g.fireRescue.water=10;g.fireRescue.waterGuide=true;g.syncFireRescue();
 const loaded=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.4);loaded.start();
 assert.equal(loaded.fireRescue.water,10);assert.equal(loaded.fireRescue.phase,'active');
 assert.deepEqual(loaded.fireWaters,loaded.fireRescue.waters);
 const objective=fireObjective(loaded);assert.ok(objective.water);assert.ok(objective.point.x>riverXAt(objective.point.y));
 const source=objective.point;Object.assign(loaded.player,{x:source.x,y:source.y});
 const before=loaded.fireRescue.water;updateFireRescue(loaded,.1);
 assert.ok(loaded.fireRescue.water>before,'东岸停靠后补水');assert.equal(loaded.fireRescue.refills,1);
});

test('东岸站内过场迁到西岸，保存重载保持阶段与路径且不重复平移',()=>{
 const p=freshProgress();p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.4);g.start();assert.ok(g.requestFireRescue());assert.ok(g.startFireRescue());
 for(let i=0;i<5000&&g.fireRescue.phase!=='boarding';i++)updateFireRescue(g,.05);
 assert.equal(g.fireRescue.phase,'boarding');g.syncFireRescue();
 for(const phase of ['boarding','departing','parking','exiting']){
  const raw=JSON.parse(JSON.stringify(g.progress));delete raw.fireStationLayoutVersion;
  raw.fireDispatch.run.phase=phase;raw.fireDispatch.run.position={x:1430,y:1173};raw.fireDispatch.run.transit.path=[{x:1371,y:1173}];
  const original=JSON.stringify(raw),migrated=validateProgress(raw),run=migrated.fireDispatch.run;
  assert.equal(run.phase,phase);assert.deepEqual(run.position,FIRE_DOOR);assert.deepEqual(run.transit.path,[FIRE_GARAGE]);
  assert.equal(JSON.stringify(raw),original);assert.deepEqual(validateProgress(migrated).fireDispatch,migrated.fireDispatch);
  const restored=new Game(migrated,()=>.4);assert.equal(restored.fireRescue.phase,phase);assert.ok(worldDistance(restored.player,FIRE_DOOR)<.01);
 }
 const walking=JSON.parse(JSON.stringify(g.progress));delete walking.fireStationLayoutVersion;
 walking.fireDispatch.run.phase='approaching';walking.fireDispatch.run.townApproach=true;walking.fireDispatch.run.position={x:1430,y:1280};walking.fireDispatch.run.transit.path=[{x:1430,y:1173}];
 const restored=new Game(validateProgress(walking),()=>.4);assert.equal(restored.fireRescue.phase,'transferring');restored.start();
 for(let i=0;i<5000&&restored.fireTransit;i++)updateFireRescue(restored,.05);
 assert.equal(restored.fireRescue.phase,'active');assert.ok(worldDistance(restored.player,FIRE_PARKING)<.01);
});

test('旧步行重规划、旧施工迁移，野外救援坐标与奖励保持不变',()=>{
 const raw={fireDispatch:{run:{phase:'approaching',townApproach:true,position:{x:1430,y:1280},fires:[{x:1500,y:1600}],water:33}},restoration:{build:{id:'fire',elapsed:1,x:1420,y:1222}},living:{position:{x:1420,y:1222}},coins:123};
 const migrated=migrateFireStationProgress(raw);
 assert.equal(migrated.fireDispatch.run.townApproach,false);assert.deepEqual(migrated.fireDispatch.run.position,raw.fireDispatch.run.position);
 assert.deepEqual(migrated.restoration.build,{id:'fire',elapsed:1,x:FIRE_STATION.x,y:1222});assert.equal(migrated.living.position.x,FIRE_STATION.x);
 assert.deepEqual(migrated.fireDispatch.run.fires,raw.fireDispatch.run.fires);assert.equal(migrated.coins,123);assert.equal(migrated.fireDispatch.run.water,33);
 assert.deepEqual(migrateFireStationProgress(migrated),migrated);
 for(const phase of ['active','returning','offered']){
  raw.fireDispatch.run.phase=phase;assert.deepEqual(migrateFireStationProgress(raw).fireDispatch,raw.fireDispatch);
 }
 raw.fireDispatch.run.phase='won';raw.fireDispatch.run.position={x:1400,y:1270};assert.deepEqual(migrateFireStationProgress(raw).fireDispatch.run.position,FIRE_EXIT);
 raw.fireDispatch.run.position={x:2400,y:1700};assert.deepEqual(migrateFireStationProgress(raw).fireDispatch,raw.fireDispatch);
});

test('已修复消防站接警后在新址出库，返站交接停回新车库',()=>{
 const p=freshProgress();p.arrival=null;p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 const g=new Game(p,()=>.4);g.start();g.boss=null;
 assert.ok(g.requestFireRescue());assert.ok(g.startFireRescue());
 for(let i=0;i<5000&&g.fireTransit;i++)updateFireRescue(g,.05);
 assert.equal(g.fireRescue.phase,'active');assert.ok(worldDistance(g.player,FIRE_PARKING)<.01);
 for(const fire of g.fireRescue.fires){fire.hp=0;fire.lit=false;}g.enemies=g.enemies.filter(e=>!e.fireEvent);updateFireRescue(g,.05);
 assert.equal(g.fireRescue.phase,'returning');assert.ok(requestFireParking(g));
 for(let i=0;i<1000&&g.fireTransit;i++)updateFireRescue(g,.05);
 assert.equal(g.fireRescue.phase,'won');assert.ok(worldDistance(g.player,FIRE_EXIT)<.01);assert.ok(g.fireGarageParked);
});
