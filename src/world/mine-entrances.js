// 矿洞地表、地下、点击和禁种共用同一入口记录，不为每个洞口创建独立地下层。
import {minePoint} from '../config/mining.js';
import {nearest} from './coordinates.js';
export const MINE_ENTRANCE={width:108,height:96,foot:24,radius:28,wait:1};
// 存档顺序给洞口编号，稳定网格键仍是唯一业务标识。
export function mineEntrances(layer){return (layer?.shafts||[]).map((key,i)=>{const [x,y]=key.split(',').map(Number);return {key,number:i+1,cell:{x,y},...minePoint({x,y})};});}
// 石拱本体和门前坡道均能点击，循环地图使用最近镜像。
export function mineEntranceContains(site,point){const p=nearest(site,point);return Math.abs(p.x-point.x)<=MINE_ENTRANCE.width/2&&point.y>=p.y-MINE_ENTRANCE.height+MINE_ENTRANCE.foot&&point.y<=p.y+MINE_ENTRANCE.foot;}
// 整块田必须避开石拱和坡道；保留相邻草地，不扩大到整片九格地下平台。
export function mineEntranceFarmBlocked(mining,point){return point?.mapId==='forest'&&mineEntrances(mining).some(site=>{const p=nearest(site,point);return Math.abs(p.x-point.x)<MINE_ENTRANCE.width/2+27&&point.y>p.y-MINE_ENTRANCE.height+MINE_ENTRANCE.foot-20&&point.y<p.y+MINE_ENTRANCE.foot+20;});}
// 地下梯井及回转平台不绘制天然高景观，避免真实出口被植株和石笋盖住。
export function mineEntrancePlatform(cell,layer){return [layer.entry,layer.descent,...(layer.shafts||[])].some(key=>{if(!key)return false;const [x,y]=key.split(',').map(Number);return Math.abs(cell.x-x)<=1&&Math.abs(cell.y-y)<=1;});}
// 超出小地图的洞口沿原方向投到边缘，始终保留所有已建洞口标识。
export function mineEntranceMarkers(layer,center){
 const placed=[];return mineEntrances(layer).map(site=>{const dx=(site.cell.x-center.x)*5,dy=(site.cell.y-center.y)*5,f=Math.min(1,38/Math.max(1,Math.abs(dx)),30/Math.max(1,Math.abs(dy))),targetX=56+dx*f,targetY=60+dy*f,edge=f<1;
  const base={x:targetX,y:targetY},candidates=[];
  // 同向洞口的号码沿边缘错开，脚下号码让出角色朝向箭头；引线仍指向真实落点。
  if(Math.hypot(dx,dy)<10)candidates.push({x:base.x,y:base.y-14});
  candidates.push(base);for(let n=1;n<=6;n++)for(const sign of [1,-1]){const shift=n*14*sign;if(!edge||Math.abs(targetY-60)>29)candidates.push({x:base.x+shift,y:base.y});if(!edge||Math.abs(targetX-56)>37)candidates.push({x:base.x,y:base.y+shift});}
  const point=candidates.find(p=>p.x>=18&&p.x<=94&&p.y>=30&&p.y<=90&&placed.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=13))||base;placed.push(point);
  return {...site,...point,targetX,targetY,angle:Math.atan2(dy,dx),edge};
 });
}
