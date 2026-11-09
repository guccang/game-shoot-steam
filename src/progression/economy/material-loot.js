import { economyFor } from '../../config/economy.js';
import {creditResource} from './resource-wallet.js';
// 材料结算不创建物理拾取物；即时入账，保底随存档保留，死亡与刷新不能重掷奖励。
import { MATERIAL_KEYS } from '../../config/materials.js';

// 只在正式击杀结算时调用一次；领主首次奖励按形象记录。
export function awardMaterials(progress, target, random = Math.random, attempts = 1) {
  const c=economyFor(progress);
  const reward = { parts: 0, crystal: 0, core: 0 };
  if (target.type === 'boss') {
    const first = !progress.materialBosses.includes(target.kind);
    Object.assign(reward, {parts:c.boss.parts,crystal:c.boss.crystal,core:c.boss.core+(first?c.boss.firstCore:0)});
    if (first) progress.materialBosses.push(target.kind);
  } else if (target.type === 'enemy') {
    const favored = ['pine', 'deep'].includes(target.biome);
    // 短波次将原怪数对应的抽取次数分给本次击杀，每次仍独立推进原保底规则。
    for(let i=0;i<attempts;i++)for (const key of ['parts', 'crystal']) {
      const rule = c.drops[key],
        chance = favored && key === 'crystal' ? rule.favoredChance : rule.chance,
        pity = favored && key === 'crystal' ? rule.favoredPity : rule.pity,
        guaranteed = target.rank === 2 && (key === 'parts' || favored);
      progress.materialPity[key]++;
      if (guaranteed || progress.materialPity[key] >= pity || random() < chance) {
        reward[key] += guaranteed ? rule.elite : 1;
        progress.materialPity[key] = 0;
      }
    }
  }
  for (const key of MATERIAL_KEYS) {
    reward[key]=creditResource(progress,key,reward[key]);
  }
  return reward;
}
