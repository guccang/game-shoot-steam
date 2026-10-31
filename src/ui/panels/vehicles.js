import {vehicleBuild,installedEngine} from '../../config/vehicle-load.js';
import {vehicleLoad} from '../../progression/load-weight.js';
import {vehicleService,personalFleet} from '../../core/vehicle-repair.js';
import {facilityOpen} from '../../config/town-restoration.js';
import {parkingFleetApplies} from '../../core/camp-parking.js';
import {vehicleTransferState,activateVehicleTransfer} from '../vehicle-transfer.js';
import { i18nText, i18nHtml } from "../../i18n/index.js";
import { nativeVehicleWeapon } from '../../config/vehicle-armaments.js';
import { drawVehicleArmament } from '../../rendering/vehicle-armaments.js';
import { upgradeHint } from '../../config/economy.js';
import { vehicleMaxHp } from '../../config/vehicles.js';
// 载具收藏面板：展示已实装的收藏，复用原有上车、下车及暂停逻辑。
import {
  COLLECTED_VEHICLES,
  VEHICLE_DISPLAY_ORDER,
  VEHICLE_COOLDOWN,
  VEHICLE_MAX_LEVEL,
  vehicleUpgradeCost,
  vehicleWeapon,
  vehicleDamage,
  vehicleModel,
} from '../../config/vehicles.js';
import { drawVehicleIcon } from '../../rendering/vehicle.js';
import { requirementsMarkup } from '../equipment-goals.js';
import { canPurchaseEquipment } from '../../progression/equipment-goals.js';
import { upgradePriceMarkup } from '../upgrade-price.js';
import { createEventScope } from '../../platform/events.js';

// 载具入口和收藏卡使用相同画布图标，打开后冻结战场，操作后返回。
export function createVehiclePanel({ game, root, dialogs, onChange }) {
  const $ = (id) => root.getElementById(id),
    scope = createEventScope();
  let tab = 'hull',
    viewed = game.loadout.vehicleIndex;
  drawVehicleIcon($('vehicle-menu-icon').getContext('2d'));
  // 收藏列表允许预览未购买车体；选用、购买与驾驶分别明确操作。
  function render() {
    const p = game.loadout,
      selected = viewed === p.vehicleIndex,
      v = game.vehicles[viewed],
      vehicle = vehicleModel(viewed),
      level = p.vehicleHulls[viewed],
      weapon = vehicleWeapon(p, v.weaponIndex),
      cost = vehicleUpgradeCost(level || 1, viewed, p);
    $('vehicle-coins').textContent = p.coins.toLocaleString();
    $('vehicle-wood').textContent = p.wood.toLocaleString();
    $('vehicle-collection-count').textContent =
      i18nText("ui.panels.vehicles.a59ae957c0", { p0: (game.realm?.loadout ? i18nText("ui.panels.vehicles.ab1cb480af") : i18nText("ui.panels.vehicles.1cff34590e")), p1: (p.vehicleHulls.filter((n) => n > 0).length) });
    $('vehicle-roster').innerHTML = VEHICLE_DISPLAY_ORDER.map(
      (i) => { const model = COLLECTED_VEHICLES[i]; return (
        `<button data-vehicle-preview="${i}" aria-pressed="${viewed === i}" aria-label="${i18nHtml("ui.panels.vehicles.93f6a042a6", { p0: (model.name) })}"><canvas width="150" height="100" aria-hidden="true"></canvas><b>${model.shortName}</b><small>${p.vehicleHulls[i] ? i18nHtml("ui.vehicle.selectedLevel", { p0: p.vehicleIndex === i ? i18nText("ui.panels.vehicles.0f5b769ee3") : '', p1: p.vehicleHulls[i] }) : game.realm?.loadout ? i18nText("ui.panels.vehicles.f390250699") : i18nText("ui.panels.vehicles.2f646314ed")}</small></button>`); },
    ).join('');
    for (const b of $('vehicle-roster').children)
      drawVehicleIcon(b.querySelector('canvas').getContext('2d'), Number(b.dataset.vehiclePreview));
    $('vehicle-collection-name').textContent = level ? i18nText("common.namedLevel", { p0: vehicle.name, p1: level }) : vehicle.name;
    $('vehicle-collection-description').textContent = vehicle.description;
    $('vehicle-collection-status').textContent = !level
      ? game.realm?.loadout ? i18nText("ui.panels.vehicles.f390250699") : i18nText("ui.inventory.2f0baebfe7")
      : v.active
        ? i18nText("ui.panels.vehicles.4111b35ac8")
        : v.cooldown > 0
          ? i18nText("ui.panels.vehicles.8878fa93ac")
          : i18nText("ui.panels.vehicles.31d097d51c");
    $('vehicle-collection-health').textContent = level
      ? `${Math.ceil(v.hp)} / ${v.maxHp}`
      : i18nText("ui.panels.vehicles.d450c14eef", { p0: vehicleMaxHp({...p,vehicleIndex:viewed,vehicleLevel:1}) });
    $('vehicle-collection-gun').textContent = weapon
      ? i18nText("common.namedLevel", { p0: weapon.name, p1: p.vehicleWeapons[v.weaponIndex] })
      : viewed===3?i18nText("ui.panels.vehicles.b7c07f0137"):i18nText("ui.panels.vehicles.156219e305");
    const maxed = !game.realm?.loadout && level >= VEHICLE_MAX_LEVEL;
    $('vehicle-upgrade-preview').textContent = game.realm?.loadout ? i18nText("ui.panels.vehicles.eb5152cc31", { p0: (game.realm.stage + 1) }) : maxed
      ? i18nText("ui.panels.vehicles.0fc1924e39")
      : i18nText("ui.panels.vehicles.4ad117918b", { p0: (v.maxHp), p1: (vehicleMaxHp({...p,vehicleIndex:viewed,vehicleLevel:level+1},game.maxHp())) });
    $('vehicle-upgrade').innerHTML = game.realm?.loadout ? i18nText("ui.panels.vehicles.f0d539f6ab") : maxed
      ? i18nText("progression.workshop.d6d8e1de4a")
      : game.realm ? i18nText("ui.panels.vehicles.b39eb2f8f1")
      : i18nText("ui.panels.vehicles.8395cbefc2", { p0: (upgradePriceMarkup(p,'vehicle',viewed,level)), p1: (upgradeHint(p,'vehicle',viewed,level)) });
    $('vehicle-upgrade').disabled =
      !!game.realm || !level || !selected || maxed || p.coins < cost.coins || p.wood < cost.wood;
    $('vehicle-upgrade').parentElement.hidden = !level || !selected;
    $('vehicle-collection-hint').textContent = !level
      ? game.realm?.loadout ? i18nText("ui.panels.vehicles.a1e390b4b5") : game.realm ? i18nText("ui.panels.vehicles.99645a67fe") : i18nText("ui.panels.vehicles.26a6b265a8")
      : !selected
        ? i18nText("ui.panels.vehicles.01edce792e")
        : v.cooldown > 0
          ? i18nText("ui.panels.vehicles.efd9af93dc", { p0: (Math.ceil(v.cooldown)) })
          : v.active
            ? i18nText("ui.panels.vehicles.45b443aa7e")
            : i18nText("ui.panels.vehicles.e281d9f870", { p0: (VEHICLE_COOLDOWN) });
    if(!level&&vehicle.rewardOnly)$('vehicle-collection-hint').textContent=i18nText("ui.panels.vehicles.3e9b593498");
    $('vehicle-material-requirements').innerHTML = game.realm?.loadout ? '' : requirementsMarkup(p, 'vehicle', viewed);
    const action = $('vehicle-board');
    action.textContent = !level
      ? vehicle.rewardOnly ? i18nText("ui.panels.vehicles.18fc7d0bec") : game.realm?.loadout ? i18nText("ui.panels.vehicles.f390250699") : game.realm ? i18nText("ui.panels.vehicles.3100ff0ae3") : i18nText("ui.panels.vehicles.6a0b8701a9")
      : !selected
        ? i18nText("ui.panels.vehicles.060ac81045", { p0: (vehicle.shortName) })
        : v.active
          ? i18nText("ui.panels.vehicles.f3cb90c551")
          : v.cooldown > 0
            ? i18nText("ui.panels.vehicles.9e008d77cc", { p0: (Math.ceil(v.cooldown)) })
            : vehicle.flying
              ? i18nText("ui.panels.vehicles.35127c7dad")
              : vehicle.amphibious ? i18nText("ui.panels.vehicles.0faf82b6a5") : i18nText("ui.panels.vehicles.c528542c48");
    action.disabled = !level
      ? !!game.realm || !canPurchaseEquipment(p, 'vehicle', viewed)
      : selected && (!['playing', 'paused'].includes(game.state) || v.cooldown > 0);
    // 入库车可整备升级，接警前不显示可远程驾驶的误导按钮。
    if(viewed===4&&game.fireGarageParked){action.textContent=selected?i18nText("ui.panels.vehicles.051b37c3fa"):i18nText("ui.panels.vehicles.a1a48bf3e2");action.disabled=selected;$('vehicle-collection-status').textContent=i18nText("ui.panels.vehicles.6f9b2ac046");$('vehicle-collection-hint').textContent=i18nText("ui.panels.vehicles.a102cacbaf");}
    if (level && selected && game.state === 'ready')
      $('vehicle-collection-hint').textContent = i18nText("ui.panels.vehicles.17ba8711dd");
    if (level && selected && game.state === 'dead')
      $('vehicle-collection-hint').textContent = i18nText("ui.panels.vehicles.0ca078e96b");
    if(parkingFleetApplies(game)){
      const transfer=vehicleTransferState(game,viewed);
      $('vehicle-collection-hint').textContent=transfer.description;
      if(level){action.textContent=transfer.label;action.disabled=v.cooldown>0;}
    }
    if(level&&personalFleet(game)&&(v.hp<=0||vehicleService(game,viewed)?.phase))$('vehicle-collection-status').textContent=v.hp<=0?'报废 · 需要维修':'维修中心待取车';
    // 永久车辆展示装甲、动力与载荷，隐藏已经停用的等级购买入口。
    if(!game.realm?.loadout){$('vehicle-upgrade').parentElement.hidden=true;$('vehicle-upgrade').disabled=true;$('vehicle-collection-name').textContent=vehicle.name;for(const node of $('vehicle-roster').children){const i=Number(node.dataset.vehiclePreview);node.querySelector('small').textContent=p.vehicleHulls[i]?(p.vehicleIndex===i?'已选用 · ':'')+vehicleBuild(p,i).plates+'层装甲':'未拥有';}const weight=vehicleLoad(game,viewed,{driver:true});$('vehicle-upgrade-preview').textContent='';$('vehicle-collection-description').textContent=vehicle.description+' · '+installedEngine(p,viewed).name+' · '+vehicleBuild(p,viewed).plates+'层附加装甲 · 载荷 '+weight.payload.toFixed(1)+' / '+weight.capacity+' kg。前往载具工坊换装发动机或增减装甲。';}
    $('vehicle-collection-image').setAttribute('aria-label', vehicle.name);
    drawVehicleIcon($('vehicle-collection-image').getContext('2d'), viewed);
    $('vehicle-turret-owner').textContent = i18nText("ui.panels.vehicles.c1bd9db13e", { p0: (vehicleModel(p.vehicleIndex).name) });
    renderTurrets();
  }
  // 所有场景只展示当前车型的固定主武器，消防车水炮沿用任务独立供给。
  function renderTurrets() {
    const p=game.loadout,base=nativeVehicleWeapon(viewed),w=base?vehicleWeapon(p,base.weaponIndex):null;
    $('vehicle-tab-turrets').textContent='主武器';
    root.querySelector('.turret-intro').textContent='载具只能使用自己的主武器。';
    for(const button of root.querySelectorAll('[data-turret-filter]'))button.hidden=true;
    $('vehicle-turret-owner').textContent=vehicleModel(viewed).name;
    if(!w){$('turret-list').textContent=viewed===4?'消防水炮在消防任务中使用独立水箱。':vehicleModel(viewed).unarmed?'无载具主武器，骑乘时保留角色手持攻击。':'购买车体后自动获得专属主武器。';return;}
    $('turret-list').innerHTML='<article class="turret-card"><canvas width="160" height="90" aria-label="'+w.name+'"></canvas><h3>'+w.name+'</h3><small>等级 '+p.vehicleWeapons[w.weaponIndex]+'</small><p>'+w.description+'</p><div class="turret-stats"><span>伤害 '+vehicleDamage(p,w.weaponIndex)+'</span><span>射程 '+w.range+'</span></div><p>主武器随车配套，可在载具工坊升级部件。</p></article>';
    const c=$('turret-list').querySelector('canvas').getContext('2d');c.save();c.translate(48,45);c.scale(1.1,1.1);drawVehicleArmament(c,w,{reduced:true});c.restore();
  }
  // 两个页签独立于角色工坊，键盘左右键也能切换并保持焦点。
  function switchTab(next) {
    tab = next;
    $('vehicle-hull-panel').hidden = tab !== 'hull';
    $('vehicle-turrets-panel').hidden = tab !== 'turrets';
    for (const b of root.querySelectorAll('[data-vehicle-tab]')) {
      const selected = b.dataset.vehicleTab === tab;
      b.setAttribute('aria-selected', String(selected));
      b.classList.toggle('selected', selected);
      b.tabIndex = selected ? 0 : -1;
    }
    render();
  }
  // 重绘后恢复到原操作按钮，避免重复购买或键盘焦点丢失。
  function finish(message, selector) {
    $('vehicle-feedback').textContent = message;
    render();
    onChange();
    const target = root.querySelector(selector);
    (target && !target.disabled ? target : $(`vehicle-tab-${tab}`)).focus({ preventScroll: true });
  }
  for (const b of root.querySelectorAll('[data-vehicle-tab]')) {
    scope.on(b, 'click', () => switchTab(b.dataset.vehicleTab));
    scope.on(b, 'keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        switchTab(b.dataset.vehicleTab === 'hull' ? 'turrets' : 'hull');
        $(`vehicle-tab-${tab}`).focus();
      }
    });
  }
  scope.on($('vehicle-upgrade'), 'click', () => {
    if (game.upgradeVehicle()) finish(i18nText("ui.panels.vehicles.cf5a78d3c8"), '#vehicle-upgrade');
  });
  dialogs.register('vehicle-collection-dialog', {
    onOpen: () => {
      viewed = game.loadout.vehicleIndex;
      $('vehicle-feedback').textContent = '';
      switchTab(tab);
    },
    focusId: 'close-vehicle-collection',
  });
  scope.on($('vehicles-button'), 'click', () => {
    if(!game.story&&!game.realm&&!facilityOpen(game.progress,'garage')&&!game.progress.vehicleHulls.some(level=>level>0)){game.requestFacility?.('garage');return;}
    tab = 'hull';
    dialogs.open('vehicle-collection-dialog');
  });
  scope.on($('weapon-categories'), 'click', (event) => {
    if (!event.target.closest('[data-category="vehicles"]')) return;
    tab = 'turrets';
    dialogs.open('vehicle-collection-dialog');
  });
  scope.on($('vehicle-roster'), 'click', (event) => {
    const b = event.target.closest('[data-vehicle-preview]');
    if (!b) return;
    viewed = Number(b.dataset.vehiclePreview);
    render();
    root.querySelector(`[data-vehicle-preview="${viewed}"]`).focus({ preventScroll: true });
  });
  scope.on($('vehicle-board'), 'click', () => {
    if (!game.loadout.vehicleHulls[viewed]) {
      if (game.buyVehicle(viewed))
        finish('购买完成，车辆已送到营地停车位。', '#vehicle-board');
      return;
    }
    if(parkingFleetApplies(game)){
      if(activateVehicleTransfer(game,viewed))dialogs.close('vehicle-collection-dialog');
      else render();
      onChange();return;
    }
    if (viewed !== game.loadout.vehicleIndex) {
      if (game.selectVehicle(viewed)) finish(viewed===4&&game.fireGarageParked?i18nText("ui.panels.vehicles.831aa93b4d"):i18nText("ui.panels.vehicles.875a9fce07"), '#vehicle-board');
      return;
    }
    const changed = game.vehicle.active ? game.dismountVehicle() : game.summonVehicle();
    if (changed) dialogs.close('vehicle-collection-dialog');
    else render();
    onChange();
  });
  for (const id of ['close-vehicle-collection', 'vehicle-collection-done'])
    scope.on($(id), 'click', () => dialogs.close('vehicle-collection-dialog'));
  return { render, dispose: scope.dispose };
}
