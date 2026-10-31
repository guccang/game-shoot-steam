// 清缴小怪与领主共享按完成轮数计算的伤害成长；五批编成不叠加伤害。
import {clearingDifficulty,clearingOpeningPacing} from './clearing-difficulty.js';
import {GAMEPLAY_VALUES} from './gameplay-values.js';
import {GAMEPLAY_TABLES} from './gameplay-tables.js';

// 基础伤害保留阶级与兵种差异，不叠加落地区域强度；死亡重试沿用原减免。
export function clearingEnemyDamage(baseDamage,completedRounds,wave=1,recoveryRun=false){
 const n=Math.max(0,Math.floor(Number.isFinite(wave)?wave:1)-1);
 const relief=recoveryRun?(GAMEPLAY_TABLES.waveRecoveryRelief[n]??1):1;
 const scale=clearingDifficulty(completedRounds).damage;
 return Math.round(Math.min(baseDamage,GAMEPLAY_VALUES.boss.baseBlastDamage)*scale*relief);
}

// 前两轮生命额外减免，第三轮起沿用原成长；援军由工厂另乘原有折扣。
export function clearingEnemyHealth(completedRounds,wave=1,recoveryRun=false){
 const n=Math.max(0,Math.floor(Number.isFinite(wave)?wave:1)-1);
 const relief=recoveryRun?(GAMEPLAY_TABLES.waveRecoveryRelief[n]??1):1;
 return (clearingDifficulty(completedRounds).health+GAMEPLAY_VALUES.wave.healthPerWave*(n%5))*(GAMEPLAY_TABLES.waveEarlyHealth[n]??1)*relief*clearingOpeningPacing(completedRounds).health;
}
