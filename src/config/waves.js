import {economyFor} from './economy.js';
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { GAMEPLAY_TABLES } from './gameplay-tables.js';
import {CLEARING_DENSITY} from './clearing-difficulty.js';
// 清缴怪潮的统一编成：五波循序引入特殊怪，以团子为主；森林属性另按永久胜场成长。
export const WAVE_REST_SECONDS = 3;
// 每份清缴固定五波普通怪，全部完成后自动挑战领主。
export const WAVE_GROUP = Object.freeze({ min: 5, max: 5 });
// 固定组长度，不再随机抽取；保留统一入口供开局和领主结算使用。
export function rollWaveGroup() { return WAVE_GROUP.max; }
// 血量平衡版本用于迁移旧领主快照，不改变存档中的波次和装备成长。
export const HEALTH_BALANCE_VERSION = 1;
// 版本5的配额仅用于历史迁移与奖励基数，每轮各批增加两只，最多四十只。
export const CLEARING_OPENING_TOTALS = Object.freeze([2,4,6,8,10]);
// 版本6首轮配额仅供旧档与奖励预算使用。
export const PREVIOUS_V6_TOTALS = Object.freeze([2,3,4,5,6]);
// 正常编成基数沿用版本7；每轮增加四只，特殊怪密度另行约束。
export const FIRST_CLEARING_TOTALS = Object.freeze([6,10,14,18,24]);
// 前两次清缴的整波配额减少30%，逐波四舍五入；第三次起恢复正常编成。
export const CLEARING_OPENING_RELIEF = Object.freeze({rounds:2,ratio:.7});
export const CLEARING_QUOTA_VERSION = 8;
export const CLEARING_WAVE_CAP = 64;
// 保留上一版工作量作为奖励基数，扩充怪群不会重复放大币木与材料。
export function clearingRewardTotal(wave){
 const n=Math.max(0,Math.floor(Number.isFinite(wave)?wave:1)-1);
 return n<5?PREVIOUS_V6_TOTALS[n]:Math.min(40,CLEARING_OPENING_TOTALS[n%5]+2*Math.floor(n/5));
}
// 历史奖励份额仅供旧报告对照；正式奖励读取下面的固定清缴预算。
export const WAVE_REWARD_TOTALS = Object.freeze([12, 18, 26, 36, 48, 60, 72, 84, 96]);
// 返回原配额对应的奖励份数，开局表之后仍沿用原来的每波加8份。
export function waveRewardTotal(wave){
  const n=Math.max(0,Math.floor(Number.isFinite(wave)?wave:1)-1);
  return WAVE_REWARD_TOTALS[n]??GAMEPLAY_VALUES.wave.rewardBase+n*GAMEPLAY_VALUES.wave.rewardPerWave;
}
// 按已结算击杀序号分摊整数奖励，尾差均匀落在本波各怪上，刷新通过击杀存档续接。
export function waveRewardAmount(wave,killIndex,amount=1){
  const total=waveDifficulty(wave).total,index=Math.max(0,Math.floor(killIndex));
  if(index>=total)return 0;
  const budget=waveRewardTotal(wave)*amount;
  return Math.floor((index+1)*budget/total)-Math.floor(index*budget/total);
}
// 按波次生成难度，区域和阶级属性在出生时再乘这些系数，已出生怪物不会突然变强。
export function waveDifficulty(wave, recoveryRun = false) {
  const n = Math.max(0, Math.floor(Number.isFinite(wave) ? wave : 1) - 1);
  // 死亡重开的前三波逐步退出缓和；此参数仅供普通怪物使用。
  const relief = recoveryRun ? (GAMEPLAY_TABLES.waveRecoveryRelief[n] ?? 1) : 1;
  const round=Math.floor(n/5),normalTotal=Math.min(CLEARING_WAVE_CAP,FIRST_CLEARING_TOTALS[n%5]+4*round);
  const total=round<CLEARING_OPENING_RELIEF.rounds?Math.round(normalTotal*CLEARING_OPENING_RELIEF.ratio):normalTotal;
  return {
    total,
    maxAlive: Math.min(CLEARING_DENSITY.maxAlive, total),
    interval: Math.max(GAMEPLAY_VALUES.wave.minInterval, GAMEPLAY_VALUES.wave.firstInterval * Math.pow(GAMEPLAY_VALUES.wave.intervalDecay, n)),
    batch: Math.min(GAMEPLAY_VALUES.wave.maxBatch, GAMEPLAY_VALUES.wave.firstBatch + Math.floor(n / GAMEPLAY_VALUES.wave.batchGrowthWaves)),
    // 生命改为线性增长，避免中期血量平方膨胀；保留前三波减免与死亡缓和。
    health: (1 + GAMEPLAY_VALUES.wave.healthPerWave * n) * (GAMEPLAY_TABLES.waveEarlyHealth[n] ?? 1) * relief,
    // 历史通用场景保留波次曲线；正常森林清缴与领主援兵由 clearingEnemyDamage 按轮数单独结算。
    damage: (1 + GAMEPLAY_VALUES.wave.damageLinear * n + GAMEPLAY_VALUES.wave.damageQuadratic * n * n) * relief,
    speed: 1 + Math.min(GAMEPLAY_VALUES.wave.speedBonusCap, GAMEPLAY_VALUES.wave.speedPerWave * n),
    rankBonus: Math.min(GAMEPLAY_VALUES.wave.rankBonusCap, GAMEPLAY_VALUES.wave.rankPerWave * n),
    rankCap: n === 0 ? GAMEPLAY_VALUES.wave.firstRankCap : n === 1 ? GAMEPLAY_VALUES.wave.secondRankCap : GAMEPLAY_VALUES.wave.rankCap,
  };
}

// 波次持续从周围可直达的近处入场；不修改怪数和整波奖励预算。
// 清缴出生点离河岸至少80单位，保留原接敌距离与波次节奏。
export const WAVE_ARRIVAL = Object.freeze({minDistance:180,maxDistance:300,riverClearance:80});

// 基准单价乘扩容前配额形成整波预算；扩容后逐怪分摊，材料抽取次数独立。
export function clearingWaveBudget(wave,progress){
 const c=economyFor(progress).clearing,n=Math.max(0,Math.floor(wave)-1),scale=Math.min(c.maxGrowth,1+Math.floor(n/5)*c.groupGrowth);
 const coins=Math.round(c.coins[n%5]*scale)*(c.perKill?clearingRewardTotal(wave):1);
 return {coins:0,wood:Math.ceil(coins*c.woodRatio),attempts:Math.round(c.attempts[n%5]*scale)};
}
// 按已结算序号分摊，零次抽取不会推进保底；存档续接也不会重发前半波。
export function clearingKillReward(wave,index,progress){
 const total=waveDifficulty(wave).total,budget=clearingWaveBudget(wave,progress);
 return Object.fromEntries(Object.entries(budget).map(([k,n])=>[k,index<0||index>=total?0:Math.floor((index+1)*n/total)-Math.floor(index*n/total)]));
}
