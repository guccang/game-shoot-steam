// 玩家导航保留完整主路，偏离时只搜索局部接入段；不改变召唤物的跟随寻路。
import {nearest,worldDistance} from '../../world/coordinates.js';
import {createQuestRouteSearch,questLineClear} from '../../physics/quest-route.js';

// 实际镜头使用世界尺寸；离线调用沿用默认视野，避免把屏幕像素当作世界距离。
function viewport(body,view){return view||{x:body.x-320,y:body.y-480,w:640,h:960};}
// 移动重算保留已验证主路，障碍失效仍清空；搜索起点与显示路线起点分别保存。
function startFull(session,body,time,keepRoute=false){
 session.searchOrigin={x:body.x,y:body.y};session.local=null;
 if(!keepRoute){session.origin=session.searchOrigin;session.points=[];session.connector=null;session.display=null;}
 session.search=createQuestRouteSearch(body,session.goal,session.index,session.budget??(worldDistance(body,session.goal)>1200?16000:4096));
 session.searchParking=structuredClone(body.parkingBarriers||[]);session.parkingChanged=false;
 session.searchStarts++;session.started=time;session.settled=false;session.retryAt=0;
}
// 会话只保存一条完整路线与一条短接入路线，不随移动追加历史路径。
export function createVisualRouteSession(body,goal,index,time,prepared=null,{budget}={}){
 // 长途驿站与任务共用加权搜索、主路/接入算法和每帧预算。
 const session={goal:{x:goal.x,y:goal.y},index,budget,searchStarts:0,localSearchStarts:0,parkingBarriers:structuredClone(body.parkingBarriers||[])};startFull(session,body,time);
 // 接单已用相同碰撞验证短边，首帧直接消费结果；不再次运行生成器或增加帧预算。
 if(prepared?.reachable&&prepared.points.length>1){session.search.result=prepared;session.origin=session.searchOrigin={...prepared.points[0]};session.searchStarts=0;}
 return session;
}
// 新障碍只有覆盖有效线段才使路线失效，距离判定沿用正式脚底半径。
function obstructedPaths(paths,added,body){
 return added.some(tree=>paths.some(points=>points.some((b,i)=>{
  if(!i)return false;const a=points[i-1],p=nearest(tree,a),dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<=(tree.radius||0)+(body.navigationRadius??12);
 })));
}
// 玩家沿路前进后，身后停车变化只裁掉经过的旧路段，不使前方路线重新计算。
export function updateVisualRouteIndex(session,index,added,body,time){
 session.index=index;
 const main=translated(session.points,session.origin,body),direct=joinIndex(main,body,index);
 let paths=[main,session.connector?.points||[],session.display?.points||[]];
 if(direct>=0){
  const remaining=[{x:body.x,y:body.y},...main.slice(direct)];
  // 已接回主路就不再依赖旧接入段；先裁掉被身后新障碍覆盖的历史部分，避免回退显示穿车路点。
  if(obstructedPaths(paths,added,body)){session.points=remaining;session.origin={x:body.x,y:body.y};session.connector=null;session.display={points:remaining,origin:session.origin};}
  paths=[remaining];
 }
 const obstructed=obstructedPaths(paths,added,body);
 if(obstructed)startFull(session,body,time);
 // 进行中的搜索需要新的停车快照，但不受影响的显示路线继续保留。
 else if(!session.settled)startFull(session,body,time,true);
 else if(session.local){session.local=null;session.retryAt=0;}
}
// 未完成的搜索先保留进度，完成后用最新停车障碍复核，避免远处访客换车反复重启长途搜索。
function updateParkingBarriers(session,body,time){
 const current=body.parkingBarriers||[],previous=session.parkingBarriers;
 if(JSON.stringify(current)===JSON.stringify(previous))return;
 const added=current.filter(b=>!previous.some(p=>p.x===b.x&&p.y===b.y&&p.width===b.width&&p.height===b.height));
 session.parkingBarriers=structuredClone(current);
 if(!session.settled){
  session.parkingChanged=true;
  // 重算期间仍可能展示旧主路；新车压住旧路时立即隐藏，但不丢弃尚未完成的搜索。
  const paths=[session.points,session.connector?.points||[],session.display?.points||[]];
  if(obstructedPaths(paths,added.map(b=>({...b,radius:Math.hypot(b.width,b.height)/2})),body)){session.points=[];session.connector=session.display=session.local=null;}
  return;
 }
 if(session.search.result?.reachable===false&&!session.points.length){startFull(session,body,time);return;}
 // 矩形外接圆保守覆盖车体，沿用主路/接入段的空间失效检查，绝不漏过车角。
 updateVisualRouteIndex(session,session.index,added.map(b=>({...b,radius:Math.hypot(b.width,b.height)/2})),body,time);
}
// 以最近路点选择整条折线的统一镜像，长途走过半张地图时也不会错误跳回起点镜像。
function translated(points,origin,body){
 let anchor=origin,best=Infinity;
 for(const point of points){const distance=worldDistance(point,body);if(distance<best){anchor=point;best=distance;}}
 const p=nearest(anchor,body),dx=p.x-anchor.x,dy=p.y-anchor.y;return points.map(n=>({x:n.x+dx,y:n.y+dy}));
}
// 接入段已有短边可直连时立即复用，只检测最近点和下一点，避免全路线反复碰撞查询。
function joinIndex(points,body,index){
 let closest=-1,distance=Infinity;
 for(let i=0;i<points.length;i++){const d=Math.hypot(points[i].x-body.x,points[i].y-body.y);if(d<distance){closest=i;distance=d;}}
 for(const i of [closest+1,closest])if(i>=0&&i<points.length&&Math.hypot(points[i].x-body.x,points[i].y-body.y)<=128&&questLineClear(body,points[i],body,index))return i;
 return -1;
}
// 在屏幕内选择玩家附近的接入点；最近点隔墙时由局部 A* 绕行，不直接连穿墙线。
function findAnchor(points,body,view){
 let nearestIndex=0,nearestDistance=Infinity,visibleIndex=-1,visibleDistance=Infinity;
 for(let i=0;i<points.length;i++){
  const p=points[i],d=Math.hypot(p.x-body.x,p.y-body.y);
  if(d<nearestDistance){nearestDistance=d;nearestIndex=i;}
  if(p.x>=view.x&&p.x<=view.x+view.w&&p.y>=view.y&&p.y<=view.y+view.h&&d<visibleDistance){visibleDistance=d;visibleIndex=i;}
 }
 return {index:visibleIndex<0?nearestIndex:visibleIndex,distance:nearestDistance};
}
// 同帧调用不重复搜索；完整路线和接入段共享每帧搜索预算。
export function advanceVisualRouteSession(session,body,time,view){
 updateParkingBarriers(session,body,time);
 if(view)session.view=view;const screen=viewport(body,view||session.view),span=Math.max(screen.w,screen.h);
 let full=session.search.advance(time,{milliseconds:1.5,steps:256});
 if(full&&!session.settled&&session.parkingChanged){
  const added=session.parkingBarriers.filter(b=>!session.searchParking.some(p=>p.x===b.x&&p.y===b.y&&p.width===b.width&&p.height===b.height));
  // 只发布仍安全的完整路线；新车覆盖路线或旧车移走使失败结果过时时才重新规划。
  if(!full.reachable||obstructedPaths([full.points],added.map(b=>({...b,radius:Math.hypot(b.width,b.height)/2})),body)){startFull(session,body,time,true);full=null;}
  else session.parkingChanged=false;
 }
 if(full&&!session.settled){
  // 只有成功的新路线才替换已有路点；重算失败保留旧路段，不能伪造当前位置的连接。
  if(full.reachable||!session.points.length){session.points=full.points;session.origin=session.searchOrigin;session.connector=null;}
  session.settled=true;session.started=time;
 }
 let points=translated(session.points,session.origin,body),connected=[],joining=false;
 if(points.length){
  const anchor=findAnchor(points,body,screen),direct=joinIndex(points,body,session.index);
  if(session.settled&&anchor.distance>span&&time-session.started>.5){startFull(session,body,time,true);}
  else if(direct>=0){connected=[{x:body.x,y:body.y},...points.slice(direct)];session.local=null;session.connector=null;}
  else{
   // 已完成的接入段也可续接，不因玩家每移动一小步就重算。
   if(session.connector){
    const part=translated(session.connector.points,session.connector.origin,body),next=joinIndex(part,body,session.index);
    if(next>=0)connected=[{x:body.x,y:body.y},...part.slice(next),...points.slice(session.connector.anchor+1)];
   }
   if(!connected.length&&session.settled){
    joining=true;
    if(!session.local&&time>=session.retryAt){
     const target=points[anchor.index],padding=96;
     const bounds={left:Math.min(body.x,target.x)-padding,right:Math.max(body.x,target.x)+padding,top:Math.min(body.y,target.y)-padding,bottom:Math.max(body.y,target.y)+padding};
     session.local={origin:{x:body.x,y:body.y},anchor:anchor.index,search:createQuestRouteSearch(body,target,session.index,2048,{bounds})};session.localSearchStarts++;
    }
    const local=session.local;
    // 主搜索完成的当帧不再叠加第二份预算。
    const result=local&&session.search.lastFrame!==time?local.search.advance(time):null;
    if(result){
     if(result.reachable){session.connector={points:result.points,origin:local.origin,anchor:local.anchor};const part=translated(result.points,local.origin,body),next=joinIndex(part,body,session.index);if(next>=0){connected=[{x:body.x,y:body.y},...part.slice(next),...points.slice(local.anchor+1)];joining=false;}}
     session.local=null;session.retryAt=time+(result.reachable?0:1);
     // 局部范围确实不可通行才升级全程规划，且失败时不每帧重试。
     if(!result.reachable&&time-session.started>=3)startFull(session,body,time,true);
    }
   }
  }
 }else if(full&&!full.reachable&&time-session.started>=3)startFull(session,body,time);
 // 主路仍保留给回走与重新接入使用；显示缓存只记录最近一次从玩家出发的剩余路线。
 // 搜索空档不能退回整条主路，否则已经走过的路点会闪回；有效接入段也随此快照保留。
 if(connected.length>1)session.display={points:connected,origin:{x:body.x,y:body.y}};
 const remaining=connected.length>1?connected:session.display?translated(session.display.points,session.display.origin,body):points;
 return {points:connected,routePoints:remaining,joining,reachable:connected.length>1,planning:!session.settled||joining,visited:full?.visited||0,searchStarts:session.searchStarts,localSearchStarts:session.localSearchStarts};
}
