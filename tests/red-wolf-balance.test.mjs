// 红狼与松果同为20级，使用正式有限弹药、弹道、维修与存档入口。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,freshProgress} from '../src/game.js';
import {grantVehicleArmament} from '../src/config/vehicle-armaments.js';
import {vehicleDamage} from '../src/config/vehicles.js';
import {updateVehicle} from '../src/combat/vehicle.js';
import {syncSupplyAmmo} from '../src/combat/supply-ammo.js';
import {vehicleRepairQuote,requestVehicleRepair,updateVehicleRepair,syncVehicleService} from '../src/core/vehicle-repair.js';
import {REPAIR_BAY} from '../src/config/vehicle-repair.js';
// 测试车队明确拥有并安装主炮；移除随机波次，保留弹药与真实命中。
function scene(hull=6){
 const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true};p.vehicleHulls[hull]=1;grantVehicleArmament(p,hull);p.vehicleIndex=hull;p.vehicleWeapons[hull===6?21:17]=20;p.coins=100000;
 p.supplies.vehicles[hull][hull===6?'heavy':'light']=100;
 const g=new Game(p,()=>.5);g.state='playing';g.trees=[];g.enemies=[];g.boss=null;g.progress.campParking.owned=[];Object.assign(g.player,{x:1900,y:1750,arena:{x:1900,y:1750,radius:1000}});assert.ok(g.summonVehicle());return g;
}
// 固定高耐久靶只限制走位，不替代碰撞或爆炸实现。
function target(g,x,y){const e=g.spawnEnemy(0,0,{x,y});Object.assign(e,{hp:1e8,maxHp:1e8,speed:0,damage:0,flying:false,arena:g.player.arena});return e;}
test('红狼半损1050、满损2100；松果150和300，故障封顶与小额取整保留',()=>{
 const g=scene();g.vehicle.hp=g.vehicle.maxHp*.5;assert.equal(vehicleRepairQuote(g,6),1050);g.vehicle.hp=0;g.progress.supplies.gunFaults[21]=100;assert.equal(vehicleRepairQuote(g,6),2100);
 g.progress.supplies.gunFaults[21]=0;g.vehicle.hp=g.vehicle.maxHp-.1;assert.equal(vehicleRepairQuote(g,6),1);
 const pine=scene(0);pine.vehicle.hp=pine.vehicle.maxHp*.5;assert.equal(vehicleRepairQuote(pine,0),150);pine.vehicle.hp=0;assert.equal(vehicleRepairQuote(pine,0),300);
});
test('维修真实扣费一次，完成保留等级与弹药，重建不免费补血补弹',()=>{
 const g=scene();Object.assign(g.player,REPAIR_BAY,{arena:null});g.vehicle.hp=g.vehicle.maxHp*.5;g.progress.supplies.vehicles[6].heavy=7;syncSupplyAmmo(g);syncVehicleService(g);
 const restored=new Game(structuredClone(g.progress));assert.equal(restored.vehicle.hp,g.vehicle.hp);assert.equal(restored.progress.vehicleWeapons[21],20);assert.equal(restored.progress.supplies.vehicles[6].heavy,7);
 assert.ok(requestVehicleRepair(g,6).ok);assert.equal(g.progress.coins,98950);assert.equal(requestVehicleRepair(g,6).ok,false);assert.equal(g.progress.coins,98950);
 for(let i=0;i<3000&&g.progress.vehicleService[6].phase;i++)updateVehicleRepair(g,.1);
 assert.equal(g.progress.vehicleService[6].phase,null);assert.equal(g.vehicle.hp,g.vehicle.maxHp);assert.equal(g.progress.vehicleWeapons[21],20);assert.equal(g.progress.supplies.vehicles[6].heavy,7);
});
test('20级红狼真实直击和扩大爆炸范围各结算一次，范围外不受伤',()=>{
 const g=scene(),direct=target(g,2100,1755),side=target(g,2135,1885),far=target(g,2135,1945);
 for(let i=0;i<330;i++){updateVehicle(g,1/120);g.updateProjectiles(1/120);}
 const amount=vehicleDamage(g.progress,21);assert.equal(1e8-direct.hp,amount);assert.equal(1e8-side.hp,Math.round(amount*.8));assert.equal(far.hp,1e8);assert.equal(g.progress.supplies.vehicles[6].heavy,99);
});
test('20秒同级原厂单靶对照保持松果连射、红狼重炮，有限弹药守恒',()=>{
 for(const hull of [0,6]){const g=scene(hull),e=target(g,2100,1755);let shots=0;g.onEvent=t=>{if(t==='shot')shots++;};
  for(let i=0;i<2400;i++){updateVehicle(g,1/120);g.updateProjectiles(1/120);}
  assert.equal(shots,hull===0?96:9);assert.ok(1e8-e.hp>0);const ammo=g.progress.supplies.vehicles[hull][hull===6?'heavy':'light']+g.vehicle.module.magazine.ammo;assert.equal(ammo+shots,100);
 }
});
