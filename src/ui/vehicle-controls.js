import {activateVehicleTransfer} from './vehicle-transfer.js';
import {parkingFleetApplies} from '../core/camp-parking.js';
import {vehicleRequiresService,vehicleService} from '../core/vehicle-repair.js';
import { i18nText } from "../i18n/index.js";
import {canvasRecoveryRevision} from '../rendering/canvas-recovery.js';
import { funnelWeapon } from '../config/funnel-loadouts.js';
// 血条下方的载具图标提供定位和下车，改装仍由工坊负责。
import { createEventScope } from '../platform/events.js';
import { realmWeapon } from '../config/realms.js';
import { drawVehicleIcon } from '../rendering/vehicle.js';
import { vehicleWeapon, vehicleModel } from '../config/vehicles.js';
import {updateVehicleLoadHud,vehicleReloadHudState} from './vehicle-load-hud.js';
import {parkedOwned,arrivalParkingAllowed} from '../core/camp-parking.js';
// 自有车快捷键只定位或下车；活动借车沿用场景原有召唤规则。
export function createVehicleControls({ game, root, onChange }) {
  const scope = createEventScope();
  scope.on(root.getElementById('vehicle-button'), 'click', () => {
    if (game.vehicle.active) game.dismountVehicle();
    else if(parkingFleetApplies(game))activateVehicleTransfer(game,game.vehicle.index);
    else game.summonVehicle();
    onChange();
  });
  return { dispose: scope.dispose };
}
// 圆内蓝色显示仓库负荷、外圈显示换弹，独立数字显示弹药；HP继续使用生命条。
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
  const repairing = v.cooldown > 0,
    reloading = m?.remaining > 0;
  const supply = w?.independentSupply ? v.module.companions.nodes : null;
  const ammo = supply ? supply.reduce((sum,n)=>sum+n.magazine.ammo,0) : m?.ammo;
  const capacity = supply ? supply.reduce((sum,n)=>sum+(n.weapon||funnelWeapon({...game.loadout||game.progress,vehicleAmmoBonus:1.5},n.index)).magazineSize,0) : w?.magazineSize;
  const detail = v.active
    ? i18nText("ui.vehicle-controls.33b311b571", { p0: (Math.ceil(v.hp)), p1: (v.maxHp), p2: (w ? `${w.name} ${ammo} / ${capacity}${reloading ? i18nText("ui.vehicle-controls.597465b574", { p0: (m.remaining.toFixed(1)) }) : ''}` : v.index===3?i18nText("ui.panels.vehicles.b7c07f0137"):i18nText("ui.vehicle-controls.b5fc74332e")) })
    : repairing
      ? i18nText("ui.vehicle-controls.c7e1c2df7f", { p0: (Math.ceil(v.cooldown)) })
      : i18nText("ui.vehicle-controls.006ef8b30e", { p0: (model.shortName) });
  node.disabled = !!game.cottage || game.arrivalCinematic || !game.loadout.vehicleHulls[v.index] || game.fireTransit || game.realm?.mode==='football' || !['playing', 'paused'].includes(game.state) || repairing;
  node.hidden = game.realm?.mode==='football';
  const campParked=!game.realm&&!game.story&&parkedOwned(game).find(s=>s.record.hull===v.index);
  if(campParked&&!v.active)node.disabled||=!arrivalParkingAllowed(game,v.index)||game.fireActive||!!game.campDefense||!!game.workshopTrial;
  const service=vehicleRequiresService(game,v)&&(v.hp<=0||vehicleService(game,v.index)?.phase),status=service?(v.hp<=0?'已报废，需要维修':'维修中心待取车'):repairing?'维修中':reloading?'装填中':'';
  const action=v.active?'点击下车':parkingFleetApplies(game)?'定位载具':'调用载具',count=w?Math.max(0,Math.ceil(ammo||0)):'—';
  updateVehicleLoadHud(node,game,{ammo:count,label:`${model.shortName} · ${action} · ${w?'弹药 '+count+' / '+capacity:'无车载弹药'}${status?' · '+status:''} · ${detail}`,mark:service?'!':repairing||reloading?'↻':'',reload:vehicleReloadHudState(m,w)});
  node.setAttribute('aria-pressed', String(v.active));
}
