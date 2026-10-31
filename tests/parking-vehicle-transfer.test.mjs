// 换乘专项：购买落位、旧档迁移、任务借车和电动车真实供给均通过正式入口验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {mainlineObjective,mainlineAction} from '../src/core/mainline-manager.js';
import {requestMainlineNavigation,worldNavigationObjective} from '../src/core/world-navigation.js';
import {STORY_LOADOUTS} from '../src/config/story.js';
import {commitWorkshop} from '../src/core/workshop.js';
import {parkedOwned,boardParkedVehicle,updateParkingVisitors} from '../src/core/camp-parking.js';
import {vehicleTransferState,activateVehicleTransfer} from '../src/ui/vehicle-transfer.js';
import {advanceReload} from '../src/combat/magazine.js';
import {scooterCapacity} from '../src/config/scooter-capacity.js';
import {funnelWeapon} from '../src/config/funnel-loadouts.js';
import {storyPostForChapter,storyPostApproach} from '../src/core/story-posts.js';
import {realmWeapon} from '../src/config/realms.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
// 已完成教学的电动车玩家，其他车需要正式购买，资金仅为隔离交易条件。
function setup(){
 const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.coins=p.wood=100000;p.bosses=50;p.materials={parts:10000,crystal:10000,core:10000};p.weapons.fill(1);
 const g=new Game(p,()=>.7);g.start();g.spawnTimer=g.fireClock=999;Object.assign(g.player,{x:1100,y:900});return g;
}
// 挪到真实车辆侧面，保留选车、登车和状态保存的正式控制器。
function approach(g,hull){const s=parkedOwned(g).find(s=>s.record.hull===hull);Object.assign(g.player,{x:s.x+64,y:s.y+18});return s;}

test('购车先保存北停车位，购买失败不扣钱；在野外不能直接选车或取车',()=>{
 const g=setup(),before=JSON.stringify(g.progress),old=g.vehicle;
 assert.equal(commitWorkshop(g,{kind:'vehicle',index:0,action:'buy'},()=>false).ok,false);
 assert.equal(g.progress.coins,JSON.parse(before).coins);assert.deepEqual(g.progress.campParking,{owned:[]});assert.equal(g.progress.vehicleHulls[0],0);
 let saved;assert.equal(commitWorkshop(g,{kind:'vehicle',index:0,action:'buy'},p=>{saved=structuredClone(p);return true;}).ok,true);
 assert.ok(saved.campParking.owned.find(r=>r.hull===0).spot.startsWith('north-'));assert.equal(g.vehicle,old);
 assert.equal(g.selectVehicle(0),false);assert.equal(boardParkedVehicle(g,0),false);
 assert.equal(vehicleTransferState(g,0).remote,true);assert.equal(activateVehicleTransfer(g,0),true);assert.equal(g.vehicle.index,5);
});
test('一次只带一辆：近车换乘保留旧车耐久、装填和余弹，刷新仍能在原位取回',()=>{
 const g=setup();assert.ok(g.buyVehicle(0));g.summonVehicle();g.vehicle.hp*=.6;const scooterHp=g.vehicle.hp;
 approach(g,0);assert.ok(boardParkedVehicle(g,0));assert.equal(g.vehicle.active,true);
 assert.equal(g.vehicles.filter(v=>v.active).length,1);assert.ok(g.progress.campParking.owned.some(r=>r.hull===5));
 g.vehicle.hp*=.7;g.vehicle.module.magazine.ammo=2;g.vehicle.module.magazine.remaining=.8;
 approach(g,5);assert.ok(boardParkedVehicle(g,5));assert.equal(g.vehicle.hp,scooterHp);
 const tank=g.progress.campParking.owned.find(r=>r.hull===0);assert.equal(tank.ammo,2);assert.equal(tank.reload,.8);assert.equal(tank.hp,.7);
 const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.7);restored.start();approach(restored,0);assert.ok(boardParkedVehicle(restored,0));
 assert.equal(restored.vehicle.module.magazine.ammo,2);assert.equal(restored.vehicle.module.magazine.remaining,.8);
 assert.equal(new Set(restored.progress.campParking.owned.map(r=>r.spot)).size,restored.progress.campParking.owned.length);
});
test('旧档仅将未携带车送到北停车场，自有车优先于访客且所有车体都有泊位',()=>{
 const p=setup().progress;p.vehicleHulls.fill(1);const migrated=validateProgress(p);
 assert.equal(migrated.campParking.owned.length,migrated.vehicleHulls.length-1);assert.ok(migrated.campParking.owned.every(r=>r.hull!==5));assert.equal(new Set(migrated.campParking.owned.map(r=>r.spot)).size,migrated.campParking.owned.length);
 const g=new Game(migrated,()=>.7);g.start();g.parkingVisitors=[{spot:g.progress.campParking.owned[0].spot,model:'star'}];updateParkingVisitors(g,.05);
 assert.equal(g.parkingVisitors.length,0);assert.equal(g.summonVehicle(),true);
});
test('松果战车任务买好后引向真实车位，取车后撤去回营路线',()=>{
 const g=setup();g.buyVehicle(0);g.progress.mainline.completed=MAINLINE_IDS.slice(0,MAINLINE_IDS.indexOf('first-vehicle'));g.progress.mainline.phase='doing';
 assert.equal(mainlineObjective(g).key,'northParking');requestMainlineNavigation(g);
 assert.ok(worldNavigationObjective(g).site.id.startsWith('north-'));assert.equal(mainlineAction(g).kind,'vehicle');
 approach(g,0);assert.ok(boardParkedVehicle(g,0));assert.equal(mainlineObjective(g).navigation,false);assert.equal(mainlineAction(g),null);
});
test('剧情整备可直接换车，永久停车记录不被借用装备改写',()=>{
 for(const spec of STORY_LOADOUTS){
  const g=setup();g.buyVehicle(0);const parked=JSON.stringify(g.progress.campParking);
  Object.assign(g.player,storyPostApproach(storyPostForChapter(g,'sunleaf-01')));assert.ok(g.enterStory());g.advanceStoryDialogue(true);assert.ok(g.chooseStoryLoadout(spec.id));g.startStoryStage();
  assert.equal(g.vehicle.index,spec.vehicle);assert.equal(g.vehicle.active,true);assert.equal(JSON.stringify(g.progress.campParking),parked);
 }
});
test('电动车容量乘1.3，真实装填生效，上下车不赠弹且下车保留装填计时',()=>{
 const g=setup(),base=g.weapon(0).magazineSize,m=g.magazines[0],ammo=m.ammo;
 assert.ok(g.summonVehicle());assert.equal(g.weapon(0).magazineSize,Math.floor(base*1.3));assert.equal(m.ammo,ammo);
 m.ammo=0;m.remaining=.1;advanceReload(m,g.weapon(0),.2);assert.equal(m.ammo,Math.floor(base*1.3));
 assert.ok(g.dismountVehicle());assert.equal(g.weapon(0).magazineSize,base);assert.equal(m.ammo,base);
 m.ammo=2;m.remaining=.8;g.summonVehicle();g.dismountVehicle();assert.equal(m.ammo,2);assert.equal(m.remaining,.8);
 g.buyVehicle(0);approach(g,0);boardParkedVehicle(g,0);assert.equal(g.weapon(0).magazineSize,base);
});
test('普通直升机和消防车能停入北停车场，取回时恢复对应驾驶状态',()=>{
 for(const hull of [2,4]){
  const p=setup().progress;p.vehicleHulls.fill(0);p.vehicleHulls[hull]=1;p.vehicleIndex=hull;
  const g=new Game(p,()=>.7);g.start();g.spawnTimer=g.fireClock=999;const s=PARKING_SPOTS.find(s=>s.id==='north-1-2');
  Object.assign(g.player,{x:s.x,y:s.approachY,vx:0,vy:0});assert.ok(g.summonVehicle());
  for(let i=0;i<180;i++)g.update(.05);
  assert.equal(g.vehicle.active,false);assert.equal(g.progress.campParking.owned[0].hull,hull);
  assert.ok(boardParkedVehicle(g,hull));assert.equal(g.player.flying,hull===2);
 }
});
test('电动车浮游炮独立弹夹共用倍率，秘境加成之后再计算，收起模块不能藏超量弹药',()=>{
 const g=setup();g.progress.funnelLoadout=[0,0,0];g.summonVehicle();
 const w=realmWeapon(funnelWeapon(g.loadout,0),{haste:2,reach:1}),mounted=scooterCapacity(w,g);
 assert.equal(mounted.magazineSize,Math.floor(w.magazineSize*1.3));
 const modules=g.magazines[12].modules;for(const m of modules){m.ammo=mounted.magazineSize;m.remaining=.7;}
 g.dismountVehicle();for(const m of modules){assert.equal(m.ammo,funnelWeapon(g.loadout,0).magazineSize);assert.equal(m.remaining,.7);}
});

// 填满公共停车位的其余位置，访客仅作占位实体，不改玩家所有权。
function fillVisitorSpaces(g){
 g.parkingVisitors=PARKING_SPOTS.filter(s=>s.building==='north'&&!g.progress.campParking.owned.some(r=>r.spot===s.id)).map(s=>({spot:s.id,model:'star'}));
 return structuredClone(g.parkingVisitors);
}
test('驾驶点击换车优先同区真实空位，不移走访客或丢失车辆供给',()=>{
 const g=setup();g.buyVehicle(0);g.summonVehicle();const target=approach(g,0);
 g.vehicle.hp*=.65;g.vehicle.wheelPhase=2;g.player.walkPhase=3;
 const visitor={spot:'north-0-1',model:'star'};g.parkingVisitors=[visitor];
 assert.ok(boardParkedVehicle(g,0));
 const old=g.progress.campParking.owned.find(r=>r.hull===5);
 assert.ok(old.spot.startsWith('north-'));assert.notEqual(old.spot,visitor.spot);assert.notEqual(old.spot,target.id);
 assert.equal(old.hp,.65);assert.equal(old.wheel,2);assert.equal(old.track,3);
 assert.deepEqual(g.parkingVisitors,[visitor]);assert.equal(g.vehicle.index,0);assert.ok(g.vehicle.active);assert.equal(g.vehicles.filter(v=>v.active).length,1);
 assert.equal(g.parking.phase,'cancelled');
});
test('全部车位占用仍可一键换车：旧车进入腾出车位，新车留在原位置，访客保留',()=>{
 const g=setup();g.buyVehicle(0);g.summonVehicle();const target=approach(g,0),visitors=fillVisitorSpaces(g),before={x:g.player.x,y:g.player.y};
 assert.ok(activateVehicleTransfer(g,0));
 assert.equal(g.progress.campParking.owned.find(r=>r.hull===5).spot,target.id);
 assert.equal(g.progress.campParking.owned.some(r=>r.hull===0),false);assert.deepEqual(g.parkingVisitors,visitors);
 assert.equal(g.vehicle.index,0);assert.ok(g.vehicle.active);assert.deepEqual({x:g.player.x,y:g.player.y},before);
 g.vehicle.hp*=.7;g.vehicle.module.magazine.ammo=2;g.vehicle.module.magazine.remaining=.8;
 assert.ok(boardParkedVehicle(g,5));assert.equal(g.progress.campParking.owned.find(r=>r.hull===0).spot,target.id);
 const restored=new Game(JSON.parse(JSON.stringify(g.progress)),()=>.7);restored.start();approach(restored,0);assert.ok(boardParkedVehicle(restored,0));
 assert.equal(restored.vehicle.hp/restored.vehicle.maxHp,.7);assert.equal(restored.vehicle.module.magazine.ammo,2);assert.equal(restored.vehicle.module.magazine.remaining,.8);
});
test('目标维修冷却或距离不符时，换车失败保留当前驾驶状态和全部停车记录',()=>{
 const g=setup();g.buyVehicle(0);g.summonVehicle();approach(g,0);fillVisitorSpaces(g);g.vehicles[0].cooldown=10;
 const before=JSON.stringify({p:g.progress,visitors:g.parkingVisitors,player:g.player});
 assert.equal(boardParkedVehicle(g,0),false);assert.equal(g.vehicle.index,5);assert.ok(g.vehicle.active);
 assert.equal(JSON.stringify({p:g.progress,visitors:g.parkingVisitors,player:g.player}),before);
 g.vehicles[0].cooldown=0;Object.assign(g.player,{x:1000,y:1000});assert.equal(boardParkedVehicle(g,0),false);assert.equal(g.vehicle.index,5);assert.ok(g.vehicle.active);
});
