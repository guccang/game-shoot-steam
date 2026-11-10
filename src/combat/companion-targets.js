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
  const escort=livingForest(game)&&!game.cottage?game.progress.trade?.escort:null;
  return (escort&&escort.hp>0?[{node:escort,source:game,trade:true}]:[]).concat(mechanicalSources(game).flatMap(source=>source.mechanical.nodes
    .filter(n=>n.active&&n.ready).map(node=>({node,source}))).concat(
      mechanicalSources(game,'spider').flatMap(source=>[source.spider.mother,...source.spider.nodes].filter(n=>n.active&&n.ready).map(node=>({node,source})))));
}
// 追击时选择更近的存活单位；前摇后锁定同一目标；目标死亡则本次扑击落空，不能将伤害转移给主角。
export function companionEnemyTarget(game, enemy, nodes = companionTargets(game)) {
  if(enemy.assault?.phase && enemy.assault.phase!=='chase') {
    if(enemy.companionTarget) return nodes.find(t=>t.node===enemy.companionTarget)||{node:enemy.companionTarget,source:null};
    return null;
  }
  const nearest=nodes.filter(t=>t.node.hp>0&&worldDistance(t.node,enemy)<worldDistance(game.player,enemy))
    .sort((a,b)=>worldDistance(a.node,enemy)-worldDistance(b.node,enemy))[0];
  enemy.companionTarget=nearest?.node||null;return nearest||null;
}
// 收起的伙伴不再承伤；保留已锁定的空目标，不能把扑击转移给玩家或其他核心。
export function damageCompanion(target, amount) { if(target.source&&livingForest(target.source)&&livingSafePoint(target.node))return false;if(target.trade){if(target.source?.progress.trade?.escort!==target.node||target.node.hp<=0||amount<=0)return false;target.node.hp=Math.max(0,target.node.hp-amount);return true;}return !!target.source&&hurtMechanical(target.source,target.node,amount); }
