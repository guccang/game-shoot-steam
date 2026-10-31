// 近战伙伴按正式碰撞确认攻击落点；有界分帧寻路不把水岸和战斗圈当作可穿越区域。
import {nearest,worldDistance} from '../../world/coordinates.js';
import {blocked} from '../../physics/motion.js';
import {SpatialGrid} from '../../world/spatial-grid.js';
import {createQuestRouteSearch,questLineClear} from '../../physics/quest-route.js';
import {hitCenter,traceTargets} from '../collision.js';
const scenes=new WeakMap(),routes=new WeakMap();
// 蓄力、命中和攻击落点共用同一阻挡检查，树干挡刀时必须换位置，不能原地反复空挥。
export function summonMeleeLineClear(game,node,target){
 const t=nearest(target,node),body={...node,worldBarriers:game.player.worldBarriers};
 const steps=Math.max(1,Math.ceil(worldDistance(node,target)/8));
 for(let i=0;i<=steps;i++)if(blocked(node.x+(t.x-node.x)*i/steps,node.y+(t.y-node.y)*i/steps,0,[],body))return false;
 const start=hitCenter(node),end=nearest(hitCenter(target),node);
 // 只查询挥击短线附近的树，避免每只猫的多个候选点都遍历整片森林。
 const trees=scene(game).grid.query(Math.min(start.x,end.x),Math.min(start.y,end.y),Math.max(start.x,end.x),Math.max(start.y,end.y),9);
 return traceTargets(start,end,[...trees,target],1)[0]?.target===target;
}
// 每帧共享树木索引和搜索预算，最多使用两毫秒，不为每个伙伴重建整片森林。
function scene(game){
 let s=scenes.get(game);
 if(!s||s.time!==game.time||s.trees!==game.trees){s={time:game.time,trees:game.trees,grid:new SpatialGrid(game.trees),spent:0};scenes.set(game,s);}
 return s;
}
// 攻击点放在目标近侧；路径尚未确认时先归队，确认不可达的目标短暂缓存后再试。
export function summonGroundReachable(game,node,target,reach){
 const s=scene(game),t=nearest(target,node),d=worldDistance(node,target),stand=(target.radius||12)+reach*.7;
 // 寻路使用伙伴自己的脚底半径，避免已经能站稳的小猫被玩家12单位半径判成卡在墙里。
 const body={...node,navigationRadius:node.radius||9,worldBarriers:game.player.worldBarriers};
 let goal;
 if(d<=stand&&summonMeleeLineClear(game,node,target))goal={x:node.x,y:node.y};
 else{
  // 近侧被树或护栏挡住时尝试目标两侧，优先采用无需绕行且能够命中的落点。
  const angle=Math.atan2(node.y-t.y,node.x-t.x),candidates=[];
  for(const turn of [0,1,-1,2,-2,3,-3,4]){
   const a=angle+turn*Math.PI/4,p={x:t.x+Math.cos(a)*stand,y:t.y+Math.sin(a)*stand};
   if(!blocked(p.x,p.y,body.navigationRadius,s.grid,body)&&summonMeleeLineClear(game,{...body,...p},target)){
    candidates.push(p);if(questLineClear(node,p,body,s.grid)){goal=p;break;}
   }
  }
  goal||=candidates[0];
 }
 if(!goal)return false;
 let cache=routes.get(node);if(!cache){cache=new Map();routes.set(node,cache);}
 let r=cache.get(target);
 if(!r||r.arena!==node.arena||r.barriers!==body.worldBarriers||r.trees!==game.trees||worldDistance(r.origin,node)>48||worldDistance(r.target,target)>24||r.result&&game.time-r.time>1){
  if(cache.size>64)cache.clear();
  r={arena:node.arena,barriers:body.worldBarriers,trees:game.trees,origin:{x:node.x,y:node.y},target:{x:target.x,y:target.y},time:game.time,cursor:1,search:null,result:null};cache.set(target,r);
  if(questLineClear(node,goal,body,s.grid))r.result={reachable:true,points:[{x:node.x,y:node.y},goal]};
  else r.search=createQuestRouteSearch(body,goal,s.grid,256);
 }
 if(!r.result&&s.spent<2){const start=performance.now();r.result=r.search.advance(game.time,{milliseconds:Math.min(.15,2-s.spent),steps:128});s.spent+=performance.now()-start;}
 return !!r.result?.reachable;
}
// 追击沿已验证的折线走，避免选敌可达却在执行时又抄近路穿过圈外。
export function summonGroundWaypoint(node,target,fallback){
 const r=routes.get(node)?.get(target);if(!r?.result?.reachable)return fallback;
 while(r.cursor<r.result.points.length-1&&worldDistance(r.result.points[r.cursor],node)<=4)r.cursor++;
 // 最后也走向已验证的攻击点，不重新切回可能被树挡住的环形编队落点。
 return r.result.points[r.cursor];
}
