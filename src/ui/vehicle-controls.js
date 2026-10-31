import {personalFleet,vehicleRequiresService,vehicleService} from '../core/vehicle-repair.js';
import { i18nText } from "../i18n/index.js";
import {canvasRecoveryRevision} from '../rendering/canvas-recovery.js';
import { funnelWeapon } from '../config/funnel-loadouts.js';
// 血条下方的载具快捷图标直接上下车，收藏使用侧边入口，配置使用独立炮塔页签。
import { createEventScope } from '../platform/events.js';
import { realmWeapon } from '../config/realms.js';
import { drawVehicleIcon } from '../rendering/vehicle.js';
import { vehicleWeapon, vehicleModel } from '../config/vehicles.js';
import { VEHICLE_COOLDOWN } from '../config/vehicles.js';
import { updateRing } from './status-rings.js';
import {parkedOwned,arrivalParkingAllowed} from '../core/camp-parking.js';
import {worldDistance} from '../world/coordinates.js';
import {canBoardFireGarage} from '../core/fire-rescue.js';
// 点击直接召唤或下车，不创建弹窗；载具冷却和资源仍由 Game 校验。
export function createVehicleControls({ game, root, onChange }) {
  const scope = createEventScope();
  scope.on(root.getElementById('vehicle-button'), 'click', () => {
    if (game.vehicle.active) game.dismountVehicle();
    else game.summonVehicle();
    onChange();
  });
  return { dispose: scope.dispose };
}
// 外圈表示耐久/修复，内圈表示炮塔余弹或装填；修复完成仍需手动召唤。
export function updateVehicleHud(root, game) {
  const node = root.getElementById('vehicle-button'),
    v = game.vehicle,
    w = realmWeapon(vehicleWeapon((game.loadout || game.progress), v.weaponIndex), game.realm?.buffs),
    m = v.module?.magazine;
  const model = vehicleModel(v.index),
    canvas = root.getElementById('vehicle-menu-icon');
  if (canvas.dataset.vehicle !== String(v.index)||canvas.dataset.recovery!==String(canvasRecoveryRevision())) {
    drawVehicleIcon(canvas.getContext('2d'), v.index);
    canvas.dataset.vehicle = String(v.index);
    canvas.dataset.recovery=String(canvasRecoveryRevision());
  }
  const parked = v.index===4&&game.fireGarageParked, repairing = v.cooldown > 0,
    reloading = m?.remaining > 0;
  const supply = w?.independentSupply ? v.module.companions.nodes : null;
  const ammo = supply ? supply.reduce((sum,n)=>sum+n.magazine.ammo,0) : m?.ammo;
  const capacity = supply ? supply.reduce((sum,n)=>sum+(n.weapon||funnelWeapon({...game.loadout||game.progress,vehicleAmmoBonus:1.5},n.index)).magazineSize,0) : w?.magazineSize;
  const detail = v.active
    ? i18nText("ui.vehicle-controls.33b311b571", { p0: (Math.ceil(v.hp)), p1: (v.maxHp), p2: (w ? `${w.name} ${ammo} / ${capacity}${reloading ? i18nText("ui.vehicle-controls.597465b574", { p0: (m.remaining.toFixed(1)) }) : ''}` : v.index===3?i18nText("ui.panels.vehicles.b7c07f0137"):i18nText("ui.vehicle-controls.b5fc74332e")) })
    : repairing
      ? i18nText("ui.vehicle-controls.c7e1c2df7f", { p0: (Math.ceil(v.cooldown)) })
      : i18nText("ui.vehicle-controls.006ef8b30e", { p0: (model.shortName) });
  updateRing(node, {
    icon: model.flying ? 'helicopter' : model.amphibious ? 'hovercraft' : 'vehicle',
    state: repairing ? 'reloading' : v.active ? 'mounted' : 'ready',
    fill: repairing ? 1 - v.cooldown / VEHICLE_COOLDOWN : v.hp / v.maxHp,
    inner:
      v.active && w ? (reloading ? 1 - m.remaining / w.reloadTime : ammo / capacity) : null,
    count: repairing ? Math.ceil(v.cooldown) : v.active && w ? ammo : '',
    mark: repairing || (v.active && reloading) ? 'reload' : '',
    label: parked ? i18nText("ui.vehicle-controls.134ebb01a8") : `${v.active ? i18nText("ui.vehicle-controls.ac0ad40e42") : i18nText("ui.vehicle-controls.9fd671b1a1", { p0: (model.shortName) })} · ${detail}${game.state === 'paused' ? i18nText("ui.funnel-supply.4ea1173d1f") : ''}`,
  });
  node.disabled = !!game.cottage || game.arrivalCinematic || !game.loadout.vehicleHulls[v.index] || game.fireTransit || parked&&!canBoardFireGarage(game) || game.realm?.mode==='football' || !['playing', 'paused'].includes(game.state) || repairing;
  node.hidden = game.realm?.mode==='football';
  // 停驻状态明确引导回到车辆，快捷入口同样不能把车从远处召走。
  const campParked=!game.realm&&!game.story&&parkedOwned(game).find(s=>s.record.hull===v.index);
  if(campParked&&!v.active){node.setAttribute('aria-label','已停在'+campParked.name+'，靠近后点击快捷入口上车');node.title='已停在'+campParked.name;node.disabled||=worldDistance(game.player,campParked)>155||!arrivalParkingAllowed(game,v.index)||game.fireActive||!!game.campDefense||!!game.workshopTrial;}
  if(vehicleRequiresService(game,v)&&(v.hp<=0||vehicleService(game,v.index)?.phase)){node.title=v.hp<=0?'已报废 · 需要维修':'维修中心待取车';node.setAttribute('aria-label',node.title);node.querySelector('.ring-count').textContent=v.hp<=0?'损坏':'维修';}
  node.setAttribute('aria-pressed', String(v.active));
}
