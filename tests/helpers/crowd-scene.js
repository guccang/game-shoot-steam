// 确定性怪潮场景供 Node 与浏览器共用，保留正式树林、战斗、物理及武器效果。
import { Game, freshProgress } from '../../src/game.js';

// 固定随机种子和敌人生命，避免优化前后因击杀、出生和随机布局产生不同负载。
export function createCrowdScene(count = 48, weapon = 2) {
  let seed = 12345;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const progress = freshProgress();
  progress.weapons.fill(1);
  progress.weapon = weapon;
  progress.funnelLoadout = [2, 2, 2];
  const game = new Game(progress, random);
  game.start();
  game.enemies = [];
  game.player.invincible = 1e6;
  game.setViewport(390, 844);
  for (let i = 0; i < count; i++) {
    const enemy = game.spawnEnemy(i * 2.399963, 125 + (i % 5) * 30);
    enemy.hp = enemy.maxHp = 1e8;
    if (i % 7 === 0) enemy.pushX = 160;
  }
  game.spawnTimer = 1e6;
  for (const tree of game.trees) tree.hp = tree.maxHp = 1e8;
  return game;
}
