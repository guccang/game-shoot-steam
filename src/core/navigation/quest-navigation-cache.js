// 蜘蛛召唤物的跟随路线缓存；玩家任务与驿站使用 visual-route-cache 的主路和局部接入策略。
import {nearest,worldDistance} from '../../world/coordinates.js';
import {createQuestRouteSearch,questLineClear} from '../../physics/quest-route.js';

// 距离远时提高总节点上限，不提高每帧工作量；旧路径与其状态一起释放。
function startSearch(session,body,time){
 session.start={x:body.x,y:body.y};session.time=time;session.checked=null;session.points=[];
 session.search=createQuestRouteSearch(body,session.goal,session.index,worldDistance(body,session.goal)>1200?16000:4096);
 session.searchStarts++;session.settled=false;
}

// 一个目标对应一个会话，树索引由上层按地图复用，目标或通行能力改变时重新创建。
export function createRouteSession(body,goal,index,time){
 const session={goal:{x:goal.x,y:goal.y},index,searchStarts:0};startSearch(session,body,time);return session;
}

// 复用已经验证的路径；仅离开路线、局部受阻或失败重试时重新规划。
export function advanceRouteSession(session,body,time){
 const result=session.search.advance(time);
 if(result&&!session.settled){session.points=result.points;session.settled=true;session.time=time;}
 const anchor=nearest(session.start,body),dx=anchor.x-session.start.x,dy=anchor.y-session.start.y;
 if(result&&(!session.checked||worldDistance(body,session.checked)>=12||time-session.checkTime>=.25)){
  const points=session.points;
  let closest=-1,best=Infinity;
  // 仅做廉价距离比较，碰撞扫掠只针对最近点和它的下一点，每条最多128单位。
  for(let i=0;i<points.length;i++){
   const distance=Math.hypot(points[i].x+dx-body.x,points[i].y+dy-body.y);
   if(distance<best){best=distance;closest=i;}
  }
  session.next=-1;
  for(const i of [closest+1,closest]){
   if(i<0||i>=points.length)continue;
   const point={x:points[i].x+dx,y:points[i].y+dy};
   if(Math.hypot(point.x-body.x,point.y-body.y)<=128&&questLineClear(body,point,body,session.index)){session.next=i;break;}
  }
  session.checked={x:body.x,y:body.y};session.checkTime=time;
 }
 const next=session.next??-1;
 // 同位置不可达最多每三秒重试一次；走偏后先隐藏，避免画出穿墙连接。
 if(result&&next<0&&time-session.time>=(result.reachable?.5:3)){
  startSearch(session,body,time);session.next=-1;
  return {points:[],reachable:false,planning:true,visited:result.visited,searchStarts:session.searchStarts};
 }
 const points=result&&next>=0?[{x:body.x,y:body.y},...session.points.slice(next).map(p=>({x:p.x+dx,y:p.y+dy}))]:[];
 return {points,reachable:points.length>1,planning:!result,visited:result?.visited||0,searchStarts:session.searchStarts};
}
