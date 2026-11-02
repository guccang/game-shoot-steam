// Debug 批量发放与小屋仓库回归：位置唯一、真实负重、存档往返和事务回滚。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress,validateProgress} from '../src/game.js';
import {unlockedWeaponProgress} from '../src/progression/unlock-weapons.js';
import {debugGrantProgress,debugVehiclesUnlocked} from '../src/progression/debug-grants.js';
import {createProgressController} from '../src/app/progress-controller.js';
import {catLoad,movementLoadFactor} from '../src/progression/load-weight.js';
import {carriedWeapon} from '../src/progression/weapon-storage.js';
import {warehouseRows,transferWarehouse,warehouseTransferPreview} from '../src/core/warehouse.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {boardParkedVehicle,vehicleParkingSite} from '../src/core/camp-parking.js';
import {quoteWorkshop} from '../src/progression/workshop.js';
// 准备正式仓库位置，不改写负重、装备或移动计算。
function setup(){const g=new Game(validateProgress(freshProgress()));g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=()=>true;Object.assign(g.player,WORKSHOP_INTERIORS.warehouse.door);return g;}
for(const kind of ['unlock','max-weapons'])test(`${kind} 全部发放后仍可移动，新武器整批入库且读档稳定`,()=>{
 const g=setup(),before=structuredClone(g.progress),load=catLoad(g).weight;
 g.progress=kind==='unlock'?unlockedWeaponProgress(g.progress,g):debugGrantProgress(g.progress,kind,g);
 assert.ok(g.progress.weapons.every(n=>n>0));assert.equal(g.progress.warehouse.weapons.length,g.progress.weapons.length-1);
 assert.equal(catLoad(g).weight,load);assert.equal(movementLoadFactor(g),1);assert.equal(g.progress.weapon,before.weapon);
 assert.deepEqual(validateProgress(g.progress),g.progress);assert.deepEqual(before.weapons,freshProgress().weapons);
 const again=kind==='unlock'?unlockedWeaponProgress(g.progress,g):debugGrantProgress(g.progress,kind,g);assert.deepEqual(again,g.progress);
});
test('只缺一把轻武器且未满载时正常放入背包，达到容量边界时改为入库',()=>{
 const g=setup();g.progress.weapons.fill(1);g.progress.warehouse.weapons=g.progress.weapons.map((_,i)=>i).filter(i=>i!==0&&i!==1);g.progress.weapons[1]=0;
 const next=unlockedWeaponProgress(g.progress,g);assert.ok(carriedWeapon(next,1));
 const full=Object.assign(Object.create(g),{progress:next}),extra=30-catLoad(full).weight;
 g.progress.supplies.hand.light+=Math.round(extra/.002);
 const stored=unlockedWeaponProgress(g.progress,g);assert.ok(stored.warehouse.weapons.includes(1));assert.equal(catLoad(Object.assign(Object.create(g),{progress:stored})).overloaded,false);
});
test('曾经全部塞入背包的武器可再次整理，保留当前武器和实际挂载',()=>{
 const g=setup();g.progress.weapons.fill(1);g.progress.funnelLoadout=[1,12,12];g.progress.mechanicalLoadout=3;g.progress.spiderLoadout=4;
 assert.ok(catLoad(g).overloaded);g.progress=unlockedWeaponProgress(g.progress,g);
 for(const i of [0,1,3,4])assert.ok(carriedWeapon(g.progress,i));assert.equal(catLoad(g).overloaded,false);
});
test('武器仓库往返保留成长、改装和实时弹匣，无法隔空装备或挂载',()=>{
 const g=setup();g.progress=unlockedWeaponProgress(g.progress,g);const i=1;
 g.progress.weapons[i]=5;g.progress.mastery[i]=120;g.progress.mods[i]=1;g.magazines[i]={ammo:17,remaining:.8};
 assert.equal(quoteWorkshop(g.progress,{kind:'weapons',index:i,action:'equip'}).ok,false);
 const before=catLoad(g).weight;assert.ok(warehouseRows(g).find(r=>r.id==='weapon:1').stored);
 assert.ok(transferWarehouse(g,'bag','weapon:1',1,'withdraw').ok);assert.ok(carriedWeapon(g.progress,i));assert.ok(catLoad(g).weight>before);
 assert.ok(transferWarehouse(g,'bag','weapon:1',1,'deposit').ok);assert.equal(catLoad(g).weight,before);
 const restored=validateProgress(g.progress);assert.equal(restored.weapons[i],5);assert.equal(restored.mods[i],1);assert.equal(restored.supplies.handMags[i].ammo,17);assert.equal(restored.supplies.handMags[i].remaining,.8);
 assert.equal(transferWarehouse(g,'bag','weapon:0',1,'deposit').ok,false);
 assert.equal(transferWarehouse(g,g.vehicle.index,'weapon:1',1,'withdraw').ok,false);
 assert.equal(transferWarehouse(g,'bag','weapon:1',2,'withdraw').ok,false);
});
test('仓库取武器满载需要确认，保存失败不改位置或弹匣',()=>{
 const g=setup();g.progress=unlockedWeaponProgress(g.progress,g);g.progress.logistics.bagWood=50;
 assert.ok(warehouseTransferPreview(g,'bag','weapon:2',1,'withdraw').needsConfirmation);
 assert.equal(transferWarehouse(g,'bag','weapon:2',1,'withdraw').ok,false);
 const before=structuredClone(g.progress);g.livingPersist=()=>false;
 assert.equal(transferWarehouse(g,'bag','weapon:2',1,'withdraw',true).ok,false);assert.deepEqual(g.progress,before);
});
test('一级和满级发放保存失败不改变任何原始进度，成功同时保存仓库和实时弹匣',()=>{
 const g=setup();g.magazines[0]={ammo:31,remaining:.9};const before=structuredClone(g.progress);let saved;
 const store={available:true,saveProgress:()=>false},c=createProgressController({game:g,store,root:{getElementById:()=>({})},refresh(){}});
 assert.equal(c.unlockWeapons(),false);assert.deepEqual(g.progress,before);assert.equal(c.debugGrant('max-weapons'),false);assert.deepEqual(g.progress,before);
 store.saveProgress=p=>{saved=structuredClone(p);return true;};assert.ok(c.unlockWeapons());assert.equal(saved.supplies.handMags[0].ammo,31);assert.ok(saved.warehouse.weapons.length);assert.equal(catLoad(g).overloaded,false);
});
test('全部载具都有真实位置，含寻宝车体，刷新后能在对应位置换乘',()=>{
 const g=setup();g.progress=debugGrantProgress(g.progress,'vehicles');assert.ok(debugVehiclesUnlocked(g.progress));
 assert.equal(g.progress.campParking.owned.length,COLLECTED_VEHICLES.length);
 assert.equal(new Set(g.progress.campParking.owned.map(r=>r.spot)).size,g.progress.campParking.owned.length);
 assert.deepEqual(validateProgress(g.progress),g.progress);
 for(const hull of [9,10]){const car=new Game(validateProgress(g.progress));car.state='playing';car.vehicle.active=false;car.mainlineSpeech=null;const site=vehicleParkingSite(car,hull);Object.assign(car.player,site);assert.ok(boardParkedVehicle(car,hull),String(hull));assert.equal(car.vehicle.index,hull);}
});
test('缺失原生主炮可修复，已换装主炮不被覆盖或重复挂载',()=>{
 const g=setup();g.progress.vehicleHulls.fill(1);assert.equal(debugVehiclesUnlocked(g.progress),false);
 g.progress.vehicleWeapons[19]=3;g.progress.vehicleLoadouts[1]=19;
 const next=debugGrantProgress(g.progress,'vehicles');assert.ok(debugVehiclesUnlocked(next));assert.equal(next.vehicleLoadouts[1],19);assert.equal(next.vehicleLoadouts[2],null);assert.equal(next.vehicleWeapons[19],3);
});

test('驾驶寻宝车批量领取后保留驾驶状态，空出常规车位供旧车换乘',()=>{
 const g=setup();g.progress.vehicleHulls[9]=1;g.progress.vehicleIndex=9;g.vehicle=g.vehicles[9];g.vehicle.active=true;
 const next=debugGrantProgress(g.progress,'vehicles',g);assert.equal(next.campParking.owned.some(r=>r.hull===9),false);
 g.progress=next;g.vehicle.active=false;const site=vehicleParkingSite(g,0);Object.assign(g.player,site);assert.ok(boardParkedVehicle(g,0));
});
test('同一武器不能同时占用仓库和武器架，非法仓库编号被清除',()=>{
 const p=validateProgress(freshProgress());p.weapons[1]=1;p.warehouse.weapons=[0,1,1,999,-1];p.homeDecor.items.push({uid:'rack-check',type:'weapon-rack',x:null,y:null,floor:0,rotation:0,weapons:[1]});
 const next=validateProgress(p);assert.deepEqual(next.warehouse.weapons,[1]);assert.ok(next.homeDecor.items.every(r=>!r.weapons?.includes(1)));assert.ok(carriedWeapon(next,0));
});
