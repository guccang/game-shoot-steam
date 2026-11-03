// 地层外沿只裁地面几何，不用不透明矩形遮住人物、车辆和景观。
import {mineBounds} from '../config/mine-ecology.js';
// 四个半平面与实际碰撞边界相同，支持未对齐施工网格的小数边界。
function planes(layer){const b=mineBounds(layer);return [['x',b.left,1],['x',b.right,-1],['y',b.top,1],['y',b.bottom,-1]];}
// 沿线段求与边界的交点，避免挪动原有内部地形和施工记录。
function crossing(a,b,axis,value){const f=(value-a[axis])/(b[axis]-a[axis]);return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,[axis]:value};}
// 只将实际地面三角面裁入层范围，外侧由连续岩床承接。
export function clipMinePolygon(points,layer){
 const b=mineBounds(layer);if(points.every(p=>p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom))return points;
 let result=points;
 for(const [axis,value,sign] of planes(layer)){
  const next=[];for(let i=0;i<result.length;i++){const a=result[i],b=result[(i+1)%result.length],inside=(a[axis]-value)*sign>=0,other=(b[axis]-value)*sign>=0;if(inside)next.push(a);if(inside!==other)next.push(crossing(a,b,axis,value));}
  result=next;if(result.length<3)return [];
 }
 return result;
}
// 岸线和普通岩壁只保留层内可见部分，内部拼接线不产生描边。
export function clipMineEdge(edge,layer){
 let [a,b]=edge;
 for(const [axis,value,sign] of planes(layer)){const inside=(a[axis]-value)*sign>=0,other=(b[axis]-value)*sign>=0;if(!inside&&!other)return null;if(inside!==other){const p=crossing(a,b,axis,value);if(!inside)a=p;else b=p;}}
 return Math.hypot(a.x-b.x,a.y-b.y)>.001?[a,b]:null;
}
// 找出地面真正接触外围岩层的线段，使墙脚与固定碰撞边界对齐。
export function mineBoundaryEdges(polygons,layer){
 const result=[],cuts=planes(layer);
 for(const points of polygons)for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a.x-b.x,a.y-b.y)>.001&&cuts.some(([axis,value])=>Math.abs(a[axis]-value)<.001&&Math.abs(b[axis]-value)<.001))result.push([a,b]);}
 return result;
}
