// 新景观以独立确定性布局追加，保留旧山湖坐标、配额和随机流。
import {EARTH_LANDFORMS,EXTRA_TREE_SPECIES} from '../config/earth-biomes.js';
import {WORLD,canonical,nearest} from './coordinates.js';
import {pathBoundsOverlap} from './paths.js';
import {MONSTER_CAMPS} from '../config/monster-camps.js';

// 包围盒保留树冠和绕行净空，不能用视觉空隙强塞实体。
function overlaps(a,b,pad=100){return a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;}
// 裂口使用不对称曲折岸线；其他地貌使用低频完整底座轮廓。
export function earthOutline(kind,rx,ry,phase=0){
 if(kind==='rift'){
  const edge=(side)=>Array.from({length:17},(_,i)=>{const t=i/16,x=(t*2-1)*rx,mid=Math.sin(t*7+phase)*ry*.28,width=Math.sin(Math.PI*t)**.65*ry*(.7+.13*Math.sin(t*17+side));return {x,y:mid+side*width};});
  return [...edge(-1),...edge(1).reverse().slice(1,-1)];
 }
 return Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2,r=1+.07*Math.sin(a*3+phase)+.035*Math.cos(a*5);return {x:Math.cos(a)*rx*r,y:Math.sin(a)*ry*r};});
}
// 同一数据同时提供地表轮廓、碰撞和实体裁剪，世界边缘保留镜像。
function feature(kind,index,x,y){const f={...kind,id:`earth-${kind.id}-${index}`,kind:kind.id,type:'earth-landform',earth:true,x,y,phase:index*.9,outline:earthOutline(kind.id,kind.rx,kind.ry,index*.9)};
 const xs=f.outline.map(p=>p.x),ys=f.outline.map(p=>p.y);f.bounds={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
 f.visualBounds={x:x-f.rx-80,y:y-f.ry-f.height-170,w:f.rx*2+160,h:f.ry*2+f.height+240};return f;
}
// 每种两处，先在近郊外圈寻找，再向外围扩展；固定坐标便于读档和导航。
export function appendEarthLandforms(terrain,reserved=[]){
 terrain.earth=[];
 const protectedAreas=[...reserved,{x:0,y:0,w:4200,h:3200},{x:WORLD.width-1800,y:0,w:1800,h:2700},...MONSTER_CAMPS.filter(c=>c.mapId==='forest').map(c=>({x:c.x-650,y:c.y-750,w:1300,h:1400}))];
 for(let copy=0;copy<2;copy++)for(const [index,kind] of EARTH_LANDFORMS.entries()){
  let chosen=null;
  for(let attempt=0;attempt<2500;attempt++){
   const col=(attempt*7+index*3+copy*19)%53,row=(Math.floor(attempt/53)*5+index*2+copy*11)%38;
   const x=4600+col*760,y=3600+row*760,item=feature(kind,copy,x,y),b=item.visualBounds;
   if(b.x<160||b.y<160||b.x+b.w>WORLD.width-160||b.y+b.h>WORLD.height-160||protectedAreas.some(r=>overlaps(b,r))||pathBoundsOverlap(b,120)||terrain.obstacles.some(f=>overlaps(b,f.visualBounds)))continue;
   chosen=item;break;
  }
  if(!chosen)throw Error(`无法为${kind.name}保留安全景观位置`);
  terrain.earth.push(chosen);terrain.obstacles.push(chosen);
 }
 return terrain;
}
// 完整包围盒筛选避免高雪峰在底座离屏时消失。
export function visibleEarthLandforms(terrain,view){
 const center={x:view.x+view.w/2,y:view.y+view.h/2},result=[];
 for(const f of terrain.earth||[]){const p=nearest(f,center),b=f.visualBounds,shifted={x:b.x+p.x-f.x,y:b.y+p.y-f.y,w:b.w,h:b.h};if(overlaps(shifted,view,0))result.push({...f,...p});}
 return result;
}
// 生态斑块只改变树种，不改变旧树位、尺寸、采集身份与疏密。
export function earthTreeSpecies(tree,terrain){
 const p=canonical(tree);for(const f of terrain.earth||[]){const q=nearest(f,p);if(Math.hypot((p.x-q.x)/(f.rx+250),(p.y-q.y)/(f.ry+250))<1.4){const i=Math.floor(Math.abs(Math.sin(p.x*.13+p.y*.21))*f.trees.length);return f.trees[Math.min(i,f.trees.length-1)];}}
 if(p.x<4200&&p.y<3200||p.x>WORLD.width-1800&&p.y<2700)return tree.variant;
 const col=Math.floor(p.x/680),row=Math.floor(p.y/680),hash=(Math.imul(col+37,73856093)^Math.imul(row+71,19349663))>>>0;
 return hash%5<2?EXTRA_TREE_SPECIES[Math.floor(hash/5)%EXTRA_TREE_SPECIES.length].id:tree.variant;
}
