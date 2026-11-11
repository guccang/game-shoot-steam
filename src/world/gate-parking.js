// 根据正式围栏生成门外停车场；每场两个独立泊位，门前保留直行车道。
import {campBoundary} from './camp-boundary.js';
import {REGIONAL_SETTLEMENTS} from '../config/regional-camps.js';
import {isWaterBlocked} from './river-geometry.js';
import {isNaturalBlocked} from './natural-terrain.js';
import {pathDistance} from './paths.js';
import {WORLD_BUILDINGS} from '../config/world-buildings.js';
import {PASTURE_BASE} from '../config/pasture.js';
import {nearest} from './coordinates.js';

const layouts=new WeakMap();
// 记录建筑的原始占地，切换存档时通过该档布局恢复，不读取上个世界的坐标。
const buildings=WORLD_BUILDINGS.map(b=>({...b}));
const sideNames={top:'北',bottom:'南',left:'西',right:'东'};

// 检查整个地坪及倒车过道，不与邻近停车场、营地、道路或水面重叠。
function available(x,y,regions,lots){
 for(const r of regions){
  const p=nearest({x,y},{x:(r.left+r.right)/2,y:(r.top+r.bottom)/2});
  if(p.x+120>r.left&&p.x-120<r.right&&p.y+105>r.top&&p.y-70<r.bottom)return false;
 }
 if(lots.some(l=>{const p=nearest(l,{x,y});return Math.abs(p.x-x)<255&&Math.abs(p.y-y)<195;}))return false;
 for(const dx of [-95,0,95])for(const dy of [-42,24,80]){
  if(pathDistance(x+dx,y+dy)<65||isWaterBlocked(x+dx,y+dy,45)||isNaturalBlocked(x+dx,y+dy,45))return false;
 }
 return true;
}

// 从门旁向外搜索可用地块，水平和垂直大门均保留中央车道。
function findLot(gate,side,index,regions,lots){
 const sign=side==='top'||side==='left'?-1:1;
 for(let ring=0;ring<32;ring++){
  for(let depth=0;depth<=ring;depth++){
   const normal=sign*(160+180*depth),offset=gate.length/2+155+260*(ring-depth);
   for(const lateral of (index%2?[offset,-offset]:[-offset,offset])){
    const x=gate.x+(gate.horizontal?lateral:normal),y=gate.y+(gate.horizontal?normal:lateral);
    if(available(x,y,regions,lots))return {x,y};
   }
  }
 }
}

// 泊位编号与具体坐标分离，门位搬迁后存档、导航与停驻车辆使用同一地坪。
export function gateParkingSpots(progress){
 const boundary=campBoundary(progress);
 const positions=progress?.campLayout?.positions||{},key=JSON.stringify(positions),cached=layouts.get(boundary);
 if(cached?.key===key)return cached.spots;
 const regions=boundary.regions.concat(REGIONAL_SETTLEMENTS),spots=[],lots=[],counts=new Map();
 for(const b of buildings){
  const site=positions[({vehicle:'garage','cat-home':'catHome','warehouse-depot':'warehouseDepot'})[b.id]||b.id]||b;
  for(const [l,t,r,bt] of b.rects)regions.push({left:site.x+l,right:site.x+r,top:site.y+t,bottom:site.y+bt});
 }
 const pen=positions.pasture,px=pen?.x??PASTURE_BASE.x,py=pen?pen.y-PASTURE_BASE.halfHeight:PASTURE_BASE.y;
 regions.push({left:px-PASTURE_BASE.halfWidth,right:px+PASTURE_BASE.halfWidth,top:py-PASTURE_BASE.halfHeight,bottom:py+PASTURE_BASE.halfHeight});
 for(const g of boundary.gates){
  const region=REGIONAL_SETTLEMENTS.find(r=>r.id===g.settlement);
  const side=g.side||(g.horizontal?(g.y===region.top?'top':'bottom'):(g.x===region.left?'left':'right'));
  const group=g.settlement+'-'+side,ordinal=(counts.get(group)||0)+1;
  counts.set(group,ordinal);
  const gateName=(region?.name||'晴叶营地')+sideNames[side]+'门'+(ordinal>1?ordinal:'');
  for(let i=0;i<3;i++){
   const site=findLot(g,side,i,regions,lots);
   if(!site)continue;
   lots.push(site);
   const lotId='gate-'+group+'-'+ordinal+'-'+i,lotName=gateName+'外 '+(i+1)+' 号场';
   for(let bay=1;bay<=2;bay++)spots.push({id:lotId+'-'+bay,building:'gate-lot',lotId,lotName,settlement:g.settlement,gateName,number:bay,name:lotName+' · '+bay+' 号位',x:site.x+(bay===1?-55:55),y:site.y,approachY:site.y+65});
  }
 }
 layouts.set(boundary,{key,spots});return spots;
}
