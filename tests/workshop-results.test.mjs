// 完成摘要校验正式值与正确目标，避免展示其他装备或遗漏脉冲双时钟。
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshProgress } from '../src/progression/progress.js';
import { workshopUpgrade, applyPartPreview } from '../src/progression/workshop/workshop.js';
import { effectiveWeapon } from '../src/config/weapon-mods.js';
import { vehicleWeapon, vehicleMaxHp, vehicleSpeed } from '../src/config/vehicles.js';
import { workshopResultChanges, formatWorkshopResult } from '../src/ui/workshop/results.js';

// 构造拥有装备的独立进度，升级只作用于副本。
function sample(kind,index,part) {
  const old=freshProgress();old.weapons.fill(1);old.vehicleWeapons.fill(1);old.vehicleHulls.fill(1);
  const plan=workshopUpgrade(old,kind,index,part,2),next=structuredClone(old);applyPartPreview(next,plan);
  return {old,next,plan,rows:workshopResultChanges(old,next,plan,120)};
}
test('完成摘要取目标炮塔正式三段时钟，不误用手持等级',()=>{
  const {old,next,plan}=sample('turret',9,'rate');old.weaponParts[9].rate=5;next.weaponParts[9].rate=5;
  const rows=workshopResultChanges(old,next,plan,120),a=vehicleWeapon(old,9),b=vehicleWeapon(next,9);
  assert.deepEqual(rows.map(r=>[r.old,r.value]),['interval','chargeTime','cooldown'].map(k=>[a[k],b[k]]));
  assert.ok(rows.every(r=>r.value<r.old));assert.equal(old.turretParts[9].rate,1);
});
test('容量、装填、射程、精度与召唤摘要包含真实变化',()=>{
  for(const [i,part,key] of [[0,'capacity','magazineSize'],[0,'reload','reloadTime'],[0,'range','range'],[2,'accuracy','spread'],[15,'coordination','summonCount']]) {
    const {old,next,rows}=sample('weapons',i,part);
    assert.equal(rows.length,1);assert.equal(rows[0].old,effectiveWeapon(old,i)[key]);assert.equal(rows[0].value,effectiveWeapon(next,i)[key]);assert.notEqual(rows[0].old,rows[0].value);
  }
});
test('车体摘要使用被编辑车型，未改动出战车或旧进度',()=>{
  for(const part of ['armor','engine']) {
    const {old,next,rows}=sample('vehicle',2,part);
    const read=part==='engine'?p=>vehicleSpeed(p,2):p=>vehicleMaxHp({...p,vehicleIndex:2},120);
    assert.equal(rows[0].old,read(old));assert.equal(rows[0].value,read(next));assert.equal(old.vehicleHulls[2],1);assert.equal(next.vehicleIndex,old.vehicleIndex);
  }
});
test('短数值仍能分辨小间隔变化',()=>{assert.equal(formatWorkshopResult(0.16), '0.16');assert.equal(formatWorkshopResult(0.16/1.08),'0.148');assert.equal(formatWorkshopResult(120),'120');});
