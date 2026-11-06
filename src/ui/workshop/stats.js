import {eraVehicle,eraDonor} from '../../config/vehicle-eras.js';
import { i18nText, i18nHtml } from "../../i18n/index.js";
// 工坊属性展示只读取正式装备快照，不维护交易或试射状态。
import { isSummonEnergy, summonRegenRate } from '../../config/summon-energy.js';
import { vehicleDamage, vehicleMaxHp, vehicleSpeed } from '../../config/vehicles.js';
import { weaponDamage, effectiveWeapon } from '../../config/weapon-mods.js';
import { spiderGunWeapon, spiderGunDamage } from '../../config/spider-loadout.js';

// 展示实际存在的属性并将变化项置前，保留召唤装备的专属参数。
export function renderWorkshopStats({root,current,after,kind,index,maxHp,draft,comparison,summaryOnly=false}) {
  const $ = id => root.getElementById(id);
  $('ws-stats-title').textContent = draft ? i18nText("ui.workshop.stats.0503926575") : comparison ? i18nText("ui.workshop.stats.56584166fb") : i18nText("ui.workshop.stats.abb2ef1523");
  let a = current.weapon, b = after.weapon;
  const spider=b?.controller==='spider',coreA=a,coreB=b;
  if(spider){a={...spiderGunWeapon(current.progress,coreA),summonCount:coreA.summonCount};b={...spiderGunWeapon(after.progress,coreB),summonCount:coreB.summonCount};}
  const crew=!!b?.crew,mechanical=b?.controller==='mechanical', ranged=mechanical&&!crew&&Number.isInteger(current.progress.mechanicalLoadout);
  if(ranged) {
    a={...effectiveWeapon(current.progress,current.progress.mechanicalLoadout),summonCount:a.summonCount};
    b={...effectiveWeapon(after.progress,after.progress.mechanicalLoadout),summonCount:b.summonCount};
  }
  const fields = [['summonCount',crew?'邻里猫 / 只':spider?i18nText("ui.workshop.stats.e0c01a2d01"):i18nText("ui.workshop.stats.4003cfd2ab")], ['damage', spider?i18nText("ui.workshop.results.83b6383867"):ranged?i18nText("ui.workshop.stats.8aa5255fe0"):mechanical?i18nText("ui.workshop.stats.e5cab807e6"):i18nText("ui.inventory.30e1196888")], ['interval', crew?'挥击间隔/秒':ranged?i18nText("ui.workshop.stats.685b6da2aa"):mechanical?i18nText("ui.workshop.stats.9081ba3824"):i18nText("ui.workshop.stats.bcae778c69")], ['range', ranged?i18nText("ui.workshop.stats.0d096aa74b"):mechanical?i18nText("ui.workshop.results.1f8fef9ecb"):i18nText("ui.inventory.5262a412ad")],
    ['magazineSize', ranged?i18nText("ui.workshop.stats.bdd1ef480a"):mechanical?i18nText("ui.inventory.7b692d13e8"):i18nText("ui.inventory.f16f121dc0")], ['reloadTime', ranged?i18nText("ui.workshop.results.cdbf2fecb6"):mechanical?i18nText("ui.workshop.stats.8e2bafeb76"):i18nText("ui.workshop.results.cdbf2fecb6")], ['pellets', i18nText("ui.workshop.stats.8ba67b2248")], ['spread', i18nText("ui.workshop.results.a62186865b")],
    ['pierce', i18nText("ui.workshop.stats.9e5fe40689")], ['bounces', i18nText("ui.workshop.stats.80e62e20b9")], ['chain', i18nText("ui.workshop.stats.dc9ce849ce")], ['chargeTime', i18nText("ui.workshop.results.a2819c7096")],
    ['impulse', i18nText("ui.workshop.stats.7a22cc916a")], ['chillFactor', i18nText("ui.workshop.stats.ab448f19ea")], ['chillDuration', i18nText("ui.workshop.stats.133b1ea488")], ['treeMultiplier', i18nText("ui.workshop.stats.6cb20070c5")]];
  if(b?.attackKind==='defense')fields.splice(0,fields.length,['magazineSize','护盾容量'],['shieldRegen','每秒恢复'],['reloadTime','受击恢复延迟 / 秒'],['shieldBreakDelay','破盾恢复延迟 / 秒']);
  // 使用正式有效武器快照；炮塔伤害另包含车载等级与角色加成。
  const values = fields.filter(([key]) => !((mechanical||b?.controller==='spider')&&['pellets','spread'].includes(key)) && (Number.isFinite(a?.[key]) || Number.isFinite(b?.[key]))).map(([key, label]) => {
    if(key==='reloadTime'&&isSummonEnergy(b)){const x=summonRegenRate(a),y=summonRegenRate(b);return {label:i18nText("ui.panels.funnel.d87a03ca6b"),old:x,value:y,changed:x!==y};}
    const old = key==='damage'&&ranged?weaponDamage(current.progress,a.weaponIndex):key === 'damage' && kind === 'vehicle' && a ? vehicleDamage(current.progress, a.weaponIndex) : key === 'damage' && kind === 'weapons' ? weaponDamage(current.progress, index) : a?.[key] ?? 0;
    const value = key==='damage'&&ranged?weaponDamage(after.progress,b.weaponIndex):key === 'damage' && kind === 'vehicle' && b ? vehicleDamage(after.progress, b.weaponIndex) : key === 'damage' && kind === 'weapons' ? weaponDamage(after.progress, index) : b?.[key] ?? 0;
    if(spider&&key==='damage'){
      const read=p=>kind==='vehicle'?vehicleDamage(p,16):weaponDamage(p,16);
      const x=spiderGunDamage(current.progress,read(current.progress)),y=spiderGunDamage(after.progress,read(after.progress));return {label,old:x,value:y,changed:x!==y};
    }
    return { label, old, value, changed: old !== value };
  });
  if (b?.grenade) for (const key of ['damage', 'radius', 'charge'])
    if (Number.isFinite(b.grenade[key])) values.push({ label: {damage:i18nText("ui.workshop.stats.a5c4d9a8f0"),radius:i18nText("ui.workshop.stats.3fb033e968"),charge:i18nText("ui.workshop.stats.af59bd944c")}[key],
      old:a?.grenade?.[key] || 0, value:b.grenade[key], changed:a?.grenade?.[key] !== b.grenade[key] });
  if (kind === 'vehicle') {
    const era=eraVehicle(index);
    if(era){const old=(!current.progress.vehicleHulls[index]||summaryOnly)&&eraDonor(era);
      values.unshift({label:'额定货载 / 千克',old:old?.payload??era.payload,value:era.payload,changed:!!old});}
    const hp = p => vehicleMaxHp({ ...p, vehicleIndex: index }, maxHp);
    values.unshift({label:i18nText("ui.workshop.results.6217343c91"),old:vehicleSpeed(current.progress,index),value:vehicleSpeed(after.progress,index),changed:vehicleSpeed(current.progress,index)!==vehicleSpeed(after.progress,index)});
    values.unshift({ label: i18nText("ui.workshop.stats.e689117b7c"), old: hp(current.progress), value: hp(after.progress), changed: hp(current.progress) !== hp(after.progress) });
  }
  if(spider){
    const damage=p=>kind==='vehicle'?vehicleDamage(p,16):weaponDamage(p,16);
    for(const [label,x,y] of [[i18nText("ui.workshop.results.50f2ddc735"),Math.round(damage(current.progress)*coreA.minionDamageRatio),Math.round(damage(after.progress)*coreB.minionDamageRatio)],[i18nText("ui.workshop.results.7cf8c40969"),coreA.magazineSize,coreB.magazineSize],[i18nText("ui.workshop.stats.85b8bcedf4"),coreA.minionInterval,coreB.minionInterval],[i18nText("ui.workshop.results.429df0595b"),coreA.minionRange,coreB.minionRange]])values.push({label,old:x,value:y,changed:x!==y});
  }
  if((spider||ranged)&&isSummonEnergy(coreB)){const x=summonRegenRate(coreA),y=summonRegenRate(coreB);values.push({label:i18nText("ui.workshop.stats.12d65004fc"),old:x,value:y,changed:x!==y});}
  values.sort((x, y) => Number(y.changed) - Number(x.changed));
  const format = value => Number.isInteger(value) ? value : Number(value.toFixed(2));
  // 车体保留八项、武器摘要保留六项；弹匣与装填优先于弹片。
  $('ws-stats').innerHTML = values.slice(0, summaryOnly?6:kind==='vehicle'?8:6).map(v =>
    `<div class="${v.changed ? 'changed' : ''}"><small>${v.label}</small><b>${format(v.old)}${v.changed ? ' → ' + format(v.value) : ''}</b></div>`).join('') || `<small>${i18nHtml("ui.workshop.stats.db4a7d8deb")}</small>`;
  // 购买摘要保留六项核心属性，专属配置细节仍由各自配置页展示。
  if(summaryOnly)return;
  if(crew)$('ws-stats').innerHTML+=`<div><small>小队生命 / 只</small><b>${b.companionHp}</b></div><div><small>出车间隔 / 秒</small><b>${b.spawnInterval}</b></div>`;
  if(mechanical&&!crew) {
    const guns=after.weapon.rangedCount||0;
    $('ws-stats').innerHTML+=`<div><small>${i18nHtml("ui.workshop.stats.fe55b3931d")}</small><b>${guns} / ${after.weapon.summonCount-guns}</b></div><div><small>${guns?i18nText("ui.workshop.stats.215520f6e6"):i18nText("ui.workshop.stats.ef1d22403f")}</small><b>${guns?'60 / 300':'300'}</b></div>`;
  }
  if(spider)$('ws-stats').innerHTML+=`<div><small>${i18nHtml("ui.workshop.stats.6364b2616f")}</small><b>${coreB.companionHp} / ${coreB.minionHp}</b></div><div><small>${i18nHtml("ui.workshop.stats.35ff12827b")}</small><b>${coreB.spawnInterval}</b></div>`;
  if (b?.controller) $('ws-stats').innerHTML += `<div><small>${i18nHtml("ui.workshop.stats.ba116b69a4")}</small><b>${b.focusFire ? i18nText("ui.workshop.stats.d5796813fa") : i18nText("ui.workshop.stats.575dbc3b64")}</b></div>`;
}
