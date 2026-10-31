import { GAMEPLAY_VALUES } from '../../config/gameplay-values.js';
// 丢失目标后的观察与落队追赶；只驱动运行态，不修改属性或供给。
import { nearest,worldDistance } from '../../world/coordinates.js';
import { summonTargetVisible } from './perception.js';
import { SUMMON_RECOVERY as RECOVERY } from '../../config/summon-behavior.js';

// 查询旧目标时短路查找，观察期间不为每只伙伴复制整场对象数组。
function previousTarget(game,id) {
  return game.enemies.find(t=>t.id===id)||(game.boss?.id===id?game.boss:null)||game.trees.find(t=>t.id===id);
}

// 仅存活目标因出屏丢失才观察；死亡、收起、补给及迫切归队不能留下幽灵锁定。
export function observeLostTarget(game,node,target,dt,{position=node,urgent=false,disabled=false}={}) {
  if(target||urgent||disabled){delete node.observation;delete node.returnEase;return false;}
  if(!node.observation&&node.targetId!=null) {
    const old=previousTarget(game,node.targetId);
    if(old?.hp>0&&!summonTargetVisible(game,old)) {
      const point=nearest(position,game.player),duration=RECOVERY.observeSeconds+(node.index%3)*RECOVERY.observeStagger;
      node.observation={targetId:old.id,x:point.x,y:point.y,angle:node.angle||0,remaining:duration,duration};
    }
  }
  const observing=node.observation;
  if(!observing)return false;
  const alive=previousTarget(game,observing.targetId)?.hp>0;
  if(!alive){delete node.observation;node.returnEase=RECOVERY.returnEase;return false;}
  observing.remaining=Math.max(0,observing.remaining-dt);
  if(!observing.remaining){delete node.observation;node.returnEase=RECOVERY.returnEase;return false;}
  return true;
}

// 前后距离滞回保证落队时先赶路；高速主人离开时不再被旧敌牵住。
export function groundEscort(game,node,weapon,motion) {
  const radius=weapon.guardRadius?(weapon.guardRadius+(node.index>=10?GAMEPLAY_VALUES.companions.outerRingPadding:0)):node.mother?GAMEPLAY_VALUES.companions.motherFollowRadius:game.vehicle?.active?GAMEPLAY_VALUES.companions.mountedFollowRadius:GAMEPLAY_VALUES.companions.followRadius;
  const distance=worldDistance(node,game.player);
  if((distance>radius+RECOVERY.catchupExtra&&motion.speed>RECOVERY.fastSpeed)||distance>radius+GAMEPLAY_VALUES.companions.forceCatchupDistance)node.catchingUp=true;
  else if(node.catchingUp&&distance<radius+RECOVERY.settleExtra)delete node.catchingUp;
  const speed=Math.min(RECOVERY.maxGroundSpeed,Math.max(weapon.moveSpeed*GAMEPLAY_VALUES.mechanical.followSpeedRatio,
    motion.speed*GAMEPLAY_VALUES.companions.ownerSpeedRatio+Math.max(0,distance-radius)*GAMEPLAY_VALUES.companions.catchupDistanceFactor));
  return {urgent:!!node.catchingUp,speed};
}

// 飞行体的位置相对玩家保存，观察锚点必须转换为上一帧的真实世界位置。
export function flyingObservation(game,state,node,target,dt,disabled) {
  const prior=state.previousPlayer?nearest(state.previousPlayer,game.player):game.player;
  const position={x:prior.x+node.x,y:prior.y+node.y};
  const speed=dt>0?worldDistance(prior,game.player)/dt:0;
  const urgent=worldDistance(position,game.player)>GAMEPLAY_VALUES.companions.flyingUrgentDistance||speed>RECOVERY.fastSpeed&&Math.hypot(node.x,node.y)>GAMEPLAY_VALUES.companions.flyingFastDistance;
  return observeLostTarget(game,node,target,dt,{position,urgent,disabled});
}
