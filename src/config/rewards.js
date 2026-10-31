// 正式默认的资源职责：树木只产木材，怪物直接掉落不产木材。
export const TREE_REWARD = Object.freeze({ coins: 0, wood: 8 });

// 保留旧调用入口；最终奖励仍由共享经济配置结算，默认怪物木材为零。
export function enemyWoodReward(coins) {
  return 0;
}
