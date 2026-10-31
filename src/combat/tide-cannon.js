// 潮汐炮分组双发：第二喷口由正式战斗时钟驱动，不使用异步回调或额外扣弹。
import { fireBallistics } from './ballistics.js';
import { TIDE_DELAY,tideKick,validateTideState } from '../config/tide-cannon.js';

// 喷口位置与正式绘制相同，移动和转向期间仍从当前车上发射。
function fireNozzle(game,state,shot,muzzle,direction) {
  const side=shot.side===0?-1:1,kick=tideKick(state.ages[shot.side],game.reducedMotion)*.75;
  const tip={x:muzzle.x-direction.x*kick-direction.y*side*5.25,y:muzzle.y-direction.y*kick+direction.x*side*5.25};
  fireBallistics(game,{...shot.weapon,id:'water',pellets:1,effectKind:'hover-tide'},tip,direction,shot.amount,shot.critical,true);
  state.ages[shot.side]=0;
  game.onEvent('weapon-sound',{kind:'hover-tide'});
  game.fx.add('tide-muzzle',tip.x,tip.y,.16,{angle:Math.atan2(direction.y,direction.x),size:14,color:'#d8fff2'});
}

// 每组先发一侧并快照另一侧，下一组交换先手喷口，总伤害和耗弹保持。
export function fireTidePair(game,weapon,muzzle,direction,amount,critical,magazine) {
  const state=magazine.tide ||= {next:0,ages:[1,1],pending:null},side=state.next;
  const pending=validateTideState({next:1-side,ages:state.ages,pending:{delay:TIDE_DELAY,side:1-side,amount,critical,weapon}}).pending;
  fireNozzle(game,state,{...pending,side},muzzle,direction);state.next=1-side;state.pending=pending;
}

// 即使末发触发装填或目标已死亡，已支付的另一发仍释放；下车、换模块和暂停由调用方冻结。
export function advanceTidePair(game,magazine,dt,muzzle,direction) {
  const state=magazine.tide;if(!state||dt<=0)return;
  state.ages=state.ages.map(age=>Math.min(1,age+dt));
  if(!state.pending)return;
  state.pending.delay=Math.max(0,state.pending.delay-dt);
  if(state.pending.delay>1e-8)return;
  const shot=state.pending;state.pending=null;fireNozzle(game,state,shot,muzzle,direction);
}
