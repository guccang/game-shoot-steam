// 猫猫经验数值集中配置，等级上限与既有角色成长保持一致。
import {GAMEPLAY_VALUES} from './gameplay-values.js';
export const HERO_MAX_LEVEL=GAMEPLAY_VALUES.progress.maxEquipmentLevel;
export const HERO_XP_PER_LEVEL=100;
export const HERO_TASK_XP=Object.freeze({mainline:60,living:80,story:120,clearing:120,horde:160,realm:60,fire:100,football:40});
export const HERO_COMBAT_XP=Object.freeze({enemy:10,tough:20,boss:100});
