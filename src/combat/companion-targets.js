import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 机械伙伴作为敌人的独立攻击目标，包含手持、车载与守护部署的核心。
import { vehicleCompanionContext } from './vehicle-companions.js';
import { worldDistance } from '../world/coordinates.js';
import { hurtMechanical } from './mechanical.js';
import {livingForest,livingSafePoint} from '../world/living-spaces.js';
// 只返回目前部署的核心；收起的队伍既不攻击也不吸收伤害。
export function mechanicalSources(game, controller='mechanical') {
  const sources=[game,...(game.realm?.defenses||[]).map(t=>t.runtime).filter(Boolean)];
  const mounted=vehicleCompanionContext(game);if(mounted)sources.push(mounted);
  return sources.filter(g=>g.weapon().controller===controller);
}
// 每个敌人更新批次只构造一次伙伴视图，避免按怪物数重复计算装备属性。
export function companionTargets(game) {
  return mechanicalSources(game).flatMap(source=>source.mechanical.nodes
    .filter(n=>n.active&&n.ready).map(node=>({node,source}))).concat(
      mechanicalSources(game,'spider').flatMap(source=>[source.spider.mother,...source.spider.nodes].filter(n=>n.active&&n.ready).map(node=>({node,source}))));
}
// 前摇后锁定同一只猫；目标死亡则本次扑击落空，不能将伤害转移给主角。
export function companionEnemyTarget(game, enemy, nodes = companionTargets(game)) {
  if(enemy.assault?.phase && enemy.assault.phase!=='chase') {
    if(enemy.companionTarget) return nodes.find(t=>t.node===enemy.companionTarget)||{node:enemy.companionTarget,source:null};
    return null;
  }
  const nearest=nodes.filter(t=>t.node.hp>0&&worldDistance(t.node,enemy)<Math.min(GAMEPLAY_VALUES.companions.aggroRange,worldDistance(game.player,enemy)+GAMEPLAY_VALUES.companions.aggroPadding))
    .sort((a,b)=>worldDistance(a.node,enemy)-worldDistance(b.node,enemy))[0];
  enemy.companionTarget=nearest?.node||null;return nearest||null;
}
// 收起的伙伴不再承伤；保留已锁定的空目标，不能把扑击转移给玩家或其他核心。
export function damageCompanion(target, amount) { if(target.source&&livingForest(target.source)&&livingSafePoint(target.node))return false;return !!target.source&&hurtMechanical(target.source,target.node,amount); }
