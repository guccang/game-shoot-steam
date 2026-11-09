// 地下同源三角几何按世界块复用，缓存只保留有限近邻，不分配全地图或位图。
import {buildMineSurface} from './mine-surface.js';
import {MINING} from '../config/mining.js';
import {mineBounds} from '../config/mine-ecology.js';
export const MINE_SURFACE_CHUNK=256,MINE_SURFACE_CACHE_LIMIT=48;
// 地形缓动依赖附近格心；多留两格检查直接写入的开掘变更，桥梁不改变地面几何。
function dependencies(rect){
 const keys=[];for(let y=Math.floor((rect.y-MINING.home.y)/64)-2;y<=Math.ceil((rect.y+rect.h-MINING.home.y)/64)+2;y++)
 for(let x=Math.floor((rect.x-MINING.home.x)/64)-2;x<=Math.ceil((rect.x+rect.w-MINING.home.x)/64)+2;x++)keys.push(`${x},${y}`);
 return keys;
}
// 编译接口可生成正式 Path2D，规则测试直接消费同一三角网格，不复制地形算法。
export function createMineSurfaceCache(compile=mesh=>mesh){
 const chunks=new Map();let tag=null,builds=0;
 // 每帧只检查当前视口的少量依赖格；移动跨块只生成新进入的边缘条带。
 function sample(layer,rect){
  const b=mineBounds(layer),nextTag=`${layer.seed}:${layer.entry}:${layer.depotRow??''}:${b.left},${b.top},${b.right},${b.bottom}`;
  if(tag!==nextTag){chunks.clear();tag=nextTag;}
  const size=MINE_SURFACE_CHUNK,left=Math.floor(rect.x/size),top=Math.floor(rect.y/size),right=Math.ceil((rect.x+rect.w)/size),bottom=Math.ceil((rect.y+rect.h)/size),items=[];let rebuilt=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
   const key=`${x},${y}`,area={x:x*size,y:y*size,w:size,h:size};let cached=chunks.get(key);
   const keys=cached?.keys||dependencies(area),signature=keys.map(k=>layer.dug?.[k]?'1':'0').join('');
   if(!cached||cached.signature!==signature){const mesh=buildMineSurface(layer,area);cached={keys,signature,value:compile(mesh),nodes:mesh.nodes,edges:mesh.walls.length+mesh.shores.length};rebuilt++;builds++;}
   chunks.delete(key);chunks.set(key,cached);items.push(cached);
  }
  while(chunks.size>MINE_SURFACE_CACHE_LIMIT)chunks.delete(chunks.keys().next().value);
  return {items,rect:{x:left*size,y:top*size,w:(right-left)*size,h:(bottom-top)*size},rebuilt,builds,cached:chunks.size};
 }
 return {sample};
}

// 相邻三角面的内部边互相抵消，只提交实际外轮廓和孔洞，保持原顶点位置与绕向。
export function mineSurfaceContours(polygons){
 const boundary=new Map(),pointKey=p=>`${Math.round(p.x*1e6)},${Math.round(p.y*1e6)}`;
 for(const polygon of polygons)for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],from=pointKey(a),to=pointKey(b);if(from===to)continue;
  const key=from<to?from+':'+to:to+':'+from;if(boundary.has(key))boundary.delete(key);else boundary.set(key,{a,b,from,to});
 }
 const outgoing=new Map(),used=new Set(),contours=[];
 for(const edge of boundary.values()){let edges=outgoing.get(edge.from);if(!edges){edges=[];outgoing.set(edge.from,edges);}edges.push(edge);}
 for(const first of boundary.values()){
  if(used.has(first))continue;const points=[];let edge=first;
  while(edge&&!used.has(edge)){used.add(edge);points.push(edge.a);if(edge.to===first.from)break;edge=outgoing.get(edge.to)?.find(next=>!used.has(next));}
  if(points.length>=3)contours.push(points);
 }
 return contours;
}
