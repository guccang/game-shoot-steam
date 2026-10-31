// 清缴与守门共享缓慢成长曲线；按已完成轮次计数，暂停、读档、失败重试不额外加难。
export const ENCOUNTER_GROWTH=Object.freeze({health:.04,damage:.02,healthCap:2,damageCap:1.5});
// 数值上限防止长期游玩变成无限血量；波数、怪物数量、速度和奖励不随此曲线改变。
export function encounterDifficulty(rounds=0){
 const n=Math.max(0,Math.floor(Number.isFinite(rounds)?rounds:0));
 return {health:Math.min(ENCOUNTER_GROWTH.healthCap,1+n*ENCOUNTER_GROWTH.health),damage:Math.min(ENCOUNTER_GROWTH.damageCap,1+n*ENCOUNTER_GROWTH.damage)};
}
