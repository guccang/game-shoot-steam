import { i18nText, i18nHtml } from "../../i18n/index.js";
// 战场建造详情只展示枪械，能力与升级预览读取正式局内装备公式。
import { GUARDIAN_PADS, GUARDIAN_ECONOMY, guardianOwnsWeapon, guardianInvestment } from '../../config/guardian.js';
import { WEAPONS } from '../../config/weapons.js';
import { availableFunnelWeapons } from '../../config/funnel-loadouts.js';
import { guardianWeaponStats } from '../../config/guardian-equipment.js';
import { GUARDIAN_STAT_KEYS, GUARDIAN_STAT_MAX, guardianStatLevel, guardianStatCost, guardianNextStat } from '../../config/guardian-upgrades.js';

// 枪械目录保持永久拥有权，不再包含车辆选项。
export function guardianEquipment(progress) {
  return WEAPONS.flatMap((w,index)=>guardianOwnsWeapon(progress,index)?[{kind:'weapon',index,name:w.name}]:[]);
}

// 主战场波次条内的紧凑状态，战斗、准备和休整均实时显示。
export function guardianStatusMarkup(game) {
  const r=game.realm;
  return `<span class="guardian-wallet">${i18nHtml("ui.panels.guardian.cf4a04481b")} <b data-guardian-coins>${r.realmCoins}</b></span><span class="guardian-health">${i18nHtml("ui.panels.guardian.89d9e7d5f7")} <b data-guardian-hp>${Math.ceil(r.goddess.hp)} / ${r.goddess.maxHp}</b><progress aria-label="${i18nHtml("ui.panels.guardian.2a34861f18")}" value="${r.goddess.hp}" max="${r.goddess.maxHp}"></progress></span>`;
}

// 仅在选择了待放置装备时显示可取消的轻量提示。
export function guardianPlacementMarkup(game, selection) {
  if(!selection)return '';
  const chosen=guardianEquipment(game.progress).find(o=>`weapon:${o.index}`===selection);
  return `<div class="guardian-placement-hint"><span>${i18nHtml("ui.panels.guardian.f7b9024d71", { p0: (chosen?.name || i18nText("ui.expedition-slots.4fddf6e096")) })}</span><button data-guardian-cancel>${i18nHtml("ui.panels.guardian.2cd0f3be87")}</button></div>`;
}

// 数值保留必要小数，整数不追加无意义零位。
function amount(value) { return Number(value.toFixed(2)).toString(); }

// 单颗伤害与射击频率分开，散弹、弹射和蓄能说明仍使用原枪械描述。
function statsMarkup(game,tower,module=null) {
  const current=guardianWeaponStats(game.progress,tower,game.realm.buffs,tower.level,module);
  const rows=[[i18nText("ui.panels.guardian.a5d56d12e7"),'damage',''],[i18nText("ui.panels.guardian.0f6a012a72"),'rate',i18nText("ui.panels.guardian.9140c07b19")],[i18nText("ui.inventory.f16f121dc0"),'magazine',i18nText("ui.panels.guardian.cf1df7e660")],[i18nText("ui.panels.guardian.4814eacae3"),'reload',i18nText("ui.panels.guardian.00fe8dda1f")],[i18nText("ui.inventory.5262a412ad"),'range',''],[i18nText("ui.panels.guardian.63f74bac21"),'pellets',i18nText("ui.panels.guardian.bce9931d83")]];
  return `<table class="guardian-stats" aria-label="${i18nHtml("ui.panels.guardian.2cc05caee3", { p0: (module===null?i18nText("ui.expedition-slots.4fddf6e096"):i18nText("ui.panels.guardian.cd49d4a545", { p0: (module+1) })) })}"><thead><tr><th>${i18nHtml("ui.panels.guardian.e98851354f")}</th><th>${i18nHtml("ui.panels.guardian.cb62ebd689")}</th><th>${i18nHtml("ui.panels.guardian.9cea2277ed")}</th></tr></thead><tbody>${rows.map(([name,key,unit])=>{
    const upgradeable=GUARDIAN_STAT_KEYS.includes(key),level=guardianStatLevel(tower,key),full=level>=GUARDIAN_STAT_MAX;
    const nextTower=upgradeable?guardianNextStat(tower,key):tower;
    const next=guardianWeaponStats(game.progress,nextTower,game.realm.buffs,nextTower.level,module);
    const disabled=full||game.realm.realmCoins<guardianStatCost(tower,key)||!['build','rest','combat'].includes(game.realm.phase)||game.state==='paused';
    const label=upgradeable?`<button data-guardian-action="upgrade" data-guardian-stat="${key}" aria-label="${i18nHtml("ui.panels.guardian.d6ab5d58fc", { p0: (name) })}" ${disabled?'disabled':''}><span>${name} <small>${i18nHtml("common.level", { p0: level })}</small></span><small>${full?i18nText("progression.workshop.d6d8e1de4a"):i18nText("ui.panels.guardian.a56425d4ba", { p0: (guardianStatCost(tower,key)) })}</small></button>`:name;
    return `<tr data-guardian-row="${key}"><th scope="row">${label}</th><td>${amount(current[key])}${unit}</td><td class="${next[key]!==current[key]?'improved':''}">${upgradeable?(full?i18nText("progression.workshop.d6d8e1de4a"):`${amount(next[key])}${unit}`):'—'}</td></tr>`;
  }).join('')}</tbody></table><p class="guardian-weapon-note">${current.weapon.description}</p>`;
}

// 浮游炮每槽独立装配；配置改变只影响这一座塔，不影响角色与其他格位。
function modulesMarkup(game,tower,editable) {
  const options=availableFunnelWeapons(game.progress),loadout=tower.funnelLoadout||game.progress.funnelLoadout;
  return `<section class="guardian-modules" aria-label="${i18nHtml("ui.panels.guardian.a172616505")}"><p>${i18nHtml("ui.panels.guardian.75c5ba7aaf")}</p>${[0,1,2].map(i=>`<details class="guardian-module" ${i===0?'open':''}><summary>${i18nHtml("ui.panels.guardian.d8d0291238", { p0: (i+1), p1: (WEAPONS[loadout[i]].name) })}</summary><label>${i18nHtml("ui.panels.guardian.52a3b1db8d")}<select data-guardian-module="${i}" aria-label="${i18nHtml("ui.panels.guardian.687732c5ed", { p0: (i+1) })}" ${!editable?'disabled':''}>${options.map(index=>`<option value="${index}" ${loadout[i]===index?'selected':''}>${index===12?i18nText("ui.panels.guardian.aa3d60c7f6"):WEAPONS[index].name}</option>`).join('')}</select></label>${statsMarkup(game,tower,i)}</details>`).join('')}</section>`;
}

// 一个面板只保留顶部关闭按钮；表格展示当前/升级后数值，主操作固定在内容之后。
export function guardianMarkup(game, {slot, selection, message}) {
  const r=game.realm,editable=['build','rest','combat'].includes(r.phase),tower=r.defenses.find(t=>t.slot===slot);
  const options=guardianEquipment(game.progress),chosen=options.find(o=>`weapon:${o.index}`===selection);
  const title=tower?i18nText("ui.panels.guardian.d6f7578026", { p0: (slot+1), p1: (WEAPONS[tower.index].name) }):i18nText("ui.panels.guardian.26fd8f6f86");
  let html=`<header class="guardian-build-head"><div><b>${title}</b><small>${slot>=0?GUARDIAN_PADS[slot].name:i18nText("ui.panels.guardian.f8d22954a8")}</small></div><div class="guardian-command-actions"><button data-guardian-close aria-label="${i18nHtml("ui.panels.guardian.5d161b4d03")}">×</button></div></header>`;
  if(tower) {
    html+=WEAPONS[tower.weaponIndex].controller==='funnel'?modulesMarkup(game,tower,editable):statsMarkup(game,tower);
    html+=`<p class="guardian-upgrade-note">${i18nHtml("ui.panels.guardian.db877403f5", { p0: (WEAPONS[tower.weaponIndex].controller==='funnel'?i18nText("ui.panels.guardian.4ff4e879e8"):'') })}</p><div class="guardian-actions"><button data-guardian-action="remove" ${!editable?'disabled':''}>${i18nHtml("ui.panels.guardian.392dbf7a65", { p0: (guardianInvestment(tower)) })}</button></div>`;
  } else if(editable) {
    html+=`<p class="guardian-catalog-title">${i18nHtml("ui.panels.guardian.35c0b3823c", { p0: (GUARDIAN_ECONOMY.weapon) })}</p><div class="guardian-catalog" aria-label="${i18nHtml("ui.panels.guardian.49be6781aa")}">${options.map(o=>`<button data-guardian-equipment="weapon:${o.index}" aria-pressed="${selection===`weapon:${o.index}`}" ${r.realmCoins<GUARDIAN_ECONOMY.weapon?'disabled':''}><canvas width="240" height="150" aria-hidden="true" data-kind="weapon" data-index="${o.index}"></canvas><span>${o.name}</span></button>`).join('')}</div>`;
  }
  html+=`<p class="guardian-build-hint" role="status">${message||(!editable?i18nText("ui.panels.guardian.c13de3df09"):tower?i18nText("ui.panels.guardian.ab7664b3ba"):chosen?i18nText("ui.panels.guardian.76e692c50a", { p0: (chosen.name) }):i18nText("ui.panels.guardian.b372898faa"))}<small>${i18nHtml("ui.panels.guardian.b476629d8d", { p0: (r.phase==='combat'?i18nText("ui.panels.guardian.8ea8656673"):i18nText("ui.panels.guardian.76fcc6baa8")) })}</small></p>`;
  return html;
}
