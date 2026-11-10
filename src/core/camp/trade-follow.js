// 商队使用正式任务寻路绕过山林障碍，逐帧预算搜索，不瞬移或删除被阻挡的拐点。
import {TRADE_FOLLOW as F} from '../../config/trade-escort.js';
import {createQuestRouteSearch} from '../../physics/quest-route.js';
import {moveBody} from '../../physics/motion.js';
import {treeGrid} from '../../world/spatial-grid.js';
import {nearest,worldDistance,WORLD} from '../../world/coordinates.js';

// 允许落后商队在局部范围追上玩家；远离队伍时等待，避免全图搜索。
export function followTradeCart(game,e,motion,dt,target=game.player){
  const distance=worldDistance(e,target);
  if(distance<=F.stop||distance>F.range)return;
  const body={x:e.x,y:e.y,mapId:'forest',livingCollision:true,campProgress:game.progress,navigationRadius:10};
  motion.frame=(motion.frame||0)+1;motion.retry=Math.max(0,(motion.retry||0)-dt);
  if(!motion.path.length&&!motion.search&&!motion.retry){motion.search=createQuestRouteSearch(body,target,treeGrid(game.trees),F.budget);}
  if(motion.search){const result=motion.search.advance(motion.frame);if(!result)return;motion.search=null;if(!result.reachable){motion.retry=F.retry;return;}motion.path=result.points.slice(1);}
  const point=motion.path[0];if(!point)return;
  const goal=nearest(point,e),dx=goal.x-e.x,dy=goal.y-e.y,len=Math.hypot(dx,dy),step=Math.min(len,dt*(F.speed+Math.min(F.catchUp,Math.max(0,distance-70))));
  if(len>0)moveBody(body,dx/len*step,dy/len*step,WORLD,10,game.trees);
  const moved=worldDistance(body,e);e.x=body.x;e.y=body.y;
  motion.stuck=moved<.01?(motion.stuck||0)+dt:0;
  if(worldDistance(e,point)<4)motion.path.shift();
  // 新障碍使实际移动受阻时重新规划，保留货车当前位置与真实碰撞。
  if(motion.stuck>.5){motion.path=[];motion.search=null;motion.retry=.25;motion.stuck=0;}
}
