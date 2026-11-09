import {ERA_RESOURCES,eraVehicle,eraDonor} from '../config/vehicle-eras.js';
import {createChallengeCatalog} from './challenge-catalog.js';
import { challengeLevelMarkup } from './challenge-feedback.js';
import {combatHudVisible} from './task-combat-layout.js';
import {clearingCombatActive} from '../core/camp/living-safety.js';
import {compactResource} from './resource-number.js';
import { i18nText, i18nHtml } from "../i18n/index.js";
// 工坊需求、材料背包和战场追踪共用展示模块，不自行扣除材料。
import { MATERIALS, MATERIAL_KEYS } from '../config/materials.js';
import { eraCraftReason,equipmentRecipe, equipmentRequirements, canPurchaseEquipment, trackEquipment,
  ownsEquipment } from '../progression/workshop/equipment-goals.js';
import { createEventScope } from '../platform/events.js';
import {storyEquipmentSource} from '../progression/story/story-rewards.js';
import {equipmentQuestReason} from '../progression/workshop/equipment-quests.js';
import {mainlinePurchaseReason} from '../config/mainline-gates.js';
import { resourceIcon, resourceButton, resourceName } from '../rendering/resource-icons.js';

const RESOURCE_SOURCES = { ...Object.fromEntries(Object.entries(ERA_RESOURCES).map(([key,r])=>[key,r.source])), coins: '种田是主要金币来源。菜单点击种地，用锄头开田，播种成熟后挥镰收割，金币直接到账。任务和玩法奖励照常；怪物与领主不掉金币。', wood: i18nText("ui.equipment-goals.2be74c2a25") };

// 卡片给出已有、所需、缺口和来源；按钮只切换追踪，不自动购买。
export function requirementsMarkup(progress, kind, index) {
  const recipe = equipmentRecipe(kind, index, progress);
  if (!recipe || ownsEquipment(progress, kind, index)) return '';
  const rows=equipmentRequirements(progress,kind,index).filter(row=>row.key!=='bosses');
  const tracked = progress.equipmentGoal?.kind === kind && progress.equipmentGoal.index === index;
  return `<section class="equipment-requirements" aria-label="${i18nHtml("ui.equipment-goals.277b8af898", { p0: (recipe.name) })}">
    <div class="requirements-heading"><b>${i18nHtml("ui.equipment-goals.9015f0a4ba")}</b><button data-track-kind="${kind}" data-track-index="${index}" aria-pressed="${tracked}">${tracked ? i18nText("ui.equipment-goals.e2f1600b76") : i18nText("ui.equipment-goals.f4c40e0161")}</button></div>
    ${storyEquipmentSource(progress,kind,index)?`<p class="story-source">${storyEquipmentSource(progress,kind,index)}</p>`:''}
    ${mainlinePurchaseReason(progress,kind,index)?`<p class="story-source">${mainlinePurchaseReason(progress,kind,index)}</p>`:''}
    ${equipmentQuestReason(progress,kind,index)?`<p class="story-source">${equipmentQuestReason(progress,kind,index)}</p>`:''}${challengeLevelMarkup(progress)}
    ${kind==='vehicle'&&eraDonor(eraVehicle(index))?`<p>原车：${eraDonor(eraVehicle(index)).name}。请先停车下车，改造会继承货物和车位。</p>`:''}
    <div class="requirement-grid">${rows.map(row =>
      `<div class="requirement-row ${row.missing ? '' : 'met'}">${resourceButton(row.key)}<b>${row.have.toLocaleString()} / ${row.need.toLocaleString()}</b><small>${row.missing ? i18nText("ui.equipment-goals.849af1c7d1", { p0: (row.missing.toLocaleString()) }) : i18nText("ui.equipment-goals.f90a2eaac0")}</small></div>`).join('')}</div>
    <small class="resource-tap-hint">点击资源图标查看获取方式</small>
    <details class="material-sources"><summary>${i18nHtml("ui.equipment-goals.d89f56988c")}</summary>${rows.map(row =>
      `<p><b>${resourceName(row.key)}</b>：${MATERIALS[row.key]?.source || RESOURCE_SOURCES[row.key]}</p>`).join('')}
      <p>营地等级提高购买优惠，金币和木头已显示折后价。</p>
    </details></section>`;
}

// 独立面板查看完整缺口，常规场景用单行目标，清缴用紧凑材料卡；监听随应用销毁。
export function createEquipmentGoals({ game, root, dialogs, onChange }) {
  const scope = createEventScope(), $ = id => root.getElementById(id);
  createChallengeCatalog({game,root,dialogs,scope});
  for (const node of root.querySelectorAll('[data-resource-icon]'))
    node.innerHTML = resourceButton(node.dataset.resourceIcon);
  dialogs.register('resource-help-dialog', { focusId: 'close-resource-help' });
  scope.on($('close-resource-help'), 'click', () => dialogs.close('resource-help-dialog'));
  scope.on(root, 'click', event => {
    const button = event.target.closest('[data-resource-info]');
    if (!button) return;
    const key = button.dataset.resourceInfo;
    $('resource-help-art').innerHTML = resourceIcon(key);
    $('resource-help-title').textContent = resourceName(key);
    $('resource-help-source').textContent = MATERIALS[key]?.source || RESOURCE_SOURCES[key];
    // 资源说明作为手机或工坊的最上层子页，DOM顺序与实际弹窗层级保持一致。
    const panel=$('resource-help-dialog');if(!panel.open)root.body.append(panel);
    dialogs.open('resource-help-dialog');
  });
  let signature = '';
  // 只在余额或目标变化时重建详情，避免反复覆盖折叠状态和焦点。
  function render() {
    const p = game.progress, goal = p.equipmentGoal,
      recipe = goal && equipmentRecipe(goal.kind, goal.index,p),
      owned = goal && ownsEquipment(p, goal.kind, goal.index),
      active = recipe && !owned;
    // 清缴保留材料追踪；其他副本仍让位给各自HUD，显隐不受余额缓存影响。
    const pill = $('equipment-goal');
    const clearing=clearingCombatActive(game);
    pill.hidden = !!game.campDefense || !active || !!game.realm || combatHudVisible(root)&&!clearing || !!game.story || game.state!=='playing' || !!root.querySelector('dialog[open]');
    if(pill.classList.contains('clearing-material-goal')!==clearing)pill.classList.toggle('clearing-material-goal',clearing);
    const blocker=goal&&(eraCraftReason(p,goal.kind,goal.index)||equipmentQuestReason(p,goal.kind,goal.index));
    const key = JSON.stringify([p.materials, blocker, goal, goal&&equipmentRequirements(p,goal.kind,goal.index), p.coins, p.wood, p.bosses, p.campLevel?.xp, !!owned, !!game.realm, clearing]);
    if (key === signature) return;
    signature = key;
    for (const node of root.querySelectorAll('[data-material-wallet]')) {
      node.innerHTML = [...MATERIAL_KEYS,...Object.keys(ERA_RESOURCES).filter(k=>p.materials[k]>0)].map(key =>
        `<span>${resourceButton(key)}<b>${p.materials[key].toLocaleString()}</b></span>`).join('');
    }
    for(const node of root.querySelectorAll('[data-challenge-level]'))node.innerHTML=challengeLevelMarkup(p);
    if (!active) {
      $('goal-title').textContent = i18nText("ui.equipment-goals.463af2b552");
      $('goal-details').innerHTML = `<p>${i18nHtml("ui.equipment-goals.9cdf0fff50")}</p>`;
      return;
    }
    const ready = canPurchaseEquipment(p, goal.kind, goal.index),
      missing = equipmentRequirements(p, goal.kind, goal.index).find(row => row.missing);
    pill.innerHTML = ready ? i18nText("ui.equipment-goals.c9feff255a", { p0: (recipe.name) }) :
      !missing ? (blocker||'材料已备齐') : `<span>◎ ${recipe.name}</span><span class="goal-shortage">${i18nHtml("ui.equipment-goals.45ac20c7c8", { p0: (resourceIcon(missing.key)), p1: (missing.missing) })}</span>`;
    pill.setAttribute('aria-label', ready ? i18nText("ui.equipment-goals.295e21ddfd", { p0: (recipe.name) }) :
      !missing ? (blocker||'材料已备齐') : i18nText("ui.equipment-goals.e5543dfd1c", { p0: (recipe.name), p1: (resourceName(missing.key)), p2: (missing.missing) }));
    // 清缴追踪仅保留仍有缺口的资源；全部备齐时用短提示代替已完成材料列表。
    if(clearing){
      const rows=equipmentRequirements(p,goal.kind,goal.index).filter(row=>row.missing>0);
      pill.innerHTML=`<span class="clearing-goal-title">追踪 · ${recipe.name}</span><span class="clearing-goal-resources">${rows.length?rows.map(row=>`<span class="clearing-goal-resource" data-goal-resource="${row.key}">${resourceIcon(row.key)}<b>${compactResource(row.have)}/${compactResource(row.need)}</b></span>`).join(''):'资源已备齐'}</span>`;
      pill.setAttribute('aria-label',`追踪${recipe.name}，${rows.length?rows.map(row=>`${resourceName(row.key)}${row.have}/${row.need}，还差${row.missing}`).join('，'):'资源已备齐'}。点击查看完整需求`);
    }
    pill.classList.toggle('ready', ready);
    pill.title = i18nText("ui.equipment-goals.c5a25ea21e");
    $('goal-title').textContent = recipe.name;
    $('goal-details').innerHTML = `<p>${ready ? i18nText("ui.equipment-goals.d5bb79b8a8") : i18nText("ui.equipment-goals.561dd83c06")}</p>` +
      requirementsMarkup(p, goal.kind, goal.index);
  }
  dialogs.register('equipment-goal-dialog', { onOpen: render, focusId: 'close-goal' });
  scope.on($('equipment-goal'), 'click', () => dialogs.open('equipment-goal-dialog'));
  scope.on($('close-goal'), 'click', () => dialogs.close('equipment-goal-dialog'));
  scope.on($('goal-workshop'), 'click', () => {
    const goal = game.progress.equipmentGoal;
    if (!goal || goal.kind === 'weapons') {
      $('weapons-button').click();
      root.querySelector(`[data-track-kind="weapons"][data-track-index="${goal?.index}"]`)
        ?.scrollIntoView({ block: 'center' });
    } else {
      $('vehicles-button').click();
      if (goal.kind === 'vehicle')
        root.querySelector(`[data-vehicle-preview="${goal.index}"]`)?.click();
      else {
        $('vehicle-tab-turrets').click();
        root.querySelector(`[data-turret-card="${goal.index}"]`)?.scrollIntoView({ block: 'center' });
      }
    }
    dialogs.transferResume('equipment-goal-dialog',
      !goal || goal.kind === 'weapons' ? 'camp-dialog' : 'vehicle-collection-dialog');
    dialogs.close('equipment-goal-dialog');
  });
  scope.on(root, 'click', event => {
    const button = event.target.closest('[data-track-kind]');
    if (!button) return;
    const dialogId = button.closest('dialog')?.id;
    if (trackEquipment(game.progress, button.dataset.trackKind, Number(button.dataset.trackIndex))) {
      game.onEvent('equipment-goal');
      render();
      onChange();
      // 重绘卡片后恢复键盘焦点，取消目标时详情内只剩关闭与前往工坊按钮。
      const replacement = $(dialogId)?.querySelector(
        `[data-track-kind="${button.dataset.trackKind}"][data-track-index="${button.dataset.trackIndex}"]`);
      (replacement || (dialogId === 'equipment-goal-dialog' ? $('close-goal') : null))
        ?.focus({ preventScroll: true });
    }
  });
  return { render, dispose: scope.dispose };
}

// 工作台读取正式追踪节点与钱包，检查真实布局、显示数量和场景状态。
export function inspectClearingMaterialTracking(game,root){
 const node=root.getElementById('equipment-goal'),rect=node.getBoundingClientRect();
 return {designCriterion:'clearing-material-tracking',visible:!node.hidden&&rect.height>0,clearing:node.classList.contains('clearing-material-goal'),goal:game.progress.equipmentGoal,text:node.textContent,label:node.getAttribute('aria-label'),box:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height},resources:[...node.querySelectorAll('[data-goal-resource]')].map(n=>({key:n.dataset.goalResource,text:n.textContent,met:n.classList.contains('met')})),overflow:root.documentElement.scrollWidth>root.defaultView.innerWidth};
}
