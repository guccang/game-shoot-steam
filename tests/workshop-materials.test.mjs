// 工坊跨仓扣料覆盖真实报价、购买、部件升级、改装及保存失败回滚。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress,validateProgress} from '../src/progression/progress.js';
import {Game} from '../src/core/game.js';
import {commitWorkshop} from '../src/core/workshop/workshop.js';
import {quoteWorkshop,workshopUpgrade,workshopDraft} from '../src/progression/workshop/workshop.js';
import {equipmentRequirements} from '../src/progression/workshop/equipment-goals.js';
import {workshopMaterialCount,spendWorkshopMaterials} from '../src/progression/workshop/workshop-materials.js';
import {industryStore} from '../src/progression/industry/industry.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {CAMP_PLOTS} from '../src/config/camp-land.js';

// 只解除本组交易前置，材料按每个用例精确提供。
function ready(){
 const p=freshProgress();p.arrival=null;p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';
 p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);p.campLand.owned=CAMP_PLOTS.map(f=>f.id);
 p.coins=100000;p.wood=0;p.vehicleHulls[0]=1;p.vehicleHulls[5]=1;p.weapons[1]=0;
 p.mastery.fill(100);return p;
}
// 使用正式库存槽布置实物，不向旧钱包伪造在途数量。
function put(p,key,where,n){const [stock,id]=industryStore(p,key,where,true);stock[id]=n;}
// 常规材料放小屋，木材和工业件分散到不同实际来源。
function fund(p,plan){
 const rows=equipmentRequirements(p,plan.kind,plan.index);
 for(const {key,need} of rows){
  if(key==='coins')continue;
  if(key==='wood'){put(p,key,'bag',10);put(p,key,0,20);put(p,key,5,need-31);put(p,key,'home',1);}
  else if(key.endsWith('Gun')||key.endsWith('Vehicle')){put(p,key,'bag',1);put(p,key,5,need-1);}
  else p.materials[key]=need;
 }
 return rows;
}

for(const plan of [{kind:'weapons',index:1,action:'buy'},{kind:'vehicle',index:3,action:'buy'}])test(`${plan.kind}合计背包、两辆车和小屋，报价不修改原库存，支付只扣一次`,()=>{
 const p=ready(),rows=fund(p,plan),before=JSON.stringify(p),q=quoteWorkshop(p,plan);
 assert.ok(q.ok,q.reason);assert.equal(JSON.stringify(p),before);
 for(const row of rows){assert.equal(q.rows.find(r=>r.key===row.key).missing,0);if(row.key!=='coins')assert.equal(workshopMaterialCount(q.next,row.key),0);}
 assert.ok((plan.kind==='weapons'?q.next.weapons:q.next.vehicleHulls)[plan.index]);
 const saved=validateProgress(q.next);for(const row of rows)if(row.key!=='coins')assert.equal(workshopMaterialCount(saved,row.key),0);
 assert.equal(quoteWorkshop(saved,plan).ok,false);
});

test('优先背包再载具最后小屋，原矿、工厂产物和未拥有车辆不冒充材料',()=>{
 const p=ready();put(p,'wood','bag',5);put(p,'wood',0,7);put(p,'wood','home',10);
 assert.ok(spendWorkshopMaterials(p,{wood:8}));assert.equal(p.logistics.bagWood,0);assert.equal(p.logistics.builds[0].wood,4);assert.equal(p.wood,10);
 p.vehicleHulls[1]=0;put(p,'copperGun',1,99);p.industry.sites.factory.output.copperGun=9;p.mining.bagOre.copper=99;
 assert.equal(workshopMaterialCount(p,'copperGun'),0);
 const before=JSON.stringify(p);assert.equal(spendWorkshopMaterials(p,{wood:10,copperGun:1}),false);assert.equal(JSON.stringify(p),before);
});

test('正式购买保存失败或抛错时跨仓库存不变，成功仅提交一次',()=>{
 const p=ready(),plan={kind:'weapons',index:1,action:'buy'};fund(p,plan);const g=new Game(p);g.cottage={kind:'weapons'};
 const before=JSON.stringify(g.progress);let writes=0;
 for(const persist of [()=>false,()=>{throw Error('保存失败');}]){assert.equal(commitWorkshop(g,plan,persist).ok,false);assert.equal(JSON.stringify(g.progress),before);}
 assert.ok(commitWorkshop(g,plan,()=>{writes++;return true;}).ok);assert.equal(writes,1);assert.equal(workshopMaterialCount(g.progress,'wood'),0);assert.equal(workshopMaterialCount(g.progress,'copperGun'),0);
 assert.equal(commitWorkshop(g,plan,()=>{writes++;return true;}).ok,false);assert.equal(writes,1);
});

test('武器升级、部件、改装及战车主炮升级使用随身和车载木材',()=>{
 const p=ready();p.weapons[0]=1;p.vehicleWeapons[18]=1;p.vehicleHulls[1]=1;p.vehicleLoadouts[1]=18;
 const plans=[{kind:'weapons',index:0,action:'upgrade'},workshopUpgrade(p,'weapons',0,'rate'),workshopDraft(p,'weapons',0,1),{kind:'turret',index:18,action:'upgrade'},workshopUpgrade(p,'turret',18,'rate',1)];
 for(const plan of plans){
  const sample=structuredClone(p);sample.wood=100000;const baseline=quoteWorkshop(sample,plan);assert.ok(baseline.ok,baseline.reason);
  const need=baseline.rows.find(r=>r.key==='wood')?.need||0;sample.wood=0;put(sample,'wood','bag',Math.floor(need/2));put(sample,'wood',5,need-Math.floor(need/2));
  const q=quoteWorkshop(sample,plan);assert.ok(q.ok,JSON.stringify({plan,reason:q.reason}));assert.equal(workshopMaterialCount(q.next,'wood'),0);
  if(need){sample.logistics.builds[5].wood--;const old=JSON.stringify(sample);assert.equal(quoteWorkshop(sample,plan).ok,false);assert.equal(JSON.stringify(sample),old);}
 }
});
