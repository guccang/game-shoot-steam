// 地下连续地形场：保留存档格心身份，轮廓、岸线与碰撞共用同一采样。
import {MINING,minePoint} from '../config/mining.js';
import {clipMinePolygon,clipMineEdge,mineBoundaryEdges} from './mine-boundary.js';
import {mineTerrain,mineCellArea,mineBounds,mineInsideBounds} from '../config/mine-ecology.js';
const terrains=new WeakMap();
export const MINE_SURFACE_STEP=16;
// 只缓存稳定地理，不缓存开掘状态；同一对象直接开格也会立即反映到碰撞。
function terrain(layer,x,y){
 let cache=terrains.get(layer);const b=mineBounds(layer);
 if(!cache||cache.seed!==layer.seed||cache.entry!==layer.entry||cache.depotRow!==layer.depotRow||cache.left!==b.left||cache.top!==b.top||cache.right!==b.right||cache.bottom!==b.bottom){cache={seed:layer.seed,entry:layer.entry,depotRow:layer.depotRow,...b,cells:new Map()};terrains.set(layer,cache);}
 const key=`${x},${y}`;let t=cache.cells.get(key);
 if(!t){if(cache.cells.size>=4096)cache.cells.clear();t={...mineTerrain({x,y},layer),area:mineCellArea({x,y},layer)>0};cache.cells.set(key,t);}
 return {open:t.area&&(t.natural||!!layer.dug?.[key])?1:0,water:t.area&&t.water?1:0};
}
// 三次缓动让格角变成弧线；轻微低频偏移消除长直格边，不重抽地理种子。
export function mineSurfaceField(layer,x,y){
 const seed=layer.seed||1847,wx=x+Math.sin(y/83+seed)*6+Math.cos(y/139+seed)*3,wy=y+Math.sin(x/97+seed)*6;
 const gx=(wx-MINING.home.x)/64,gy=(wy-MINING.home.y)/64,ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const a=terrain(layer,ix,iy),b=terrain(layer,ix+1,iy),c=terrain(layer,ix+1,iy+1),d=terrain(layer,ix,iy+1),mix=k=>(a[k]*(1-u)+b[k]*u)*(1-v)+(d[k]*(1-u)+c[k]*u)*v;
 return {open:mix('open'),water:mix('water')};
}
// 使用16单位三角网格线性插值，使正式碰撞与绘制三角轮廓逐点一致。
export function mineSurfaceAt(layer,x,y){
 if(!mineInsideBounds(layer,x,y))return {open:false,water:false};
 const s=MINE_SURFACE_STEP,left=Math.floor(x/s)*s,top=Math.floor(y/s)*s,u=(x-left)/s,v=(y-top)/s;
 const a=mineSurfaceField(layer,left,top),c=mineSurfaceField(layer,left+s,top+s),other=u>=v?mineSurfaceField(layer,left+s,top):mineSurfaceField(layer,left,top+s);
 const blend=k=>u>=v?a[k]*(1-u)+other[k]*(u-v)+c[k]*v:a[k]*(1-v)+other[k]*(v-u)+c[k]*u;
 return {open:blend('open')>=.5,water:blend('water')>=.5};
}
// 裁出三角形内的开放部分，同时记录真实等值边，内部拼接线不参与描边。
function cutTriangle(vertices,kind,polygons,edges){
 const points=[],cross=[];for(let i=0;i<3;i++){const a=vertices[i],b=vertices[(i+1)%3],inside=a[kind]>=.5,next=b[kind]>=.5;if(inside)points.push({x:a.x,y:a.y});if(inside!==next){const f=(.5-a[kind])/(b[kind]-a[kind]),p={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};points.push(p);cross.push(p);}}
 if(points.length>=3)polygons.push(points);if(cross.length===2&&Math.hypot(cross[0].x-cross[1].x,cross[0].y-cross[1].y)>.001)edges.push(cross);
}
// 只为当前镜头及余量构建几何，移动跨格才重建，不遍历整张地下地图。
export function buildMineSurface(layer,rect){
 const s=MINE_SURFACE_STEP,left=Math.floor(rect.x/s)*s,top=Math.floor(rect.y/s)*s,right=Math.ceil((rect.x+rect.w)/s)*s,bottom=Math.ceil((rect.y+rect.h)/s)*s;
 const cols=Math.round((right-left)/s)+1,rows=Math.round((bottom-top)/s)+1,nodes=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const px=left+x*s,py=top+y*s;nodes.push({x:px,y:py,...mineSurfaceField(layer,px,py)});}
 const result={open:[],water:[],walls:[],shores:[],nodes:nodes.length,rect:{x:left,y:top,w:right-left,h:bottom-top}};
 for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){const a=nodes[y*cols+x],b=nodes[y*cols+x+1],c=nodes[(y+1)*cols+x+1],d=nodes[(y+1)*cols+x];for(const triangle of [[a,b,c],[a,c,d]]){cutTriangle(triangle,'open',result.open,result.walls);cutTriangle(triangle,'water',result.water,result.shores);}}
 // 外围保持坚硬岩床，普通地面与水域在真实层边界结束，实体不被矩形覆盖。
 for(const kind of ['open','water'])result[kind]=result[kind].map(p=>clipMinePolygon(p,layer)).filter(p=>p.length>=3);
 for(const kind of ['walls','shores'])result[kind]=result[kind].map(e=>clipMineEdge(e,layer)).filter(Boolean);
 result.walls.push(...mineBoundaryEdges(result.open,layer));result.shores.push(...mineBoundaryEdges(result.water,layer));
 return result;
}
// 景观脚底稳定且微错落，正式排序与主体绘制共同消费该锚点。
export function mineLandscapeAnchor(cell,hash,layer=null){const p=minePoint(cell),point={x:p.x-19+(hash>>>16)%17,y:p.y+9+(hash>>>24)%18};if(layer){const s=mineSurfaceAt(layer,point.x,point.y);if(!s.open||s.water)return p;}return point;}
