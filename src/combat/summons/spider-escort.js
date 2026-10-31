// 蜘蛛归队使用连续减速，母体周围的预留空间与实际分离圈一致。
import { nearest } from '../../world/coordinates.js';

export const SPIDER_MOTHER_CLEARANCE=64;
export const SPIDER_ARRIVAL={arrival:6,stopDistance:.5,turnSpeed:7};

// 将归队落脚点投到母体排斥圈之外，避免每帧先走回旧点再被推出。
export function spiderEscortHome(state,node,home) {
  const mother=state.mother;
  if(!mother?.ready||mother.hp<=0)return home;
  const center=nearest(mother,home),dx=home.x-center.x,dy=home.y-center.y,d=Math.hypot(dx,dy),radius=SPIDER_MOTHER_CLEARANCE+16;
  if(d>=radius)return home;
  const angle=d>.1?Math.atan2(dy,dx):node.index*2.39996;
  return {x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};
}
