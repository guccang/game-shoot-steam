import {FIRE_STATION} from '../config/fire-station-layout.js';
export {FIRE_STATION} from '../config/fire-station-layout.js';
import {TOWN_LAYOUT} from '../config/town-layout.js';
import { i18nText } from "../i18n/index.js";
// 消防路线取自真实森林碰撞网格；道路、桥梁、树干和水界均参与连通性检查。
import {blocked} from '../physics/motion.js';
import {worldDistance,ORIGINAL_WORLD} from './coordinates.js';
import {SpatialGrid} from './spatial-grid.js';
import {riverXAt} from './river-geometry.js';
// 出入库各点相对站房定位，移动站房时保持原有车道形状。
export const FIRE_PARKING={x:FIRE_STATION.x+40,y:FIRE_STATION.y+70};
// 小镇营地的已验证主路落点，接警转场后从这里步行去消防站。
export const FIRE_TOWN_ARRIVAL=Object.freeze({...TOWN_LAYOUT.spawn});
// 交接下车点在车库门前干地，猫猫与库内车辆各有独立落点。
export const FIRE_EXIT={x:FIRE_STATION.x-20,y:FIRE_STATION.y+70};
// 库内驾驶席、侧门和车道共享正式世界锚点，不能由不同绘制层各自估算。
export const FIRE_GARAGE={x:FIRE_STATION.x-49,y:FIRE_STATION.y-27};
export const FIRE_DOOR={x:FIRE_STATION.x+10,y:FIRE_STATION.y-27};
export const FIRE_APRON={x:FIRE_STATION.x-49,y:FIRE_STATION.y+42};
export const FIRE_DOOR_APPROACH={x:FIRE_STATION.x+10,y:FIRE_STATION.y+30};
const STEP=40, graphs=new WeakMap();
// 按世界实例缓存原林路网，采伐后仍采用保守路线；不会改变地形，也不会清除任何树木。
export function fireRoads(game) {
 const key=JSON.stringify([game.progress.campLayout,game.progress.campLand,FIRE_STATION.x,FIRE_STATION.y]);if(graphs.get(game)?.key===key)return graphs.get(game);
 // 消防仍服务原生活圈；树木按局部桶查询，扩图后不逐格扫描数千棵外围树。
 const nodes=new Map(),trees=new SpatialGrid(game.trees),body={mapId:'forest',campProgress:game.progress},left=Math.min(40,Math.floor((FIRE_STATION.x-1000)/40)*40),right=Math.max(ORIGINAL_WORLD.width,FIRE_STATION.x+1000),top=Math.min(40,Math.floor((FIRE_STATION.y-1000)/40)*40),bottom=Math.max(ORIGINAL_WORLD.height,FIRE_STATION.y+1000),step=Math.max(STEP,Math.ceil(Math.sqrt((right-left)*(bottom-top)/50000)/40)*40);
 for(let y=top;y<bottom;y+=step)for(let x=left;x<right;x+=step)
  if(!blocked(x,y,16,trees,body))nodes.set(`${x}:${y}`,{x,y,links:[]});
 for(const n of nodes.values())for(const [dx,dy]of [[step,0],[0,step]]){
  const b=nodes.get(`${n.x+dx}:${n.y+dy}`);
  if(b&&!blocked(n.x+dx/2,n.y+dy/2,16,trees,body)){n.links.push(b);b.links.push(n);}
 }
 const start=[...nodes.values()].sort((a,b)=>worldDistance(a,FIRE_PARKING)-worldDistance(b,FIRE_PARKING))[0],reachable=new Set([start]),queue=[start];
 for(let i=0;i<queue.length;i++)for(const n of queue[i].links)if(!reachable.has(n)){reachable.add(n);queue.push(n);}
 const road={nodes:queue,start,key};graphs.set(game,road);return road;
}
// 取水点统一选择已连通的东岸干地，吸水管向西伸入真实河道，排除桥面。
export function fireWaterSources(game){
 const candidates=fireRoads(game).nodes.filter(n=>n.x-riverXAt(n.y)<125&&n.x-riverXAt(n.y)>55&&(n.y<550||n.y>950));
 const result=[];for(const y of [1080,1720,400]){const n=candidates.filter(n=>result.every(s=>worldDistance(s,n)>260)).sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y)||worldDistance(a,FIRE_STATION)-worldDistance(b,FIRE_STATION))[0];if(n)result.push({x:n.x,y:n.y,name:i18nText("world.fire-navigation.68f54d96f1", { p0: (result.length+1) }),waterX:riverXAt(n.y),waterY:n.y,waterDx:riverXAt(n.y)-n.x});}
 if(!result.length)throw Error(i18nText("world.fire-navigation.45d396baa8"));return result;
}
// 火树只从连通路边的原树选取，停靠点必须位于喷水距离内。
export function fireTreeSites(game){
 const nodes=fireRoads(game).nodes;return game.trees.filter(t=>t.hp>0&&worldDistance(t,FIRE_STATION)>340&&worldDistance(t,FIRE_STATION)<1100).flatMap(tree=>{
  const stop=nodes.filter(n=>Math.hypot(n.x-tree.x,n.y-tree.y)<105).sort((a,b)=>Math.hypot(a.x-tree.x,a.y-tree.y)-Math.hypot(b.x-tree.x,b.y-tree.y))[0];
  return stop?[{tree,stop:{x:stop.x,y:stop.y}}]:[];
 });
}
// 导航路线绕过真实障碍；接警步行额外避开站房，先到门前再靠近车旁。
export function fireRoute(game,target,avoidStation=false){
 const outside=n=>!avoidStation||n.x<FIRE_STATION.x-140||n.x>FIRE_STATION.x+90||n.y<FIRE_STATION.y-150||n.y>FIRE_STATION.y+20;
 const nodes=fireRoads(game).nodes.filter(outside),closest=p=>nodes.reduce((a,b)=>worldDistance(a,p)<worldDistance(b,p)?a:b);
 const start=closest(game.player),end=closest(target),queue=[start],previous=new Map([[start,null]]);
 for(let i=0;i<queue.length&&!previous.has(end);i++)for(const n of queue[i].links)if(outside(n)&&!previous.has(n)){previous.set(n,queue[i]);queue.push(n);}
 if(!previous.has(end))return [];
 const route=[];for(let n=end;n;n=previous.get(n))route.unshift({x:n.x,y:n.y});
 while(route.length>1&&worldDistance(game.player,route[0])<24)route.shift();return route;
}
