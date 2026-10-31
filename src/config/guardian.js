import { i18nText } from "../i18n/index.js";
// 守护塔防的预设格位与局内经济；永久装备只用于校验拥有权。
import { WEAPONS } from './weapons.js';
import { REALM_ARENA } from './realms.js';
import { GUARDIAN_STAT_KEYS, GUARDIAN_STAT_COST, GUARDIAN_STAT_MAX, guardianStatLevel } from './guardian-upgrades.js';

// 八个预设格位环绕区域中央女神；编号稳定，旧存档的装备和等级可以原样恢复。
export const GUARDIAN_PADS = Object.freeze([
  { x: 760, y: 560, name: i18nText("config.guardian.fadc307272") }, { x: 900, y: 510, name: i18nText("config.guardian.83d3e27abd") },
  { x: 1040, y: 560, name: i18nText("config.guardian.4fc955d610") }, { x: 1090, y: 700, name: i18nText("config.guardian.8d8289a3c8") },
  { x: 1040, y: 840, name: i18nText("config.guardian.644007e0f3") }, { x: 900, y: 890, name: i18nText("config.guardian.69abab2ef9") },
  { x: 760, y: 840, name: i18nText("config.guardian.f1f01e5e0c") }, { x: 710, y: 700, name: i18nText("config.guardian.195d3239ff") },
]);
export const GUARDIAN_ECONOMY = Object.freeze({ start: 160, weapon: 60, vehicle: 100, upgrade: GUARDIAN_STAT_COST, maxLevel: GUARDIAN_STAT_MAX, kill: 12, elite: 25, boss: 100 });
// 格位仅平移到抽中的主场景区域，不缩放角色、射程或建造间距。
export function guardianPoint(point, arena = REALM_ARENA) {
  return { ...point, x: point.x + arena.x - REALM_ARENA.x, y: point.y + arena.y - REALM_ARENA.y };
}
// 正式火力和地面点击层共用相同格位坐标。
export function guardianPads(arena) { return GUARDIAN_PADS.map(point => guardianPoint(point, arena)); }
// 支架武器可以来自已拥有的手持枪或独立炮塔，控制器仍使用独立阵列。
export function guardianOwnsWeapon(progress, index) {
  return Number.isInteger(index) && !!WEAPONS[index] && WEAPONS[index].attackKind!=='defense' &&
    (progress.weapons[index] > 0 || (index<17 && !WEAPONS[index].controller && progress.vehicleWeapons[index] > 0));
}
// 格位只部署枪械或独立控制器，事务层拒绝车辆，不能通过页面参数绕过。
export function guardianCanDeploy(progress, kind, index, weaponIndex) {
  return kind === 'weapon' && index === weaponIndex && guardianOwnsWeapon(progress, weaponIndex);
}
// 累计投资用于波间拆除返还，局内升级不会改变森林等级。
export function guardianInvestment(tower) {
  return GUARDIAN_ECONOMY[tower.kind] + GUARDIAN_STAT_KEYS.reduce((sum, key) => {
    const level = guardianStatLevel(tower, key);
    return sum + GUARDIAN_ECONOMY.upgrade * level * (level - 1) / 2;
  }, 0);
}
