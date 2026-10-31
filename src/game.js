// 兼容公开入口：规则层可在 Node、浏览器或其他视图中独立使用。
export { Game } from './core/game.js';
export { HEROES } from './config/heroes.js';
export { WEAPONS } from './config/weapons.js';
export { freshProgress, validateProgress, upgradeCost } from './progression/progress.js';
export { WORLD, worldDistance as distance } from './world/coordinates.js';
export { clamp } from './core/math.js';
