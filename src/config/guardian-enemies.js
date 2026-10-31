import { i18nText } from "../i18n/index.js";
// 守护怪潮使用既有四族配色及地面/飞行绘制器，类型不再由祭坛所在区域单独决定。
export const GUARDIAN_INVADERS = Object.freeze([
  { biome: 'meadow', color: '#9bae71', accent: '#c8da91', name: i18nText("config.guardian-enemies.5048edf543"), species: 'slime', hp: 1, speed: 1, damage: 1, rank: 0 },
  { biome: 'pine', color: '#7c9eaa', accent: '#b5d5d9', name: i18nText("config.guardian-enemies.094eadb1fb"), species: 'slime', hp: .85, speed: 1.15, damage: .9, rank: 0 },
  { biome: 'amber', color: '#bc9561', accent: '#e0c58c', name: i18nText("config.guardian-enemies.214780299f"), species: 'slime', hp: 1.3, speed: .8, damage: 1, rank: 1 },
  { biome: 'deep', color: '#a08aad', accent: '#cfb5e1', name: i18nText("config.guardian-enemies.3af2a085ea"), species: 'slime', hp: .9, speed: 1.1, damage: .9, rank: 0 },
  { biome: 'pine', color: '#7c9eaa', accent: '#b5d5d9', name: i18nText("config.guardian-enemies.7a88566d3d"), species: 'leaf-bat', hp: .7, speed: 1.25, damage: .65, rank: 0 },
  { biome: 'deep', color: '#a08aad', accent: '#cfb5e1', name: i18nText("config.guardian-enemies.8d699a963a"), species: 'leaf-bat', hp: .75, speed: 1.2, damage: .65, rank: 0 },
]);

// 按出生序号轮换、按波次错开开头，保证每波都有混编；数量仍完全由波次配额管理。
export function guardianEnemyProfile(stage, ordinal) {
  return GUARDIAN_INVADERS[(ordinal + Math.max(0, stage - 1)) % GUARDIAN_INVADERS.length];
}
