import {campFixedFacilities} from './camp-layout-facilities.js';
// 广场与建筑共用占地，旧布局自动选择最近空位，不挪动玩家房屋。
import {CAMP_PLAZA_BUILDING} from '../config/camp-plaza.js';
import {CAMP_BUILDINGS,campBuildingPosition,campLayoutFootprints} from '../config/camp-layout.js';
import {campPlots,ownsCampPlot} from '../config/camp-land.js';
import {campDecorDefinition} from '../config/camp-management.js';
import {nearest} from './coordinates.js';
export const CAMP_PLAZA={x:40,y:725,width:300,depth:160};
export const CAMP_DECOR_ZONES=[{name:'庆典广场',x:40,y:725,note:'中央留白，边缘布灯与花箱'},{name:'生活庭园',x:650,y:390,note:'小屋与仓库之间，适合盆景与座椅'},{name:'营门迎宾',x:500,y:70,note:'门边陈列，保留进出通道'},{name:'工坊休憩',x:-800,y:800,note:'长椅、水景与路灯成组布置'}];
let active=null;const cache=new WeakMap();
// 通用种田和装饰几何使用当前世界，显式调用可传独立存档。
export function activateCampPlaza(progress){active=progress;}
// 只检查实体和脚底，不把穿过铺地的道路当作房屋。
export function resolveCampPlaza(progress=active,layout=progress?.campLayout){if(!progress)return {...CAMP_PLAZA};const key=JSON.stringify([layout,progress.campLand,progress.campManagement?.items,progress.farm?.plots]),old=cache.get(progress);if(old?.key===key)return old.value;const base=campBuildingPosition(layout,CAMP_PLAZA_BUILDING),regions=campPlots(progress).filter(p=>ownsCampPlot(progress,p.id)),fixed=campFixedFacilities(progress),buildings=CAMP_BUILDINGS.filter(b=>b.id!=='plaza').map(b=>campBuildingPosition(layout,b));
 const free=(x,y)=>{const left=x-150,right=x+150,top=y-160,bottom=y;return [[left,top],[right,top],[left,bottom],[right,bottom]].every(([x,y])=>regions.some(r=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom))&&!fixed.some(f=>f.rects.some(([l,t,r,b])=>left<f.x+r&&right>f.x+l&&top<f.y+b&&bottom>f.y+t))&&!buildings.some(b=>{const rects=b.parking?campLayoutFootprints(b):[{left:b.x-b.width/2-10,right:b.x+b.width/2+10,top:b.y-b.height-10,bottom:b.y+12}];return rects.some(r=>left<r.right&&right>r.left&&top<r.bottom&&bottom>r.top);})&&!(progress.campManagement?.items||[]).some(i=>{if(i.x==null)return false;const d=campDecorDefinition(i.type);return i.x+d.width/2>left&&i.x-d.width/2<right&&i.y+d.depth/2>top&&i.y-d.height<bottom;})&&!(progress.farm?.plots||[]).some(p=>(!p.mapId||p.mapId==='forest')&&p.x+24>left&&p.x-24<right&&p.y+18>top&&p.y-18<bottom);};
 let position=free(base.x,base.y)?base:null;if(!position){const choices=[];for(const r of regions)for(let x=Math.ceil((r.left+162)/40)*40;x<=r.right-162;x+=40)for(let y=Math.ceil((r.top+172)/40)*40;y<=r.bottom-12;y+=40)choices.push({x,y,d:Math.hypot(x-base.x,y-base.y)});choices.sort((a,b)=>a.d-b.d);position=choices.find(p=>free(p.x,p.y));}const value=position?{x:position.x,y:position.y-80,width:300,depth:160}:null;cache.set(progress,{key,value});return value;}
// 农田、装饰和建筑使用同一实际铺地范围，不增加行走碰撞。
export function overlapsCampPlaza(x,y,rx=0,ry=rx,progress=active,layout=progress?.campLayout){const plaza=resolveCampPlaza(progress,layout);if(!plaza)return false;const p=nearest({x,y},plaza);return Math.abs(p.x-plaza.x)<plaza.width/2+rx&&Math.abs(p.y-plaza.y)<plaza.depth/2+ry;}
// 没有足够空地时提示腾出广场用地，绝不把道具画到房屋里面。
export function campPlazaOccupied(progress){return !resolveCampPlaza(progress);}
