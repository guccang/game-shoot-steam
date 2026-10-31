// 装备档案覆盖正式目录、拥有状态和主炮编号隔离，阅读不会修改存档。
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProgress} from '../src/progression/progress.js';
import {WEAPONS} from '../src/config/weapons.js';
import {COLLECTED_VEHICLES} from '../src/config/vehicles.js';
import {VEHICLE_ARMAMENTS} from '../src/config/vehicle-armaments.js';
import {workshopEquipmentInfo} from '../src/ui/workshop/equipment-info.js';

test('所有武器与载具均有独立完整故事，拥有后隐藏来源且不修改存档',()=>{
 const p=freshProgress(),titles=new Set();
 for(const [kind,catalog,key] of [['weapons',WEAPONS,'weapons'],['vehicle',COLLECTED_VEHICLES,'vehicleHulls']]){
  catalog.forEach((equipment,index)=>{
   p[key][index]=0;const before=structuredClone(p),model=workshopEquipmentInfo(p,{kind,index});
   assert.equal(model.name,equipment.name);assert.equal(model.description,equipment.description);
   assert.ok(model.maker&&model.title&&model.story.length>=2&&model.source);
   assert.ok(model.story.join('').length>80);assert.ok(!titles.has(model.title));titles.add(model.title);
   assert.deepEqual(p,before);
   p[key][index]=1;assert.equal(workshopEquipmentInfo(p,{kind,index}).source,'');
  });
 }
 assert.equal(titles.size,WEAPONS.length+COLLECTED_VEHICLES.length);
});
test('每种专属主炮关联自己的故事，17号主炮不会串到引力枪',()=>{
 const p=freshProgress();p.vehicleHulls.fill(1);
 for(const arm of VEHICLE_ARMAMENTS){
  const model=workshopEquipmentInfo(p,{kind:'vehicle',index:arm.hullIndex,turret:arm.weaponIndex});
  assert.equal(model.name,arm.name);assert.ok(model.story.length&&model.maker);assert.equal(model.source,'');
 }
 assert.equal(workshopEquipmentInfo(p,{kind:'weapons',index:17,turret:17}).id,'gravity-gun');
 assert.equal(workshopEquipmentInfo(p,{kind:'vehicle',index:0,turret:17}).id,'vehicle-machinegun');
 assert.equal(workshopEquipmentInfo(p,{kind:'vehicle',index:6,turret:17}).id,'red-wolf');
});
test('空货架不返回旧档案，红狼保留完整传奇故事',()=>{
 const p=freshProgress();
 for(const index of [null,-1,999])assert.equal(workshopEquipmentInfo(p,{kind:'weapons',index}),null);
 const wolf=workshopEquipmentInfo(p,{kind:'vehicle',index:6});
 assert.ok(wolf.story.length>=4);assert.ok(wolf.story.join('').includes('等你回家'));
});
