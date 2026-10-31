// 可重复的怪潮逻辑基准，固定模拟步长；输出平均与尾部耗时，不把计时断言加入测试。
import { createCrowdScene } from '../tests/helpers/crowd-scene.js';

// 使用正式更新入口，预热后测量相同帧数及确定性走位。
function measure(count, weapon) {
  const game = createCrowdScene(count, weapon), times = [];
  for (let i = 0; i < 240; i++) {
    const start = performance.now();
    game.update(1 / 60, { x: Math.cos(i / 55) * 0.2, y: Math.sin(i / 55) * 0.2 });
    if (i >= 60) times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { count, weapon, trees: game.trees.length,
    mean: times.reduce((a, b) => a + b, 0) / times.length,
    p95: times[Math.floor(times.length * 0.95)],
    alive: game.enemies.length, shots: game.projectiles.length };
}
console.log(JSON.stringify([measure(12, 2), measure(48, 2), measure(48, 9), measure(48, 12), measure(96, 12)], null, 2));
