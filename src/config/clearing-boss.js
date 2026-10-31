// 清缴领主独立生命预算：抵抗武器与载具集火，与小怪共用胜场锚点但分别配置属性。
import {clearingDifficulty} from './clearing-difficulty.js';
import {missionBossHealth} from './mission-boss-balance.js';
import {COLLECTED_VEHICLES} from './vehicles.js';
export const CLEARING_BOSS_HEALTH_VERSION = 11;

// 在现有领主预算上增加50%耐久，让整备后的火力有更长的验证时间。
const CLEARING_BOSS_HEALTH_MULTIPLIER = 1.5;
// 永久获得带武器载具后提高耐久，不按车炮等级追涨，也不计入电动车或任务借装。
const CLEARING_BOSS_VEHICLE_MULTIPLIER = 3;
// 第八轮起已有四倍后期预算，只额外增加50%，避免两档增强叠成过长的消耗战。
const CLEARING_BOSS_LATE_VEHICLE_MULTIPLIER = 1.5;
// 前五轮保留教学预算；第六、七、八轮起依次为原预算的1.5、2.5、4倍，后续保持四倍。
const CLEARING_BOSS_LATE_MULTIPLIERS = Object.freeze([1.5,2.5,4]);

// 按轮数与永久载具获取阶段生成预算；开战快照锁定结果，换装与重试不重算。
export function clearingBossHealth(completed=0,progress=null){
 const rounds=Math.max(0,Math.floor(Number.isFinite(completed)?completed:0));
 const base=Math.round(missionBossHealth(clearingDifficulty(rounds).bossHealth)*CLEARING_BOSS_HEALTH_MULTIPLIER);
 const late=rounds<5?1:CLEARING_BOSS_LATE_MULTIPLIERS[Math.min(rounds-5,CLEARING_BOSS_LATE_MULTIPLIERS.length-1)];
 const vehicle=COLLECTED_VEHICLES.some((model,index)=>!model.unarmed&&progress?.vehicleHulls?.[index]>0)?(rounds<7?CLEARING_BOSS_VEHICLE_MULTIPLIER:CLEARING_BOSS_LATE_VEHICLE_MULTIPLIER):1;
 return Math.round(Math.round(base*late)*vehicle);
}
