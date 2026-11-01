import {WAREHOUSE} from '../config/warehouse.js';
import {AMMO_SHOP} from '../config/supplies.js';
import {CAT_HOME} from '../config/cat-home.js';
import {FURNITURE_SHOP} from '../config/furniture-shop.js';
import {REPAIR_CENTER} from '../config/vehicle-repair.js';
// 开垦和农活共用正式地形、设施、树干碰撞，地图接缝使用最近镜像。
import {blocked} from '../physics/motion.js';
import {canonical,nearest,worldDistance,delta,WORLD,visibleBodies} from './coordinates.js';
import {FARM_DELIVERY,FARM_SEED_SHOP} from '../config/farm.js';
import {COTTAGES} from './scenery.js';
import {REALM_ENTRANCES} from './realm-entrances.js';
import {farmOverlapsRoad} from './farm-roads.js';
// 没有参照田时保留点击位置；有参照时沿田块中心按原间距对齐，支持地图接缝。
export function snapFarmPoint(point,mapId='forest',origin=null){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
 const p=origin?nearest(point,origin):point;
 return {...canonical(origin?{x:origin.x+Math.round((p.x-origin.x)/56)*56,y:origin.y+Math.round((p.y-origin.y)/52)*52}:p),mapId};
}
// 只从当前镜头内的已开垦田块选择最近参照，离屏田和未完成的开垦不锁定新田区。
export function farmDigPoint(game,point,view){
 let origin=null;
 if(view&&[view.x,view.y,view.w,view.h].every(Number.isFinite)&&view.w>0&&view.h>0){
  const plots=game.progress.farm.plots.filter(p=>p.mapId===game.mapId);
  origin=visibleBodies(plots,view,25).filter(p=>p.y+18>=view.y&&p.y-18<=view.y+view.h)
   .sort((a,b)=>Math.hypot(a.x-point.x,a.y-point.y)-Math.hypot(b.x-point.x,b.y-point.y)||a.id-b.id)[0];
 }
 return snapFarmPoint(point,game.mapId,origin);
}
// 先检查实际点击的土壤，再沿用最近可见田格选址；窄缝提示空间不足，不误称已有田块。
export function farmDigTarget(game,point,view){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return {point:null,reason:'请选择当前地图的地面。'};
 const raw=canonical(point),occupied=game.progress.farm.plots.find(p=>p.mapId===game.mapId&&Math.abs(delta(p.x-raw.x,WORLD.width))<=25&&Math.abs(delta(p.y-raw.y,WORLD.height))<=18);
 if(occupied)return {point:{...occupied},reason:'这里已有田块，请选择旁边的空地。'};
 const target=farmDigPoint(game,point,view),reason=farmLandReason(game,target);
 return {point:target,reason:reason?.includes('已有田块')?'这处空隙放不下一整块田，请选择更宽的空地。':reason};
}
// 树木在已经开垦的土地上不再生，刷新和切图也保持清出的空间。
export function farmCovers(game,point){if(game.realm)return false;return (game.progress?.farm?.plots||[]).some(p=>p.mapId===game.mapId&&worldDistance(p,point)<43);}
// 路面、水、山、建筑与树木都不能当作耕地，路边草地不额外扩大禁种范围。
export function farmLandReason(game,point,ignorePlotId=null){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.mapId!==game.mapId)return '请选择当前地图的地面。';
 if(game.progress.farm.plots.some(p=>p.id!==ignorePlotId&&p.mapId===point.mapId&&Math.abs(delta(p.x-point.x,WORLD.width))<52&&Math.abs(delta(p.y-point.y,WORLD.height))<46))return '这里已有田块，请选择旁边的空地。';
 if(farmOverlapsRoad(point))return '田块会占到路面，请稍微移到旁边的草地。';
 if(game.mapId==='forest')for(const b of [...COTTAGES,...REALM_ENTRANCES,FARM_DELIVERY,FARM_SEED_SHOP,REPAIR_CENTER,FURNITURE_SHOP,WAREHOUSE,CAT_HOME,AMMO_SHOP]){const q=nearest(b,point);if(Math.abs(q.x-point.x)<(b.width||150)/2+27&&point.y>q.y-(b.height||140)-20&&point.y<q.y+34)return '建筑与入口需要留出通路，换一处空地吧。';}
 if((game.trees||[]).some(t=>t.hp>0&&worldDistance(t,point)<(t.radius||14)+30))return '这里有树，先用电锯清理。';
 const body={...game.player,mapId:game.mapId,arena:null,flying:false,amphibious:false,treePass:false,livingCollision:game.mapId==='forest'};
 for(const [dx,dy] of [[0,0],[-22,-15],[22,-15],[-22,15],[22,15]])if(blocked(point.x+dx,point.y+dy,10,[],body))return '水面、山体和设施上不能开垦，请选择可站立的地面。';
 return null;
}
// 从四周选择可站立操作位；正面留出猫头高度，侧面留出肩宽，避免田块压住脸。
export function farmApproach(game,point,action=null){
 // 浇水从两侧或斜上方操作，壶嘴高于田面；不从下方隔着猫头反向喷水。
 const center=nearest(point,game.player),offsets=action==='water'?[[-54,6],[54,6],[-42,-36],[42,-36]]:[[0,62],[-54,6],[54,6],[0,-48]],body={...game.player,livingCollision:game.mapId==='forest'};
 return offsets.map(([x,y])=>({x:center.x+x,y:center.y+y})).filter(p=>!blocked(p.x,p.y,12,game.trees||[],body)).sort((a,b)=>worldDistance(a,game.player)-worldDistance(b,game.player))[0]||null;
}

// 按离原位置的距离搜索网格；最多向外24格，找不到安全位置就保留原田，不丢弃。
export function nearbyFarmLand(game,plot,ignorePlotId=null){
 for(let ring=0;ring<=24;ring++){
  const candidates=[];
  for(let y=-ring;y<=ring;y++)for(let x=-ring;x<=ring;x++)if(Math.max(Math.abs(x),Math.abs(y))===ring)candidates.push(snapFarmPoint({x:plot.x+x*56,y:plot.y+y*52},plot.mapId));
  candidates.sort((a,b)=>worldDistance(a,plot)-worldDistance(b,plot));
  const found=candidates.find(p=>!farmLandReason(game,p,ignorePlotId));if(found)return found;
 }
 return null;
}
