import {storedWeaponRack} from './weapon-storage.js';
import {equipmentLevelCap} from '../config/legendary-workshop.js';
import {equipmentQuestReason} from './equipment-quests.js';
import {facilityOpen,facilityReason,workshopFacility} from '../config/town-restoration.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
import {mainlinePurchaseReason} from '../config/mainline-gates.js';
import { i18nText } from "../i18n/index.js";
import { VEHICLE_WEAPONS, nativeVehicleWeapon, isVehicleArmament } from '../config/vehicle-armaments.js';
import { bindEconomy, economyFor, economyUpgradeCost } from '../config/economy.js';
import { recordEconomy } from './economy-ledger.js';
// 工坊方案、报价与预览只处理副本，拖拽和试射永远不修改正式成长。
import { validateProgress } from './progress.js';
import { transactProgress } from './transactions.js';
import { transactVehicle } from './vehicles.js';
import { changeWeaponMod } from './mastery.js';
import { equipmentRecipe, equipmentRequirements } from './equipment-goals.js';
import { WEAPONS } from '../config/weapons.js';
import { MOD_COST, masteryInfo, effectiveWeapon, MOD_MASTERY_LEVEL, MASTERY_THRESHOLDS } from '../config/weapon-mods.js';
import { COLLECTED_VEHICLES, vehicleWeapon } from '../config/vehicles.js';
import { equipmentParts, partLevel } from '../config/equipment-parts.js';

// 部件草稿记录原等级与所属车体，避免旧施工完成事件升级错误目标。
export function workshopUpgrade(progress, kind, index, part, vehicleIndex = null) {
  return { kind, index, part, action: 'part', original: partLevel(progress, kind, index, part), vehicleIndex };
}

// 免费试装仅修改副本；满级时保持原样，正式校验仍拒绝交易。
export function applyPartPreview(progress, plan) {
  const spec = equipmentParts(plan.kind, plan.index,progress).find(p => p.key === plan.part);
  if (!spec) return;
  const level = Math.min(spec.max, partLevel(progress, plan.kind, plan.index, plan.part) + 1);
  if (plan.part === 'damage') (plan.kind === 'turret' ? progress.vehicleWeapons : progress.weapons)[plan.index] = level;
  else if (plan.part === 'armor') progress.vehicleHulls[plan.index] = level;
  else progress[plan.kind === 'vehicle' ? 'vehicleParts' : plan.kind === 'turret' ? 'turretParts' : 'weaponParts'][plan.index][plan.part] = level;
}

// 草稿携带目标和原始选择，过时方案不能覆盖其他入口已经提交的装配。
export function workshopDraft(progress, kind, index, choice) {
  return { kind, index, choice, action: kind === 'weapons' ? 'modify' : 'mount',
    original: kind === 'weapons' ? progress.mods[index] : progress.vehicleLoadouts[index] };
}

// 返回完整需求及失败原因；引用正式交易函数验证，不复制扣费规则。
export function quoteWorkshop(progress, plan, realm = false) {
  if(plan.kind==='weapons'&&plan.action==='equip'&&storedWeaponRack(progress,plan.index))return {ok:false,reason:'这把武器存放在巡林小屋，请先到武器架取出。',rows:[],next:null};
  if(plan.action==='mount')return {ok:false,reason:'请使用载具装配中的主炮换装。',rows:[],next:null};
  if(plan.kind==='vehicle'&&['part','upgrade'].includes(plan.action))return {ok:false,reason:'车体改用发动机换装与装甲叠加，请打开载具装配。',rows:[],next:null};
  if(!facilityOpen(progress,workshopFacility(plan.kind)))return {ok:false,reason:facilityReason(progress,workshopFacility(plan.kind)),rows:[],next:null};
  const next = validateProgress(bindEconomy(JSON.parse(JSON.stringify(progress)),economyFor(progress)));
  const { kind, index, action, choice } = plan;
  const catalog = kind === 'vehicle' ? COLLECTED_VEHICLES : kind==='turret'?VEHICLE_WEAPONS:WEAPONS;
  let rows = [], reason = '', ok = false;
  if (!['weapons', 'vehicle', 'turret'].includes(kind) || !Number.isInteger(index) || !catalog[index])
    return { ok: false, reason: i18nText("progression.workshop.154f86c3c1"), rows, next: null };
  const level = (kind === 'vehicle' ? progress.vehicleHulls : kind === 'turret' ? progress.vehicleWeapons : progress.weapons)[index];
  // 消耗与非消耗门槛分别表达，避免把领主战绩误当作货币。
  const costRows = cost => Object.entries(cost).filter(([, need]) => need > 0).map(([key, need]) => ({
    key, need, have: progress[key] || 0, missing: Math.max(0, need - (progress[key] || 0)),
  }));
  if(kind==='turret'&&!isVehicleArmament(index))return {ok:false,reason:'载具只能使用自己的主武器',rows,next:null};
  if(kind==='vehicle'&&catalog[index].rewardOnly&&!level)reason=i18nText("progression.workshop.b5135712d3");
  else if (action==='buy'&&!level&&mainlinePurchaseReason(progress,kind,index)){reason=mainlinePurchaseReason(progress,kind,index);rows=equipmentRequirements(progress,kind,index);}
  else if(action==='buy'&&!level&&equipmentQuestReason(progress,kind,index)){reason=equipmentQuestReason(progress,kind,index);rows=equipmentRequirements(progress,kind,index);}
  else if (realm) reason = i18nText("progression.workshop.d6c72c52df");
  else if (action === 'part') {
    const spec = equipmentParts(kind, index,progress).find(p => p.key === plan.part);
    const current = partLevel(progress, kind, index, plan.part);
    rows = costRows(economyUpgradeCost(progress,kind,index,current,plan.part));
    if (!spec) reason = i18nText("progression.workshop.3f4545579c");
    else if (!level) reason = i18nText("progression.workshop.5f5d7b184d");
    else if (kind === 'turret' && (!Number.isInteger(plan.vehicleIndex) || !progress.vehicleHulls[plan.vehicleIndex])) reason = i18nText("progression.workshop.e3c1f80940");
    else if (kind==='turret' && progress.vehicleLoadouts[plan.vehicleIndex]!==index) reason='这门主炮尚未安装在当前车辆上。';
    else if (plan.original !== current) reason = i18nText("progression.workshop.3b62615a84");
    else if (current >= spec.max) reason = i18nText("progression.workshop.76b8c8d208");
    else if (!rows.some(r => r.missing)) {
      for (const row of rows) next[row.key] -= row.need;
      recordEconomy(next,'expense','part:'+kind+':'+index+':'+plan.part,Object.fromEntries(rows.map(r=>[r.key,r.need])));
      applyPartPreview(next, plan); ok = true;
    }
  } else if (action === 'modify' && kind === 'weapons') {
    if (choice) rows = costRows(MOD_COST);
    if (plan.original !== progress.mods[index]) reason = i18nText("progression.workshop.4f64799614");
    else if (!level) reason = i18nText("progression.workshop.e385f727eb");
    else if (choice === progress.mods[index]) reason = i18nText("progression.workshop.fbe7e18ea3");
    else if (choice && masteryInfo(progress, index).level < MOD_MASTERY_LEVEL) reason = `套件需熟练度 ${MOD_MASTERY_LEVEL} 级 · 还差 ${MASTERY_THRESHOLDS[MOD_MASTERY_LEVEL-1]-masteryInfo(progress,index).xp} 点，使用本枪击败怪物提升`;
    else ok = changeWeaponMod(next, index, choice);
  } else if (action === 'buy' || action === 'upgrade') {
    rows = action === 'buy' ? equipmentRequirements(progress, kind, index)
      : costRows(economyUpgradeCost(progress,kind,index,level));
    ok = kind === 'weapons' ? transactProgress(next, kind, index, action) : transactVehicle(next, kind, index, action);
    if (!ok && action === 'upgrade' && level >= equipmentLevelCap(progress,kind)) reason = i18nText("progression.workshop.d6d8e1de4a");
    if (!ok && action === 'buy' && level) reason = i18nText("progression.workshop.70ddc40598");
  }
  const challenge=rows.find(row=>row.key==='bosses'&&row.missing);
  if(!ok&&!reason&&challenge)reason=`需要挑战等级 ${challenge.need} 阶（当前 ${challenge.have} 阶）`;
  if (!ok && !reason) reason = rows.some(row => row.missing) ? i18nText("progression.workshop.661ea549dd") : i18nText("progression.workshop.31ea15cc90");
  rows = rows.map(row => ({ ...row, after: row.key === 'bosses' ? row.have : row.have - row.need }));
  return { ok, reason, rows, next: ok ? next : null,
    purchase: action === 'mount' && !progress.vehicleWeapons[choice],
    name: equipmentRecipe(kind, index)?.name || catalog[index].name };
}

// 预览可越过购买与熟练度门槛，但只返回临时副本及正式有效属性。
export function previewWorkshop(progress, kind, index, choice) {
  const next = validateProgress(bindEconomy(JSON.parse(JSON.stringify(progress)),economyFor(progress)));
  if (kind === 'weapons') {
    next.weapons[index] ||= 1;
    if (choice !== undefined) {
      next.mods[index] = choice;
      if (choice) next.mastery[index] = Math.max(MASTERY_THRESHOLDS[GAMEPLAY_VALUES.progress.modUnlockLevel - 1], next.mastery[index]);
    }
    return { progress: next, weapon: effectiveWeapon(next, index) };
  }
  next.vehicleHulls[index] ||= 1;
  const weaponIndex = progress.vehicleHulls[index] ? progress.vehicleLoadouts[index] : nativeVehicleWeapon(index)?.weaponIndex ?? null;
  next.vehicleLoadouts[index] = weaponIndex;
  if (weaponIndex !== null) next.vehicleWeapons[weaponIndex] ||= 1;
  return { progress: next, weapon: weaponIndex === null ? null : vehicleWeapon(next, weaponIndex) };
}
