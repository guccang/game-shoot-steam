// 真实购枪事务覆盖负重临界、原子拒绝和原地清理恢复，不放宽移动上限。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {catLoad,movementLoadFactor} from '../src/progression/load-weight.js';
import {quoteWorkshop} from '../src/progression/workshop.js';
import {weaponPurchaseQuote} from '../src/core/weapon-purchase-load.js';
import {commitWorkshop} from '../src/core/workshop.js';
import {discardLoad} from '../src/core/load-cleanup.js';
import {AMMO_TYPES} from '../src/config/supplies.js';

const plan={kind:'weapons',index:1,action:'buy'};
// 保留实际农具和基础武器，解除购买资格但不赠送全部枪械。
function scene(){
  const p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};
  p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
  p.restoration.repaired=TOWN_RESTORATIONS.map(r=>r.id);p.coins=p.wood=100000;p.bosses=50;
  p.materials={parts:10000,crystal:10000,core:10000};
  p.weapons.fill(0);p.weapons[0]=1;p.weapon=0;
  const g=new Game(p);g.state='playing';g.vehicle.active=false;g.cottage={kind:'weapons'};g.livingPersist=()=>true;
  return g;
}
// 用真实子弹质量补足指定购买后重量，确保校验的是现有 30kg 限制。
function fillAfterPurchase(g,weight){
  const quote=weaponPurchaseQuote(g,plan,quoteWorkshop(g.progress,plan));assert.ok(quote.ok,quote.reason);
  g.progress.supplies.hand.light+=Math.round((weight-quote.load.weight)/AMMO_TYPES.light.mass);
}

for(const weight of [30,30.002])test(`购买后 ${weight}kg 在保存前拒绝且不扣资源`,()=>{
  const g=scene();fillAfterPurchase(g,weight);assert.ok(!catLoad(g).overloaded);
  const before=JSON.stringify(g.progress),mags=JSON.stringify(g.magazines);let writes=0;
  const r=commitWorkshop(g,plan,()=>{writes++;return true;});
  assert.equal(r.ok,false);assert.equal(r.loadBlocked,true);assert.equal(r.load.weight,weight);assert.match(r.reason,/整理背包/);
  assert.equal(writes,0);assert.equal(JSON.stringify(g.progress),before);assert.equal(JSON.stringify(g.magazines),mags);
  assert.equal(g.transact('weapons',1,'buy'),false);assert.equal(JSON.stringify(g.progress),before);
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

test('已经满载可在工坊原地整理，清理后重算购枪资格并恢复移动',()=>{
  const g=scene();g.progress.logistics.bagWood=100;assert.ok(movementLoadFactor(g)>0&&movementLoadFactor(g)<1);
  assert.equal(commitWorkshop(g,plan,()=>true).loadBlocked,true);
  assert.ok(discardLoad(g,{id:'material:wood',count:100}).ok);assert.ok(movementLoadFactor(g)>0);
  assert.ok(commitWorkshop(g,plan,()=>true).ok);assert.ok(movementLoadFactor(g)>0);
});

test('负重限制不干扰已拥有武器的换装与升级',()=>{
  const g=scene();g.progress.logistics.bagWood=100;
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
