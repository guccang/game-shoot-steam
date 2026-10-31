import { i18nText } from "../i18n/index.js";
// 工坊按用途分组，保留武器目录编号和组内的解锁顺序。
import { WEAPONS, WEAPON_DISPLAY_ORDER } from './weapons.js';

export const WEAPON_CATEGORIES = [
  { id: 'all', name: i18nText("config.weapon-categories.5c55a67935") },
  { id: 'standard', name: i18nText("config.weapon-categories.40fae00b7c"), weapons: ['pistol', 'chainsaw', 'shotgun', 'ricochet'] },
  { id: 'heavy', name: i18nText("config.weapon-categories.447ab6d781"), weapons: ['gatling', 'grenade', 'sniper', 'pulse'] },
  { id: 'elemental', name: i18nText("config.weapon-categories.a1c1675f5d"), weapons: ['laser', 'water', 'flame', 'arc', 'frost', 'gravity-gun', 'energy-shield'] },
  { id: 'automated', name: i18nText("config.weapon-categories.9b5b08d290"), weapons: ['drone', 'funnel', 'mechanical-core', 'mechanical-spider'] },
];

// 未归类的新武器暂归常规，新增目录不会从工坊消失。
export function weaponCategory(index) {
  return (
    WEAPON_CATEGORIES.find((category) => category.weapons?.includes(WEAPONS[index]?.id))?.id ||
    'standard'
  );
}

// 当前装备始终只出现一次并排在首位，不受分类筛选影响。
export function workshopWeapons(progress, category = 'all') {
  return [
    progress.weapon,
    ...WEAPON_DISPLAY_ORDER.filter(
      (index) =>
        index !== progress.weapon && (category === 'all' || weaponCategory(index) === category),
    ),
  ];
}
