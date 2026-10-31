// 自有车报废、报价、付款、拖运与读档的针对性回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {ownedPineProgress} from './helpers/owned-pine-progress.mjs';
import {capturePatrol} from '../src/core/patrol-session.js';
import {absorbVehicleHit,updateVehicle} from '../src/combat/vehicle.js';
import {REPAIR_CENTER,REPAIR_BAY} from '../src/config/vehicle-repair.js';
import {economyFor} from '../src/config/economy.js';
import {vehicleRepairQuote,requestVehicleRepair,collectRepairedVehicle,updateVehicleRepair,vehicleService} from '../src/core/vehicle-repair.js';
import {blocked} from '../src/physics/motion.js';
import {parkedOwned} from '../src/core/camp-parking.js';
import {farmLandReason} from '../src/world/farm-land.js';
import {startFireRescue} from '../src/core/fire-rescue.js';
// 测试使用真实游戏对象和自有车，避开入职演出，不使用替代业务实现。
function game(){const p=ownedPineProgress();p.coins=100000;const g=new Game(p);g.state='playing';Object.assign(g.player,{x:220,y:835});g.trees=[];g.enemies=[];g.boss=null;return g;}
// 用正式受伤入口建立残骸，溢出伤害不损伤猫猫。
function wreck(g){assert.equal(g.summonVehicle(),true);absorbVehicleHit(g,999999);return vehicleService(g,0);}
// 模拟可见游戏时间；业务计时不读取现实时间。
function finish(g){for(let i=0;i<2000&&vehicleService(g,0).phase!=='ready';i++)updateVehicleRepair(g,.05);assert.equal(vehicleService(g,0).phase,'ready');}
test('报废立即下车且等待、刷新、重生均不免费恢复',()=>{
 const g=game(),hp=g.player.hp,pos={x:g.player.x,y:g.player.y};wreck(g);
 assert.equal(g.vehicle.active,false);assert.equal(g.vehicle.hp,0);assert.equal(g.player.hp,hp);assert.deepEqual(vehicleService(g,0).position,pos);
 updateVehicle(g,1000);assert.equal(g.summonVehicle(),false);g.progress.patrol=capturePatrol(g);
 const loaded=new Game(structuredClone(g.progress));loaded.state='playing';assert.equal(loaded.vehicle.hp,0);assert.equal(loaded.summonVehicle(),false);
 g.reset();assert.equal(g.vehicle.hp,0);
});
test('报废固定一成、日常保养按损失比例百分之二报价',()=>{
 const g=game(),base=economyFor(g.progress).vehicles[0].coins;
 g.vehicle.hp=g.vehicle.maxHp*.5;assert.equal(vehicleRepairQuote(g,0),Math.ceil(base*.01));
 g.vehicle.hp=0;assert.equal(vehicleRepairQuote(g,0),Math.ceil(base*.1));g.vehicle.hp=g.vehicle.maxHp;assert.equal(vehicleRepairQuote(g,0),0);
});
test('钱不足和重复请求不扣款，暂停冻结，读档续接拖车与工时',()=>{
 const g=game();wreck(g);g.progress.coins=0;assert.equal(requestVehicleRepair(g,0,true).ok,false);assert.equal(vehicleService(g,0).phase,'wrecked');
 g.progress.coins=100000;const cost=vehicleRepairQuote(g,0);assert.equal(requestVehicleRepair(g,0,true).ok,true);assert.equal(g.progress.coins,100000-cost);
 assert.equal(requestVehicleRepair(g,0,true).ok,false);assert.equal(g.progress.coins,100000-cost);
 updateVehicleRepair(g,.5);g.state='paused';const before=JSON.stringify(vehicleService(g,0));updateVehicleRepair(g,1000);assert.equal(JSON.stringify(vehicleService(g,0)),before);
 g.progress.patrol=capturePatrol(g);const loaded=new Game(structuredClone(g.progress));loaded.state='playing';assert.deepEqual(vehicleService(loaded,0),JSON.parse(before));
 finish(loaded);assert.equal(loaded.vehicle.hp,loaded.vehicle.maxHp);assert.equal(loaded.summonVehicle(),false);
 Object.assign(loaded.player,REPAIR_CENTER,{y:REPAIR_CENTER.y+50});assert.equal(collectRepairedVehicle(loaded,0).ok,true);assert.equal(loaded.vehicle.active,true);assert.equal(loaded.progress.coins,100000-cost);
});
test('手机不接保养，现场须驾驶目标车；交车后低价修满再取车',()=>{
 const g=game();g.summonVehicle();g.vehicle.hp=g.vehicle.maxHp*.5;
 assert.equal(requestVehicleRepair(g,0,true).ok,false);Object.assign(g.player,REPAIR_BAY);
 const before=g.progress.coins,cost=vehicleRepairQuote(g,0);assert.equal(requestVehicleRepair(g,0).ok,true);assert.equal(g.vehicle.active,false);assert.equal(g.progress.coins,before-cost);
 finish(g);assert.equal(collectRepairedVehicle(g,0).ok,true);assert.equal(g.vehicle.hp,g.vehicle.maxHp);
});
test('现场可救援报废车，远处不可取车，服务期间不可被停车迁移',()=>{
 const g=game();wreck(g);Object.assign(g.player,REPAIR_BAY);assert.equal(requestVehicleRepair(g,0).ok,true);finish(g);
 Object.assign(g.player,{x:2000,y:2000});assert.equal(collectRepairedVehicle(g,0).ok,false);
 const saved=new Game(structuredClone(g.progress));assert.equal(saved.progress.campParking.owned.some(r=>r.hull===0),false);
});
test('报废飞行载具落到可步行位置且保留原损毁坐标',()=>{
 const p=ownedPineProgress();p.vehicleHulls[2]=1;p.vehicleIndex=2;const g=new Game(p);g.state='playing';g.progress.campParking.owned=[];Object.assign(g.player,{x:1000,y:2400});g.summonVehicle();const pos={x:g.player.x,y:g.player.y};absorbVehicleHit(g,999999);
 assert.equal(g.player.flying,false);assert.equal(g.vehicle.active,false);assert.deepEqual(vehicleService(g,2).position,pos);assert.equal(blocked(g.player.x,g.player.y,12,g.trees,g.player),false);
});
test('临时秘境装备不改写永久车队',()=>{
 const g=game();g.realm={mode:'rogue',phase:'combat'};g.vehicle.active=true;absorbVehicleHit(g,999999);assert.equal(vehicleService(g,0),null);assert.equal(g.vehicle.cooldown,60);
 assert.equal(requestVehicleRepair(g,0,true).ok,false);
});
test('换用其他车后仍能领取修好车，旧车留在停车场而非丢失',()=>{
 const p=ownedPineProgress();p.vehicleHulls[5]=1;p.coins=100000;const g=new Game(p);g.state='playing';g.trees=[];Object.assign(g.player,{x:220,y:835});wreck(g);assert.equal(requestVehicleRepair(g,0,true).ok,true);
 const site=parkedOwned(g).find(s=>s.record.hull===5);Object.assign(g.player,{x:site.x,y:site.y+70});assert.equal(g.selectVehicle(5),true);assert.equal(g.summonVehicle(),true);
 Object.assign(g.player,REPAIR_BAY);g.dismountVehicle();finish(g);assert.equal(collectRepairedVehicle(g,0).ok,true);assert.equal(g.vehicle.index,0);assert.equal(g.vehicle.active,true);assert.ok(parkedOwned(g).some(s=>s.record.hull===5));assert.equal(vehicleService(g,0).phase,null);
});
test('旧档零血停驻车迁移为唯一残骸，维修中心底座与耕地留白一致',()=>{
 const p=ownedPineProgress();p.campParking={owned:[{hull:0,spot:'north-0-0',hp:0,ammo:0,reload:0}]};const g=new Game(p);
 assert.equal(g.vehicle.hp,0);assert.equal(vehicleService(g,0).phase,'wrecked');assert.equal(g.progress.campParking.owned.length,0);
 assert.equal(blocked(REPAIR_CENTER.x+90,REPAIR_CENTER.y,12,[],{mapId:'forest',livingCollision:true}),true);
 assert.equal(blocked(REPAIR_CENTER.x,REPAIR_CENTER.y+55,12,[],{mapId:'forest',livingCollision:true}),false);
 assert.match(farmLandReason(g,{...REPAIR_CENTER,y:REPAIR_CENTER.y-45}),/建筑|路面/);
});
test('消防任务不能覆盖报废订单，自有消防车再出动保持损耗耐久',()=>{
 const p=ownedPineProgress();p.vehicleHulls[4]=1;const g=new Game(p);g.state='playing';g.fireRescue={phase:'offered',fires:[]};g.progress.vehicleService[4]={hp:0,phase:'wrecked',position:{x:200,y:800},mapId:'forest'};g.vehicles[4].hp=0;
 assert.equal(startFireRescue(g),false);assert.equal(g.progress.vehicleService[4].phase,'wrecked');
 g.progress.vehicleService[4]=null;g.vehicles[4].hp=g.vehicles[4].maxHp*.6;const truck=g.vehicles[4],hp=truck.hp;
 assert.equal(startFireRescue(g),true);assert.equal(g.vehicle,truck);assert.equal(g.vehicle.hp,hp);
 g.fireRescue.phase='active';g.vehicle.active=true;absorbVehicleHit(g,999999);assert.equal(vehicleService(g,4).phase,'wrecked');assert.equal(g.vehicle.hp,0);assert.equal(g.summonVehicle(),false);
});
