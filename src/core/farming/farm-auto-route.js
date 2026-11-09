// 高级农具走近目标时使用正式分帧寻路，有限等待，不越过地形或停车实体。
import {createQuestRouteSearch} from '../../physics/quest-route.js';
import {playerNavigationBody} from '../navigation/prepared-navigation.js';
import {nearest,worldDistance} from '../../world/coordinates.js';
import {FARM_AUTO} from '../../config/farm-tools.js';

// 路线状态只属于当前动作；每格完成或玩家接管后由调用方丢弃。
export function farmAutoStep(game,owner,goal,dt,speed,radius=12){
 const p=game.player,d=worldDistance(p,goal);
 if(d<=FARM_AUTO.arrival){owner.route=null;return {arrived:true,input:{x:0,y:0}};}
 const route=owner.route??={search:createQuestRouteSearch({...playerNavigationBody(game),navigationRadius:radius},goal,game.trees||[]),frame:0,index:1,elapsed:0,still:0,last:{x:p.x,y:p.y}};
 route.elapsed+=dt;route.still=worldDistance(p,route.last)<.03?route.still+dt:0;route.last={x:p.x,y:p.y};
 if(route.elapsed>FARM_AUTO.travelLimit||route.still>FARM_AUTO.blockedWait)return {failed:true,input:{x:0,y:0}};
 if(!route.points){const result=route.search.advance(++route.frame);if(!result)return {input:{x:0,y:0}};if(!result.reachable)return {failed:true,input:{x:0,y:0}};route.points=result.points;}
 while(route.index<route.points.length-1&&worldDistance(p,route.points[route.index])<8)route.index++;
 const point=nearest(route.points[route.index]||goal,p),dx=point.x-p.x,dy=point.y-p.y,length=Math.hypot(dx,dy),scale=speed/Math.max(length,14);
 return {input:{x:dx*scale,y:dy*scale}};
}
