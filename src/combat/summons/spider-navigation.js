// 母巢按真实体积绕过树木、营地护栏和维修封锁；路线缓存不进入存档。
import {nearest,worldDistance} from '../../world/coordinates.js';
import {SpatialGrid} from '../../world/spatial-grid.js';
import {questLineClear} from '../../physics/quest-route.js';
import {createRouteSession,advanceRouteSession} from '../../core/navigation/quest-navigation-cache.js';
const paths=new WeakMap();
// 玩家能贴近围栏的空隙未必容得下母体；在玩家同侧选择可站立的近邻落点。
function followAnchor(owner,body,index){
 if(questLineClear(owner,owner,body,index))return owner;
 for(let radius=12;radius<=96;radius+=12)for(let i=0;i<8;i++){
  const point={x:owner.x+Math.cos(i*Math.PI/4)*radius,y:owner.y+Math.sin(i*Math.PI/4)*radius};
  if(questLineClear(point,point,body,index)&&questLineClear(owner,point,{...body,navigationRadius:0},index))return point;
 }
 return null;
}
// 跟随位置必须与主人同侧；固定后侧偏移穿过栏杆时临时收拢到主人附近。
export function spiderFollowWaypoint(game,node,destination){
 const body={...node,navigationRadius:node.radius||24},owner=nearest(game.player,node);
 let cache=paths.get(node);
 if(!cache||cache.trees!==game.trees||cache.count!==game.trees.length||cache.mapId!==node.mapId||cache.arena!==node.arena||cache.barriers!==node.worldBarriers||cache.radius!==body.navigationRadius){
  cache={trees:game.trees,count:game.trees.length,mapId:node.mapId,arena:node.arena,barriers:node.worldBarriers,radius:body.navigationRadius,index:new SpatialGrid(game.trees),session:null};paths.set(node,cache);
 }
 const goal=questLineClear(owner,nearest(destination,owner),{...body,navigationRadius:0},cache.index)?nearest(destination,node):followAnchor(owner,body,cache.index);
 if(!goal)return {x:node.x,y:node.y};
 // 开阔地直接跟随，不把自然走停与转向交给异步规划。
 if(questLineClear(node,goal,body,cache.index)){cache.session=null;return goal;}
 const time=node.clock||0;
 // 规划中保留已搜索工作；主人明显换向才重算，避免边走边搜永远无法完成。
 if(!cache.session||worldDistance(cache.session.goal,goal)>(cache.session.settled?64:256))cache.session=createRouteSession(body,goal,cache.index,time);
 const result=advanceRouteSession(cache.session,body,time);
 return result.reachable?{...result.points[1],transit:true}:{x:node.x,y:node.y};
}
