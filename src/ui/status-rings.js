import { i18nText } from "../i18n/index.js";
import { isSummonEnergy } from '../config/summon-energy.js';
// 紧凑战斗仪表：SVG 图标与圆环只读取规则快照，不使用独立动画计时。
const GLYPHS = {
  hovercraft: '<rect x="2" y="14" width="20" height="6" rx="3"/><path d="M6 14v-4h9l4 4M5 17h14"/><circle cx="6" cy="6" r="4"/><path d="m4 4 4 4m0-4-4 4"/>',
  ammo: '<path d="M10 5h4l2 4v12H8V9zM8 10h8M8 18h8"/>',
  shield: '<path d="M12 2 21 6v7c0 5-9 9-9 9S3 18 3 13V6z"/><path d="m8 12 3 3 5-6"/>',
  energy: '<path d="m12 3 8 9-8 9-8-9zM12 7l4 5-4 5-4-5z"/>',
  vehicle:
    '<rect x="2" y="13" width="20" height="7" rx="3"/><path d="M5 13V8h10v5M11 8V5h8M5 17h14"/>',
  helicopter: '<path d="M3 4h18M12 4v4M8 8h8l5 7H8l-5-5H1M10 15v5m7-5v5M6 20h16"/>',
  aim: '<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  wait: '<circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 3"/>',
  charge: '<path d="m14 2-9 12h6l-1 8 9-12h-6z"/>',
  return: '<path d="m9 5-6 5 6 5M3 10h11a6 6 0 0 1 0 12"/>',
  reload: '<path d="M19 8a8 8 0 1 0 1 7M19 3v6h-6"/>',
  dead: '<path d="m6 6 12 12M18 6 6 18"/>',
};
// 图标采用统一圆头描边，避免平台字体差异改变枪械与载具外观。
export function statusIcon(kind) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[kind] || GLYPHS.ammo}</svg>`;
}
// 一个仪表同时支持外圈弹药与内圈蓄能，载具复用内圈显示炮塔弹药。
export function ringMarkup(slot = '') {
  return `<svg class="ring-meter" viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-track" cx="18" cy="18" r="16"/><circle class="ring-value" cx="18" cy="18" r="16" pathLength="100"/><circle class="ring-inner" cx="18" cy="18" r="12" pathLength="100"/></svg><span class="ring-icon" aria-hidden="true"></span><span class="ring-count" aria-hidden="true"></span><span class="ring-mark" aria-hidden="true"></span>${slot ? `<span class="ring-slot" aria-hidden="true">${slot}</span>` : ''}`;
}
// 余量随弹药减少，装填从零到满；返航期间不能提前显示装填增长。
export function ammoRingState(
  magazine,
  weapon,
  { returning = false, prefix = '', stopped = '', skill = null } = {},
) {
  if(weapon.attackKind==='defense'){
    const count=Math.ceil(magazine.ammo),waiting=magazine.remaining>0;
    return {fill:magazine.ammo/weapon.magazineSize,state:waiting?'reloading':'ready',icon:'shield',count,mark:waiting?'wait':count<weapon.magazineSize?'charge':'',inner:null,
      label:`${weapon.name}：护盾 ${count} / ${weapon.magazineSize}${waiting?'，'+magazine.remaining.toFixed(1)+'秒后恢复':count<weapon.magazineSize?'，正在恢复':''}`,value:count,max:weapon.magazineSize};
  }
  const regenerating=isSummonEnergy(weapon)&&magazine.ammo<weapon.magazineSize;
  const reloading = !isSummonEnergy(weapon)&&magazine.remaining > 0;
  const fill = returning
    ? 0
    : reloading
      ? 1 - magazine.remaining / weapon.reloadTime
      : magazine.ammo / weapon.magazineSize;
  const state = returning ? 'returning' : reloading ? 'reloading' : 'ready';
  const energy = weapon.resourceType === 'energy';
  const description = returning
    ? i18nText("ui.inventory.e470d32779")
    : reloading
      ? i18nText("ui.status-rings.337cbf82b9", { p0: (energy ? i18nText("ui.inventory.c0c253c271") : i18nText("ui.status-rings.fabcd6ddc5")), p1: (magazine.remaining.toFixed(1)) })
      : i18nText("ui.status.amount", { p0: energy ? i18nText("ui.inventory.9196f0338a") : i18nText("ui.status-rings.5a8114a4b3"), p1: magazine.ammo, p2: weapon.magazineSize });
  return {
    fill,
    state,
    icon: weapon.resourceType === 'energy' ? 'energy' : 'ammo',
    count: magazine.ammo,
    mark: returning ? 'return' : reloading ? 'reload' : regenerating ? 'charge' : '',
    inner: skill,
    label: i18nText("ui.status.label", { p0: prefix, p1: weapon.name, p2: description, p3: regenerating?i18nText("ui.status-rings.94759d21b4"):'', p4: stopped }),
    value: returning ? 0 : reloading ? Math.round(fill * 100) : magazine.ammo,
    max: reloading || returning ? 100 : weapon.magazineSize,
  };
}
// 修改现有节点而非每帧重建，保留焦点且暂停时不产生虚假进度。
export function updateRing(node, state) {
  if (!node.querySelector('.ring-meter')) node.innerHTML = ringMarkup();
  const percent = Math.max(0, Math.min(1, state.fill)) * 100;
  node.dataset.state = state.state;
  node.dataset.fill = percent.toFixed(2);
  node.title = state.label;
  node.setAttribute('aria-label', state.label);
  if (node.tagName !== 'BUTTON') {
    node.setAttribute('role', 'progressbar');
    node.setAttribute('aria-valuemin', '0');
    node.setAttribute('aria-valuemax', String(state.max || 100));
    node.setAttribute('aria-valuenow', String(Math.max(0, state.value ?? Math.round(percent))));
    node.setAttribute('aria-valuetext', state.label);
  }
  node.querySelector('.ring-value').style.strokeDasharray = `${percent} 100`;
  const inner = node.querySelector('.ring-inner');
  inner.style.strokeDasharray = `${Math.max(0, Math.min(1, state.inner || 0)) * 100} 100`;
  inner.style.opacity = state.inner == null ? 0 : 1;
  const icon = node.querySelector('.ring-icon');
  if (icon.dataset.kind !== state.icon) {
    icon.innerHTML = statusIcon(state.icon);
    icon.dataset.kind = state.icon;
  }
  node.querySelector('.ring-count').textContent = state.count ?? '';
  const mark = node.querySelector('.ring-mark');
  if (mark.dataset.kind !== (state.mark || '')) {
    mark.innerHTML = state.mark ? statusIcon(state.mark) : '';
    mark.dataset.kind = state.mark || '';
  }
}
