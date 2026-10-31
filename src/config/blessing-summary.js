import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { i18nText } from "../i18n/index.js";
// 祝福累计展示按正式线性叠加和五层上限计算；选择次数与有效层数分别记录。
import { BLESSINGS } from './realms.js';

// 只读取合法非负整数，展示层不信任外部存档字符串。
function count(value) { return Number.isFinite(value) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : 0; }

// 提供选择卡与已获祝福摘要，旧档缺失的历史次数明确显示为下限。
export function blessingSummary(key, realm) {
  if (!Object.hasOwn(BLESSINGS, key)) return null;
  const stacks = Math.min(GAMEPLAY_VALUES.blessings.maxStacks, count(realm.buffs?.[key]));
  const selections = Math.max(stacks, count(realm.blessingCounts?.[key]));
  const partial = realm.blessingCountsPartial || (!realm.blessingCounts && (realm.stage > 1 || realm.cleared > 0));
  const selectionText = partial ? selections > 0 ? i18nText("config.blessing-summary.85dfa1edd4", { p0: (selections) }) : i18nText("config.blessing-summary.25b6e6df62") : i18nText("config.blessing-summary.ef21bd9787", { p0: (selections) });
  const effects = {
    power: i18nText("config.blessing-summary.2154c9ca53", { p0: (Number((stacks * GAMEPLAY_VALUES.blessings.powerPerStack * 100).toFixed(2))) }),
    haste: i18nText("config.blessing-summary.24184a31b8", { p0: (Number((stacks * GAMEPLAY_VALUES.blessings.hastePerStack * 100).toFixed(2))) }),
    vitality: i18nText("config.blessing-summary.12fbe7946a", { p0: (stacks * GAMEPLAY_VALUES.blessings.vitalityPerStack) }),
    armor: i18nText("config.blessing-summary.305cc701f9", { p0: (Number((stacks * GAMEPLAY_VALUES.blessings.armorPerStack * 100).toFixed(2))) }),
    leech: i18nText("config.blessing-summary.4b299f1c79", { p0: (stacks * GAMEPLAY_VALUES.blessings.leechPerStack) }),
    reach: i18nText("config.blessing-summary.482dc2d2d4", { p0: (Number((stacks * GAMEPLAY_VALUES.blessings.reachPerStack * 100).toFixed(2))) }),
    mend: i18nText("config.blessing-summary.940f48dd1c"),
    heal: i18nText("config.blessing-summary.940f48dd1c"),
  };
  const instant = key === 'mend' || key === 'heal';
  const capped = !instant && stacks === GAMEPLAY_VALUES.blessings.maxStacks;
  const nextEffect = capped ? key === 'vitality' ? i18nText("config.blessing-summary.29aeef2ef5") : i18nText("config.blessing-summary.832155f848") : i18nText("config.blessing-summary.ad615181e8", { p0: (BLESSINGS[key].text) });
  return { selections, stacks, selectionText, effect: effects[key], capped, instant, nextEffect };
}
