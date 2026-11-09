// 真实购枪事务覆盖负重临界、原子拒绝和原地清理恢复，不放宽移动上限。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {catLoad,movementLoadFactor} from '../src/progression/inventory/load-weight.js';
import {quoteWorkshop} from '../src/progression/workshop/workshop.js';
import {equipmentRecipe} from '../src/progression/workshop/equipment-goals.js';
import {weaponPurchaseQuote} from '../src/core/inventory/weapon-purchase-load.js';
import {commitWorkshop} from '../src/core/workshop/workshop.js';
import {collectShopStock} from '../src/core/economy/shop-delivery.js';
import {carriedWeapon} from '../src/progression/inventory/weapon-storage.js';
import {discardLoad} from '../src/core/inventory/load-cleanup.js';
import {WOOD_ITEM} from '../src/config/wood-storage.js';
import {AMMO_TYPES} from '../src/config/supplies.js';

const plan={kind:'weapons',index:1,action:'buy'};
// 保留实际农具和基础武器，解除购买资格但不赠送全部枪械。
function scene(){
  const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=TOWN_RESTORATIONS.map(r=>r.id);p.coins=p.wood=100000;p.bosses=50;
  // 购枪负重夹具提供现行工业配方的部件，避免资源资格掩盖容量检查。
  p.materials={...p.materials,parts:10000,crystal:10000,core:10000,copperGun:10000};
  p.weapons.fill(0);p.weapons[0]=1;p.weapon=0;
  const g=new Game(p);g.state='playing';g.vehicle.active=false;g.cottage={kind:'weapons'};g.livingPersist=()=>true;
  return g;
}
// 按整数克计算整发弹药，无法精确构造边界时直接失败，不四舍五入掩盖测试偏差。
function fillAfterPurchase(g,weight){
  const quote=weaponPurchaseQuote(g,plan,quoteWorkshop(g.progress,plan));assert.ok(quote.ok,quote.reason);
  assert.equal(quote.load.capacity,30);
  const remaining=Math.round(weight*1000)-Math.round(quote.load.weight*1000),mass=Math.round(AMMO_TYPES.light.mass*1000);
  assert.ok(remaining>=0);assert.equal(remaining%mass,0,'目标重量必须能由整发子弹精确组成');
  g.progress.supplies.hand.light+=remaining/mass;
  assert.equal(weaponPurchaseQuote(g,plan,quoteWorkshop(g.progress,plan)).load.weight,weight);
}

for(const weight of [30,30.002])test(`购买后 ${weight}kg 整件入库，保存失败可重试`,()=>{
  const g=scene();
  // 50 克钥匙会留下 2 克余数；精确 30kg 场景不携带钥匙，其余场景保留正常随身物品。
  if(weight===30)g.progress.keepsakes.items=g.progress.keepsakes.items.filter(id=>id!=='house-key');
  fillAfterPurchase(g,weight);assert.ok(!catLoad(g).overloaded);
  const before=JSON.stringify(g.progress),mags=JSON.stringify(g.magazines);let writes=0;
  assert.equal(commitWorkshop(g,plan,()=>false).ok,false);assert.equal(JSON.stringify(g.progress),before);
  const r=commitWorkshop(g,plan,()=>{writes++;return true;});
  assert.ok(r.ok);assert.equal(r.place,'小屋仓库');assert.equal(r.load.weight,weight);assert.deepEqual(g.progress.warehouse.weapons,[1]);
  assert.equal(writes,1);assert.equal(JSON.stringify(g.magazines),mags);assert.equal(g.transact('weapons',1,'buy'),false);
});

test('略低于上限可购买，报价与购买、读档后的真实负重一致',()=>{
  const g=scene();fillAfterPurchase(g,29.998);let saved;
  const r=commitWorkshop(g,plan,p=>{saved=structuredClone(p);return true;});
  assert.ok(r.ok,r.reason);assert.equal(catLoad(g).weight,29.998);assert.ok(movementLoadFactor(g)>0);
  assert.equal(g.progress.weapons[1],1);assert.ok(g.progress.coins<100000);
  assert.equal(catLoad(new Game(saved)).weight,29.998);
});

test('报价计入运行弹匣，不依赖过期的存档弹匣数量',()=>{
  const g=scene();g.magazines[0].ammo=12;g.magazines[1].ammo=8;g.progress.supplies.handMags=[];
  const r=weaponPurchaseQuote(g,plan,quoteWorkshop(g.progress,plan));assert.ok(r.ok);
  assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.equal(catLoad(g).weight,r.load.weight);
});

// 将同一辆可用自有车停在店外，按不同负重复核三个交付位置。
function parkOutside(){
 const g=scene();g.cottage.outside={x:2000,y:2000};g.progress.vehicleHulls[1]=1;
 g.progress.campParking.owned=[{hull:1,mapId:'forest',spot:null,x:2010,y:2010,hp:1,ammo:0}];
 return g;
}

test('背包有余量时即使店外有车也优先随身携带',()=>{
 const g=parkOutside();
 assert.equal(commitWorkshop(g,plan,()=>true).place,'猫猫背包');
 assert.ok(carriedWeapon(g.progress,1));
});

test('背包与门外车辆都装不下时交付小屋仓库',()=>{
 const g=parkOutside();g.progress.logistics.bagWood=Math.ceil(catLoad(g).capacity/WOOD_ITEM.mass);
 // 扣掉制造木材后仍然满载，才应触发仓库交付。
 g.progress.logistics.bagWood+=equipmentRecipe('weapons',1,g.progress).wood;
 g.progress.logistics.builds[1].wood=99999;
 assert.equal(commitWorkshop(g,plan,()=>true).place,'小屋仓库');
 assert.deepEqual(g.progress.warehouse.weapons,[1]);
});

test('背包装不下才交付门外车辆，读档后可从同车取回',()=>{
 const g=parkOutside();g.progress.logistics.bagWood=Math.ceil(catLoad(g).capacity/WOOD_ITEM.mass);
 const paidWood=equipmentRecipe('weapons',1,g.progress).wood;g.progress.logistics.bagWood+=paidWood;
 const before=catLoad(g).weight;let saved;
 const result=commitWorkshop(g,plan,p=>{saved=structuredClone(p);return true;});
 assert.ok(result.ok);assert.match(result.place,/载具仓库/);assert.ok(Math.abs(catLoad(g).weight-(before-paidWood*WOOD_ITEM.mass))<1e-6);
 const restored=new Game(saved);restored.state='paused';restored.vehicle.active=false;
 restored.livingPersist=()=>true;Object.assign(restored.player,{x:2010,y:2010});
 assert.equal(carriedWeapon(restored.progress,1),false);assert.equal(restored.progress.weapon,0);
 assert.equal(collectShopStock(restored,1,'weapon:1').ok,false);
 restored.progress.logistics.bagWood=0;
 assert.ok(collectShopStock(restored,1,'weapon:1').ok);assert.ok(carriedWeapon(restored.progress,1));
 assert.equal(collectShopStock(restored,1,'weapon:1').ok,false);
});

test('已经满载可在工坊原地整理，清理后重算购枪资格并恢复移动',()=>{
  const g=scene();g.progress.logistics.bagWood=Math.ceil(catLoad(g).capacity/WOOD_ITEM.mass);assert.ok(movementLoadFactor(g)>0&&movementLoadFactor(g)<1);
  g.progress.logistics.bagWood+=equipmentRecipe('weapons',1,g.progress).wood;
  assert.equal(commitWorkshop(g,plan,()=>true).place,'小屋仓库');
  assert.ok(discardLoad(g,{id:'material:wood',count:g.progress.logistics.bagWood}).ok);assert.ok(movementLoadFactor(g)>0);
  assert.equal(commitWorkshop(g,plan,()=>true).ok,false);assert.ok(movementLoadFactor(g)>0);
});

test('制造消耗背包材料释放空间后，整枪优先放入背包',()=>{
 const g=parkOutside();g.progress.logistics.bagWood=Math.ceil(catLoad(g).capacity/WOOD_ITEM.mass);
 const wood=g.progress.logistics.bagWood,paid=equipmentRecipe('weapons',1,g.progress).wood,home=g.progress.wood;
 const result=commitWorkshop(g,plan,()=>true);assert.ok(result.ok);assert.equal(result.place,'猫猫背包');
 assert.equal(g.progress.logistics.bagWood,wood-paid);assert.equal(g.progress.wood,home);assert.ok(carriedWeapon(g.progress,1));
});

test('负重限制不干扰已拥有武器的换装与升级',()=>{
  const g=scene();g.progress.logistics.bagWood=Math.ceil(catLoad(g).capacity/WOOD_ITEM.mass);
  assert.equal(g.transact('weapons',0,'equip'),true);
  assert.ok(commitWorkshop(g,{kind:'weapons',index:0,action:'upgrade'},()=>true).ok);
});

test('首次手枪制造仍完成入职，保存失败不会扣除木料或发枪',()=>{
  const g=scene();g.progress.arrival.phase='craft';g.progress.weapons[0]=0;g.progress.weapons[14]=1;g.progress.weapon=14;g.progress.wood=8;
  const first={kind:'weapons',index:0,action:'buy'};
  assert.equal(commitWorkshop(g,first,()=>false).ok,false);assert.equal(g.progress.wood,8);assert.equal(g.progress.arrival.phase,'craft');
  assert.ok(commitWorkshop(g,first,()=>true).ok);assert.equal(g.progress.weapon,0);assert.equal(g.progress.wood,0);
  assert.equal(g.progress.arrival.phase,'complete');assert.ok(movementLoadFactor(g)>0);
});
