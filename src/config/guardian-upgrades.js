import growth from './content/growth.json' with {type:'json'};
import { GAMEPLAY_VALUES } from './gameplay-values.js';
// 守护炮塔的四条独立成长线；只通过局内装备快照应用，不影响永久枪械。
export const GUARDIAN_STAT_KEYS = Object.freeze(['damage', 'rate', 'magazine', 'reload']);
export const GUARDIAN_STAT_MAX = growth.guardian.maxLevel;
export const GUARDIAN_STAT_COST = growth.guardian.cost;

// 攻击沿用旧版等级，其余属性缺省为一级，损坏数据收敛为合法整数。
export function guardianStatLevel(tower, key) {
  const raw = key === 'damage' ? tower.level : tower.upgrades?.[key];
  return Number.isFinite(raw) ? Math.max(1, Math.min(GUARDIAN_STAT_MAX, Math.floor(raw))) : 1;
}

// 每项单独递增费用，其他成长线不会抬高本项价格。
export function guardianStatCost(tower, key) {
  return guardianStatLevel(tower, key) * GUARDIAN_STAT_COST;
}

// 保存时只接收可识别的三项供给等级，攻击仍保存在旧版level字段。
export function guardianSupplyLevels(tower) {
  return Object.fromEntries(GUARDIAN_STAT_KEYS.slice(1).map(key => [key, guardianStatLevel(tower, key)]));
}

// 预览只复制待升级的一项，不修改实体炮塔或运行中的武器。
export function guardianNextStat(tower, key) {
  const level = Math.min(GUARDIAN_STAT_MAX, guardianStatLevel(tower, key) + 1);
  return key === 'damage' ? { ...tower, level } : { ...tower, upgrades: { ...tower.upgrades, [key]: level } };
}

// 攻速每级增加基础值12%，弹夹每级增加基础容量20%，换弹效率每级增加15%。
export function applyGuardianSupply(weapon, levels) {
  if (!levels) return weapon;
  const tower = { upgrades: levels }, rate = 1 + (guardianStatLevel(tower, 'rate') - 1) * GAMEPLAY_VALUES.guardian.ratePerLevel;
  weapon.interval /= rate;
  // 脉冲以蓄能和冷却驱动射击，必须同步缩短两段，保持面板与实际频率一致。
  if (weapon.chargeTime) { weapon.chargeTime /= rate; weapon.cooldown /= rate; }
  weapon.magazineSize = Math.ceil(weapon.magazineSize * (1 + (guardianStatLevel(tower, 'magazine') - 1) * GAMEPLAY_VALUES.guardian.magazinePerLevel));
  weapon.reloadTime /= 1 + (guardianStatLevel(tower, 'reload') - 1) * GAMEPLAY_VALUES.guardian.reloadPerLevel;
  return weapon;
}
