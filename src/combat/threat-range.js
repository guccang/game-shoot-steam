import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 敌人不可达时按当前实际武器保持距离；不读取未装备的仓库武器。
import { vehicleWeapon } from '../config/vehicles.js';

// 炮塔和独立浮游炮仍能从水面开火，撤退距离需覆盖它们的有效射程。
export function playerThreatRange(game) {
  const weapon = game.weapon();
  let range = weapon.range || GAMEPLAY_VALUES.combat.defaultThreatRange;
  if (weapon.controller) for (const node of game.funnel?.nodes || []) range = Math.max(range, node.weapon?.range || 0);
  if (game.vehicle?.active) range = Math.max(range, vehicleWeapon(game.progress, game.vehicle.weaponIndex)?.range || 0);
  return range;
}
