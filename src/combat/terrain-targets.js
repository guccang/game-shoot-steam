// 岩壁与森林树木共用碰撞类型，矿井继续由原有采矿规则决定可命中对象。
const emptyTargets = Object.freeze([]);

// 开启木材索敌时，允许伐木的手持武器可命中森林树木；独立炮口继续使用矿井岩壁规则。
export function weaponTerrainTargets(game, allowWood = false) {
  if (game.trees.mineScene) return game.trees;
  if (allowWood && game.gameplayPreferences?.targetWood !== false && !game.fireActive &&
      !['football', 'race'].includes(game.realm?.mode)) return game.trees;
  return emptyTargets;
}
