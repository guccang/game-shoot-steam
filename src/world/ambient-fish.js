// 常态游鱼采样真实水域；稳定散列决定栖点，不使用战斗随机数或新增存档实体。
import {NATURAL_TERRAIN,touchesLandform} from './natural-terrain.js';
import {JIUZHAIGOU_LAKES} from './jiuzhaigou.js';
import {nearest} from './coordinates.js';
import {mineSurfaceAt} from './mine-surface.js';
import {mineHash} from '../config/mine-ecology.js';
const lakesCache=new WeakMap(),mineCaches=new WeakMap();
export const AMBIENT_FISH_LIMIT=32;
// 整个游动包围盒都必须落在水里，鱼身、尾鳍和转弯均预留空间。
function clearWater(water,x,y,radius=36){for(let dx=-radius;dx<=radius;dx+=radius/2)for(let dy=-radius;dy<=radius;dy+=radius/2)if(!water(x+dx,y+dy))return false;return true;}
// 游鱼沿小范围平滑环线行进，朝向来自路径切线，摆尾由绘制器单独处理。
export function ambientFishPose(anchor,time){const t=time*(.22+(anchor.seed%7)*.015)+anchor.seed;const travel=anchor.small?.5:1;return {...anchor,x:anchor.x+Math.cos(t)*18*travel,y:anchor.y+Math.sin(t)*12*travel,angle:Math.atan2(12*Math.cos(t),-18*Math.sin(t)),clock:time+anchor.seed};}
// 可见性只影响绘制数量，进入视野不会重置游动相位。
function visible(p,view){return p.x>view.x-30&&p.x<view.x+view.w+30&&p.y>view.y-30&&p.y<view.y+view.h+30;}
// 每座真实湖泊缓存少量安全栖点，湖岸和内部均有鱼群。
function lakeAnchors(lake){
 if(lakesCache.has(lake))return lakesCache.get(lake);const anchors=[],water=(x,y)=>touchesLandform(lake,x,y);
 const xs=lake.outline.map(p=>p.x),ys=lake.outline.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 for(let dy=top+24;dy<bottom-20&&anchors.length<18;dy+=52)for(let dx=left+24;dx<right-20&&anchors.length<18;dx+=56){const x=lake.x+dx,y=lake.y+dy,seed=mineHash(Math.round(x),Math.round(y),743);if(clearWater(water,x,y))anchors.push({x,y,seed:seed%997,species:seed%3});}
 // 狭窄小湖采用较小鱼体和更短路径，仍完整检查尾鳍与转弯空间。
 if(!anchors.length)for(let dy=top+18;dy<bottom-18&&anchors.length<3;dy+=32)for(let dx=left+18;dx<right-18&&anchors.length<3;dx+=36){const x=lake.x+dx,y=lake.y+dy,seed=mineHash(Math.round(x),Math.round(y),743);if(clearWater(water,x,y,26))anchors.push({x,y,seed:seed%997,species:seed%3,small:true});}
 lakesCache.set(lake,anchors);return anchors;
}
// 地表水域与正式地貌共用轮廓，周期地图使用镜像坐标保持岸线一致。
export function surfaceAmbientFish(mapId,view,time){
 const lakes=mapId==='forest'?NATURAL_TERRAIN.lakes:mapId==='jiuzhaigou'?JIUZHAIGOU_LAKES.filter(l=>l.kind==='lake'):[],result=[],center={x:view.x+view.w/2,y:view.y+view.h/2};
 for(const lake of lakes)for(const a of lakeAnchors(lake)){const p=ambientFishPose(a,time),q=nearest(p,center);if(visible(q,view))result.push({...p,x:q.x,y:q.y,lakeId:lake.id});if(result.length===AMBIENT_FISH_LIMIT)return result;}return result;
}
// 地下只查询视野中的96单位网格，缓存有界；真实开放水界决定能否存在鱼群。
export function mineAmbientFish(layer,view,time){
 let cache=mineCaches.get(layer);if(!cache){cache=new Map();mineCaches.set(layer,cache);}const result=[],water=(x,y)=>{const s=mineSurfaceAt(layer,x,y);return s.open&&s.water;};
 const left=Math.floor((view.x-40)/96),top=Math.floor((view.y-40)/96),right=Math.ceil((view.x+view.w+40)/96),bottom=Math.ceil((view.y+view.h+40)/96);
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
  const key=x+','+y;let a=cache.get(key);if(a===undefined){const seed=mineHash(x,y,layer.seed),px=x*96+48,py=y*96+48;a=clearWater(water,px,py)?{x:px,y:py,seed:seed%997,species:seed%3}:null;if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,a);}
  if(a){const p=ambientFishPose(a,time);if(visible(p,view))result.push(p);}if(result.length===AMBIENT_FISH_LIMIT)return result;
 }return result;
}
