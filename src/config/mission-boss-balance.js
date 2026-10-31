// 任务、清缴和兽潮领主统一增加15%生命；普通怪、攻击与移动速度保持各自配置。
const MISSION_BOSS_HEALTH_PERCENT=115;
// 先乘整数百分比再除100，避免650×1.15的浮点误差把747.5误舍为747。
export function missionBossHealth(base){return Math.min(Number.MAX_SAFE_INTEGER,Math.round(base*MISSION_BOSS_HEALTH_PERCENT/100));}
