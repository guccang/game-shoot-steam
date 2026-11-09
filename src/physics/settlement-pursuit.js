import {visibilityRoute} from './visibility-route.js';
// 野外追兵将聚落视为不可穿越的区域，沿外侧角点绕行，并修正栏杆内的重叠落点。
import {SETTLEMENTS} from '../config/settlements.js';
import {ARMORED} from '../config/armored-enemies.js';
import {RANGED_ENEMIES} from '../config/ranged-enemies.js';
import {nearest,worldDistance} from '../world/coordinates.js';
import {settlementAt,settlementBlocked} from '../world/settlements.js';
import {terrainLineClear} from './terrain-navigation.js';
import {blocked} from './motion.js';

const routes=new WeakMap();
// 章节和独立竞技场有自己的边界；普通森林敌人始终绕开生活安全区。
function applies(body){return body.mapId==='forest'&&!body.story&&!body.arena&&['enemy','boss'].includes(body.type);}
// 使用距离当前实体最近的聚落镜像，跨世界边缘仍共用同一围栏。
function rectangles(body,pad){return SETTLEMENTS.map(s=>{const center={x:(s.left+s.right)/2,y:(s.top+s.bottom)/2},p=nearest(center,body),dx=p.x-center.x,dy=p.y-center.y;return {left:s.left+dx-pad,right:s.right+dx+pad,top:s.top+dy-pad,bottom:s.bottom+dy+pad};});}
// 线段与扩边矩形精确相交，避免短路径采样漏掉栏杆或每帧扫描整条远路。
function crosses(a,b,rects){return rects.some(r=>{let lo=0,hi=1;for(const [key,min,max] of [['x',r.left,r.right],['y',r.top,r.bottom]]){const d=b[key]-a[key];if(Math.abs(d)<1e-9){if(a[key]<min||a[key]>max)return false;}else{const t1=(min-a[key])/d,t2=(max-a[key])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}}return true;});}
// 只修正实体与栏杆实际重叠的情况，按最短外移位置检查河岸、建筑和树木。
export function releaseSettlementOverlap(body,trees=[]){
 if(!applies(body)||body.flying||body.hp<=0)return false;
 const radius=Math.max(12,body.radius||12);
 if(!settlementBlocked(body.x,body.y,radius))return false;
 const points=rectangles(body,radius+6).flatMap(r=>[
  {x:r.left,y:body.y},{x:r.right,y:body.y},{x:body.x,y:r.top},{x:body.x,y:r.bottom},
  ...[r.left,r.right].flatMap(x=>[r.top,r.bottom].map(y=>({x,y}))),
 ]).filter(p=>worldDistance(p,body)<=radius*2+16&&!settlementAt(p,radius+5)&&!blocked(p.x,p.y,radius,trees,body));
 points.sort((a,b)=>worldDistance(a,body)-worldDistance(b,body));
 if(!points.length)return false;
 Object.assign(body,points[0]);body.pushX=body.pushY=0;
 if(body.assault)body.assault={phase:'chase',elapsed:0,hit:false};
 routes.delete(body);return true;
}
// 小型可见图只包含两座聚落的外侧角点；每条边同时校验自然地形和建筑。
function plan(body,goal,rects,radius){
 const nodes=[{x:body.x,y:body.y},goal,...rects.flatMap(r=>[r.left-4,r.right+4].flatMap(x=>[r.top-4,r.bottom+4].map(y=>({x,y}))))];
 const clear=(a,b)=>!crosses(a,b,rects)&&terrainLineClear(a,b,radius,(x,y,r)=>blocked(x,y,r,[],body));
 // 常见贴栏追击只绕一个角，先按总路程检查，避免整群同时扫描远端聚落边。
 const corners=nodes.slice(2).sort((a,b)=>worldDistance(body,a)+worldDistance(a,goal)-worldDistance(body,b)-worldDistance(b,goal));
 for(const corner of corners)if(clear(body,corner)&&clear(corner,goal))return [corner,goal];
 // 多角绕栏按周期世界距离优先，远端聚落的长边不再提前采样。
 return visibilityRoute(nodes,worldDistance,clear);
}
// 无栅栏阻挡时交回原河岸寻路；绕栏路径按时间缓存，玩家回到安全区时不隔栏扑击。
export function settlementPursuit(body,target,dt,navigate=true){
 if(!applies(body))return null;
 const radius=(body.species===ARMORED.id||RANGED_ENEMIES[body.species])?body.radius:12,rects=rectangles(body,radius+5),goal=nearest(target,body);
 if(!crosses(body,goal,rects)){routes.delete(body);return null;}
 if(!navigate||settlementAt(goal,radius+5))return {goal:body,direct:false,holding:true};
 let route=routes.get(body);if(route)route.clock-=dt;
 if(!route||route.clock<=0||worldDistance(goal,route.goal)>48){route={goal,clock:.5,path:plan(body,goal,rects,radius)};routes.set(body,route);}
 for(let i=route.path.length-1;i>=0;i--)if(!crosses(body,route.path[i],rects)&&terrainLineClear(body,route.path[i],radius,(x,y,r)=>blocked(x,y,r,[],body)))return {goal:route.path[i],direct:false,holding:false};
 return {goal:body,direct:false,holding:true};
}
