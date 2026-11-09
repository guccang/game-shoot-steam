// 种地召牛在田边寻找可通行的入场路线；屏幕内已有耕牛从原位置起步。
import {PASTURE,PEN_GATE,PEN_OX,oxFoot,oxSiteFromFoot} from '../../config/pasture.js';
import {createQuestRouteSearch,questLineClear} from '../../physics/quest-route.js';
import {FARM_GARDEN} from '../../config/farm.js';
import {nearest,worldDistance,canonical} from '../../world/coordinates.js';
import {blocked} from '../../physics/motion.js';

// 沿路径检测牛蹄占地，避免跨过窄围栏、树干或水岸。
function clearSegment(game,a,b){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));
 for(let i=1;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,26,game.trees||[],game.player))return false;
 return true;
}
// 从玩家身旁向外搜索；反向读取父节点得到从屏外到田边的折线。
function arrivalPath(game,view,from=null){
 const p=nearest(game.player,{x:view.x+view.w/2,y:view.y+view.h/2});
 const site=game.progress.farm.oxSite,here=from?nearest(from,p):site?.mapId===game.mapId?nearest(oxFoot(site),p):null;
 const outside=q=>q.x<view.x-115||q.x>view.x+view.w+115||q.y<view.y-100||q.y>view.y+view.h+110;
 const visible=!!here&&(!!from||!outside(here)),queue=[],seen=new Set();
 // 优先走到身旁的直路，开阔田野无需展开整片寻路网格。
 const edges=[{x:view.x-116,y:p.y},{x:view.x+view.w+116,y:p.y},{x:p.x,y:view.y-101},{x:p.x,y:view.y+view.h+111}];
 const starts=visible?[here]:edges.sort((a,b)=>worldDistance(a,p)-worldDistance(b,p));
 for(const start of starts){
  const dx=start.x-p.x,dy=start.y-p.y,d=Math.hypot(dx,dy);
  if(d<=52)return [start];
  const stop={x:p.x+48*dx/d,y:p.y+48*dy/d};
  if(clearSegment(game,start,start)&&clearSegment(game,start,stop))return [start,stop];
 }
 for(const [x,y] of [[48,0],[-48,0],[0,-48],[0,48]]){const q={x:p.x+x,y:p.y+y,parent:null};if(clearSegment(game,p,q)){queue.push(q);seen.add(x+','+y);}}
 for(let i=0;i<queue.length&&i<3500;i++){
  const q=queue[i];
  if(visible?worldDistance(q,here)<52&&clearSegment(game,q,here):outside(q)){
   const path=visible?[here]:[];for(let s=q;s;s=s.parent)path.push({x:s.x,y:s.y});return path;
  }
  for(const [dx,dy] of [[32,0],[-32,0],[0,32],[0,-32]]){
   const next={x:q.x+dx,y:q.y+dy,parent:q},key=Math.round(next.x-p.x)+','+Math.round(next.y-p.y);
   if(seen.has(key)||!clearSegment(game,q,next))continue;seen.add(key);queue.push(next);
  }
 }
 return null;
}
// 发出一次召唤，保留耕牛身份，不生成第二只动物。
export function summonOx(game,view){
 const f=game.progress.farm;
 if(!f.oxPlow)return {ok:false,message:'可以到营地牧栏门口领养耕牛，也可以用甜穗草驯服野牛。'};
 if(f.oxReturn)return {ok:false,message:'耕牛正在走回牧栏，进栏后就可以召它了。'};
 if(game.oxArrival)return {ok:false,message:'耕牛正在赶来。'};
 if(!view||game.state!=='playing'||game.cottage||game.realm||game.story||game.vehicle.active||game.farmWork?.tool==='ox')return {ok:false,message:'请在自由巡游时下车，结束当前作业后再召牛。'};
 if(!(game.mapId===FARM_GARDEN.mapId&&worldDistance(game.player,FARM_GARDEN)<=FARM_GARDEN.radius)&&!f.plots.some(p=>!p.wild&&p.mapId===game.mapId&&worldDistance(p,game.player)<=PASTURE.callRange))return {ok:false,message:'走到营地农田或自家田块旁再召牛。'};
 if(f.oxSite?.mapId===game.mapId&&worldDistance(oxFoot(f.oxSite),game.player)<=52){f.oxIdleSeconds=0;game.oxIdleRetry=0;return {ok:true,message:'耕牛就在身旁，点牛身就能牵它犁地。'};}
 const path=arrivalPath(game,view);if(!path)return {ok:false,message:'牛过不来，换到开阔的田埂再试。'};
 const first=path.shift();f.oxIdleSeconds=0;game.oxIdleRetry=0;game.oxArrival={point:first,path,mapId:game.mapId,player:game.player,phase:0};
 return {ok:true,message:'耕牛正在赶来，在田边等一等。'};
}
// 只累计森林自由巡游中的弃用时间；暂停、异地图和召唤不把牛突然送回牧栏。
function updateOxIdle(game,dt){
 const farm=game.progress.farm;
 if(!farm.oxPlow||!farm.oxSite||farm.oxReturn)return;
 if(game.farmWork?.tool==='ox'||game.oxArrival){farm.oxIdleSeconds=0;game.oxIdleRetry=0;return;}
 if(game.mapId!=='forest'||farm.oxSite.mapId!=='forest'||game.cottage||game.realm||game.story||game.campDefense||game.workshopTrial||game.fireActive||game.arrivalCinematic||game.livingPreview)return;
 const foot=nearest(oxFoot(farm.oxSite),PASTURE);
 if(Math.abs(foot.x-PASTURE.x)<=PASTURE.halfWidth-26&&Math.abs(foot.y-PASTURE.y)<=PASTURE.halfHeight-26){farm.oxIdleSeconds=0;return;}
 farm.oxIdleSeconds=Math.min(PASTURE.idleReturnSeconds,(farm.oxIdleSeconds||0)+dt);
 game.oxIdleRetry=Math.max(0,(game.oxIdleRetry||0)-dt);
 if(farm.oxIdleSeconds+1e-9<PASTURE.idleReturnSeconds||game.oxIdleRetry)return;
 // 阶段写入失败时留在原地，稍后重试；不扣费、不产生第二头牛。
 farm.oxReturn='gate';let saved=true;try{saved=game.livingPersist?.(game.progress)!==false;}catch{saved=false;}
 if(!saved){farm.oxReturn=null;game.oxIdleRetry=2;return;}
 const event={action:'pasture',message:'耕牛闲下来一会儿，自己往牛栏走了。'};
 (game.farmSignals??=[]).push(event);game.onEvent?.('farm-change',event);
}
// 回栏分两段寻路，牛先从野外走到北门，再进入牧栏。读档只需牛蹄位置和目的地。
function preparePenReturn(game,dt){
 const farm=game.progress.farm;
 let trip=game.oxArrival;
 if(!trip?.returning||trip.player!==game.player){
  const point=oxFoot(farm.oxSite);
  trip=game.oxArrival={returning:true,point,path:[],player:game.player,mapId:'forest',phase:0,
   body:{mapId:'forest',campProgress:game.progress,livingCollision:true,navigationRadius:26},frame:0,retry:0,yaw:farm.oxSite.yaw??0};
 }
 trip.body.campProgress=game.progress;
 if(trip.path.length)return true;
 trip.moving=false;
 trip.retry=Math.max(0,trip.retry-dt);
 if(trip.retry)return false;
 const goal=farm.oxReturn==='gate'?PEN_GATE:oxFoot(PEN_OX);
 trip.search??=createQuestRouteSearch({...trip.body,...trip.point},goal,game.trees);
 const route=trip.search.advance(++trip.frame);
 if(!route)return false;
 trip.search=null;
 if(!route.reachable){trip.retry=2;return false;}
 trip.path=route.points.slice(1);
 return true;
}
// 召牛与回栏都按真实游玩时钟推进蹄步，逐段检查新出现的障碍。
export function updateOxArrival(game,dt){
 if(dt<=0||game.state!=='playing')return;
 updateOxIdle(game,dt);
 const farm=game.progress.farm;
 if(farm.oxReturn){
  if(game.mapId!=='forest'||game.cottage||game.realm||game.story||game.campDefense||game.workshopTrial||game.fireActive||game.arrivalCinematic||game.livingPreview){game.oxArrival=null;return;}
  if(!preparePenReturn(game,dt))return;
 }else if(game.oxArrival?.returning){game.oxArrival=null;return;}
 const trip=game.oxArrival;if(!trip)return;
 if(game.player!==trip.player||game.mapId!==trip.mapId||game.cottage||game.realm||!game.progress.farm.oxPlow){game.oxArrival=null;return;}
 const next=trip.path[0],current=trip.point,dx=next?next.x-current.x:0,dy=next?next.y-current.y:0,d=Math.hypot(dx,dy),step=Math.min(d,dt*PASTURE.walkSpeed);
 const point=d?{x:current.x+dx/d*step,y:current.y+dy/d*step}:current;
 trip.moving=false;
 if(trip.returning&&!questLineClear(current,point,trip.body,game.trees)){trip.path=[];trip.retry=.5;return;}
 if(!trip.returning&&!clearSegment(game,current,point)){trip.path=[];trip.blocked=true;}
 else {trip.moving=step>0;trip.point=point;trip.phase+=step*.12;if(step>=d)trip.path.shift();}
 const prev=game.progress.farm.oxSite,angle=trip.yaw??(prev?.facing===-1?Math.PI:0);
 const wanted=d&&trip.path.length?Math.atan2(dy/.67,dx):(Math.cos(angle)>=0?0:Math.PI),delta=Math.atan2(Math.sin(wanted-angle),Math.cos(wanted-angle));
 const yaw=trip.yaw=angle+Math.sign(delta)*Math.min(Math.abs(delta),dt*3.5),facing=Math.cos(yaw)<0?-1:1;
 game.progress.farm.oxSite={...canonical(oxSiteFromFoot(trip.point,yaw)),yaw,facing,mapId:trip.mapId};
 if(trip.returning){
  if(trip.path.length)return;
  if(farm.oxReturn==='gate'){farm.oxReturn='pen';return;}
  farm.oxReturn=null;farm.oxIdleSeconds=0;farm.oxSite={...PEN_OX};game.oxArrival=null;
  game.livingPersist?.(game.progress);
  const event={action:'pasture',message:'耕牛走进牧栏了，可以去牵它犁地了。'};
  (game.farmSignals??=[]).push(event);game.onEvent?.('farm-change',event);return;
 }
 if(trip.path.length||Math.abs(delta)>=.02)return;
 // 玩家在田间走动时，从牛当前的蹄底续走到新站位。
 const distance=worldDistance(game.player,trip.point);
 if(!trip.blocked&&distance>68&&distance<=PASTURE.callRange&&game.parkingView){
  const nextPath=arrivalPath(game,game.parkingView,trip.point);
  if(nextPath?.length>1){trip.path=nextPath.slice(1);return;}
  trip.blocked=true;
 }
 game.oxArrival=null;game.livingPersist?.(game.progress);
 const event={action:'pasture',message:trip.blocked?'前面过不去，耕牛停在路边了。':distance>68?'耕牛已到田边，会在原地等你。':'耕牛到了，点牛身就能牵它犁地。'};
 (game.farmSignals??=[]).push(event);game.onEvent?.('farm-change',event);
}
