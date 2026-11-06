// 岩壁与森林树木共用碰撞类型，矿井继续由原有采矿规则决定可命中对象。
const emptyTargets = Object.freeze([]);

// 只有开启木材索敌的手持电锯能把森林树木纳入攻击，独立武器仅可命中矿井岩壁。
export function weaponTerrainTargets(game, heldChainsaw = false) {
  if (game.trees.mineScene) return game.trees;
  if (heldChainsaw && game.gameplayPreferences?.targetWood !== false && !game.fireActive &&
      !['football', 'race'].includes(game.realm?.mode)) return game.trees;
  return emptyTargets;
}
