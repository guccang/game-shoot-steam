// 任务视觉路线只查询正式碰撞，不移动角色，不修改地形或任务状态。
import {blocked} from './motion.js';
import {nearest,WORLD} from '../world/coordinates.js';
import {SpatialGrid} from '../world/spatial-grid.js';

export const QUEST_ROUTE_STEP=32,QUEST_ROUTE_BUDGET=4096;
// 八方向网格使用直角加对角距离；扣除终点直连的最大节省，保持估价不高于真实最短路。
const GOAL_CONNECT_RADIUS=QUEST_ROUTE_STEP*1.5,GOAL_CONNECT_SLACK=GOAL_CONNECT_RADIUS*(Math.sqrt(4-2*Math.SQRT2)-1);
// 远距离网格路径比欧氏直线更长，贴合八方向代价可减少向目标两侧无效扩张。
function estimate(x,y,goal,slack=GOAL_CONNECT_SLACK){const dx=Math.abs(goal.x-x),dy=Math.abs(goal.y-y);return Math.max(0,Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy)-slack);}
// 单点碰撞共用正式规则，生成器和同步扫掠无需重复检测同一个端点。
function pointClear(x,y,body,trees){
 // 玩家保持原有十二单位余量；大型召唤物显式传入自己的脚底尺寸。
 const radius=body.navigationRadius??12;
 if(body.arena){const a=nearest(body.arena,{x,y});if(Math.hypot(x-a.x,y-a.y)>body.arena.radius-radius)return false;}
 return !blocked(x,y,radius,trees,body);
}
// 每条边以8单位扫掠，沿用步行、两栖、飞行与战斗圈的实际通行规则。
export function questLineClear(a,b,body,trees){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));
 for(let i=0;i<=steps;i++){
  const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;
  if(!pointClear(x,y,body,trees))return false;
 }
 return true;
}
// 最小堆限制开放节点排序开销，搜索达到预算就停止而不画穿墙备用线。
function push(heap,node){let i=heap.length;heap.push(node);while(i){const p=(i-1)>>1;if(heap[p].score<=node.score)break;heap[i]=heap[p];i=p;}heap[i]=node;}
// 取出估价最小的节点；重复入堆的旧节点由调用方检查代价后跳过。
function pop(heap){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
// 扫掠按固定小批次让出执行权；每批跨短边累计，长直线和路径收束也不能绕过帧预算。
function* lineSearch(a,b,collision){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8));
 for(let i=0;i<=steps;i++){
  if(++collision.samples>=32){collision.samples=0;yield;}
  const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;
  if(!collision.clear(x,y))return false;
 }
 return true;
}
// A*在最近世界镜像内搜索；生成器同时供同步规则检查与正式分帧会话使用。
function* routeSearch(player,target,trees,budget,local=false,bounds=null,canOccupy=null,step=QUEST_ROUTE_STEP){
 // 远程驿站可先用稀疏网格，边仍逐8单位扫掠，旧任务保持32单位精度。
 const connectRadius=step*1.5,slack=connectRadius*(Math.sqrt(4-2*Math.SQRT2)-1);
 const body={...player},start={x:player.x,y:player.y},goal=nearest(target,start),grid=trees.query?trees:new SpatialGrid(trees);
 // 长途使用加权 A* 优先沿目标方向绕障，不为追求最短路铺开整片森林；近距离仍保留原代价。
 const weight=Math.hypot(goal.x-start.x,goal.y-start.y)>1200?1.5:1;
 // 同次搜索缓存精确坐标的碰撞结果，不取整或放大网格，避免树角与窄门误判。
 const columns=new Map(),collision={samples:0,
  // 相邻边共享端点和采样点；缓存随本次搜索释放，能力或障碍变化仍由会话重新规划。
  clear(x,y){let column=columns.get(x);if(!column){column=new Map();columns.set(x,column);}if(!column.has(y))column.set(y,canOccupy?canOccupy(x,y):pointClear(x,y,body,grid));return column.get(y);}
 };
 const clear=(a,b)=>lineSearch(a,b,collision);
 if(yield* clear(start,goal)){
  if(!local)return {points:[start,goal],visited:0,reachable:true};
  // 正式缓存直接输出短边，每条按最终端点重新扫掠，避免二次切段改变采样位置漏过树角。
  const points=[start],count=Math.max(1,Math.ceil(Math.hypot(goal.x-start.x,goal.y-start.y)/64));let safe=true;
  for(let i=1;i<=count;i++){
   const point={x:start.x+(goal.x-start.x)*i/count,y:start.y+(goal.y-start.y)*i/count};
   if(!(yield* clear(points.at(-1),point))){safe=false;break;}points.push(point);
  }
  if(safe)return {points,visited:0,reachable:true};
 }
 if(!(yield* clear(start,start))||!(yield* clear(goal,goal)))return {points:[],visited:0,reachable:false};
 const heap=[],nodes=new Map(),origin={...start,ix:0,iy:0,cost:0,score:weight*estimate(start.x,start.y,goal,slack),previous:null};
 nodes.set('0:0',origin);push(heap,origin);let visited=0;
 while(heap.length&&visited<budget){
  yield;
  const current=pop(heap);if(nodes.get(current.ix+':'+current.iy)!==current||current.closed)continue;
  current.closed=true;visited++;
  if(Math.hypot(goal.x-current.x,goal.y-current.y)<=connectRadius&&(yield* clear(current,goal))){
   const path=[goal];for(let n=current;n;n=n.previous){path.push({x:n.x,y:n.y});yield;}path.reverse();
   // 只在近邻内合并，避免对越来越长的全程重复扫掠；所有折点仍经正式碰撞验证。
   const points=[path[0]];let i=0;
   while(i<path.length-1){let next=i+1;while(next+1<path.length&&Math.hypot(path[next+1].x-path[i].x,path[next+1].y-path[i].y)<=64&&(yield* clear(path[i],path[next+1])))next++;points.push(path[next]);i=next;}
   return {points,visited,reachable:true};
  }
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const ix=current.ix+dx,iy=current.iy+dy;
   if(Math.abs(ix*step)>WORLD.width||Math.abs(iy*step)>WORLD.height)continue;
   const key=ix+':'+iy,cost=current.cost+Math.hypot(dx,dy)*step;
   if(nodes.has(key)&&nodes.get(key).cost<=cost)continue;
   const node={x:start.x+ix*step,y:start.y+iy*step,ix,iy,cost,previous:current};
   if(bounds&&(node.x<bounds.left||node.x>bounds.right||node.y<bounds.top||node.y>bounds.bottom))continue;
   // 先排除堵塞终点；相邻节点再次探测同一堵塞格时直接命中缓存，不反复扫掠整条边。
   if(++collision.samples>=32){collision.samples=0;yield;}
   if(!collision.clear(node.x,node.y))continue;
   if(!(yield* clear(current,node)))continue;
   node.score=cost+weight*estimate(node.x,node.y,goal,slack);nodes.set(key,node);push(heap,node);
  }
 }
 return {points:[],visited,reachable:false};
}

// 每帧最多1.5毫秒或256个搜索批次；每批最多32次采样，重复绘制不推进或伪造直线。
export function createQuestRouteSearch(player,target,trees=[],budget=QUEST_ROUTE_BUDGET,{bounds=null,canOccupy=null,step=QUEST_ROUTE_STEP}={}){
 // 室内点击行走注入正式家具碰撞，仍共用有界搜索与逐段扫掠。
 const iterator=routeSearch(player,target,trees,budget,true,bounds,canOccupy,[32,64,96].includes(step)?step:QUEST_ROUTE_STEP);
 return {result:null,steps:0,slices:0,lastFrame:null,
  // 有界推进供故事和邻里共用；时钟参数支持确定性预算回归。
  advance(frame,{milliseconds=1.5,steps=256,now=()=>performance.now()}={}){
   if(this.result||this.lastFrame===frame)return this.result;
   this.lastFrame=frame;this.slices++;const start=now();
   for(let i=0;i<steps;i++){
    const next=iterator.next();this.steps++;
    if(next.done){this.result=next.value;break;}
    if(now()-start>=milliseconds)break;
   }
   return this.result;
  }
 };
}

// 同步入口供离线验证及一次性接取校验，持续导航和正式渲染使用上面的有界会话。
export function planQuestRoute(player,target,trees=[],budget=QUEST_ROUTE_BUDGET,{shortEdges=false}={}){
 // 接单路线需要直接交给视觉缓存时，使用同一生成器验证不超过64单位的短边。
 const iterator=routeSearch(player,target,trees,budget,shortEdges);let next;
 do{next=iterator.next();}while(!next.done);
 return next.value;
}
