// Boss 重击与援兵配置集中维护，普通武器继续使用原有的小幅击退参数。
const IMPACTS = {
  normal: { scale: 0.6, limit: 55, drag: 10, flash: 0.13, pose: 0 },
  sniper: { scale: 1.1, limit: 125, drag: 8, flash: 0.26, pose: 7 },
  pulse: { scale: 1.3, limit: 180, drag: 7, flash: 0.34, pose: 10 },
};
// 以实际弹丸类型查询，挂载武器与在途切枪均不依赖当前手持装备。
export function bossImpactProfile(kind) {
  return IMPACTS[kind] || IMPACTS.normal;
}
export const BOSS_SUPPORT = {
  first: 2, interval: 8, jitter: 2, warning: 2, spacing: 0.7,
  // 附近安全距离内接敌，避免援军在远处被地形挡住或迟迟进不了画面。
  minDistance: 220, maxDistance: 320,
  cap: 6, fieldCap: 12, health: 0.65, damage: 0.7,
  // 召唤木卫在重装基础生命上再翻倍；专属玩法至少承受首领十分之一的生命预算。
  summonHealth: 2, bossHealthRatio: 0.1,
};
