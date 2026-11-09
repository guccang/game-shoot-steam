import {eraVehicle,eraDonor} from '../../config/vehicle-eras.js';
import {arrivalPistolPurchase} from '../../config/ranger-arrival.js';
import {createMagazines} from '../../combat/magazine.js';
import { i18nText } from "../../i18n/index.js";
import { vehicleMaxHp } from '../../config/vehicles.js';
// 工坊提交先持久化候选成长，再同步战斗状态；存储失败时无任何正式副作用。
import { quoteWorkshop } from '../../progression/workshop/workshop.js';
import {weaponPurchaseQuote} from '../inventory/weapon-purchase-load.js';
import { capturePatrol } from '../battle/patrol-session.js';
import { createVehicle, configureVehicle } from '../../combat/vehicle.js';
import {canLegendaryForge} from './legendary-workshop.js';

// 单次方案原子提交，保存函数由应用注入；失败仍可继续编辑原草稿。
export function commitWorkshop(game, plan, persist) {
  // 已解锁的传奇工坊提供正式枪械锻造；车体整备仍需回载具工坊。
  if(['upgrade','part','modify','mount'].includes(plan.action)&&game.cottage?.kind!==(plan.kind==='weapons'?'weapons':'vehicle')&&!canLegendaryForge(game,plan.kind))return {ok:false,reason:'请到对应工坊，与售货员交谈后整备。'};
  if(game.fireActive)return {ok:false,reason:i18nText("core.map-travel.c5d64346b5")};
  if (game.story) return {ok:false,reason:i18nText("core.workshop.f30c3779f7")};
  const firstPistol=arrivalPistolPurchase(game.progress,plan.kind,plan.index,plan.action);
  const era=plan.kind==='vehicle'&&plan.action==='buy'&&eraVehicle(plan.index);
  const donor=eraDonor(era);
  if(donor&&game.vehicles[donor.index]?.active)return {ok:false,reason:'请先将原车停好并下车。'};
  const snapshot=Object.create(game);
  // 改造前先在副本记录原车实况，普通订单只在报价成功后构建快照。
  function patrolSnapshot(){
    snapshot.progress=structuredClone(game.progress);
    return capturePatrol(snapshot);
  }
  const originalPatrol=era?patrolSnapshot():null;
  const quote=weaponPurchaseQuote(game,plan,quoteWorkshop(era?snapshot.progress:game.progress,plan,!!game.realm));
  if(!quote.ok)return quote;
  quote.next.patrol=era?originalPatrol:patrolSnapshot();
  quote.next.living.position=snapshot.progress.living.position;
  if(!era)quote.next.vehicleService=snapshot.progress.vehicleService;
  if(!era)quote.next.supplies=snapshot.progress.supplies;
  let saved = false;
  try { saved = persist(quote.next) === true; } catch { saved = false; }
  if (!saved) return { ...quote, ok: false, reason: i18nText("core.workshop.7d32e8a05c") };
  const previousEvent = game.onEvent;
  // 正式方法保留原有改装蓄能清理与装备副作用，事件在整笔事务完成后由界面反馈。
  game.onEvent = () => {};
  try {
    if (plan.action === 'modify') game.modifyWeapon(plan.index, plan.choice);
    if (plan.kind === 'weapons' && ['buy', 'upgrade'].includes(plan.action))
      game.transact('weapons', plan.index, plan.action);
    game.progress = quote.next;
    if(firstPistol){game.arrivalScene=null;game.arrivalError=false;game.magazines=createMagazines(game.progress);game.aimLock=null;}
    if (plan.kind === 'vehicle' && plan.action === 'buy')
      game.vehicles[plan.index] = createVehicle(game.progress, plan.index);
    if(era){
      const v=game.vehicles[plan.index],parked=game.progress.campParking.owned.find(r=>r.hull===plan.index);
      v.hp=v.maxHp*(parked?.hp??1);
      if(donor&&game.vehicle.index===donor.index)game.vehicle=v;
    }
    if (plan.kind === 'vehicle' && (plan.action === 'upgrade' || plan.action === 'part' && plan.part === 'armor')) {
      const vehicle = game.vehicles[plan.index], ratio = vehicle.maxHp ? vehicle.hp / vehicle.maxHp : 0;
      vehicle.maxHp = vehicleMaxHp({...game.progress,vehicleIndex:plan.index},game.maxHp());
      vehicle.hp = vehicle.maxHp * ratio;
    }
    if (plan.action === 'mount') configureVehicle(game, plan.choice, plan.index);
  } finally { game.onEvent = previousEvent; }
  if(firstPistol)game.onEvent('arrival-complete');
  return { ...quote, ok: true };
}
