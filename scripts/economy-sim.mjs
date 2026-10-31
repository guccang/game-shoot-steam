import { ORIGINAL_ECONOMY, bindEconomy } from '../src/config/economy.js';
// 离线经济节奏模拟：复用真实掉落与购买规则，击杀频率是假设，不代替真人战斗测试。
import { pathToFileURL } from 'node:url';
import { freshProgress } from '../src/progression/progress.js';
import { awardMaterials } from '../src/progression/material-loot.js';
import { transactProgress } from '../src/progression/transactions.js';
import { transactVehicle } from '../src/progression/vehicles.js';
import { equipmentRecipe } from '../src/progression/equipment-goals.js';
import { BOSSES } from '../src/config/bosses.js';
import { TREE_REWARD, enemyWoodReward } from '../src/config/rewards.js';

export const ECONOMY_ROUTE = [
  ['weapons', 14], ['weapons', 3], ['weapons', 1], ['weapons', 2],
  ['vehicle', 1], ['weapons', 8], ['weapons', 9], ['weapons', 12],
];

// 确定性随机源便于用同一组样本复查调参，不影响正式战斗随机数。
function randomSource(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
}

// 每分钟结算保守收益，预留四分之一金币木材给升级；只买一条路线，不假定全收集。
export function simulateEconomy(seed = 1, { killScale = 1, bossInterval = 8 } = {}) {
  const p = bindEconomy(freshProgress(),ORIGINAL_ECONOMY), random = randomSource(seed), purchases = [];
  let cursor = 0, kills = 0;
  for (let minute = 1; minute <= 180; minute++) {
    const count = Math.max(1, Math.floor((minute < 15 ? 8 : 12) * killScale));
    let coins = 0, wood = 0;
    for (let i = 0; i < count; i++) {
      kills++;
      const rank = minute >= 40 && kills % 12 === 0 ? 2 : 0,
        biome = minute >= 25 ? 'pine' : 'meadow',
        reward = (biome === 'pine' ? 24 : 15) + rank * 9;
      awardMaterials(p, { type: 'enemy', rank, biome }, random);
      coins += reward; wood += enemyWoodReward(reward);
    }
    coins += TREE_REWARD.coins * 8; wood += TREE_REWARD.wood * 8;
    if (minute % bossInterval === 0) {
      awardMaterials(p, { type: 'boss', kind: BOSSES[p.bosses % BOSSES.length].id }, random);
      p.bosses++; coins += 180; wood += 85;
    }
    p.coins += Math.floor(coins * 0.75); p.wood += Math.floor(wood * 0.75);
    while (cursor < ECONOMY_ROUTE.length) {
      const [kind, index] = ECONOMY_ROUTE[cursor],
        bought = kind === 'weapons' ? transactProgress(p, kind, index, 'buy')
          : transactVehicle(p, kind, index, 'buy');
      if (!bought) break;
      purchases.push({ name: equipmentRecipe(kind, index, p).name, minute });
      cursor++;
    }
  }
  return { purchases, completed: cursor === ECONOMY_ROUTE.length,
    remaining: { coins: p.coins, wood: p.wood, ...p.materials } };
}

// 命令行输出多随机种子的完成区间，并额外展示低效率游玩的缺口。
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const samples = Array.from({ length: 100 }, (_, i) => simulateEconomy(i + 1));
  console.log(JSON.stringify({
    assumptions: '前15分钟8杀/分钟，之后12杀；8树/分钟；8分钟一个领主；25分钟后去雾松；预留25%金币木材养成',
    samples: samples.length, completed: samples.filter(s => s.completed).length,
    route: ECONOMY_ROUTE.map(([kind, index], i) => {
      const times = samples.map(s => s.purchases[i]?.minute).filter(Number.isFinite).sort((a, b) => a - b);
      return { name: equipmentRecipe(kind, index).name, earliest: times[0],
        median: times[Math.floor(times.length / 2)], latest: times.at(-1) };
    }),
    slower: simulateEconomy(1, { killScale: 0.65, bossInterval: 12 }),
  }, null, 2));
}
