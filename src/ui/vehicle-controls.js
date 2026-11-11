import {activateVehicleTransfer} from './vehicle-transfer.js';
import {parkingFleetApplies} from '../core/vehicles/camp-parking.js';
import {boardParkedVehicle} from '../core/vehicles/camp-parking.js';
import {boardingVehicles,nearVehicle} from '../core/vehicles/vehicle-boarding.js';
import {worldDistance} from '../world/coordinates.js';
import {boardFireGarage} from '../core/activities/fire-rescue.js';
import {vehicleRequiresService,vehicleService} from '../core/vehicles/vehicle-repair.js';
import { i18nText } from "../i18n/index.js";
import {canvasRecoveryRevision} from '../rendering/canvas-recovery.js';
import { funnelWeapon } from '../config/funnel-loadouts.js';
// 左下角载具图标提供就近上车、下车和远处定位，改装仍由工坊负责。
import { createEventScope } from '../platform/events.js';
import { realmWeapon } from '../config/realms.js';
import { drawVehicleIcon } from '../rendering/vehicle.js';
import { vehicleWeapon, vehicleModel } from '../config/vehicles.js';
import {updateVehicleLoadHud,vehicleReloadHudState} from './vehicle-load-hud.js';
import {parkedOwned,arrivalParkingAllowed} from '../core/vehicles/camp-parking.js';
// 主动点击可以跳过靠近候停，仍校验正式车旁范围、建筑阻隔和车辆状态。
export function nearbyBoardingVehicle(game){return !game.vehicle.active&&parkingFleetApplies(game)?boardingVehicles(game).filter(s=>nearVehicle(game,s)).sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player))[0]||null:null;}
// 按钮和键盘点击共用行为；远处仍标路，不把车辆瞬移到玩家身边。
export function activateVehicleShortcut(game){
 if(game.vehicle.active)return game.dismountVehicle();
 const nearby=nearbyBoardingVehicle(game);
 if(nearby?.fireGarage){if(game.vehicle.index!==4&&!game.selectVehicle(4))return false;return boardFireGarage(game);}
 if(nearby&&!nearby.fireGarage)return boardParkedVehicle(game,nearby.hull);
 if(parkingFleetApplies(game))return activateVehicleTransfer(game,nearby?.hull??game.vehicle.index);
 return game.summonVehicle();
}
// 同一个原按钮保留监听、焦点与载荷刷新，不创建重复入口。
export function createVehicleControls({ game, root, onChange }) {
  const scope = createEventScope();
  scope.on(root.getElementById('vehicle-button'), 'click', () => {
    activateVehicleShortcut(game);
    onChange();
  });
  return { dispose: scope.dispose };
}
// 状态徽记固定在载具按钮上缘；仅在实际巡航或巡战切换时更新图形。
const modeIcons={
 autopilot:{label:'自动驾驶',shape:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="m4 9 6 2m10-2-6 2m-2 3v6"/>'},
 combat:{label:'自动战斗',shape:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>'}
};
// 徽记只报告状态，触控仍交给原有的上下载具按钮。
function updateModeIcon(node,mode){
 let badge=node.querySelector('.vehicle-mode-icon');
 if(!mode){badge?.remove();return;}
 if(badge?.dataset.mode===mode)return;
 if(!badge){badge=node.ownerDocument.createElement('span');badge.className='vehicle-mode-icon';badge.setAttribute('aria-hidden','true');node.append(badge);}
 badge.dataset.mode=mode;
 badge.innerHTML='<svg viewBox="0 0 24 24">'+modeIcons[mode].shape+'</svg>';
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
  node.hidden = !!game.cottage||game.arrivalCinematic||['football','race'].includes(game.realm?.mode);
  const campParked=!game.realm&&!game.story&&parkedOwned(game).find(s=>s.record.hull===v.index);
  if(campParked&&!v.active)node.disabled||=!arrivalParkingAllowed(game,v.index)||game.fireActive||!!game.campDefense||!!game.workshopTrial;
  const service=vehicleRequiresService(game,v)&&(v.hp<=0||vehicleService(game,v.index)?.phase),status=service?(v.hp<=0?'已报废，需要维修':'维修中心待取车'):repairing?'维修中':reloading?'装填中':'';
  const nearby=nearbyBoardingVehicle(game);
  if(nearby&&!game.cottage&&!game.arrivalCinematic&&['playing','paused'].includes(game.state))node.disabled=false;
  const action=v.active?'下车':nearby?'上车':parkingFleetApplies(game)?'找车':'上车',count=w?Math.max(0,Math.ceil(ammo||0)):'—';
  const control=game.seControl;
  const mode=v.active&&control?.hull===v.index&&control.mapId===game.mapId&&Object.hasOwn(modeIcons,control.mode)?control.mode:null;
  updateVehicleLoadHud(node,game,{ammo:count,label:`${nearby?vehicleModel(nearby.hull).shortName:model.shortName} · ${action} · ${w?'弹药 '+count+' / '+capacity:'无车载弹药'}${status?' · '+status:''} · ${detail}${mode?' · '+modeIcons[mode].label:''}`,mark:service?'!':repairing||reloading?'↻':'',reload:vehicleReloadHudState(m,w)});
  updateModeIcon(node,mode);
  node.setAttribute('aria-pressed', String(v.active));
  // 车型图配进出箭头表达操作，文字仅保留在无障碍名称与悬停说明中。
  let icon=node.querySelector('.vehicle-action-icon');if(!icon){icon=root.createElement('span');icon.className='vehicle-action-icon';icon.setAttribute('aria-hidden','true');node.append(icon);}
  const state=v.active?'exit':nearby?'enter':parkingFleetApplies(game)?'locate':'enter';
  if(icon.dataset.action!==state){icon.dataset.action=state;icon.innerHTML='<svg viewBox="0 0 24 24">'+(state==='locate'?'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>':state==='exit'?'<path d="M10 5H5v14h5m1-7h10m-4-4 4 4-4 4"/>':'<path d="M14 5h5v14h-5M3 12h11m-4-4 4 4-4 4"/>')+'</svg>';}
}
