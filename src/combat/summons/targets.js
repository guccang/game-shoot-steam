// 召唤物共用存活/射程/敌人优先筛选，地面与飞行分配策略独立保留。
import { summonTargetVisible } from './perception.js';
import { worldDistance } from '../../world/coordinates.js';

// 调用方显式指定飞行敌人资格、领主优先及同距离排序，保持原索敌行为。
export function summonTargetPool(game,origin,range,{allowFlying=true,bossFirst=false,tieById=false,targetTrees=true}={}) {
  const valid=t=>t.hp>0&&(!game.combatLineClear||game.combatLineClear(origin,t))&&(!game.player.arena||worldDistance(t,game.player.arena)+(t.radius||0)<=game.player.arena.radius)&&summonTargetVisible(game,t)&&(allowFlying||!t.flying)&&worldDistance(t,origin)<=range;
  if(bossFirst&&game.boss&&valid(game.boss))return [game.boss];
  const enemies=(bossFirst?game.enemies:[...game.enemies,...(game.boss?[game.boss]:[])]).filter(valid);
  return (enemies.length?enemies:targetTrees===false?[]:game.trees.filter(valid)).sort((a,b)=>worldDistance(a,origin)-worldDistance(b,origin)||(tieById?a.id-b.id:0));
}

// 全队按最少认领数分配目标，同数时保留当前锁定，避免抖动与十猫扎堆。
export function allocateGroundTargets(nodes, targets, reachable = () => true) {
  const claims = new Map();
  return nodes.map(node => {
    if (node.hp <= 0 || !targets.length) return null;
    const ordered = [...targets].sort((a,b) => (claims.get(a.id)||0)-(claims.get(b.id)||0) ||
      Number(b.id===node.targetId)-Number(a.id===node.targetId) || worldDistance(a,node)-worldDistance(b,node));
    const target = ordered.find(t => reachable(node,t)); if(!target)return null; claims.set(target.id, (claims.get(target.id)||0)+1); return target;
  });
}

// 飞行阵列先保留独立锁定，再补位或集中攻击，不使用地面近战的重新分配规则。
export function allocateFlyingTargets(nodes,pools,focusFire) {
  const used = new Map();
  const focus = focusFire
    ? nodes.map((n, i) => pools[i].find((t) => t.id === n.targetId)).find(Boolean)
    : null;
  const result = nodes.map((node, i) => {
    const pool = pools[i];
    if (!pool.length) return null;
    if (pool[0].type === 'boss') return pool[0];
    if (focusFire) return pool.find((t) => t.id === focus?.id) || pool[0];
    const target = pool.find((t) => t.id === node.targetId);
    if (!target || used.has(target.id)) return null;
    used.set(target.id, 1);
    return target;
  });
  return result.map((target, i) => {
    if (target || !pools[i].length) return target;
    const best = pools[i].reduce((a, b) => ((used.get(b.id) || 0) < (used.get(a.id) || 0) ? b : a));
    used.set(best.id, (used.get(best.id) || 0) + 1);
    return best;
  });
}
