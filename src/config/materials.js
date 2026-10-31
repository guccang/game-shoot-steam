import { i18nText } from "../i18n/index.js";
// 材料经济统一目录：新材料只用于首次解锁，金币与木材继续承担日常养成。
export const MATERIALS = Object.freeze({
  parts: { name: i18nText("balance.app.04480d568c"), color: '#b8cebb', source: i18nText("config.materials.b0380e907d") },
  crystal: { name: i18nText("balance.app.00aedb5fc7"), color: '#a9e1e1', source: i18nText("config.materials.0815375a14") },
  core: { name: i18nText("balance.help.e6550a880a"), color: '#f3d17f', source: i18nText("config.materials.c95328de02") },
});
export const MATERIAL_KEYS = Object.freeze(Object.keys(MATERIALS));
export const MATERIAL_CAP = 9999999;
export const MATERIAL_DROP = Object.freeze({
  parts: { chance: 0.18, pity: 8 },
  crystal: { chance: 0.04, pity: 24, favoredChance: 0.22, favoredPity: 8 },
});
// 配方按稳定武器编号绑定；分钟为设计目标区间，不是游玩时间门槛。
export const WEAPON_RECIPES = Object.freeze([
  { parts: 0, crystal: 0, core: 0, minutes: i18nText("config.materials.036d65598b") },
  { parts: 12, crystal: 12, core: 0, minutes: '15–35' },
  { parts: 40, crystal: 0, core: 1, minutes: '30–55' },
  { parts: 8, crystal: 0, core: 0, minutes: '8–15' },
  { parts: 18, crystal: 16, core: 0, minutes: '25–45' },
  { parts: 6, crystal: 4, core: 0, minutes: '12–25' },
  { parts: 40, crystal: 12, core: 1, minutes: '40–70' },
  { parts: 16, crystal: 18, core: 0, minutes: '25–50' },
  { parts: 55, crystal: 20, core: 2, minutes: '50–90' },
  { parts: 100, crystal: 70, core: 4, minutes: '80–140' },
  { parts: 20, crystal: 32, core: 1, minutes: '45–75' },
  { parts: 14, crystal: 24, core: 1, minutes: '35–60' },
  { parts: 160, crystal: 120, core: 8, minutes: '120–180' },
  { parts: 120, crystal: 90, core: 6, minutes: '110–160' },
  { parts: 2, crystal: 0, core: 0, minutes: '1–5' },
  { parts: 140, crystal: 100, core: 7, minutes: '115–170' },
  { parts: 180, crystal: 140, core: 9, minutes: '130–190' },
  { parts: 45, crystal: 50, core: 2, minutes: '聚怪控制' },
  { parts: 12, crystal: 8, core: 0, minutes: '驻车防护' },
]);
export const VEHICLE_RECIPES = Object.freeze([
  { parts: 0, crystal: 0, core: 0, minutes: i18nText("config.materials.b60d9f91e0") },
  { parts: 70, crystal: 12, core: 2, minutes: '35–80' },
  { parts: 100, crystal: 55, core: 4, minutes: '75–120' },
  { parts: 85, crystal: 28, core: 3, minutes: '55–100' },
  { parts:112, crystal:20, core:2, minutes:'消防或购买' },
  { parts:0, crystal:0, core:0, minutes:'入职或购买' },
  { parts:220, crystal:100, core:8, minutes:'重型火力' },
  { parts:90, crystal:40, core:3, minutes:'近战小队' },
  { parts:18, crystal:0, core:0, minutes:'轻快巡逻' },
]);
