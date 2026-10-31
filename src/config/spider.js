// 母巢扩编与单枪架数值，正式战斗、存档边界和工坊共用。
export const SPIDER_INITIAL_MINIONS=8;
export const SPIDER_MAX_MINIONS=20;
export const SPIDER_COORDINATION_MAX=13;
export const SPIDER_SPAWN_INTERVAL=2;
export const SPIDER_GUN_MULTIPLIER=1.5;

// 小蛛爆炸以当前近战伤害为基准，中心两倍、边缘衰减，母体不使用该规则。
export const SPIDER_DEATH_BURST = Object.freeze({ radius: 80, damageMultiplier: 2, impulse: 12 });
