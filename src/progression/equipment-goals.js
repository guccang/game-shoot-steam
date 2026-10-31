import {equipmentQuestReason} from './equipment-quests.js';
import {sendMail,resourceMailText} from './mailbox.js';
import {RANGER,arrivalPistolPurchase} from '../config/ranger-arrival.js';
import { i18nText } from "../i18n/index.js";
import {campPurchasePrice} from './camp-level.js';
import { economyFor } from '../config/economy.js';
import { recordEconomy } from './economy-ledger.js';
// 装备配方、余额校验与追踪共用纯数据接口，避免按钮与实际交易条件分离。
import { WEAPONS } from '../config/weapons.js';
import { COLLECTED_VEHICLES, vehicleWeaponCost } from '../config/vehicles.js';
import { MATERIAL_KEYS, WEAPON_RECIPES, VEHICLE_RECIPES } from '../config/materials.js';

// 查询首次购买的完整需求；已有装备升级不调用此配方。
export function equipmentRecipe(kind, index, progress) {
  if (!Number.isInteger(index) || index < 0 || kind==='turret'&&index>=17) return null;
  const item = kind === 'vehicle' ? COLLECTED_VEHICLES[index] : WEAPONS[index];
  if (!item || item.rewardOnly || !['weapons', 'vehicle', 'turret'].includes(kind)) return null;
  const base = kind === 'vehicle' ? VEHICLE_RECIPES[index] : WEAPON_RECIPES[index];
  if (!base) return null;
  const recipe = { ...base, coins: item.coins, wood: item.wood, bosses: item.bosses || 0,
    name: item.name + (kind === 'turret' ? i18nText("progression.equipment-goals.3d7947dc15") : '') };
  if (kind === 'turret') {
    Object.assign(recipe, { coins: vehicleWeaponCost(index).coins, wood: vehicleWeaponCost(index).wood });
    // 基础炮塔快速体验；电锯炮塔拥有持续开路价值，使用独立材料价格。
    if (index === 0) recipe.parts = 4;
    if (item.id === 'chainsaw') Object.assign(recipe, { parts: 35, crystal: 0, core: 1 });
  }
  const c=economyFor(progress),configured=(kind==='vehicle'?c.vehicles:kind==='turret'?c.turrets:c.weapons)[index];
  Object.assign(recipe,configured,{bosses:0,gate:0});
  // 入职首枪沿用8木材预算，货架、按钮和正式支付读取同一配方。
  if(arrivalPistolPurchase(progress,kind,index,'buy'))Object.assign(recipe,{coins:0,wood:RANGER.pistolWood,parts:0,crystal:0,core:0});
  return campPurchasePrice(progress,recipe);
}

// 所有权独立校验，购买手持枪不会自动取得同型号炮塔。
export function ownsEquipment(progress, kind, index) {
  return !!(kind === 'vehicle' ? progress.vehicleHulls : kind === 'turret'
    ? progress.vehicleWeapons : progress.weapons)?.[index];
}

// 提供同一缺口列表给购买按钮、追踪提示和测试，只包含实际消耗资源。
export function equipmentRequirements(progress, kind, index) {
  const recipe = equipmentRecipe(kind, index, progress);
  if (!recipe) return [];
  return ['coins', 'wood', ...MATERIAL_KEYS].filter(key => recipe[key] > 0).map(key => {
    const need=recipe[key],have=MATERIAL_KEYS.includes(key)?progress.materials?.[key]||0:progress[key]||0;
    return {key,have,need,missing:Math.max(0,need-have)};
  });
}

// 材料缺失等价于余额为零，旧档已有装备仍可装备和升级。
export function canPurchaseEquipment(progress, kind, index) {
  return !!equipmentRecipe(kind, index, progress) && !ownsEquipment(progress, kind, index) && !equipmentQuestReason(progress,kind,index) &&
    equipmentRequirements(progress, kind, index).every(row => row.missing === 0);
}

// 所有校验完成后原子扣费，任何失败不修改余额或目标。
export function payEquipment(progress, kind, index) {
  if (!canPurchaseEquipment(progress, kind, index)) return false;
  const cost = equipmentRecipe(kind, index, progress);
  recordEconomy(progress,'expense','buy:'+kind+':'+index,cost);
  // 手续与所有权处于同一候选事务；报价预览不会向真实邮箱寄信。
  sendMail(progress,{key:`purchase:${kind}:${index}`,sender:kind==='vehicle'?'载具工坊':'武器工坊',title:`${cost.name}购买手续`,body:`${cost.name}的购买手续已办妥。\n实际支付：${resourceMailText(cost)}。\n${kind==='vehicle'?'车辆已登记到你的名下，并停入停车场，可通过手机定位。':'装备已登记到你的名下，可以在工坊查看和装备。'}\n此邮件为购买凭证，无需再次付款。`});
  progress.coins -= cost.coins;
  progress.wood -= cost.wood;
  for (const key of MATERIAL_KEYS) progress.materials[key] -= cost[key];
  if (progress.equipmentGoal?.kind === kind && progress.equipmentGoal.index === index)
    progress.equipmentGoal = null;
  return true;
}

// 追踪一个尚未拥有的装备；重复点击取消，切换目标不花资源。
export function trackEquipment(progress, kind, index) {
  if (!equipmentRecipe(kind, index, progress) || ownsEquipment(progress, kind, index)) return false;
  const same = progress.equipmentGoal?.kind === kind && progress.equipmentGoal.index === index;
  progress.equipmentGoal = same ? null : { kind, index };
  return true;
}
