// 正式地契、施工、碰撞和存档事务回归，避免只检查展示数据。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {CAMP_PLOTS,CAMP_DIRECTIONS,campDirectionStatus,availableCampPlots,campPlotAt} from '../src/config/camp-land.js';
import {purchaseCampLand} from '../src/core/camp/camp-land.js';
import {TOWN_RESTORATIONS,facilityOpen,RESTORATION_SECONDS} from '../src/config/town-restoration.js';
import {restorationStatus,repairFacility,updateRestoration,restorationObjective} from '../src/core/camp/town-restoration.js';
import {campObjectVisible,campLandObjects} from '../src/rendering/camp-land.js';
import {worldBuildingBlocked} from '../src/world/building-collision.js';
import {WORLD} from '../src/world/coordinates.js';
// 隔离新档只准备材料，操作仍由正式事务提交。
function setup(){const p=freshProgress();p.arrival={phase:'complete',version:3,keys:true};p.coins=1000;p.wood=1000;p.mainline.trackingPaused=true;const g=new Game(p);g.state='playing';g.mainlineSpeech=null;g.restorationPersist=()=>true;return g;}
test('新档只拥有起始营地，南侧与西侧可购，远端必须相邻',()=>{const g=setup();assert.deepEqual(g.progress.campLand.owned,['core']);assert.deepEqual(availableCampPlots(g.progress).map(p=>p.id),['workyard','services','north-yard','quarter']);Object.assign(g.player,CAMP_PLOTS[2].sign);assert.equal(purchaseCampLand(g,'gardens').ok,false);assert.equal(g.progress.coins,1000);});
test('购地保存失败不扣金币，成功一次扣款且刷新保留地契',()=>{const g=setup();Object.assign(g.player,CAMP_PLOTS[1].sign);const before=structuredClone(g.progress);assert.equal(purchaseCampLand(g,'workyard',()=>false).ok,false);assert.deepEqual(g.progress,before);assert.equal(purchaseCampLand(g,'workyard',()=>{throw Error('写入失败');}).ok,false);assert.equal(purchaseCampLand(g,'workyard').ok,true);assert.equal(g.progress.coins,976);assert.equal(purchaseCampLand(g,'workyard').ok,false);assert.equal(g.progress.coins,976);const restored=validateProgress(structuredClone(g.progress));assert.deepEqual(restored.campLand.owned,['core','workyard']);assert.ok(availableCampPlots(restored).some(p=>p.id==='gardens'));});
test('远程购地一次开放整组设施，失败不扣款，读档后仍可使用',()=>{
 const g=setup();Object.assign(g.player,{x:9000,y:8000});
 assert.equal(facilityOpen(g.progress,'garage'),false);
 assert.equal(purchaseCampLand(g,'workyard',()=>false).ok,false);
 assert.equal(facilityOpen(g.progress,'garage'),false);
 assert.equal(purchaseCampLand(g,'workyard').ok,true);
 for(const p of [g.progress,validateProgress(g.progress)])for(const id of ['garage','story','clearing'])assert.equal(facilityOpen(p,id),true);
 assert.equal(g.progress.wood,952);assert.equal(g.progress.coins,976);
});
test('隐去实体同步撤掉墙体，周期镜像仍识别同一地块',()=>{const g=setup(),f=TOWN_RESTORATIONS.find(f=>f.id==='garage');for(const dx of [0,WORLD.width]){assert.equal(campPlotAt({x:f.x+dx,y:f.y}).id,'workyard');assert.equal(campObjectVisible(g,{type:'scenery',kind:'garage',x:f.x+dx,y:f.y}),false);assert.equal(worldBuildingBlocked(f.x+90+dx,f.y,12,{mapId:'forest',campProgress:g.progress}),false);}assert.equal(campLandObjects(g).find(p=>p.id==='south').count,'0/3');g.progress.campLand.owned.push('workyard');assert.equal(campLandObjects(g).find(p=>p.id==='south').count,'1/3');assert.equal(campObjectVisible(g,{type:'scenery',kind:'garage',...f}),true);});
test('旧档保留土地及原营业设施，新档不免费开放新增建设项目',()=>{const p=freshProgress();assert.equal(facilityOpen(p,'ammo'),false);delete p.campLand;p.restoration.repaired=['garage'];const migrated=validateProgress(p);assert.equal(migrated.campLand.owned.length,CAMP_PLOTS.length);assert.equal(facilityOpen(migrated,'garage'),true);assert.equal(facilityOpen(migrated,'ammo'),true);assert.deepEqual(validateProgress(migrated).campLand,migrated.campLand);});

test('异常地契字段不会崩溃或授予未知土地',()=>{for(const owned of [null,42,'industry',['unknown']]){const p=freshProgress();p.campLand={version:1,owned};assert.deepEqual(validateProgress(p).campLand.owned,['core']);}});

// 所有合法地契组合均保留左列车辆与侧向上下车净空，扩建不能留下内部栏杆。
test('北停车场在各地契组合下不穿围栏，西侧共界无缝衔接',async()=>{const {PARKING_SPOTS}=await import('../src/config/parking.js'),{campBoundaryBlocked}=await import('../src/world/camp-boundary.js');for(let mask=0;mask<16;mask++){const p=freshProgress();p.campLand.owned=['core',...CAMP_PLOTS.slice(1).filter((_,i)=>mask&(1<<i)).map(p=>p.id)];for(const s of PARKING_SPOTS.filter(s=>s.building==='north')){assert.equal(campBoundaryBlocked(s.x,s.y,48,p),false);for(const dx of [-64,64])assert.equal(campBoundaryBlocked(s.x+dx,s.y+18,12,p),false);}assert.equal(campBoundaryBlocked(-210,340,12,p),false);}const east=CAMP_PLOTS.filter(p=>['core','workyard','gardens'].includes(p.id));assert.ok(east.every(p=>p.left===CAMP_PLOTS.find(p=>p.id==='services').right));});

// 分拆旧地契时保留原有北界和施工，迁移重复执行不得重复发放。
test('旧工业地拆分后保留建设进度、扩建边界和余额',()=>{
 const raw=freshProgress();raw.campLand={version:3,owned:['core','services','industry'],baseTops:{core:-220,services:-220,industry:-220},expansions:0};
 raw.restoration.build={id:'factory',x:-950,y:650,elapsed:1};
 const saved=validateProgress(raw);assert.equal(saved.coins,raw.coins);assert.ok(saved.campLand.owned.includes('se-yard'));
 assert.equal(saved.campLand.baseTops.homes,-220);assert.equal(saved.campLand.baseTops.commons,-220);assert.equal(saved.campLand.baseTops.services,180);
 assert.equal(facilityOpen(saved,'seWorkshop'),true);assert.equal(facilityOpen(saved,'factory'),false);assert.deepEqual(saved.restoration.build,raw.restoration.build);
 assert.deepEqual(validateProgress(saved).restoration,saved.restoration);
});

// 每个方向共用一笔金币和木材事务，购买后立即刷新方向进度。
test('四向扩建只显示本阶段，缺料拒绝，最后保留完工路牌',()=>{
 const g=setup();g.progress.wood=0;g.progress.logistics.bagWood=0;
 assert.equal(purchaseCampLand(g,'north-yard').ok,false);assert.equal(g.progress.coins,1000);
 g.progress.logistics.bagWood=12;assert.equal(purchaseCampLand(g,'commons').ok,false);
 assert.equal(purchaseCampLand(g,'north-yard',()=>false).ok,false);assert.equal(g.progress.logistics.bagWood,12);
 assert.equal(purchaseCampLand(g,'north-yard').ok,true);assert.equal(g.progress.logistics.bagWood,0);assert.equal(g.progress.coins,994);
 g.progress.coins=10000;g.progress.wood=10000;
 for(const direction of CAMP_DIRECTIONS){
  for(const id of direction.plots.filter(id=>!g.progress.campLand.owned.includes(id))){
   const status=campDirectionStatus(g.progress,direction);assert.equal(status.next,id);
   assert.equal(purchaseCampLand(g,id).ok,true);assert.equal(purchaseCampLand(g,id).ok,false);
  }
  const saved=validateProgress(g.progress);assert.equal(campDirectionStatus(saved,direction).remaining,0);
  for(const f of TOWN_RESTORATIONS.filter(f=>direction.plots.includes(f.plotId)))assert.ok(saved.restoration.repaired.includes(f.id));
 }
 assert.equal(campLandObjects(g).length,4);assert.deepEqual(availableCampPlots(g.progress),[]);
});
