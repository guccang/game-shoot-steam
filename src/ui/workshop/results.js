import { i18nText } from "../../i18n/index.js";
import { isSummonEnergy, summonRegenRate } from '../../config/summon-energy.js';
// 完成摘要只读取正式装备计算结果，不另写成长公式。
import { effectiveWeapon, weaponDamage } from '../../config/weapon-mods.js';
import { vehicleWeapon, vehicleDamage, vehicleMaxHp, vehicleSpeed } from '../../config/vehicles.js';
import { spiderGunDamage } from '../../config/spider-loadout.js';

// 按本次升级部件选取真实变化值，最多三项，射速同时覆盖脉冲蓄能及冷却。
export function workshopResultChanges(previous,next,plan,maxHp) {
  if(plan.kind==='vehicle') {
    const read=plan.part==='armor'?p=>vehicleMaxHp({...p,vehicleIndex:plan.index},maxHp):p=>vehicleSpeed(p,plan.index);
    return [{label:plan.part==='armor'?i18nText("ui.workshop.results.5ad0c596f2"):i18nText("ui.workshop.results.6217343c91"),old:read(previous),value:read(next)}];
  }
  const read=plan.kind==='turret'?vehicleWeapon:effectiveWeapon,a=read(previous,plan.index),b=read(next,plan.index);
  if(a.attackKind==='defense'){const key=plan.part==='damage'?'magazineSize':'shieldRegen';return [{label:plan.part==='damage'?'护盾容量':'每秒恢复',old:a[key],value:b[key]}];}
  if(plan.part==='damage') {
    const damage=plan.kind==='turret'?vehicleDamage:weaponDamage;
    if(a.controller==='spider')return [
      {label:i18nText("ui.workshop.results.83b6383867"),old:spiderGunDamage(previous,damage(previous,16)),value:spiderGunDamage(next,damage(next,16))},
      {label:i18nText("ui.workshop.results.50f2ddc735"),old:Math.round(damage(previous,16)*a.minionDamageRatio),value:Math.round(damage(next,16)*b.minionDamageRatio)}
    ].filter(v=>v.old!==v.value);
    return [{label:a.crew?'近战伤害':a.controller==='mechanical'?i18nText("ui.workshop.results.618c4172f9"):i18nText("ui.inventory.30e1196888"),old:damage(previous,plan.index),value:damage(next,plan.index)}];
  }
  if(plan.part==='reload'&&isSummonEnergy(a))return [{label:i18nText("ui.panels.funnel.d87a03ca6b"),old:summonRegenRate(a),value:summonRegenRate(b)}];
  const fields={rate:[['interval',i18nText("ui.workshop.results.eb9397f841")],['chargeTime',i18nText("ui.workshop.results.a2819c7096")],['cooldown',i18nText("ui.workshop.results.8f2ac689c2")]],capacity:[['magazineSize',i18nText("ui.workshop.results.d8272b3c5f")]],reload:[['reloadTime',i18nText("ui.workshop.results.cdbf2fecb6")]],range:[['range',i18nText("ui.inventory.5262a412ad")]],accuracy:[['spread',i18nText("ui.workshop.results.a62186865b")]],coordination:[['summonCount',i18nText("ui.workshop.results.1b82a3f01e")]]};
  if(a.controller==='spider'){
    fields.capacity=[['magazineSize',i18nText("ui.workshop.results.7cf8c40969")]];fields.reload=[['reloadTime',i18nText("ui.workshop.results.4cf8988988")]];fields.range=[['minionRange',i18nText("ui.workshop.results.429df0595b")]];
    if(Number.isInteger(previous.spiderLoadout))fields.rate=[['minionInterval',i18nText("ui.workshop.results.71e6a40401")]];
  }
  return (fields[plan.part]||[]).filter(([key])=>Number.isFinite(a[key])&&Number.isFinite(b[key])&&a[key]!==b[key])
    .map(([key,label])=>({label:a.crew&&key==='summonCount'?'邻里猫数量':a.controller==='spider'&&key==='summonCount'?i18nText("ui.workshop.results.ae8b080bd8"):a.controller==='mechanical'&&key==='range'?i18nText("ui.workshop.results.1f8fef9ecb"):label,old:a[key],value:b[key]}));
}

// 小幅变化保留三位小数，避免低射速间隔升级被四舍五入成没有变化。
export function formatWorkshopResult(value) {return String(Number(value.toFixed(3)));}
