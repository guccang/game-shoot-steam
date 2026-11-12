import {SUPPLY_ITEMS} from '../src/config/supplies.js';
import {collectShopStock} from '../src/core/economy/shop-delivery.js';
// 实物补给、跨车换炮与特殊伤害回归，调用正式事务及战斗时钟。
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {CAMP_PLOTS} from '../src/config/camp-land.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {vehicleWeapon} from '../src/config/vehicles.js';
import {LOAD_RULES} from '../src/config/vehicle-load.js';
import {AMMO_TYPES,AMMO_SHOP,vehicleFaults} from '../src/config/supplies.js';
import {tradeSupply,useSupplyItem,mountMainGun,transferSupplyAmmo} from '../src/core/vehicles/supplies.js';
import {catLoad,vehicleLoad,movementLoadFactor} from '../src/progression/inventory/load-weight.js';
import {advanceReload,consumeRound} from '../src/combat/magazine.js';
import {takeSupplyAmmo,syncSupplyAmmo} from '../src/combat/supply-ammo.js';
import {absorbVehicleHit,updateVehicle,configureVehicle} from '../src/combat/vehicle.js';
import {requestVehicleRepair,updateVehicleRepair,vehicleRepairQuote} from '../src/core/vehicles/vehicle-repair.js';
import {REPAIR_BAY} from '../src/config/vehicle-repair.js';
import {REPAIR_PARKING_SPOTS} from '../src/config/repair-parking.js';
import {commitWorkshop} from '../src/core/workshop/workshop.js';
import {workshopUpgrade,previewWorkshop} from '../src/progression/workshop/workshop.js';
import {blocked} from '../src/physics/motion.js';
import {WORKSHOP_INTERIORS} from '../src/config/workshop-interiors.js';
import {clampRiderSupply} from '../src/combat/rider-supply.js';
import {captureRealmVehicles,restoreRealmVehicles} from '../src/core/realms/realm-vehicles.js';
import {syncRealm} from '../src/core/realms/realm-manager.js';
// 完成入职的独立车队，禁用随机波次但保留正常运行时和保存边界。
function scene(hull=1){const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.campLand.owned=CAMP_PLOTS.map(plot=>plot.id);p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.vehicleHulls.fill(1);p.vehicleHulls.forEach((_,i)=>grantVehicleArmament(p,i));p.vehicleIndex=hull;p.coins=p.wood=100000;p.materials.parts=100;const g=new Game(p,()=>0);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.spawnTimer=g.fireClock=999;g.livingPersist=()=>true;g.progress.campParking.owned=[];g.vehicle.active=true;Object.assign(g.player,{x:220,y:835,vx:0,vy:0});return g;}
// 只推进车炮和在途弹丸，让驾驶员的手持枪无法代替车炮造成伤害。
test('车炮按独立手机设定伐木，关闭后保留弹药且仍可击中树后的敌人',()=>{
 const g=scene(1);
 Object.assign(g.player,{x:820,y:790,arena:{x:820,y:790,radius:1000}});
 g.addTree(920,790);
 const tree=g.trees[0],mag=g.vehicle.module.magazine;
 tree.hp=tree.maxHp=10000;
 g.gameplayPreferences={targetWood:false};
 Object.assign(mag,{ammo:1,remaining:0});
 for(let i=0;i<50;i++){updateVehicle(g,.04);g.updateProjectiles(.04);}
 assert.ok(tree.hp<tree.maxHp);
 const afterShot=tree.hp;
 Object.assign(g.gameplayPreferences,{vehicleTargetWood:false,targetWood:true});
 Object.assign(mag,{ammo:1,remaining:0});
 for(let i=0;i<50;i++){updateVehicle(g,.04);g.updateProjectiles(.04);}
 assert.equal(g.vehicle.targetId,null);
 assert.equal(mag.ammo,1);
 const enemy=g.spawnEnemy(0,0,{x:1000,y:790});
 enemy.hp=enemy.maxHp=10000;
 for(let i=0;i<50;i++){updateVehicle(g,.04);g.updateProjectiles(.04);}
 assert.ok(enemy.hp<enemy.maxHp);
 assert.equal(tree.hp,afterShot);
});
// 模拟真实停在弹药铺外的车辆，室内购买仍受地理位置约束。
function shop(g){g.vehicle.active=false;const site={x:AMMO_SHOP.x+105,y:AMMO_SHOP.y+80};g.progress.campParking.owned=[{hull:g.vehicle.index,spot:null,mapId:'forest',...site,hp:1,ammo:0,reload:0,wheel:0,track:0}];g.cottage={kind:'ammo',outside:site};}
test('补给只在柜台交易，购买与制作按实物计费计重、保存失败不扣款',()=>{const g=scene();assert.equal(tradeSupply(g,{kind:'ammo',id:'shell'}).ok,false);shop(g);const c=g.progress.coins;assert.ok(tradeSupply(g,{kind:'ammo',id:'shell',target:'vehicle'}).ok);assert.equal(g.progress.supplies.vehicles[1].shell,AMMO_TYPES.shell.pack);assert.equal(g.progress.coins,c-100);assert.ok(vehicleLoad(g).ammo>=AMMO_TYPES.shell.pack*AMMO_TYPES.shell.mass);const w=g.progress.wood,parts=g.progress.materials.parts;assert.ok(tradeSupply(g,{kind:'ammo',id:'heavy',craft:true,target:'vehicle'}).ok);assert.equal(g.progress.supplies.vehicles[1].heavy,AMMO_TYPES.heavy.pack);assert.equal(g.progress.supplies.hand.heavy,0);assert.equal(g.progress.wood,w-5);assert.equal(g.progress.materials.parts,parts-2);assert.equal(catLoad(g).overloaded,false);assert.equal(g.progress.mailbox.items.length,0);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(tradeSupply(g,{kind:'item',id:'medkit'}).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;g.progress.coins=0;assert.equal(tradeSupply(g,{kind:'ammo',id:'shell'}).ok,false);});
test('实物装填只取实际库存，射空不再开火；暂停与重建不能补弹',()=>{const g=scene(),w=vehicleWeapon(g.progress,18),m=g.vehicle.module.magazine;g.progress.supplies.vehicles[1].shell=2;advanceReload(m,w,10,null,n=>takeSupplyAmmo(g,w,n,1));assert.equal(m.ammo,1);assert.equal(g.progress.supplies.vehicles[1].shell,1);assert.ok(consumeRound(m,w));advanceReload(m,w,10,null,n=>takeSupplyAmmo(g,w,n,1));assert.ok(consumeRound(m,w));advanceReload(m,w,10,null,n=>takeSupplyAmmo(g,w,n,1));assert.equal(m.ammo,0);assert.equal(consumeRound(m,w),false);const before=structuredClone(g.progress.supplies);g.state='paused';updateVehicle(g,30);assert.deepEqual(g.progress.supplies,before);g.state='playing';syncSupplyAmmo(g);const n=new Game(structuredClone(g.progress));assert.equal(n.vehicle.module.magazine.ammo,0);assert.equal(n.progress.supplies.vehicles[1].shell,0);g.magazines[0]={ammo:3,remaining:0};syncSupplyAmmo(g);assert.equal(new Game(g.progress).magazines[0].remaining,0);assert.equal(new Game(g.progress).magazines[0].ammo,3);});
test('跨车换炮只受重量限制、唯一归属、退回原车弹药且保存故障',()=>{const g=scene();g.cottage={kind:'vehicle'};g.vehicle.active=false;g.vehicles[6].module.magazine={ammo:1,remaining:0};g.progress.supplies.gunFaults[21]=60;g.vehicle.module.magazine={ammo:1,remaining:0};const result=mountMainGun(g,1,21);assert.ok(result.ok,result.message);assert.equal(g.vehicle.weaponIndex,21);assert.equal(g.vehicles[6].module,null);assert.equal(g.progress.vehicleLoadouts[6],null);assert.equal(g.progress.supplies.vehicles[6].heavy,1);assert.equal(g.progress.supplies.vehicles[1].shell,1);assert.equal(vehicleFaults(g.progress,1).gun,60);assert.equal(previewWorkshop(g.progress,'vehicle',1).weapon.id,'wolf-256');const n=new Game(g.progress);assert.equal(n.vehicle.weaponIndex,21);assert.equal(n.vehicles[6].module,null);assert.equal(mountMainGun(g,5,21).ok,false);assert.equal(g.progress.vehicleLoadouts[1],21);const before=structuredClone(g.progress);g.livingPersist=()=>false;assert.equal(mountMainGun(g,1,null).ok,false);assert.deepEqual(g.progress,before);g.livingPersist=()=>true;assert.ok(mountMainGun(g,1,null).ok);assert.equal(g.vehicle.module,null);assert.equal(configureVehicle(g,18,1),false);});
test('换到重坦的红狼主炮实际发射重弹，备用耗尽停止',()=>{const g=scene();g.cottage={kind:'vehicle'};assert.ok(mountMainGun(g,1,21).ok);g.cottage=null;g.vehicle.active=true;g.progress.supplies.vehicles[1].heavy=2;Object.assign(g.player,{x:1900,y:1750,arena:{x:1900,y:1750,radius:1000}});const e=g.spawnEnemy(0,0,{x:2070,y:1755});Object.assign(e,{hp:1e6,maxHp:1e6,speed:0,flying:false,arena:g.player.arena});for(let i=0;i<400;i++)updateVehicle(g,.04);assert.equal(g.projectiles.filter(b=>b.kind==='wolf-256').length,2);assert.equal(g.progress.supplies.vehicles[1].heavy,0);assert.equal(g.vehicle.module.magazine.ammo,0);});
test('普通伤害不损坏部件，特殊伤害有独立概率，100%故障停火停驶',()=>{const g=scene();absorbVehicleHit(g,1,{});assert.deepEqual(vehicleFaults(g.progress,1),{gun:0,engine:0});g.random=()=>.99;absorbVehicleHit(g,1,{damageType:'explosion'});assert.equal(vehicleFaults(g.progress,1).gun,0);g.random=()=>0;absorbVehicleHit(g,1,{damageType:'explosion'});assert.deepEqual(vehicleFaults(g.progress,1),{gun:24,engine:18});for(let i=0;i<10;i++)absorbVehicleHit(g,1,{damageType:'electric'});assert.deepEqual(vehicleFaults(g.progress,1),{gun:100,engine:100});assert.equal(movementLoadFactor(g),0);g.progress.supplies.vehicles[1].shell=3;updateVehicle(g,10);assert.equal(g.progress.supplies.vehicles[1].shell,3);assert.equal(g.progress.mailbox.items.length,0);const before={x:g.player.x,y:g.player.y};for(let i=0;i<3;i++)g.update(.04,{x:1,y:0});assert.equal(g.player.x,before.x);assert.equal(g.player.y,before.y);});
test('道具回复HP和部分故障，满状态/完全损坏/保存失败不消耗',()=>{const g=scene();g.progress.supplies.items={medkit:2,gunKit:2,engineKit:2};g.player.hp=20;assert.ok(useSupplyItem(g,'medkit').ok);assert.equal(g.player.hp,80);g.progress.supplies.gunFaults[18]=60;g.progress.supplies.engineFaults[1]=80;assert.ok(useSupplyItem(g,'gunKit').ok);assert.equal(vehicleFaults(g.progress,1).gun,25);assert.ok(useSupplyItem(g,'engineKit').ok);assert.equal(vehicleFaults(g.progress,1).engine,45);g.progress.supplies.engineFaults[1]=100;assert.equal(useSupplyItem(g,'engineKit').ok,false);assert.equal(g.progress.supplies.items.engineKit,1);g.livingPersist=()=>false;const p=structuredClone(g.progress);assert.equal(useSupplyItem(g,'gunKit').ok,false);assert.deepEqual(g.progress,p);g.livingPersist=()=>true;g.player.hp=g.maxHp();assert.equal(useSupplyItem(g,'medkit').ok,false);});
test('弹药转移守恒，远程不能装卸；超载停驶且卸货恢复',()=>{const g=scene(5),count=Math.ceil(vehicleLoad(g).capacity/AMMO_TYPES.heavy.mass)+1;g.progress.supplies.hand.heavy=count;assert.ok(transferSupplyAmmo(g,5,'heavy',count,'load').ok);assert.equal(g.progress.supplies.hand.heavy,0);assert.equal(g.progress.supplies.vehicles[5].heavy,count);assert.equal(movementLoadFactor(g),0);assert.ok(transferSupplyAmmo(g,5,'heavy',count,'unload').ok);assert.equal(g.progress.supplies.vehicles[5].heavy,0);g.progress.supplies.hand.heavy=0;assert.ok(movementLoadFactor(g)>0);shop(g);assert.equal(transferSupplyAmmo(g,5,'heavy',1,'load').ok,false);});
test('满HP发动机故障可以呼叫救援，保留HP与弹药，修好交维修站露天车位',()=>{const g=scene();g.progress.supplies.engineFaults[1]=100;g.progress.supplies.gunFaults[18]=35;g.progress.supplies.vehicles[1].shell=4;Object.assign(g.player,{x:REPAIR_BAY.x+200,y:REPAIR_BAY.y+80});const hp=g.vehicle.hp;assert.ok(vehicleRepairQuote(g,1)>0);const r=requestVehicleRepair(g,1,true);assert.ok(r.ok,r.message);assert.equal(g.vehicle.active,false);assert.equal(g.progress.vehicleService[1].hp,1);assert.equal(g.vehicle.hp,hp);assert.equal(requestVehicleRepair(g,1,true).ok,false);for(let i=0;i<3000&&g.progress.vehicleService[1].phase;i++)updateVehicleRepair(g,.1);assert.equal(g.progress.vehicleService[1].phase,null);assert.deepEqual(vehicleFaults(g.progress,1),{gun:0,engine:0});assert.ok(REPAIR_PARKING_SPOTS.some(s=>s.id===g.progress.campParking.owned.find(r=>r.hull===1).spot));assert.equal(g.progress.supplies.vehicles[1].shell,4);});
test('主页面不能提交升级，工坊升级保留当前实际弹夹',()=>{const g=scene();const plan=workshopUpgrade(g.progress,'turret',18,'rate',1);assert.equal(g.transactTurret(18,'upgrade'),false);assert.equal(commitWorkshop(g,plan,()=>true).ok,false);g.cottage={kind:'vehicle'};g.vehicle.module.magazine={ammo:1,remaining:0};assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(g.progress.supplies.vehicleMags[1].ammo,1);});
test('弹药铺实体墙阻挡移动，门口可站定进入；存档主炮不重复',()=>{const room=WORKSHOP_INTERIORS.ammo,body={mapId:'forest',livingCollision:true};assert.equal(blocked(AMMO_SHOP.x-85,AMMO_SHOP.y-40,10,[],body),true);assert.equal(blocked(room.door.x,room.door.y,10,[],body),false);const g=scene();g.progress.vehicleLoadouts[6]=18;const p=validateProgress(g.progress);assert.equal(p.vehicleLoadouts.filter(i=>i===18).length,1);});
test('电动车下车收回扩大弹夹多余子弹，重复收回不增殖',()=>{const g=scene(5);g.progress.weapon=0;g.progress.weapons[0]=1;g.vehicle.active=false;g.magazines[0]={ammo:30,remaining:0};g.progress.supplies.hand.light=0;clampRiderSupply(g);assert.equal(g.magazines[0].ammo,12);assert.equal(g.progress.supplies.hand.light,18);clampRiderSupply(g);assert.equal(g.progress.supplies.hand.light,18);});
test('真实受击入口尊重无敌与护盾，穿透后的特殊伤害才损伤部件',()=>{const g=scene();Object.assign(g.player,{x:1900,y:1750,invincible:1});g.hurt(1,{damageType:'piercing'});assert.equal(vehicleFaults(g.progress,1).gun,0);g.player.invincible=0;g.hurt(1,{damageType:'piercing'});assert.equal(vehicleFaults(g.progress,1).gun,25);assert.equal(vehicleFaults(g.progress,1).engine,15);});
test('共用活动快照保留跨车主炮，秘境刷新返回不复制或消耗永久弹药',()=>{const g=scene();g.cottage={kind:'vehicle'};assert.ok(mountMainGun(g,1,21).ok);g.cottage=null;g.vehicle.module.magazine={ammo:1,remaining:0};g.progress.supplies.vehicles[1].heavy=2;g.progress.supplies.gunFaults[21]=35;const snapshot=captureRealmVehicles(g);assert.equal(snapshot.hulls[1].weaponIndex,21);assert.equal(snapshot.hulls[6].weaponIndex,null);restoreRealmVehicles(g,snapshot);assert.equal(g.vehicle.weaponIndex,21);assert.equal(g.vehicle.module.magazine.ammo,1);assert.ok(g.enterRealm('tower'));const stock=structuredClone(g.progress.supplies);assert.equal(takeSupplyAmmo(g,vehicleWeapon(g.loadout,21),50,1),50);assert.deepEqual(g.progress.supplies,stock);syncRealm(g);const n=new Game(structuredClone(g.progress));assert.equal(n.vehicle.weaponIndex,21);assert.ok(n.leaveRealm());assert.equal(n.vehicle.weaponIndex,21);assert.equal(n.progress.vehicleLoadouts[6],null);assert.equal(n.vehicle.module.magazine.ammo,1);assert.equal(n.progress.supplies.vehicles[1].heavy,2);assert.equal(n.progress.supplies.gunFaults[21],35);});

// 购弹分类必须隔离库存和负重，避免购买炮弹让步行的猫猫无法移动。
test('车载弹药购买制作不增加猫猫负重，保存重建后仍归原车',()=>{const g=scene();shop(g);const beforeCat=catLoad(g).weight,beforeCar=vehicleLoad(g).payload,other=structuredClone(g.progress.supplies.vehicles[0]);assert.ok(tradeSupply(g,{kind:'ammo',id:'shell',target:'vehicle'}).ok);assert.ok(tradeSupply(g,{kind:'ammo',id:'heavy',target:'vehicle',craft:true}).ok);assert.ok(tradeSupply(g,{kind:'ammo',id:'light',target:'vehicle'}).ok);assert.equal(catLoad(g).weight,beforeCat);assert.ok(movementLoadFactor(g)>0);assert.ok(Math.abs(vehicleLoad(g).payload-beforeCar-['shell','heavy','light'].reduce((n,k)=>n+AMMO_TYPES[k].pack*AMMO_TYPES[k].mass,0))<1e-6);assert.deepEqual(g.progress.supplies.vehicles[0],other);const restored=new Game(structuredClone(g.progress));assert.equal(restored.progress.supplies.vehicles[1].shell,AMMO_TYPES.shell.pack);assert.equal(restored.progress.supplies.vehicles[1].heavy,AMMO_TYPES.heavy.pack);assert.equal(restored.progress.supplies.hand.shell,0);assert.equal(restored.progress.supplies.hand.heavy,0);});
test('购买优先入车而制作优先入包，车载炮弹和缺少目的地的交易不能扣款',()=>{const g=scene();shop(g);const beforeCar=structuredClone(g.progress.supplies.vehicles),weight=catLoad(g).weight;assert.ok(tradeSupply(g,{kind:'ammo',id:'light',target:'hand'}).ok);assert.ok(tradeSupply(g,{kind:'ammo',id:'light',target:'hand',craft:true}).ok);assert.ok(Math.abs(catLoad(g).weight-weight-1.2)<1e-6);assert.equal(g.progress.supplies.vehicles[1].light,beforeCar[1].light+300);for(const id of ['shell','heavy','water','light'])for(const craft of [false,true]){const before=structuredClone(g.progress);assert.equal(tradeSupply(g,{kind:'ammo',id,craft}).ok,false);if(['shell','heavy'].includes(id))assert.equal(tradeSupply(g,{kind:'ammo',id,craft,target:'hand'}).ok,false);assert.deepEqual(g.progress,before);}});
test('车辆不在场时整包炮弹送入可用仓位，保存失败不扣款',()=>{const g=scene();shop(g);g.progress.campParking.owned[0].x+=1000;let before=structuredClone(g.progress);const receipt=tradeSupply(g,{kind:'ammo',id:'shell',target:'vehicle'});assert.ok(receipt.ok);assert.equal(g.progress.supplies.hand.shell+g.progress.warehouse.ammo.shell,AMMO_TYPES.shell.pack);assert.deepEqual(g.progress.supplies.vehicles,before.supplies.vehicles);g.progress.campParking.owned[0].x-=1000;g.livingPersist=()=>false;before=structuredClone(g.progress);for(const craft of [false,true])assert.equal(tradeSupply(g,{kind:'ammo',id:'heavy',target:'vehicle',craft}).ok,false);assert.deepEqual(g.progress,before);});

// 三种补给统一按真实重量入货舱；整理后可取回使用，保存失败不能清除货格。
test('三种补给送到店旁载具，读档后取回，重量与金币守恒',()=>{
 for(const id of ['medkit','gunKit','engineKit']){
  const g=scene();shop(g);const before=g.progress.coins,bag=catLoad(g).weight,car=vehicleLoad(g,1).payload;
  const result=tradeSupply(g,{kind:'item',id});assert.ok(result.ok,result.message);
  const key='supply:'+id,restored=new Game(structuredClone(g.progress));
  assert.equal(restored.progress.shopStock[1][key],1);assert.equal(catLoad(g).weight,bag);
  assert.equal(g.progress.coins,before-SUPPLY_ITEMS[id].coins);assert.ok(Math.abs(vehicleLoad(g,1).payload-car-SUPPLY_ITEMS[id].mass)<1e-6);
  g.livingPersist=()=>false;assert.equal(collectShopStock(g,1,key).ok,false);assert.equal(g.progress.shopStock[1][key],1);
  g.livingPersist=()=>true;assert.ok(collectShopStock(g,1,key).ok);assert.equal(g.progress.shopStock[1][key],undefined);assert.ok(Math.abs(catLoad(g).weight-bag-SUPPLY_ITEMS[id].mass)<1e-6);
 }
});
test('负重确认：车载制作确认只改货舱',()=>{{const craft=true;const g=scene();shop(g);const load=vehicleLoad(g,1,{driver:true});g.progress.logistics.builds[1].wood=Math.floor((load.capacity-load.payload-AMMO_TYPES.shell.pack*AMMO_TYPES.shell.mass/2)/WOOD_ITEM.mass);const request={kind:'ammo',id:'shell',target:'vehicle',craft},before=structuredClone(g.progress),r=tradeSupply(g,request);assert.equal(r.needsLoadConfirmation,true);assert.equal(r.load.before,vehicleLoad(g,1,{driver:true}).payload);assert.equal(r.load.after,r.load.before+AMMO_TYPES.shell.pack*AMMO_TYPES.shell.mass);assert.deepEqual(g.progress,before);assert.ok(tradeSupply(g,{...request,loadConfirmation:r.confirmation}).ok);assert.equal(vehicleLoad(g,1,{driver:true}).payload,r.load.after);assert.deepEqual(g.progress.supplies.hand,before.supplies.hand);assert.equal(g.progress.supplies.vehicles[1].shell,AMMO_TYPES.shell.pack);assert.equal(g.progress.coins,before.coins-(craft?0:100));assert.equal(g.progress.wood,before.wood-(craft?3:0));}});
test('背包与车仓满时送到小屋，余额不足或存储失败都不会发货',()=>{
 const g=scene();shop(g);g.progress.logistics.bagWood=999;g.progress.logistics.builds[1].wood=99999;
 const request={kind:'item',id:'engineKit'},before=structuredClone(g.progress);
 g.livingPersist=()=>false;assert.equal(tradeSupply(g,request).ok,false);assert.deepEqual(g.progress,before);
 g.livingPersist=()=>true;g.progress.coins=0;assert.equal(tradeSupply(g,request).ok,false);
 g.progress.coins=1000;assert.ok(tradeSupply(g,request).ok);assert.equal(g.progress.shopStock.home['supply:engineKit'],1);
});
