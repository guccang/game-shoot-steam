// 载具词条读取已生效的车型规则，显示上限统一为三条。
import {vehicleModel} from './vehicles.js';
import {SCOOTER_AMMO_MULTIPLIER} from './scooter-capacity.js';
export const VEHICLE_TRAIT_LIMIT = 3;

// 只描述实际存在的特性；新增车型特性可继续加入列表，界面不填充空槽。
export function vehicleTraits(index) {
  const model = vehicleModel(index), traits = [];
  if (model.id === 'ranger-scooter') traits.push(`骑乘时玩家弹夹量 ×${SCOOTER_AMMO_MULTIPLIER}`);
  if (model.id === 'red-wolf') traits.push('传奇工坊的钥匙');
  if (model.treePass) traits.push('树木可通行');
  if (model.amphibious) traits.push('河流、湖泊可通行');
  if (model.flying) traits.push('飞行越过地面障碍');
  if (model.unarmed) traits.push('骑乘时使用手持武器');
  return traits.slice(0, VEHICLE_TRAIT_LIMIT);
}
